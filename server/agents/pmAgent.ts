/**
 * PM Agent - Epic Breakdown Service
 * 
 * Provides intelligent epic breakdown with:
 * - Natural language to epic conversion
 * - Story decomposition with acceptance criteria
 * - Task estimation and sizing
 * - Dependency detection
 * - Agent assignment recommendations
 */

import { getDb } from "../db";
import { kanbanCards, cardDependencies, agents, projects, type InsertKanbanCard, type InsertCardDependency } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface Epic {
  title: string;
  description: string;
  stories: Story[];
  estimatedEffort: "small" | "medium" | "large" | "xlarge";
}

export interface Story {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  tasks: Task[];
  storyPoints: number;
  priority: "low" | "medium" | "high" | "critical";
}

export interface Task {
  title: string;
  description: string;
  estimatedHours: number;
  agentType: "pm" | "dev" | "qa" | "devops" | "research";
  dependencies: string[]; // Task titles this depends on
  skills: string[];
}

export interface EpicBreakdownResult {
  epic: Epic;
  totalStoryPoints: number;
  totalEstimatedHours: number;
  criticalPath: string[];
  parallelizableTasks: string[][];
}

// ════════════════════════════════════════════════════════════════════════════
// EPIC BREAKDOWN
// ════════════════════════════════════════════════════════════════════════════

/**
 * Breaks down a natural language epic description into stories and tasks
 */
export async function breakdownEpic(
  epicDescription: string,
  projectContext?: string
): Promise<EpicBreakdownResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert PM Agent that breaks down epics into actionable stories and tasks.

For each epic, you should:
1. Create a clear epic title and description
2. Break it into 3-7 user stories with acceptance criteria
3. Break each story into 2-5 tasks
4. Estimate effort (story points for stories, hours for tasks)
5. Identify dependencies between tasks
6. Recommend which agent type should handle each task

Agent types:
- pm: Planning, specs, requirements, coordination
- dev: Implementation, coding, debugging
- qa: Testing, validation, quality assurance
- devops: Deployment, infrastructure, CI/CD
- research: Investigation, analysis, documentation

Respond with JSON matching this schema:
{
  "epic": {
    "title": "Epic title",
    "description": "Epic description",
    "estimatedEffort": "medium",
    "stories": [
      {
        "title": "Story title",
        "description": "As a user, I want...",
        "acceptanceCriteria": ["Criteria 1", "Criteria 2"],
        "storyPoints": 5,
        "priority": "high",
        "tasks": [
          {
            "title": "Task title",
            "description": "Task description",
            "estimatedHours": 4,
            "agentType": "dev",
            "dependencies": [],
            "skills": ["typescript", "react"]
          }
        ]
      }
    ]
  }
}`,
        },
        {
          role: "user",
          content: `Break down this epic:

${epicDescription}

${projectContext ? `Project context:\n${projectContext}` : ""}

Provide a detailed breakdown with stories, tasks, and dependencies.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "epic_breakdown",
          strict: true,
          schema: {
            type: "object",
            properties: {
              epic: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  estimatedEffort: { 
                    type: "string",
                    enum: ["small", "medium", "large", "xlarge"]
                  },
                  stories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        acceptanceCriteria: {
                          type: "array",
                          items: { type: "string" }
                        },
                        storyPoints: { type: "number" },
                        priority: {
                          type: "string",
                          enum: ["low", "medium", "high", "critical"]
                        },
                        tasks: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              description: { type: "string" },
                              estimatedHours: { type: "number" },
                              agentType: {
                                type: "string",
                                enum: ["pm", "dev", "qa", "devops", "research"]
                              },
                              dependencies: {
                                type: "array",
                                items: { type: "string" }
                              },
                              skills: {
                                type: "array",
                                items: { type: "string" }
                              }
                            },
                            required: ["title", "description", "estimatedHours", "agentType", "dependencies", "skills"],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ["title", "description", "acceptanceCriteria", "storyPoints", "priority", "tasks"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["title", "description", "estimatedEffort", "stories"],
                additionalProperties: false
              }
            },
            required: ["epic"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No response from LLM");
    }

    const parsed = JSON.parse(content) as { epic: Epic };
    const epic = parsed.epic;

    // Calculate totals
    let totalStoryPoints = 0;
    let totalEstimatedHours = 0;
    const allTasks: Task[] = [];

    for (const story of epic.stories) {
      totalStoryPoints += story.storyPoints;
      for (const task of story.tasks) {
        totalEstimatedHours += task.estimatedHours;
        allTasks.push(task);
      }
    }

    // Calculate critical path and parallelizable tasks
    const { criticalPath, parallelizableTasks } = analyzeTaskGraph(allTasks);

    return {
      epic,
      totalStoryPoints,
      totalEstimatedHours,
      criticalPath,
      parallelizableTasks,
    };
  } catch (error) {
    console.error("Epic breakdown failed:", error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TASK GRAPH ANALYSIS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Analyzes task dependencies to find critical path and parallelizable groups
 */
export function analyzeTaskGraph(tasks: Task[]): {
  criticalPath: string[];
  parallelizableTasks: string[][];
  incomplete?: boolean;
  droppedTasks?: string[];
  circularDependencyWarning?: string;
} {
  // Build adjacency list
  const taskMap = new Map<string, Task>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const task of tasks) {
    taskMap.set(task.title, task);
    inDegree.set(task.title, 0);
    adjList.set(task.title, []);
  }

  // Build edges
  for (const task of tasks) {
    for (const dep of task.dependencies) {
      if (taskMap.has(dep)) {
        adjList.get(dep)!.push(task.title);
        inDegree.set(task.title, (inDegree.get(task.title) || 0) + 1);
      }
    }
  }

  // Find parallelizable tasks (tasks with no dependencies at each level)
  const parallelizableTasks: string[][] = [];
  const remaining = new Set(tasks.map(t => t.title));
  const completed = new Set<string>();

  while (remaining.size > 0) {
    const level: string[] = [];
    
    for (const taskTitle of Array.from(remaining)) {
      const task = taskMap.get(taskTitle)!;
      const allDepsCompleted = task.dependencies.every(d => completed.has(d) || !taskMap.has(d));
      
      if (allDepsCompleted) {
        level.push(taskTitle);
      }
    }

    if (level.length === 0) {
      // Circular dependency detected - remaining tasks have unresolvable dependencies
      const droppedTasks = Array.from(remaining);
      const criticalPath = findCriticalPath(tasks.filter(t => !remaining.has(t.title)), taskMap);
      
      console.warn(`[analyzeTaskGraph] Circular dependency detected. Dropped tasks: ${droppedTasks.join(', ')}`);
      
      return {
        criticalPath,
        parallelizableTasks,
        incomplete: true,
        droppedTasks,
        circularDependencyWarning: `Circular dependency detected. The following ${droppedTasks.length} task(s) were dropped due to unresolvable dependencies: ${droppedTasks.join(', ')}. Please review and fix the dependency graph.`,
      };
    }

    parallelizableTasks.push(level);
    
    for (const taskTitle of level) {
      remaining.delete(taskTitle);
      completed.add(taskTitle);
    }
  }

  // Find critical path (longest path by estimated hours)
  const criticalPath = findCriticalPath(tasks, taskMap);

  return { criticalPath, parallelizableTasks };
}

/**
 * Finds the critical path (longest path by estimated hours)
 */
function findCriticalPath(tasks: Task[], taskMap: Map<string, Task>): string[] {
  const memo = new Map<string, { path: string[]; hours: number }>();

  function dfs(taskTitle: string): { path: string[]; hours: number } {
    if (memo.has(taskTitle)) {
      return memo.get(taskTitle)!;
    }

    const task = taskMap.get(taskTitle);
    if (!task) {
      return { path: [], hours: 0 };
    }

    let maxPath: string[] = [];
    let maxHours = 0;

    // Find the longest path among dependencies
    for (const dep of task.dependencies) {
      if (taskMap.has(dep)) {
        const result = dfs(dep);
        if (result.hours > maxHours) {
          maxHours = result.hours;
          maxPath = result.path;
        }
      }
    }

    const result = {
      path: [...maxPath, taskTitle],
      hours: maxHours + task.estimatedHours,
    };

    memo.set(taskTitle, result);
    return result;
  }

  // Find the longest path ending at any task
  let criticalPath: string[] = [];
  let maxHours = 0;

  for (const task of tasks) {
    const result = dfs(task.title);
    if (result.hours > maxHours) {
      maxHours = result.hours;
      criticalPath = result.path;
    }
  }

  return criticalPath;
}

// ════════════════════════════════════════════════════════════════════════════
// KANBAN CARD CREATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Creates Kanban cards from an epic breakdown
 */
export async function createCardsFromEpic(
  boardId: number,
  columnId: number,
  breakdown: EpicBreakdownResult,
  userId: number
): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cardIds: number[] = [];
  const taskToCardId = new Map<string, number>();

  // Create cards for each task in each story
  for (const story of breakdown.epic.stories) {
    for (const task of story.tasks) {
      const cardData: InsertKanbanCard = {
        boardId,
        columnId,
        title: task.title,
        description: `${task.description}\n\n**Story:** ${story.title}\n**Epic:** ${breakdown.epic.title}`,
        priority: story.priority,
        storyPoints: Math.ceil(task.estimatedHours / 4), // Convert hours to story points
        labels: [task.agentType, ...task.skills.slice(0, 2)],
      };

      const [result] = await db.insert(kanbanCards).values(cardData);
      cardIds.push(result.insertId);
      taskToCardId.set(task.title, result.insertId);
    }
  }

  // Create dependencies
  for (const story of breakdown.epic.stories) {
    for (const task of story.tasks) {
      const cardId = taskToCardId.get(task.title);
      if (!cardId) continue;

      for (const depTitle of task.dependencies) {
        const depCardId = taskToCardId.get(depTitle);
        if (depCardId) {
          const depData: InsertCardDependency = {
            cardId,
            blockedByCardId: depCardId,
            dependencyType: "blocks",
          };
          await db.insert(cardDependencies).values(depData);
        }
      }
    }
  }

  return cardIds;
}

// ════════════════════════════════════════════════════════════════════════════
// INTELLIGENT TASK ASSIGNMENT
// ════════════════════════════════════════════════════════════════════════════

export interface AgentCapability {
  agentId: number;
  agentType: string;
  skills: string[];
  currentLoad: number; // Number of active tasks
  successRate: number; // 0-100
}

/**
 * Assigns tasks to agents based on capabilities and workload
 */
export async function assignTasksToAgents(
  cardIds: number[],
  projectId: number
): Promise<Map<number, number>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the project to find its userId
  const projectResult = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  
  if (projectResult.length === 0) {
    console.warn(`[assignTasksToAgents] Project ${projectId} not found`);
    return new Map();
  }
  
  const project = projectResult[0];
  
  // Get available agents for the project's user
  const projectAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, project.userId));

  if (projectAgents.length === 0) {
    return new Map();
  }

  // Get cards to assign
  const cards = await db
    .select()
    .from(kanbanCards)
    .where(inArray(kanbanCards.id, cardIds));

  const assignments = new Map<number, number>();

  for (const card of cards) {
    // Extract agent type from labels
    const labels = card.labels as string[] || [];
    const preferredType = labels.find(l => 
      ["pm", "dev", "qa", "devops", "research"].includes(l)
    );

    // Find best matching agent
    let bestAgent = projectAgents[0];
    let bestScore = 0;

    for (const agent of projectAgents) {
      let score = 0;
      
      // Type match
      if (agent.type === preferredType) {
        score += 50;
      }

      // Prefer agents with lower load (would need to track this)
      score += 10;

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    if (bestAgent) {
      assignments.set(card.id, bestAgent.id);
      
      // Update card with assignment
      await db
        .update(kanbanCards)
        .set({ assignedAgent: bestAgent.type as "pm" | "qa" | "devops" | "research" | "developer" })
        .where(eq(kanbanCards.id, card.id));
    }
  }

  return assignments;
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCKER DETECTION
// ════════════════════════════════════════════════════════════════════════════

export interface Blocker {
  cardId: number;
  cardTitle: string;
  blockerType: "dependency" | "stale" | "overdue" | "resource";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestedAction: string;
}

/**
 * Detects blockers in the project
 */
export async function detectBlockers(boardId: number): Promise<Blocker[]> {
  const db = await getDb();
  if (!db) return [];

  const blockers: Blocker[] = [];

  // Get all cards for the board
  const cards = await db
    .select()
    .from(kanbanCards)
    .where(eq(kanbanCards.boardId, boardId));

  // Get all dependencies
  const deps = await db.select().from(cardDependencies);
  const depMap = new Map<number, number[]>();
  
  for (const dep of deps) {
    if (!depMap.has(dep.cardId)) {
      depMap.set(dep.cardId, []);
    }
    depMap.get(dep.cardId)!.push(dep.blockedByCardId);
  }

  const cardMap = new Map(cards.map(c => [c.id, c]));
  const now = new Date();

  for (const card of cards) {
    // Check for blocked by incomplete dependencies
    const dependencies = depMap.get(card.id) || [];
    for (const depId of dependencies) {
      const depCard = cardMap.get(depId);
      if (depCard && depCard.columnId !== 999) {
        blockers.push({
          cardId: card.id,
          cardTitle: card.title,
          blockerType: "dependency",
          description: `Blocked by incomplete task: "${depCard.title}"`,
          severity: card.priority === "critical" ? "critical" : "medium",
          suggestedAction: `Complete "${depCard.title}" first, or remove the dependency if no longer needed.`,
        });
      }
    }

    // Check for stale cards (no updates in 7 days while in progress)
    if (card.columnId > 1) {
      const daysSinceUpdate = Math.floor(
        (now.getTime() - new Date(card.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceUpdate > 7) {
        blockers.push({
          cardId: card.id,
          cardTitle: card.title,
          blockerType: "stale",
          description: `No updates for ${daysSinceUpdate} days while in progress`,
          severity: daysSinceUpdate > 14 ? "high" : "medium",
          suggestedAction: "Check if the task is actually blocked or needs to be reassigned.",
        });
      }
    }

    // Check for overdue cards (past due date)
    if (card.dueDate && new Date(card.dueDate) < now && card.columnId !== 999) {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(card.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      blockers.push({
        cardId: card.id,
        cardTitle: card.title,
        blockerType: "overdue",
        description: `Overdue by ${daysOverdue} days`,
        severity: daysOverdue > 7 ? "critical" : "high",
        suggestedAction: "Reprioritize or extend the deadline with stakeholder approval.",
      });
    }

    // Check for unassigned high-priority cards
    if (!card.assignedAgent && (card.priority === "high" || card.priority === "critical")) {
      blockers.push({
        cardId: card.id,
        cardTitle: card.title,
        blockerType: "resource",
        description: "High-priority task has no assigned agent",
        severity: card.priority === "critical" ? "critical" : "high",
        suggestedAction: "Assign an appropriate agent to this task.",
      });
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  blockers.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return blockers;
}

// ════════════════════════════════════════════════════════════════════════════
// ESCALATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Escalates critical blockers to the project owner
 */
export async function escalateBlockers(
  projectId: number,
  blockers: Blocker[]
): Promise<void> {
  const criticalBlockers = blockers.filter(b => b.severity === "critical");
  
  if (criticalBlockers.length === 0) {
    return;
  }

  // In a real implementation, this would send notifications
  console.debug(`[PM Agent] Escalating ${criticalBlockers.length} critical blockers for project ${projectId}`);
  
  for (const blocker of criticalBlockers) {
    console.debug(`  - ${blocker.cardTitle}: ${blocker.description}`);
  }
}
