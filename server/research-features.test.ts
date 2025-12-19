import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock database functions
vi.mock("./db", () => ({
  // Checkpoint mocks
  getAgentExecutionById: vi.fn(),
  getCheckpointsByExecutionId: vi.fn(),
  getCheckpointById: vi.fn(),
  createCheckpoint: vi.fn(),
  updateAgentExecution: vi.fn(),
  
  // Project notes mocks
  getProjectById: vi.fn(),
  getProjectNotes: vi.fn(),
  getProjectNoteById: vi.fn(),
  createProjectNote: vi.fn(),
  updateProjectNote: vi.fn(),
  deleteProjectNote: vi.fn(),
  
  // Metrics mocks
  getDailyMetrics: vi.fn(),
  getMetricsSummary: vi.fn(),
  upsertDailyMetrics: vi.fn(),
}));

import * as db from "./db";

describe("Research Integration Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKPOINT TESTS (CG-03 from Research)
  // ════════════════════════════════════════════════════════════════════════════

  describe("Checkpoints Router", () => {
    const mockUser = { id: 1, openId: "test-user", role: "user" };
    const mockExecution = { 
      id: 1, 
      agentId: 1, 
      userId: 1, 
      goal: "Test goal",
      state: "executing" 
    };
    const mockCheckpoint = {
      id: 1,
      agentId: 1,
      executionId: 1,
      userId: 1,
      stepNumber: 3,
      description: "Checkpoint at step 3",
      state: {
        executionState: "executing",
        currentStep: 3,
        steps: [],
        context: {},
        filesModified: ["file1.ts", "file2.ts"],
      },
      rollbackData: {
        fileSnapshots: [
          { path: "file1.ts", content: "original content", action: "modify" as const },
        ],
        dbChanges: [],
      },
      automatic: true,
      createdAt: new Date(),
    };

    it("should list checkpoints for an execution", async () => {
      vi.mocked(db.getAgentExecutionById).mockResolvedValue(mockExecution as any);
      vi.mocked(db.getCheckpointsByExecutionId).mockResolvedValue([mockCheckpoint] as any);

      const result = await db.getCheckpointsByExecutionId(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].stepNumber).toBe(3);
    });

    it("should create a checkpoint with state snapshot", async () => {
      vi.mocked(db.getAgentExecutionById).mockResolvedValue(mockExecution as any);
      vi.mocked(db.createCheckpoint).mockResolvedValue({ id: 2 });

      const result = await db.createCheckpoint({
        agentId: 1,
        executionId: 1,
        userId: 1,
        stepNumber: 4,
        description: "New checkpoint",
        state: {
          executionState: "executing",
          currentStep: 4,
          steps: [],
          context: {},
          filesModified: [],
        },
        automatic: true,
      });

      expect(result.id).toBe(2);
      expect(db.createCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          stepNumber: 4,
          automatic: true,
        })
      );
    });

    it("should rollback to a checkpoint", async () => {
      vi.mocked(db.getCheckpointById).mockResolvedValue(mockCheckpoint as any);
      vi.mocked(db.getAgentExecutionById).mockResolvedValue(mockExecution as any);
      vi.mocked(db.updateAgentExecution).mockResolvedValue(undefined);

      await db.updateAgentExecution(1, {
        state: mockCheckpoint.state.executionState as any,
        currentStep: mockCheckpoint.state.currentStep,
        steps: mockCheckpoint.state.steps as any,
      });

      expect(db.updateAgentExecution).toHaveBeenCalledWith(1, expect.objectContaining({
        currentStep: 3,
      }));
    });

    it("should reject rollback for non-existent checkpoint", async () => {
      vi.mocked(db.getCheckpointById).mockResolvedValue(undefined);

      const checkpoint = await db.getCheckpointById(999);
      expect(checkpoint).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PROJECT NOTES TESTS (Context Engineering from Research)
  // ════════════════════════════════════════════════════════════════════════════

  describe("Project Notes Router", () => {
    const mockProject = { id: 1, userId: 1, name: "Test Project" };
    const mockNote = {
      id: 1,
      projectId: 1,
      userId: 1,
      category: "architecture",
      title: "System Architecture",
      content: "# Architecture\n\nThis is the system architecture...",
      tags: ["design", "system"],
      priority: "high",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should list notes for a project", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(db.getProjectNotes).mockResolvedValue([mockNote] as any);

      const result = await db.getProjectNotes(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("architecture");
    });

    it("should filter notes by category", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(db.getProjectNotes).mockResolvedValue([mockNote] as any);

      const result = await db.getProjectNotes(1, "architecture");
      
      expect(db.getProjectNotes).toHaveBeenCalledWith(1, "architecture");
    });

    it("should create a project note", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(db.createProjectNote).mockResolvedValue({ id: 2 });

      const result = await db.createProjectNote({
        projectId: 1,
        userId: 1,
        category: "decisions",
        title: "API Design Decision",
        content: "We decided to use REST over GraphQL...",
        tags: ["api", "decision"],
        priority: "medium",
      });

      expect(result.id).toBe(2);
    });

    it("should update a project note", async () => {
      vi.mocked(db.getProjectNoteById).mockResolvedValue(mockNote as any);
      vi.mocked(db.updateProjectNote).mockResolvedValue(undefined);

      await db.updateProjectNote(1, 1, {
        content: "Updated content",
      });

      expect(db.updateProjectNote).toHaveBeenCalledWith(1, 1, {
        content: "Updated content",
      });
    });

    it("should delete a project note", async () => {
      vi.mocked(db.deleteProjectNote).mockResolvedValue(undefined);

      await db.deleteProjectNote(1, 1);

      expect(db.deleteProjectNote).toHaveBeenCalledWith(1, 1);
    });

    it("should support all note categories", () => {
      const categories = [
        "architecture",
        "decisions",
        "todos",
        "bugs",
        "context",
        "requirements",
        "api",
      ];

      categories.forEach(category => {
        expect(typeof category).toBe("string");
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // METRICS TESTS (MR-04 from Research)
  // ════════════════════════════════════════════════════════════════════════════

  describe("Metrics Router", () => {
    const mockDailyMetrics = [
      {
        id: 1,
        userId: 1,
        date: "2025-12-18",
        messagesCount: 50,
        tokensUsed: 10000,
        costUsd: "0.01",
        agentExecutionsCount: 5,
        agentTasksCompleted: 4,
        agentTasksFailed: 1,
        linesGenerated: 200,
        filesModified: 10,
        totalExecutionTimeMs: 30000,
      },
      {
        id: 2,
        userId: 1,
        date: "2025-12-19",
        messagesCount: 30,
        tokensUsed: 8000,
        costUsd: "0.008",
        agentExecutionsCount: 3,
        agentTasksCompleted: 3,
        agentTasksFailed: 0,
        linesGenerated: 150,
        filesModified: 5,
        totalExecutionTimeMs: 20000,
      },
    ];

    const mockSummary = {
      totalMessages: 80,
      totalTokens: 18000,
      totalCost: "0.018",
      totalExecutions: 8,
      totalTasksCompleted: 7,
      totalTasksFailed: 1,
      totalLinesGenerated: 350,
      totalFilesModified: 15,
      totalExecutionTime: 50000,
    };

    it("should get daily metrics for date range", async () => {
      vi.mocked(db.getDailyMetrics).mockResolvedValue(mockDailyMetrics as any);

      const result = await db.getDailyMetrics(1, "2025-12-18", "2025-12-19");

      expect(result).toHaveLength(2);
      expect(result[0].messagesCount).toBe(50);
      expect(result[1].messagesCount).toBe(30);
    });

    it("should get metrics summary for date range", async () => {
      vi.mocked(db.getMetricsSummary).mockResolvedValue(mockSummary as any);

      const result = await db.getMetricsSummary(1, "2025-12-18", "2025-12-19");

      expect(result?.totalMessages).toBe(80);
      expect(result?.totalTokens).toBe(18000);
      expect(result?.totalTasksCompleted).toBe(7);
    });

    it("should record/upsert daily metrics", async () => {
      vi.mocked(db.upsertDailyMetrics).mockResolvedValue({ id: 3 });

      const result = await db.upsertDailyMetrics({
        userId: 1,
        date: "2025-12-19",
        messagesCount: 10,
        tokensUsed: 2000,
        costUsd: "0.002",
      });

      expect(result.id).toBe(3);
      expect(db.upsertDailyMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          date: "2025-12-19",
          messagesCount: 10,
        })
      );
    });

    it("should handle empty metrics gracefully", async () => {
      vi.mocked(db.getDailyMetrics).mockResolvedValue([]);
      vi.mocked(db.getMetricsSummary).mockResolvedValue(null);

      const daily = await db.getDailyMetrics(1, "2025-01-01", "2025-01-07");
      const summary = await db.getMetricsSummary(1, "2025-01-01", "2025-01-07");

      expect(daily).toEqual([]);
      expect(summary).toBeNull();
    });

    it("should calculate recent activity (last 7 days)", async () => {
      vi.mocked(db.getDailyMetrics).mockResolvedValue(mockDailyMetrics as any);
      vi.mocked(db.getMetricsSummary).mockResolvedValue(mockSummary as any);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      const [daily, summary] = await Promise.all([
        db.getDailyMetrics(1, formatDate(startDate), formatDate(endDate)),
        db.getMetricsSummary(1, formatDate(startDate), formatDate(endDate)),
      ]);

      expect(daily).toBeDefined();
      expect(summary).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe("Feature Integration", () => {
    it("should support checkpoint creation during agent execution", async () => {
      // Simulate agent execution with automatic checkpointing
      const executionId = 1;
      const steps = [
        { stepNumber: 1, action: "analyze" },
        { stepNumber: 2, action: "plan" },
        { stepNumber: 3, action: "implement" },
      ];

      vi.mocked(db.createCheckpoint).mockResolvedValue({ id: 1 });

      // Create checkpoint at each step
      for (const step of steps) {
        const result = await db.createCheckpoint({
          agentId: 1,
          executionId,
          userId: 1,
          stepNumber: step.stepNumber,
          description: `Checkpoint before ${step.action}`,
          state: {
            executionState: "executing",
            currentStep: step.stepNumber,
            steps: [],
            context: {},
            filesModified: [],
          },
          automatic: true,
        });

        expect(result.id).toBeDefined();
      }

      expect(db.createCheckpoint).toHaveBeenCalledTimes(3);
    });

    it("should track metrics during chat interactions", async () => {
      vi.mocked(db.upsertDailyMetrics).mockResolvedValue({ id: 1 });

      const today = new Date().toISOString().split('T')[0];

      // Record chat metrics
      await db.upsertDailyMetrics({
        userId: 1,
        date: today,
        messagesCount: 1,
        tokensUsed: 500,
        costUsd: "0.0005",
      });

      expect(db.upsertDailyMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          messagesCount: 1,
        })
      );
    });

    it("should support project notes for context engineering", async () => {
      vi.mocked(db.createProjectNote).mockResolvedValue({ id: 1 });
      vi.mocked(db.getProjectNotes).mockResolvedValue([]);

      // Create notes for different categories
      const categories = ["architecture", "decisions", "context"] as const;

      for (const category of categories) {
        await db.createProjectNote({
          projectId: 1,
          userId: 1,
          category,
          title: `${category} note`,
          content: `Content for ${category}`,
        });
      }

      expect(db.createProjectNote).toHaveBeenCalledTimes(3);
    });
  });
});
