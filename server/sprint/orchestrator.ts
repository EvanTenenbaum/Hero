import { invokeLLM } from "../_core/llm";
import { getCardsByBoard, getBoardById } from "../kanban/db";

export interface TaskAnalysis {
  cardId: number;
  title: string;
  description: string | null;
  type: string | null;
  priority: string | null;
  estimateHours: number | null;
  storyPoints: number | null;
  assignedAgent: string | null;
  // AI-analyzed fields
  touchedFiles: string[];
  touchedModules: string[];
  dependencies: number[];
  blockedBy: number[];
  complexity: 'low' | 'medium' | 'high';
  suggestedAgent: string;
  parallelizable: boolean;
}

export interface SprintWorkstream {
  name: string;
  agent: string;
  tasks: TaskAnalysis[];
  totalHours: number;
  totalPoints: number;
  reasoning: string;
}

export interface SprintPlan {
  sprintName: string;
  sprintGoal: string;
  duration: string;
  workstreams: SprintWorkstream[];
  conflicts: Array<{
    task1: number;
    task2: number;
    reason: string;
    resolution: string;
  }>;
  criticalPath: number[];
  risks: string[];
  recommendations: string[];
}

/**
 * Analyze a single task to extract file/module touchpoints and complexity
 */
async function analyzeTask(task: {
  id: number;
  title: string;
  description: string | null;
  type: string | null;
  priority: string | null;
  estimateHours: number | null;
  storyPoints: number | null;
  assignedAgent: string | null;
}): Promise<TaskAnalysis> {
  const prompt = `Analyze this software development task and extract structured information.

Task Title: ${task.title}
Task Description: ${task.description || 'No description provided'}
Task Type: ${task.type || 'task'}
Priority: ${task.priority || 'medium'}
Estimate: ${task.estimateHours ? `${task.estimateHours} hours` : 'Not estimated'}

Based on the task description, identify:
1. Which files or file patterns this task likely touches (e.g., "src/components/*.tsx", "server/api/users.ts")
2. Which modules or areas of the codebase (e.g., "authentication", "database", "UI components", "API routes")
3. Complexity level (low/medium/high) based on scope and technical requirements
4. Best agent type to assign: PM (planning/requirements), Dev (implementation), QA (testing), DevOps (infrastructure), Research (investigation)
5. Whether this task can be parallelized with other tasks (true if it doesn't block or depend on many others)

Respond in JSON format:
{
  "touchedFiles": ["file/pattern1", "file/pattern2"],
  "touchedModules": ["module1", "module2"],
  "complexity": "low|medium|high",
  "suggestedAgent": "PM|Dev|QA|DevOps|Research",
  "parallelizable": true|false,
  "reasoning": "Brief explanation of analysis"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a technical project analyst. Analyze tasks and extract structured information about code impact and complexity. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "task_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              touchedFiles: { type: "array", items: { type: "string" } },
              touchedModules: { type: "array", items: { type: "string" } },
              complexity: { type: "string", enum: ["low", "medium", "high"] },
              suggestedAgent: { type: "string", enum: ["PM", "Dev", "QA", "DevOps", "Research"] },
              parallelizable: { type: "boolean" },
              reasoning: { type: "string" }
            },
            required: ["touchedFiles", "touchedModules", "complexity", "suggestedAgent", "parallelizable", "reasoning"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const analysis = JSON.parse(typeof content === 'string' ? content : "{}");
    
    return {
      cardId: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      estimateHours: task.estimateHours,
      storyPoints: task.storyPoints,
      assignedAgent: task.assignedAgent,
      touchedFiles: analysis.touchedFiles || [],
      touchedModules: analysis.touchedModules || [],
      dependencies: [],
      blockedBy: [],
      complexity: analysis.complexity || 'medium',
      suggestedAgent: analysis.suggestedAgent || 'Dev',
      parallelizable: analysis.parallelizable ?? true
    };
  } catch (error) {
    console.error('Task analysis failed:', error);
    return {
      cardId: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      estimateHours: task.estimateHours,
      storyPoints: task.storyPoints,
      assignedAgent: task.assignedAgent,
      touchedFiles: [],
      touchedModules: [],
      dependencies: [],
      blockedBy: [],
      complexity: 'medium',
      suggestedAgent: task.assignedAgent || 'Dev',
      parallelizable: true
    };
  }
}

/**
 * Detect conflicts between tasks based on file/module overlap
 */
function detectConflicts(tasks: TaskAnalysis[]): Array<{
  task1: number;
  task2: number;
  reason: string;
  resolution: string;
}> {
  const conflicts: Array<{
    task1: number;
    task2: number;
    reason: string;
    resolution: string;
  }> = [];

  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const task1 = tasks[i];
      const task2 = tasks[j];

      // Check file overlap
      const fileOverlap = task1.touchedFiles.filter(f => 
        task2.touchedFiles.some(f2 => f === f2 || f.includes(f2) || f2.includes(f))
      );

      // Check module overlap
      const moduleOverlap = task1.touchedModules.filter(m => 
        task2.touchedModules.includes(m)
      );

      if (fileOverlap.length > 0 || moduleOverlap.length > 0) {
        conflicts.push({
          task1: task1.cardId,
          task2: task2.cardId,
          reason: fileOverlap.length > 0 
            ? `Both tasks touch: ${fileOverlap.join(', ')}`
            : `Both tasks affect module: ${moduleOverlap.join(', ')}`,
          resolution: 'Sequence these tasks or assign to same agent'
        });
      }
    }
  }

  return conflicts;
}

/**
 * Group tasks into parallel workstreams based on conflicts and agent assignments
 */
function createWorkstreams(
  tasks: TaskAnalysis[],
  conflicts: Array<{ task1: number; task2: number; reason: string; resolution: string }>
): SprintWorkstream[] {
  // Group by suggested agent
  const agentGroups: Record<string, TaskAnalysis[]> = {};
  
  for (const task of tasks) {
    const agent = task.suggestedAgent;
    if (!agentGroups[agent]) {
      agentGroups[agent] = [];
    }
    agentGroups[agent].push(task);
  }

  // Create workstreams
  const workstreams: SprintWorkstream[] = [];
  
  for (const [agent, agentTasks] of Object.entries(agentGroups)) {
    // Sort by priority (critical > high > medium > low)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    agentTasks.sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
      return aPriority - bPriority;
    });

    const totalHours = agentTasks.reduce((sum, t) => sum + (t.estimateHours || 4), 0);
    const totalPoints = agentTasks.reduce((sum, t) => sum + (t.storyPoints || 1), 0);

    workstreams.push({
      name: `${agent} Workstream`,
      agent,
      tasks: agentTasks,
      totalHours,
      totalPoints,
      reasoning: `${agentTasks.length} tasks assigned to ${agent} agent based on task type and complexity analysis.`
    });
  }

  return workstreams;
}

/**
 * Calculate critical path through tasks based on dependencies
 */
function calculateCriticalPath(
  tasks: TaskAnalysis[],
  conflicts: Array<{ task1: number; task2: number; reason: string; resolution: string }>
): number[] {
  // Simple critical path: high priority + high complexity + most conflicts
  const taskScores = tasks.map(task => {
    const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 }[task.priority || 'medium'] || 2;
    const complexityScore = { high: 3, medium: 2, low: 1 }[task.complexity] || 2;
    const conflictCount = conflicts.filter(c => c.task1 === task.cardId || c.task2 === task.cardId).length;
    
    return {
      cardId: task.cardId,
      score: priorityScore * 2 + complexityScore + conflictCount
    };
  });

  // Sort by score descending and return top tasks
  taskScores.sort((a, b) => b.score - a.score);
  return taskScores.slice(0, Math.min(5, taskScores.length)).map(t => t.cardId);
}

/**
 * Generate a complete sprint plan from backlog tasks
 */
export async function generateSprintPlan(
  boardId: number,
  sprintName: string,
  sprintGoal: string,
  durationDays: number = 14
): Promise<SprintPlan> {
  // Get all cards from the board
  const board = await getBoardById(boardId);
  if (!board) {
    throw new Error('Board not found');
  }

  const cards = await getCardsByBoard(boardId);
  
  // Filter to only include non-completed cards
  // Cards don't have a status field, they're in columns - we'll include all cards
  const backlogCards = cards;

  if (backlogCards.length === 0) {
    return {
      sprintName,
      sprintGoal,
      duration: `${durationDays} days`,
      workstreams: [],
      conflicts: [],
      criticalPath: [],
      risks: ['No tasks in backlog'],
      recommendations: ['Add tasks to the board before generating a sprint plan']
    };
  }

  // Analyze each task
  const analyzedTasks: TaskAnalysis[] = [];
  for (const card of backlogCards) {
    const analysis = await analyzeTask({
      id: card.id,
      title: card.title,
      description: card.description,
      type: card.cardType,
      priority: card.priority,
      estimateHours: card.estimatedMinutes ? Math.round(card.estimatedMinutes / 60) : null,
      storyPoints: card.storyPoints,
      assignedAgent: card.assignedAgent
    });
    analyzedTasks.push(analysis);
  }

  // Detect conflicts
  const conflicts = detectConflicts(analyzedTasks);

  // Create workstreams
  const workstreams = createWorkstreams(analyzedTasks, conflicts);

  // Calculate critical path
  const criticalPath = calculateCriticalPath(analyzedTasks, conflicts);

  // Generate risks and recommendations
  const totalHours = workstreams.reduce((sum, w) => sum + w.totalHours, 0);
  const availableHours = durationDays * 6; // Assuming 6 productive hours per day

  const risks: string[] = [];
  const recommendations: string[] = [];

  if (totalHours > availableHours) {
    risks.push(`Sprint is overloaded: ${totalHours} hours of work for ${availableHours} available hours`);
    recommendations.push('Consider moving lower priority tasks to next sprint');
  }

  if (conflicts.length > 5) {
    risks.push(`High conflict count (${conflicts.length}) may cause merge conflicts and coordination overhead`);
    recommendations.push('Consider sequencing conflicting tasks or assigning to same developer');
  }

  const highComplexityCount = analyzedTasks.filter(t => t.complexity === 'high').length;
  if (highComplexityCount > analyzedTasks.length / 2) {
    risks.push('More than half of tasks are high complexity');
    recommendations.push('Break down complex tasks into smaller subtasks');
  }

  return {
    sprintName,
    sprintGoal,
    duration: `${durationDays} days`,
    workstreams,
    conflicts,
    criticalPath,
    risks,
    recommendations
  };
}

/**
 * Adjust a sprint plan based on user feedback
 */
export async function adjustSprintPlan(
  currentPlan: SprintPlan,
  adjustment: string
): Promise<SprintPlan> {
  const prompt = `You are a sprint planning assistant. The user wants to adjust the current sprint plan.

Current Sprint Plan:
${JSON.stringify(currentPlan, null, 2)}

User's Adjustment Request:
${adjustment}

Apply the user's adjustment to the sprint plan and return the updated plan. Maintain the same JSON structure.
If the user wants to move a task between workstreams, update the workstreams accordingly.
If the user wants to change priorities, update the task order.
If the user wants to remove tasks, remove them from workstreams.

Return the complete updated sprint plan in the same JSON format.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a sprint planning assistant. Apply user adjustments to sprint plans and return valid JSON." },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    if (typeof content !== 'string') {
      return currentPlan;
    }
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as SprintPlan;
    }
    return currentPlan;
  } catch (error) {
    console.error('Sprint adjustment failed:', error);
    return currentPlan;
  }
}
