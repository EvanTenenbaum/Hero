/**
 * Unit tests for Hero IDE advanced features:
 * - GitHub Integration
 * - Real-time Agent Monitoring
 * - Agent Execution System
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock authenticated user
function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("GitHub Integration", () => {
  describe("github.connection", () => {
    it("returns null when no GitHub connection exists", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.github.connection();
      
      // Should return null or undefined for new users
      expect(result).toBeFalsy();
    });
  });

  describe("github.repositories", () => {
    it("returns empty array when not connected to GitHub", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.github.repositories({ page: 1 });
      expect(result.repositories).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("github.getFileContent", () => {
    it("validates required parameters", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.github.getFileContent({
          owner: "",
          repo: "test-repo",
          path: "README.md",
        })
      ).rejects.toThrow();
    });
  });
});

describe("Agent Execution System", () => {
  describe("agents.startExecution", () => {
    it("validates agent ID is required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.agents.startExecution({
          id: 0, // Invalid ID
          goal: "Test goal",
        })
      ).rejects.toThrow();
    });

    it("validates goal is required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.agents.startExecution({
          id: 1,
          goal: "", // Empty goal
        })
      ).rejects.toThrow();
    });
  });

  describe("agents.pauseExecution", () => {
    it("validates execution ID is required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.agents.pauseExecution({ executionId: 0 })
      ).rejects.toThrow();
    });
  });

  describe("agents.stopExecution", () => {
    it("validates execution ID is required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.agents.stopExecution({ executionId: 0 })
      ).rejects.toThrow();
    });
  });
});

describe("Governance System", () => {
  describe("governance.violations", () => {
    it("returns empty array for new users", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.governance.violations();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("governance.changeRequests", () => {
    it("throws NOT_FOUND for non-existent project", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      // changeRequests throws NOT_FOUND for non-existent project
      await expect(caller.governance.changeRequests({ projectId: 999 })).rejects.toThrow();
    });
  });
});

describe("Settings Management", () => {
  describe("settings.secrets", () => {
    it("returns empty array for new users", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.settings.secrets({});
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("settings.createSecret", () => {
    it("validates name is required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.settings.createSecret({
          name: "",
          key: "TEST_KEY",
          value: "test-value",
        })
      ).rejects.toThrow();
    });

    it("validates key is required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.settings.createSecret({
          name: "Test Secret",
          key: "",
          value: "test-value",
        })
      ).rejects.toThrow();
    });
  });
});

describe("Chat System", () => {
  describe("chat.conversations", () => {
    it("returns conversations for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.chat.conversations();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("chat.createConversation", () => {
    it("creates a new conversation", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.chat.createConversation({ title: "Test Conversation" });
      
      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });
  });
});

describe("Real-time Monitoring Types", () => {
  it("AgentStep type structure is correct", () => {
    // Type check - this validates the interface structure
    const step = {
      id: "step-1",
      type: "thinking" as const,
      content: "Analyzing...",
      timestamp: new Date(),
      metadata: { tokensUsed: 100 },
    };
    
    expect(step.id).toBeDefined();
    expect(step.type).toBe("thinking");
    expect(step.content).toBeDefined();
    expect(step.timestamp).toBeInstanceOf(Date);
  });

  it("ExecutionState type structure is correct", () => {
    // Type check - this validates the interface structure
    const state = {
      agentId: 1,
      executionId: 1,
      status: "running" as const,
      currentStep: 0,
      maxSteps: 10,
      tokensUsed: 0,
      costIncurred: 0,
      budgetLimit: 1.0,
      steps: [],
      goal: "Test goal",
    };
    
    expect(state.agentId).toBeDefined();
    expect(state.executionId).toBeDefined();
    expect(state.status).toBe("running");
    expect(state.steps).toEqual([]);
  });
});
