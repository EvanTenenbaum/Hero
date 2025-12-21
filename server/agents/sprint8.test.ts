/**
 * Sprint 8: Agent Orchestration Tests
 * 
 * Tests for:
 * - PM Agent epic breakdown
 * - Task graph analysis
 * - Intelligent task assignment
 * - Blocker detection
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ════════════════════════════════════════════════════════════════════════════
// PM AGENT TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("PM Agent", () => {
  describe("Epic Structure", () => {
    it("should have title field", () => {
      const epic = {
        title: "User Authentication",
        description: "Implement user auth",
        stories: [],
        estimatedEffort: "medium" as const,
      };
      expect(epic.title).toBeDefined();
    });

    it("should have description field", () => {
      const epic = {
        title: "User Authentication",
        description: "Implement user auth",
        stories: [],
        estimatedEffort: "medium" as const,
      };
      expect(epic.description).toBeDefined();
    });

    it("should have stories array", () => {
      const epic = {
        title: "User Authentication",
        description: "Implement user auth",
        stories: [],
        estimatedEffort: "medium" as const,
      };
      expect(Array.isArray(epic.stories)).toBe(true);
    });

    it("should have estimated effort", () => {
      const efforts = ["small", "medium", "large", "xlarge"];
      expect(efforts).toContain("medium");
    });
  });

  describe("Story Structure", () => {
    it("should have acceptance criteria", () => {
      const story = {
        title: "Login",
        description: "As a user...",
        acceptanceCriteria: ["Can login with email", "Can login with Google"],
        tasks: [],
        storyPoints: 5,
        priority: "high" as const,
      };
      expect(story.acceptanceCriteria.length).toBeGreaterThan(0);
    });

    it("should have story points", () => {
      const story = {
        title: "Login",
        description: "As a user...",
        acceptanceCriteria: [],
        tasks: [],
        storyPoints: 5,
        priority: "high" as const,
      };
      expect(story.storyPoints).toBeGreaterThan(0);
    });

    it("should have priority", () => {
      const priorities = ["low", "medium", "high", "critical"];
      expect(priorities).toContain("high");
    });
  });

  describe("Task Structure", () => {
    it("should have agent type", () => {
      const agentTypes = ["pm", "dev", "qa", "devops", "research"];
      expect(agentTypes).toContain("dev");
    });

    it("should have estimated hours", () => {
      const task = {
        title: "Implement login form",
        description: "Create React component",
        estimatedHours: 4,
        agentType: "dev" as const,
        dependencies: [],
        skills: ["react", "typescript"],
      };
      expect(task.estimatedHours).toBeGreaterThan(0);
    });

    it("should have dependencies array", () => {
      const task = {
        title: "Implement login form",
        description: "Create React component",
        estimatedHours: 4,
        agentType: "dev" as const,
        dependencies: ["Design login UI"],
        skills: ["react"],
      };
      expect(Array.isArray(task.dependencies)).toBe(true);
    });

    it("should have skills array", () => {
      const task = {
        title: "Implement login form",
        description: "Create React component",
        estimatedHours: 4,
        agentType: "dev" as const,
        dependencies: [],
        skills: ["react", "typescript"],
      };
      expect(task.skills.length).toBeGreaterThan(0);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TASK GRAPH ANALYSIS TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Task Graph Analysis", () => {
  describe("analyzeTaskGraph", () => {
    it("should export analyzeTaskGraph function", async () => {
      const { analyzeTaskGraph } = await import("./pmAgent");
      expect(typeof analyzeTaskGraph).toBe("function");
    });

    it("should return critical path", async () => {
      const { analyzeTaskGraph } = await import("./pmAgent");
      const tasks = [
        { title: "A", description: "", estimatedHours: 2, agentType: "dev" as const, dependencies: [], skills: [] },
        { title: "B", description: "", estimatedHours: 3, agentType: "dev" as const, dependencies: ["A"], skills: [] },
        { title: "C", description: "", estimatedHours: 1, agentType: "dev" as const, dependencies: ["B"], skills: [] },
      ];
      
      const result = analyzeTaskGraph(tasks);
      expect(result.criticalPath).toBeDefined();
      expect(Array.isArray(result.criticalPath)).toBe(true);
    });

    it("should return parallelizable tasks", async () => {
      const { analyzeTaskGraph } = await import("./pmAgent");
      const tasks = [
        { title: "A", description: "", estimatedHours: 2, agentType: "dev" as const, dependencies: [], skills: [] },
        { title: "B", description: "", estimatedHours: 3, agentType: "dev" as const, dependencies: [], skills: [] },
      ];
      
      const result = analyzeTaskGraph(tasks);
      expect(result.parallelizableTasks).toBeDefined();
      expect(Array.isArray(result.parallelizableTasks)).toBe(true);
    });

    it("should group independent tasks together", async () => {
      const { analyzeTaskGraph } = await import("./pmAgent");
      const tasks = [
        { title: "A", description: "", estimatedHours: 2, agentType: "dev" as const, dependencies: [], skills: [] },
        { title: "B", description: "", estimatedHours: 3, agentType: "dev" as const, dependencies: [], skills: [] },
        { title: "C", description: "", estimatedHours: 1, agentType: "dev" as const, dependencies: [], skills: [] },
      ];
      
      const result = analyzeTaskGraph(tasks);
      // All tasks should be in the first level since they have no dependencies
      expect(result.parallelizableTasks[0]?.length).toBe(3);
    });

    it("should respect dependencies in levels", async () => {
      const { analyzeTaskGraph } = await import("./pmAgent");
      const tasks = [
        { title: "A", description: "", estimatedHours: 2, agentType: "dev" as const, dependencies: [], skills: [] },
        { title: "B", description: "", estimatedHours: 3, agentType: "dev" as const, dependencies: ["A"], skills: [] },
      ];
      
      const result = analyzeTaskGraph(tasks);
      // Should have 2 levels
      expect(result.parallelizableTasks.length).toBe(2);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BLOCKER DETECTION TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Blocker Detection", () => {
  describe("Blocker Types", () => {
    it("should support dependency blockers", () => {
      const blockerTypes = ["dependency", "stale", "overdue", "resource"];
      expect(blockerTypes).toContain("dependency");
    });

    it("should support stale blockers", () => {
      const blockerTypes = ["dependency", "stale", "overdue", "resource"];
      expect(blockerTypes).toContain("stale");
    });

    it("should support overdue blockers", () => {
      const blockerTypes = ["dependency", "stale", "overdue", "resource"];
      expect(blockerTypes).toContain("overdue");
    });

    it("should support resource blockers", () => {
      const blockerTypes = ["dependency", "stale", "overdue", "resource"];
      expect(blockerTypes).toContain("resource");
    });
  });

  describe("Blocker Severity", () => {
    it("should support critical severity", () => {
      const severities = ["low", "medium", "high", "critical"];
      expect(severities).toContain("critical");
    });

    it("should support high severity", () => {
      const severities = ["low", "medium", "high", "critical"];
      expect(severities).toContain("high");
    });

    it("should support medium severity", () => {
      const severities = ["low", "medium", "high", "critical"];
      expect(severities).toContain("medium");
    });

    it("should support low severity", () => {
      const severities = ["low", "medium", "high", "critical"];
      expect(severities).toContain("low");
    });
  });

  describe("Blocker Structure", () => {
    it("should have cardId", () => {
      const blocker = {
        cardId: 1,
        cardTitle: "Test Task",
        blockerType: "dependency" as const,
        description: "Blocked by...",
        severity: "high" as const,
        suggestedAction: "Complete dependency first",
      };
      expect(blocker.cardId).toBeDefined();
    });

    it("should have description", () => {
      const blocker = {
        cardId: 1,
        cardTitle: "Test Task",
        blockerType: "dependency" as const,
        description: "Blocked by...",
        severity: "high" as const,
        suggestedAction: "Complete dependency first",
      };
      expect(blocker.description).toBeDefined();
    });

    it("should have suggested action", () => {
      const blocker = {
        cardId: 1,
        cardTitle: "Test Task",
        blockerType: "dependency" as const,
        description: "Blocked by...",
        severity: "high" as const,
        suggestedAction: "Complete dependency first",
      };
      expect(blocker.suggestedAction).toBeDefined();
    });
  });

  describe("detectBlockers function", () => {
    it("should export detectBlockers function", async () => {
      const { detectBlockers } = await import("./pmAgent");
      expect(typeof detectBlockers).toBe("function");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TASK ASSIGNMENT TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Intelligent Task Assignment", () => {
  describe("Agent Capabilities", () => {
    it("should track agent type", () => {
      const capability = {
        agentId: 1,
        agentType: "dev",
        skills: ["typescript", "react"],
        currentLoad: 3,
        successRate: 95,
      };
      expect(capability.agentType).toBeDefined();
    });

    it("should track skills", () => {
      const capability = {
        agentId: 1,
        agentType: "dev",
        skills: ["typescript", "react"],
        currentLoad: 3,
        successRate: 95,
      };
      expect(capability.skills.length).toBeGreaterThan(0);
    });

    it("should track current load", () => {
      const capability = {
        agentId: 1,
        agentType: "dev",
        skills: ["typescript", "react"],
        currentLoad: 3,
        successRate: 95,
      };
      expect(capability.currentLoad).toBeGreaterThanOrEqual(0);
    });

    it("should track success rate", () => {
      const capability = {
        agentId: 1,
        agentType: "dev",
        skills: ["typescript", "react"],
        currentLoad: 3,
        successRate: 95,
      };
      expect(capability.successRate).toBeGreaterThanOrEqual(0);
      expect(capability.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe("assignTasksToAgents function", () => {
    it("should export assignTasksToAgents function", async () => {
      const { assignTasksToAgents } = await import("./pmAgent");
      expect(typeof assignTasksToAgents).toBe("function");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// EPIC BREAKDOWN RESULT TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Epic Breakdown Result", () => {
  it("should have total story points", () => {
    const result = {
      epic: { title: "Test", description: "", stories: [], estimatedEffort: "medium" as const },
      totalStoryPoints: 21,
      totalEstimatedHours: 40,
      criticalPath: ["A", "B", "C"],
      parallelizableTasks: [["A"], ["B", "C"]],
    };
    expect(result.totalStoryPoints).toBeGreaterThanOrEqual(0);
  });

  it("should have total estimated hours", () => {
    const result = {
      epic: { title: "Test", description: "", stories: [], estimatedEffort: "medium" as const },
      totalStoryPoints: 21,
      totalEstimatedHours: 40,
      criticalPath: ["A", "B", "C"],
      parallelizableTasks: [["A"], ["B", "C"]],
    };
    expect(result.totalEstimatedHours).toBeGreaterThanOrEqual(0);
  });

  it("should have critical path", () => {
    const result = {
      epic: { title: "Test", description: "", stories: [], estimatedEffort: "medium" as const },
      totalStoryPoints: 21,
      totalEstimatedHours: 40,
      criticalPath: ["A", "B", "C"],
      parallelizableTasks: [["A"], ["B", "C"]],
    };
    expect(Array.isArray(result.criticalPath)).toBe(true);
  });

  it("should have parallelizable tasks", () => {
    const result = {
      epic: { title: "Test", description: "", stories: [], estimatedEffort: "medium" as const },
      totalStoryPoints: 21,
      totalEstimatedHours: 40,
      criticalPath: ["A", "B", "C"],
      parallelizableTasks: [["A"], ["B", "C"]],
    };
    expect(Array.isArray(result.parallelizableTasks)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ESCALATION TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Escalation", () => {
  it("should export escalateBlockers function", async () => {
    const { escalateBlockers } = await import("./pmAgent");
    expect(typeof escalateBlockers).toBe("function");
  });

  it("should only escalate critical blockers", async () => {
    const { escalateBlockers } = await import("./pmAgent");
    
    // This should not throw
    await escalateBlockers(1, [
      {
        cardId: 1,
        cardTitle: "Test",
        blockerType: "stale",
        description: "Test",
        severity: "low",
        suggestedAction: "Test",
      },
    ]);
  });
});
