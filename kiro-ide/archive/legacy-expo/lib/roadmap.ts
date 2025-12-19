/**
 * KIRO IDE - Roadmap System
 * 
 * Smart task management with:
 * - Drag-and-drop reordering
 * - Dependency tracking
 * - Blocker detection
 * - Parallel execution identification
 * - Smart sprint suggestions based on severity and context
 * - Natural language editing via AI PM
 */

// ════════════════════════════════════════════════════════════════════════════
// TASK TYPES
// ════════════════════════════════════════════════════════════════════════════

export type TaskStatus = 
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "blocked"
  | "done"
  | "cancelled";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskType = 
  | "feature"
  | "bug"
  | "refactor"
  | "documentation"
  | "test"
  | "chore"
  | "spike";

export interface Task {
  id: string;
  projectId: string;
  
  // Core info
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  
  // Estimation
  estimatedHours?: number;
  actualHours?: number;
  storyPoints?: number;
  complexity: "trivial" | "simple" | "moderate" | "complex" | "epic";
  
  // Dependencies
  dependsOn: string[]; // Task IDs this task depends on
  blockedBy: string[]; // Task IDs blocking this task
  blocks: string[]; // Task IDs this task blocks
  
  // Parallelization
  canRunParallel: boolean;
  parallelGroup?: string; // Group ID for tasks that can run together
  
  // Assignment
  assignedTo?: "user" | "agent";
  agentId?: string;
  
  // Sprint
  sprintId?: string;
  sprintOrder: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: "user" | "agent" | "system";
  
  // Context
  relatedFiles: string[];
  contextNotes: string;
  acceptanceCriteria: string[];
  
  // AI analysis
  severityScore: number; // 0-100, based on project context
  urgencyScore: number; // 0-100, based on dependencies and blockers
  impactScore: number; // 0-100, based on what it enables
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: Date;
  endDate: Date;
  status: "planning" | "active" | "completed" | "cancelled";
  taskIds: string[];
  
  // Capacity
  totalPoints: number;
  completedPoints: number;
  
  // Smart suggestions
  suggestedByAI: boolean;
  suggestionReasoning?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// ROADMAP STATE
// ════════════════════════════════════════════════════════════════════════════

export interface RoadmapState {
  tasks: Task[];
  sprints: Sprint[];
  
  // Ordering
  backlogOrder: string[];
  
  // Analysis cache
  dependencyGraph: Map<string, string[]>;
  parallelGroups: Map<string, string[]>;
  criticalPath: string[];
}

export function createInitialRoadmapState(): RoadmapState {
  return {
    tasks: [],
    sprints: [],
    backlogOrder: [],
    dependencyGraph: new Map(),
    parallelGroups: new Map(),
    criticalPath: [],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// TASK OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

export function createTask(
  projectId: string,
  data: Partial<Task>,
  createdBy: Task["createdBy"] = "user"
): Task {
  return {
    id: generateTaskId(),
    projectId,
    title: data.title || "New Task",
    description: data.description || "",
    type: data.type || "feature",
    status: data.status || "backlog",
    priority: data.priority || "medium",
    complexity: data.complexity || "moderate",
    dependsOn: data.dependsOn || [],
    blockedBy: data.blockedBy || [],
    blocks: data.blocks || [],
    canRunParallel: data.canRunParallel ?? true,
    parallelGroup: data.parallelGroup,
    sprintOrder: data.sprintOrder ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy,
    relatedFiles: data.relatedFiles || [],
    contextNotes: data.contextNotes || "",
    acceptanceCriteria: data.acceptanceCriteria || [],
    severityScore: data.severityScore ?? 50,
    urgencyScore: data.urgencyScore ?? 50,
    impactScore: data.impactScore ?? 50,
    ...data,
  };
}

export function updateTask(task: Task, updates: Partial<Task>): Task {
  return {
    ...task,
    ...updates,
    updatedAt: new Date(),
  };
}

export function addDependency(
  state: RoadmapState,
  taskId: string,
  dependsOnId: string
): RoadmapState {
  const task = state.tasks.find((t) => t.id === taskId);
  const dependsOn = state.tasks.find((t) => t.id === dependsOnId);
  
  if (!task || !dependsOn) return state;
  
  // Check for circular dependency
  if (wouldCreateCycle(state, taskId, dependsOnId)) {
    throw new Error("Cannot add dependency: would create circular dependency");
  }
  
  const updatedTasks = state.tasks.map((t) => {
    if (t.id === taskId) {
      return {
        ...t,
        dependsOn: [...t.dependsOn, dependsOnId],
        updatedAt: new Date(),
      };
    }
    if (t.id === dependsOnId) {
      return {
        ...t,
        blocks: [...t.blocks, taskId],
        updatedAt: new Date(),
      };
    }
    return t;
  });
  
  return rebuildAnalysis({
    ...state,
    tasks: updatedTasks,
  });
}

export function removeDependency(
  state: RoadmapState,
  taskId: string,
  dependsOnId: string
): RoadmapState {
  const updatedTasks = state.tasks.map((t) => {
    if (t.id === taskId) {
      return {
        ...t,
        dependsOn: t.dependsOn.filter((id) => id !== dependsOnId),
        updatedAt: new Date(),
      };
    }
    if (t.id === dependsOnId) {
      return {
        ...t,
        blocks: t.blocks.filter((id) => id !== taskId),
        updatedAt: new Date(),
      };
    }
    return t;
  });
  
  return rebuildAnalysis({
    ...state,
    tasks: updatedTasks,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// DEPENDENCY ANALYSIS
// ════════════════════════════════════════════════════════════════════════════

function wouldCreateCycle(
  state: RoadmapState,
  taskId: string,
  newDependencyId: string
): boolean {
  // DFS to check if newDependencyId can reach taskId
  const visited = new Set<string>();
  const stack = [newDependencyId];
  
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    
    const task = state.tasks.find((t) => t.id === current);
    if (task) {
      stack.push(...task.dependsOn);
    }
  }
  
  return false;
}

function rebuildAnalysis(state: RoadmapState): RoadmapState {
  // Rebuild dependency graph
  const dependencyGraph = new Map<string, string[]>();
  for (const task of state.tasks) {
    dependencyGraph.set(task.id, task.dependsOn);
  }
  
  // Identify parallel groups
  const parallelGroups = identifyParallelGroups(state.tasks);
  
  // Calculate critical path
  const criticalPath = calculateCriticalPath(state.tasks);
  
  return {
    ...state,
    dependencyGraph,
    parallelGroups,
    criticalPath,
  };
}

function identifyParallelGroups(tasks: Task[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  
  // Group tasks that have the same dependencies and can run in parallel
  const tasksByDeps = new Map<string, Task[]>();
  
  for (const task of tasks) {
    if (!task.canRunParallel) continue;
    if (task.status === "done" || task.status === "cancelled") continue;
    
    const depsKey = [...task.dependsOn].sort().join(",");
    const existing = tasksByDeps.get(depsKey) || [];
    tasksByDeps.set(depsKey, [...existing, task]);
  }
  
  // Create groups for tasks with same dependencies
  let groupIndex = 0;
  for (const [_, groupTasks] of tasksByDeps) {
    if (groupTasks.length > 1) {
      const groupId = `parallel_${groupIndex++}`;
      groups.set(groupId, groupTasks.map((t) => t.id));
    }
  }
  
  return groups;
}

function calculateCriticalPath(tasks: Task[]): string[] {
  // Topological sort with longest path calculation
  const inDegree = new Map<string, number>();
  const longestPath = new Map<string, number>();
  const predecessor = new Map<string, string | null>();
  
  // Initialize
  for (const task of tasks) {
    inDegree.set(task.id, task.dependsOn.length);
    longestPath.set(task.id, task.estimatedHours || task.storyPoints || 1);
    predecessor.set(task.id, null);
  }
  
  // Find tasks with no dependencies
  const queue: string[] = [];
  for (const task of tasks) {
    if (task.dependsOn.length === 0) {
      queue.push(task.id);
    }
  }
  
  // Process in topological order
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = tasks.find((t) => t.id === currentId)!;
    const currentPath = longestPath.get(currentId)!;
    
    // Update tasks that depend on this one
    for (const task of tasks) {
      if (task.dependsOn.includes(currentId)) {
        const newPath = currentPath + (task.estimatedHours || task.storyPoints || 1);
        if (newPath > (longestPath.get(task.id) || 0)) {
          longestPath.set(task.id, newPath);
          predecessor.set(task.id, currentId);
        }
        
        const newInDegree = (inDegree.get(task.id) || 0) - 1;
        inDegree.set(task.id, newInDegree);
        
        if (newInDegree === 0) {
          queue.push(task.id);
        }
      }
    }
  }
  
  // Find the end of the critical path
  let maxPath = 0;
  let endTask: string | null = null;
  for (const [taskId, path] of longestPath) {
    if (path > maxPath) {
      maxPath = path;
      endTask = taskId;
    }
  }
  
  // Reconstruct the path
  const criticalPath: string[] = [];
  let current = endTask;
  while (current) {
    criticalPath.unshift(current);
    current = predecessor.get(current) || null;
  }
  
  return criticalPath;
}

// ════════════════════════════════════════════════════════════════════════════
// SMART ORDERING
// ════════════════════════════════════════════════════════════════════════════

export interface OrderingFactors {
  dependencyWeight: number;
  priorityWeight: number;
  severityWeight: number;
  urgencyWeight: number;
  impactWeight: number;
  complexityWeight: number;
}

export const DEFAULT_ORDERING_FACTORS: OrderingFactors = {
  dependencyWeight: 0.25,
  priorityWeight: 0.20,
  severityWeight: 0.20,
  urgencyWeight: 0.15,
  impactWeight: 0.15,
  complexityWeight: 0.05,
};

export function calculateSmartOrder(
  tasks: Task[],
  factors: OrderingFactors = DEFAULT_ORDERING_FACTORS
): Task[] {
  // Filter to actionable tasks
  const actionable = tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  );
  
  // Score each task
  const scored = actionable.map((task) => ({
    task,
    score: calculateTaskScore(task, tasks, factors),
  }));
  
  // Sort by score (higher = should be done first)
  scored.sort((a, b) => b.score - a.score);
  
  // Adjust for dependencies (tasks that unblock others come first)
  const ordered = topologicalSortWithScores(scored);
  
  return ordered.map((s) => s.task);
}

function calculateTaskScore(
  task: Task,
  allTasks: Task[],
  factors: OrderingFactors
): number {
  let score = 0;
  
  // Priority score
  const priorityScores: Record<TaskPriority, number> = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
  };
  score += priorityScores[task.priority] * factors.priorityWeight;
  
  // Severity score
  score += task.severityScore * factors.severityWeight;
  
  // Urgency score
  score += task.urgencyScore * factors.urgencyWeight;
  
  // Impact score (tasks that unblock many others)
  const unblockCount = task.blocks.length;
  const impactBonus = Math.min(unblockCount * 20, 100);
  score += (task.impactScore + impactBonus) * factors.impactWeight;
  
  // Dependency score (tasks with fewer blockers are more actionable)
  const blockerCount = task.blockedBy.filter((id) => {
    const blocker = allTasks.find((t) => t.id === id);
    return blocker && blocker.status !== "done";
  }).length;
  const dependencyScore = blockerCount === 0 ? 100 : Math.max(0, 100 - blockerCount * 25);
  score += dependencyScore * factors.dependencyWeight;
  
  // Complexity score (simpler tasks can be quick wins)
  const complexityScores: Record<Task["complexity"], number> = {
    trivial: 100,
    simple: 80,
    moderate: 60,
    complex: 40,
    epic: 20,
  };
  score += complexityScores[task.complexity] * factors.complexityWeight;
  
  return score;
}

function topologicalSortWithScores(
  scored: { task: Task; score: number }[]
): { task: Task; score: number }[] {
  const result: { task: Task; score: number }[] = [];
  const remaining = [...scored];
  const completed = new Set<string>();
  
  while (remaining.length > 0) {
    // Find tasks with all dependencies satisfied
    const ready = remaining.filter((s) =>
      s.task.dependsOn.every((depId) => completed.has(depId))
    );
    
    if (ready.length === 0) {
      // Circular dependency or all remaining have unsatisfied deps
      // Add remaining by score
      remaining.sort((a, b) => b.score - a.score);
      result.push(...remaining);
      break;
    }
    
    // Sort ready tasks by score and take the best one
    ready.sort((a, b) => b.score - a.score);
    const best = ready[0];
    
    result.push(best);
    completed.add(best.task.id);
    
    const bestIndex = remaining.findIndex((s) => s.task.id === best.task.id);
    remaining.splice(bestIndex, 1);
  }
  
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// SMART SPRINT SUGGESTIONS
// ════════════════════════════════════════════════════════════════════════════

export interface SprintSuggestion {
  name: string;
  goal: string;
  taskIds: string[];
  totalPoints: number;
  estimatedHours: number;
  reasoning: string;
  parallelOpportunities: string[][];
  criticalTasks: string[];
}

export function suggestSprint(
  state: RoadmapState,
  options: {
    maxPoints?: number;
    maxTasks?: number;
    focusArea?: TaskType;
    includeCriticalPath?: boolean;
  } = {}
): SprintSuggestion {
  const {
    maxPoints = 20,
    maxTasks = 10,
    focusArea,
    includeCriticalPath = true,
  } = options;
  
  // Get smart ordered tasks
  const ordered = calculateSmartOrder(state.tasks);
  
  // Filter by focus area if specified
  const filtered = focusArea
    ? ordered.filter((t) => t.type === focusArea)
    : ordered;
  
  // Select tasks for sprint
  const selected: Task[] = [];
  let totalPoints = 0;
  let totalHours = 0;
  
  for (const task of filtered) {
    if (selected.length >= maxTasks) break;
    if (totalPoints + (task.storyPoints || 0) > maxPoints) continue;
    
    // Check if dependencies are satisfied
    const depsInSprint = task.dependsOn.every(
      (depId) =>
        selected.some((s) => s.id === depId) ||
        state.tasks.find((t) => t.id === depId)?.status === "done"
    );
    
    if (depsInSprint) {
      selected.push(task);
      totalPoints += task.storyPoints || 0;
      totalHours += task.estimatedHours || 0;
    }
  }
  
  // Include critical path tasks if requested
  if (includeCriticalPath) {
    for (const taskId of state.criticalPath) {
      if (selected.some((s) => s.id === taskId)) continue;
      if (selected.length >= maxTasks) break;
      
      const task = state.tasks.find((t) => t.id === taskId);
      if (task && totalPoints + (task.storyPoints || 0) <= maxPoints) {
        selected.push(task);
        totalPoints += task.storyPoints || 0;
        totalHours += task.estimatedHours || 0;
      }
    }
  }
  
  // Identify parallel opportunities within selected tasks
  const parallelOpportunities: string[][] = [];
  for (const [groupId, taskIds] of state.parallelGroups) {
    const inSprint = taskIds.filter((id) => selected.some((s) => s.id === id));
    if (inSprint.length > 1) {
      parallelOpportunities.push(inSprint);
    }
  }
  
  // Identify critical tasks
  const criticalTasks = selected
    .filter((t) => state.criticalPath.includes(t.id))
    .map((t) => t.id);
  
  // Generate reasoning
  const reasoning = generateSprintReasoning(selected, parallelOpportunities, criticalTasks);
  
  return {
    name: `Sprint ${new Date().toISOString().slice(0, 10)}`,
    goal: generateSprintGoal(selected),
    taskIds: selected.map((t) => t.id),
    totalPoints,
    estimatedHours: totalHours,
    reasoning,
    parallelOpportunities,
    criticalTasks,
  };
}

function generateSprintGoal(tasks: Task[]): string {
  const types = new Map<TaskType, number>();
  for (const task of tasks) {
    types.set(task.type, (types.get(task.type) || 0) + 1);
  }
  
  const sorted = [...types.entries()].sort((a, b) => b[1] - a[1]);
  const primary = sorted[0];
  
  if (primary[0] === "bug") {
    return `Fix ${primary[1]} bugs and improve stability`;
  } else if (primary[0] === "feature") {
    return `Deliver ${primary[1]} new features`;
  } else if (primary[0] === "refactor") {
    return `Improve code quality with ${primary[1]} refactoring tasks`;
  }
  
  return `Complete ${tasks.length} tasks`;
}

function generateSprintReasoning(
  tasks: Task[],
  parallelOps: string[][],
  criticalTasks: string[]
): string {
  const parts: string[] = [];
  
  parts.push(`Selected ${tasks.length} tasks based on priority, dependencies, and impact.`);
  
  if (criticalTasks.length > 0) {
    parts.push(`${criticalTasks.length} tasks are on the critical path.`);
  }
  
  if (parallelOps.length > 0) {
    const totalParallel = parallelOps.reduce((sum, g) => sum + g.length, 0);
    parts.push(`${totalParallel} tasks can be executed in parallel across ${parallelOps.length} groups.`);
  }
  
  const blockers = tasks.filter((t) => t.blocks.length > 0);
  if (blockers.length > 0) {
    parts.push(`Completing ${blockers.length} tasks will unblock dependent work.`);
  }
  
  return parts.join(" ");
}

// ════════════════════════════════════════════════════════════════════════════
// DRAG AND DROP SUPPORT
// ════════════════════════════════════════════════════════════════════════════

export interface DragDropResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  updatedState: RoadmapState;
}

export function moveTask(
  state: RoadmapState,
  taskId: string,
  newIndex: number,
  targetList: "backlog" | "sprint",
  targetSprintId?: string
): DragDropResult {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) {
    return { success: false, error: "Task not found", updatedState: state };
  }
  
  const warnings: string[] = [];
  
  // Check for dependency violations
  if (targetList === "sprint" && targetSprintId) {
    const sprint = state.sprints.find((s) => s.id === targetSprintId);
    if (sprint) {
      // Check if dependencies are in the sprint or done
      const unmetDeps = task.dependsOn.filter((depId) => {
        const dep = state.tasks.find((t) => t.id === depId);
        return dep && dep.status !== "done" && !sprint.taskIds.includes(depId);
      });
      
      if (unmetDeps.length > 0) {
        warnings.push(`Task has ${unmetDeps.length} unmet dependencies not in this sprint`);
      }
    }
  }
  
  // Update task
  const updatedTask = {
    ...task,
    sprintId: targetList === "sprint" ? targetSprintId : undefined,
    sprintOrder: newIndex,
    updatedAt: new Date(),
  };
  
  // Update state
  let updatedState = {
    ...state,
    tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
  };
  
  // Update sprint if needed
  if (targetList === "sprint" && targetSprintId) {
    updatedState = {
      ...updatedState,
      sprints: state.sprints.map((s) => {
        if (s.id === targetSprintId && !s.taskIds.includes(taskId)) {
          const newTaskIds = [...s.taskIds];
          newTaskIds.splice(newIndex, 0, taskId);
          return { ...s, taskIds: newTaskIds };
        }
        return s;
      }),
    };
  }
  
  // Update backlog order
  if (targetList === "backlog") {
    const newBacklogOrder = state.backlogOrder.filter((id) => id !== taskId);
    newBacklogOrder.splice(newIndex, 0, taskId);
    updatedState = {
      ...updatedState,
      backlogOrder: newBacklogOrder,
    };
  }
  
  return {
    success: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    updatedState,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateSprintId(): string {
  return `sprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
