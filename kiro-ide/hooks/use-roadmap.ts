/**
 * KIRO IDE - Roadmap Hook
 * 
 * State management for the roadmap system with:
 * - Task CRUD operations
 * - Sprint management
 * - Smart ordering
 * - Drag-and-drop support
 * - Natural language commands
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  RoadmapState,
  Task,
  Sprint,
  TaskStatus,
  TaskPriority,
  TaskType,
  SprintSuggestion,
  createInitialRoadmapState,
  createTask,
  updateTask,
  addDependency,
  removeDependency,
  calculateSmartOrder,
  suggestSprint,
  moveTask,
  generateSprintId,
  DEFAULT_ORDERING_FACTORS,
  OrderingFactors,
} from "@/lib/roadmap";

const ROADMAP_KEY = "hero_roadmap_state";

export function useRoadmap(projectId: string) {
  const [state, setState] = useState<RoadmapState>(createInitialRoadmapState);
  const [loading, setLoading] = useState(true);

  // Load state
  useEffect(() => {
    loadState();
  }, [projectId]);

  const loadState = useCallback(async () => {
    try {
      const key = `${ROADMAP_KEY}_${projectId}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        // Restore dates
        parsed.tasks = parsed.tasks.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }));
        parsed.sprints = parsed.sprints.map((s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
        }));
        // Restore Maps
        parsed.dependencyGraph = new Map(parsed.dependencyGraph || []);
        parsed.parallelGroups = new Map(parsed.parallelGroups || []);
        setState(parsed);
      }
    } catch (error) {
      console.error("Failed to load roadmap state:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const saveState = useCallback(
    async (newState: RoadmapState) => {
      try {
        const key = `${ROADMAP_KEY}_${projectId}`;
        // Convert Maps to arrays for JSON
        const toSave = {
          ...newState,
          dependencyGraph: Array.from(newState.dependencyGraph.entries()),
          parallelGroups: Array.from(newState.parallelGroups.entries()),
        };
        await AsyncStorage.setItem(key, JSON.stringify(toSave));
      } catch (error) {
        console.error("Failed to save roadmap state:", error);
      }
    },
    [projectId]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TASK OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const addTask = useCallback(
    async (data: Partial<Task>, createdBy: Task["createdBy"] = "user") => {
      const task = createTask(projectId, data, createdBy);
      const newState = {
        ...state,
        tasks: [...state.tasks, task],
        backlogOrder: [...state.backlogOrder, task.id],
      };
      setState(newState);
      await saveState(newState);
      return task;
    },
    [state, projectId, saveState]
  );

  const editTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return null;

      const updated = updateTask(task, updates);
      const newState = {
        ...state,
        tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
      };
      setState(newState);
      await saveState(newState);
      return updated;
    },
    [state, saveState]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const newState = {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== taskId),
        backlogOrder: state.backlogOrder.filter((id) => id !== taskId),
        sprints: state.sprints.map((s) => ({
          ...s,
          taskIds: s.taskIds.filter((id) => id !== taskId),
        })),
      };
      setState(newState);
      await saveState(newState);
    },
    [state, saveState]
  );

  const setTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      return editTask(taskId, { status });
    },
    [editTask]
  );

  const setTaskPriority = useCallback(
    async (taskId: string, priority: TaskPriority) => {
      return editTask(taskId, { priority });
    },
    [editTask]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DEPENDENCY OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const addTaskDependency = useCallback(
    async (taskId: string, dependsOnId: string) => {
      try {
        const newState = addDependency(state, taskId, dependsOnId);
        setState(newState);
        await saveState(newState);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    [state, saveState]
  );

  const removeTaskDependency = useCallback(
    async (taskId: string, dependsOnId: string) => {
      const newState = removeDependency(state, taskId, dependsOnId);
      setState(newState);
      await saveState(newState);
    },
    [state, saveState]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SPRINT OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const createSprint = useCallback(
    async (data: Partial<Sprint>) => {
      const sprint: Sprint = {
        id: generateSprintId(),
        projectId,
        name: data.name || `Sprint ${state.sprints.length + 1}`,
        goal: data.goal || "",
        startDate: data.startDate || new Date(),
        endDate: data.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: "planning",
        taskIds: data.taskIds || [],
        totalPoints: 0,
        completedPoints: 0,
        suggestedByAI: data.suggestedByAI || false,
        suggestionReasoning: data.suggestionReasoning,
      };

      const newState = {
        ...state,
        sprints: [...state.sprints, sprint],
      };
      setState(newState);
      await saveState(newState);
      return sprint;
    },
    [state, projectId, saveState]
  );

  const updateSprint = useCallback(
    async (sprintId: string, updates: Partial<Sprint>) => {
      const newState = {
        ...state,
        sprints: state.sprints.map((s) =>
          s.id === sprintId ? { ...s, ...updates } : s
        ),
      };
      setState(newState);
      await saveState(newState);
    },
    [state, saveState]
  );

  const deleteSprint = useCallback(
    async (sprintId: string) => {
      // Move tasks back to backlog
      const sprint = state.sprints.find((s) => s.id === sprintId);
      const tasksToMove = sprint?.taskIds || [];

      const newState = {
        ...state,
        sprints: state.sprints.filter((s) => s.id !== sprintId),
        tasks: state.tasks.map((t) =>
          tasksToMove.includes(t.id) ? { ...t, sprintId: undefined } : t
        ),
        backlogOrder: [...state.backlogOrder, ...tasksToMove],
      };
      setState(newState);
      await saveState(newState);
    },
    [state, saveState]
  );

  const addTaskToSprint = useCallback(
    async (taskId: string, sprintId: string) => {
      const sprint = state.sprints.find((s) => s.id === sprintId);
      if (!sprint || sprint.taskIds.includes(taskId)) return;

      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const newState = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, sprintId } : t
        ),
        sprints: state.sprints.map((s) =>
          s.id === sprintId
            ? {
                ...s,
                taskIds: [...s.taskIds, taskId],
                totalPoints: s.totalPoints + (task.storyPoints || 0),
              }
            : s
        ),
        backlogOrder: state.backlogOrder.filter((id) => id !== taskId),
      };
      setState(newState);
      await saveState(newState);
    },
    [state, saveState]
  );

  const removeTaskFromSprint = useCallback(
    async (taskId: string, sprintId: string) => {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const newState = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, sprintId: undefined } : t
        ),
        sprints: state.sprints.map((s) =>
          s.id === sprintId
            ? {
                ...s,
                taskIds: s.taskIds.filter((id) => id !== taskId),
                totalPoints: s.totalPoints - (task.storyPoints || 0),
              }
            : s
        ),
        backlogOrder: [...state.backlogOrder, taskId],
      };
      setState(newState);
      await saveState(newState);
    },
    [state, saveState]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SMART FEATURES
  // ══════════════════════════════════════════════════════════════════════════

  const getSmartOrder = useCallback(
    (factors?: OrderingFactors) => {
      return calculateSmartOrder(state.tasks, factors || DEFAULT_ORDERING_FACTORS);
    },
    [state.tasks]
  );

  const getSuggestedSprint = useCallback(
    (options?: Parameters<typeof suggestSprint>[1]): SprintSuggestion => {
      return suggestSprint(state, options);
    },
    [state]
  );

  const applySprintSuggestion = useCallback(
    async (suggestion: SprintSuggestion) => {
      const sprint = await createSprint({
        name: suggestion.name,
        goal: suggestion.goal,
        taskIds: suggestion.taskIds,
        suggestedByAI: true,
        suggestionReasoning: suggestion.reasoning,
      });

      // Update tasks with sprint assignment
      const newState = {
        ...state,
        tasks: state.tasks.map((t) =>
          suggestion.taskIds.includes(t.id) ? { ...t, sprintId: sprint.id } : t
        ),
        backlogOrder: state.backlogOrder.filter(
          (id) => !suggestion.taskIds.includes(id)
        ),
        sprints: state.sprints.map((s) =>
          s.id === sprint.id
            ? { ...s, totalPoints: suggestion.totalPoints }
            : s
        ),
      };
      setState(newState);
      await saveState(newState);

      return sprint;
    },
    [state, createSprint, saveState]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DRAG AND DROP
  // ══════════════════════════════════════════════════════════════════════════

  const handleDragDrop = useCallback(
    async (
      taskId: string,
      newIndex: number,
      targetList: "backlog" | "sprint",
      targetSprintId?: string
    ) => {
      const result = moveTask(state, taskId, newIndex, targetList, targetSprintId);
      if (result.success) {
        setState(result.updatedState);
        await saveState(result.updatedState);
      }
      return result;
    },
    [state, saveState]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // NATURAL LANGUAGE COMMANDS
  // ══════════════════════════════════════════════════════════════════════════

  const parseNaturalLanguageCommand = useCallback(
    (command: string): {
      action: string;
      params: Record<string, any>;
      confidence: number;
    } | null => {
      const lower = command.toLowerCase();

      // Add task patterns
      if (lower.includes("add task") || lower.includes("create task")) {
        const titleMatch = command.match(/["']([^"']+)["']/);
        return {
          action: "add_task",
          params: { title: titleMatch?.[1] || "New Task" },
          confidence: titleMatch ? 0.9 : 0.6,
        };
      }

      // Priority patterns
      if (lower.includes("set priority") || lower.includes("mark as")) {
        const priorities: TaskPriority[] = ["critical", "high", "medium", "low"];
        const priority = priorities.find((p) => lower.includes(p));
        const taskMatch = command.match(/task\s+["']([^"']+)["']/i);
        if (priority) {
          return {
            action: "set_priority",
            params: { priority, taskTitle: taskMatch?.[1] },
            confidence: taskMatch ? 0.85 : 0.7,
          };
        }
      }

      // Status patterns
      if (lower.includes("move to") || lower.includes("mark")) {
        const statuses: Record<string, TaskStatus> = {
          "in progress": "in_progress",
          "in review": "in_review",
          done: "done",
          blocked: "blocked",
          backlog: "backlog",
          todo: "todo",
        };
        for (const [phrase, status] of Object.entries(statuses)) {
          if (lower.includes(phrase)) {
            return {
              action: "set_status",
              params: { status },
              confidence: 0.8,
            };
          }
        }
      }

      // Sprint patterns
      if (lower.includes("suggest sprint") || lower.includes("create sprint")) {
        return {
          action: "suggest_sprint",
          params: {},
          confidence: 0.9,
        };
      }

      // Reorder patterns
      if (lower.includes("reorder") || lower.includes("smart order")) {
        return {
          action: "smart_reorder",
          params: {},
          confidence: 0.85,
        };
      }

      return null;
    },
    []
  );

  const executeNaturalLanguageCommand = useCallback(
    async (command: string) => {
      const parsed = parseNaturalLanguageCommand(command);
      if (!parsed) {
        return { success: false, error: "Could not understand command" };
      }

      switch (parsed.action) {
        case "add_task":
          const task = await addTask({ title: parsed.params.title });
          return { success: true, result: task, message: `Created task: ${task.title}` };

        case "set_priority":
          // Find task by title
          const taskForPriority = state.tasks.find((t) =>
            t.title.toLowerCase().includes(parsed.params.taskTitle?.toLowerCase() || "")
          );
          if (taskForPriority) {
            await setTaskPriority(taskForPriority.id, parsed.params.priority);
            return {
              success: true,
              message: `Set ${taskForPriority.title} priority to ${parsed.params.priority}`,
            };
          }
          return { success: false, error: "Task not found" };

        case "suggest_sprint":
          const suggestion = getSuggestedSprint();
          return {
            success: true,
            result: suggestion,
            message: `Suggested sprint with ${suggestion.taskIds.length} tasks`,
          };

        case "smart_reorder":
          const ordered = getSmartOrder();
          return {
            success: true,
            result: ordered,
            message: `Reordered ${ordered.length} tasks by priority and dependencies`,
          };

        default:
          return { success: false, error: "Unknown action" };
      }
    },
    [state.tasks, addTask, setTaskPriority, getSuggestedSprint, getSmartOrder, parseNaturalLanguageCommand]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ══════════════════════════════════════════════════════════════════════════

  const backlogTasks = useMemo(() => {
    return state.backlogOrder
      .map((id) => state.tasks.find((t) => t.id === id))
      .filter((t): t is Task => t !== undefined);
  }, [state.tasks, state.backlogOrder]);

  const activeSprint = useMemo(() => {
    return state.sprints.find((s) => s.status === "active");
  }, [state.sprints]);

  const sprintTasks = useMemo(() => {
    if (!activeSprint) return [];
    return activeSprint.taskIds
      .map((id) => state.tasks.find((t) => t.id === id))
      .filter((t): t is Task => t !== undefined);
  }, [state.tasks, activeSprint]);

  const blockedTasks = useMemo(() => {
    return state.tasks.filter((t) => t.status === "blocked");
  }, [state.tasks]);

  const criticalPathTasks = useMemo(() => {
    return state.criticalPath
      .map((id) => state.tasks.find((t) => t.id === id))
      .filter((t): t is Task => t !== undefined);
  }, [state.tasks, state.criticalPath]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      blocked: [],
      done: [],
      cancelled: [],
    };
    for (const task of state.tasks) {
      grouped[task.status].push(task);
    }
    return grouped;
  }, [state.tasks]);

  const stats = useMemo(() => {
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => t.status === "done").length;
    const inProgress = state.tasks.filter((t) => t.status === "in_progress").length;
    const blocked = state.tasks.filter((t) => t.status === "blocked").length;
    const totalPoints = state.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = state.tasks
      .filter((t) => t.status === "done")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    return {
      total,
      done,
      inProgress,
      blocked,
      completion: total > 0 ? Math.round((done / total) * 100) : 0,
      totalPoints,
      completedPoints,
      velocity: completedPoints,
    };
  }, [state.tasks]);

  return {
    // State
    state,
    loading,

    // Task operations
    addTask,
    editTask,
    deleteTask,
    setTaskStatus,
    setTaskPriority,

    // Dependency operations
    addTaskDependency,
    removeTaskDependency,

    // Sprint operations
    createSprint,
    updateSprint,
    deleteSprint,
    addTaskToSprint,
    removeTaskFromSprint,

    // Smart features
    getSmartOrder,
    getSuggestedSprint,
    applySprintSuggestion,

    // Drag and drop
    handleDragDrop,

    // Natural language
    parseNaturalLanguageCommand,
    executeNaturalLanguageCommand,

    // Computed
    backlogTasks,
    activeSprint,
    sprintTasks,
    blockedTasks,
    criticalPathTasks,
    tasksByStatus,
    stats,

    // Raw data
    tasks: state.tasks,
    sprints: state.sprints,
    criticalPath: state.criticalPath,
    parallelGroups: state.parallelGroups,
  };
}
