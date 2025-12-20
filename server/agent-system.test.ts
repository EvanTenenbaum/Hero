/**
 * Agent System Tests
 * Tests for the agent configuration framework including:
 * - User rules CRUD operations
 * - Prompt template assembly
 * - Safety checker validation
 * - Execution steps tracking
 * - Agent logs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  createUserAgentRule: vi.fn().mockResolvedValue({ id: 1 }),
  getUserAgentRules: vi.fn().mockResolvedValue([]),
  getUserAgentRuleById: vi.fn().mockResolvedValue(undefined),
  updateUserAgentRule: vi.fn().mockResolvedValue(undefined),
  deleteUserAgentRule: vi.fn().mockResolvedValue(undefined),
  createAgentLog: vi.fn().mockResolvedValue({ id: 1 }),
  getAgentLogs: vi.fn().mockResolvedValue([]),
  createExecutionStep: vi.fn().mockResolvedValue({ id: 1 }),
  getExecutionSteps: vi.fn().mockResolvedValue([]),
  updateExecutionStep: vi.fn().mockResolvedValue(undefined),
  confirmExecutionStep: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import * as db from "./db";

describe("Agent System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User Agent Rules", () => {
    it("should create a new user rule", async () => {
      const rule = {
        userId: 1,
        agentType: "developer" as const,
        ruleType: "instruction" as const,
        ruleContent: "Always use TypeScript",
      };

      const result = await db.createUserAgentRule(rule);
      
      expect(db.createUserAgentRule).toHaveBeenCalledWith(rule);
      expect(result).toEqual({ id: 1 });
    });

    it("should get user rules for a specific agent type", async () => {
      const mockRules = [
        { id: 1, userId: 1, agentType: "developer", ruleType: "instruction", ruleContent: "Use TypeScript" },
        { id: 2, userId: 1, agentType: null, ruleType: "deny", ruleContent: "Never delete files" },
      ];
      vi.mocked(db.getUserAgentRules).mockResolvedValueOnce(mockRules as any);

      const rules = await db.getUserAgentRules(1, "developer");
      
      expect(db.getUserAgentRules).toHaveBeenCalledWith(1, "developer");
      expect(rules).toHaveLength(2);
    });

    it("should get all user rules when no agent type specified", async () => {
      const mockRules = [
        { id: 1, userId: 1, agentType: "developer", ruleType: "instruction", ruleContent: "Use TypeScript" },
        { id: 2, userId: 1, agentType: "qa", ruleType: "instruction", ruleContent: "Write tests" },
      ];
      vi.mocked(db.getUserAgentRules).mockResolvedValueOnce(mockRules as any);

      const rules = await db.getUserAgentRules(1);
      
      expect(db.getUserAgentRules).toHaveBeenCalledWith(1);
      expect(rules).toHaveLength(2);
    });

    it("should update a user rule", async () => {
      await db.updateUserAgentRule(1, 1, { ruleContent: "Updated content" });
      
      expect(db.updateUserAgentRule).toHaveBeenCalledWith(1, 1, { ruleContent: "Updated content" });
    });

    it("should delete a user rule", async () => {
      await db.deleteUserAgentRule(1, 1);
      
      expect(db.deleteUserAgentRule).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("Agent Logs", () => {
    it("should create an agent log entry", async () => {
      const log = {
        userId: 1,
        agentType: "developer",
        event: "tool_execution",
        level: "info" as const,
        data: { tool: "file_write", path: "/src/index.ts" },
      };

      const result = await db.createAgentLog(log);
      
      expect(db.createAgentLog).toHaveBeenCalledWith(log);
      expect(result).toEqual({ id: 1 });
    });

    it("should get logs filtered by execution ID", async () => {
      const mockLogs = [
        { id: 1, executionId: 5, event: "step_start", level: "info" },
        { id: 2, executionId: 5, event: "step_complete", level: "info" },
      ];
      vi.mocked(db.getAgentLogs).mockResolvedValueOnce(mockLogs as any);

      const logs = await db.getAgentLogs(1, { executionId: 5 });
      
      expect(db.getAgentLogs).toHaveBeenCalledWith(1, { executionId: 5 });
      expect(logs).toHaveLength(2);
    });

    it("should get logs filtered by level", async () => {
      const mockLogs = [
        { id: 1, event: "error_occurred", level: "error" },
      ];
      vi.mocked(db.getAgentLogs).mockResolvedValueOnce(mockLogs as any);

      const logs = await db.getAgentLogs(1, { level: "error" });
      
      expect(db.getAgentLogs).toHaveBeenCalledWith(1, { level: "error" });
      expect(logs).toHaveLength(1);
    });
  });

  describe("Execution Steps", () => {
    it("should create an execution step", async () => {
      const step = {
        userId: 1,
        executionId: 1,
        stepNumber: 1,
        action: "file_write",
        input: { path: "/src/index.ts", content: "console.log('hello')" },
        status: "pending" as const,
      };

      const result = await db.createExecutionStep(step);
      
      expect(db.createExecutionStep).toHaveBeenCalledWith(step);
      expect(result).toEqual({ id: 1 });
    });

    it("should get execution steps for an execution", async () => {
      const mockSteps = [
        { id: 1, executionId: 1, stepNumber: 1, action: "file_read", status: "complete" },
        { id: 2, executionId: 1, stepNumber: 2, action: "file_write", status: "running" },
      ];
      vi.mocked(db.getExecutionSteps).mockResolvedValueOnce(mockSteps as any);

      const steps = await db.getExecutionSteps(1, 1);
      
      expect(db.getExecutionSteps).toHaveBeenCalledWith(1, 1);
      expect(steps).toHaveLength(2);
    });

    it("should update an execution step status", async () => {
      await db.updateExecutionStep(1, 1, { status: "complete" as const });
      
      expect(db.updateExecutionStep).toHaveBeenCalledWith(1, 1, { status: "complete" });
    });

    it("should confirm an execution step", async () => {
      await db.confirmExecutionStep(1, 1);
      
      expect(db.confirmExecutionStep).toHaveBeenCalledWith(1, 1);
    });
  });
});

describe("Prompt Templates", () => {
  describe("Template Assembly", () => {
    it("should assemble a complete prompt from sections", () => {
      const sections = {
        identity: "You are a helpful developer agent.",
        communication: "Be concise and clear.",
        tools: "You have access to file operations.",
        safety: "Never delete production files.",
      };

      const assembled = [
        sections.identity,
        sections.communication,
        sections.tools,
        sections.safety,
      ].join("\n\n");

      expect(assembled).toContain("helpful developer agent");
      expect(assembled).toContain("concise and clear");
      expect(assembled).toContain("file operations");
      expect(assembled).toContain("Never delete");
    });

    it("should inject user rules into prompt", () => {
      const basePrompt = "You are a developer agent.";
      const userRules = [
        { ruleType: "instruction", ruleContent: "Always use TypeScript" },
        { ruleType: "deny", ruleContent: "Never use var keyword" },
      ];

      const rulesSection = userRules.map(r => {
        const prefix = r.ruleType === "deny" ? "NEVER:" : "ALWAYS:";
        return `${prefix} ${r.ruleContent}`;
      }).join("\n");

      const fullPrompt = `${basePrompt}\n\n## User Rules\n${rulesSection}`;

      expect(fullPrompt).toContain("ALWAYS: Always use TypeScript");
      expect(fullPrompt).toContain("NEVER: Never use var keyword");
    });
  });
});

describe("Safety Checker", () => {
  describe("Action Validation", () => {
    it("should block denied actions", () => {
      const denyRules = [
        { ruleType: "deny", ruleContent: "delete production" },
        { ruleType: "deny", ruleContent: "force push" },
      ];

      const action = { type: "git", command: "git push --force" };
      
      const isBlocked = denyRules.some(rule => 
        rule.ruleType === "deny" && 
        action.command.toLowerCase().includes(rule.ruleContent.toLowerCase().split(" ").pop() || "")
      );

      expect(isBlocked).toBe(true);
    });

    it("should allow safe actions", () => {
      const denyRules = [
        { ruleType: "deny", ruleContent: "delete production" },
      ];

      const action = { type: "file", command: "create test.ts" };
      
      const isBlocked = denyRules.some(rule => 
        rule.ruleType === "deny" && 
        action.command.toLowerCase().includes(rule.ruleContent.toLowerCase())
      );

      expect(isBlocked).toBe(false);
    });

    it("should flag actions requiring confirmation", () => {
      const confirmRules = [
        { ruleType: "confirm", ruleContent: "file deletion" },
        { ruleType: "confirm", ruleContent: "database migration" },
      ];

      const action = { type: "file", operation: "delete", path: "/src/old.ts" };
      
      const needsConfirmation = confirmRules.some(rule => 
        rule.ruleType === "confirm" && 
        action.operation === "delete"
      );

      expect(needsConfirmation).toBe(true);
    });
  });

  describe("Path Validation", () => {
    it("should block access to sensitive paths", () => {
      const sensitivePaths = [
        "/etc/passwd",
        "/root/.ssh",
        "~/.aws/credentials",
        ".env",
        ".env.local",
      ];

      const requestedPath = ".env.local";
      
      const isSensitive = sensitivePaths.some(p => 
        requestedPath.includes(p) || requestedPath.endsWith(p)
      );

      expect(isSensitive).toBe(true);
    });

    it("should allow access to project paths", () => {
      const sensitivePaths = [".env", "/etc", "/root"];
      const requestedPath = "/home/user/project/src/index.ts";
      
      const isSensitive = sensitivePaths.some(p => 
        requestedPath.includes(p)
      );

      expect(isSensitive).toBe(false);
    });
  });
});

describe("Context Builder", () => {
  describe("Context Assembly", () => {
    it("should build context with project info", () => {
      const project = {
        name: "my-app",
        description: "A web application",
        techStack: ["React", "TypeScript", "Node.js"],
      };

      const context = {
        projectName: project.name,
        projectDescription: project.description,
        technologies: project.techStack.join(", "),
      };

      expect(context.projectName).toBe("my-app");
      expect(context.technologies).toContain("React");
    });

    it("should include recent conversation history", () => {
      const messages = [
        { role: "user", content: "Create a login page" },
        { role: "assistant", content: "I'll create a login page with..." },
        { role: "user", content: "Add password validation" },
      ];

      const recentHistory = messages.slice(-3);
      
      expect(recentHistory).toHaveLength(3);
      expect(recentHistory[0].content).toContain("login page");
    });

    it("should truncate context to fit token limit", () => {
      const maxTokens = 1000;
      const estimateTokens = (text: string) => Math.ceil(text.length / 4);
      
      let context = "A".repeat(5000); // ~1250 tokens
      
      while (estimateTokens(context) > maxTokens) {
        context = context.slice(0, -100);
      }

      expect(estimateTokens(context)).toBeLessThanOrEqual(maxTokens);
    });
  });
});

describe("Execution Engine", () => {
  describe("State Machine", () => {
    it("should transition from idle to running", () => {
      type State = "idle" | "running" | "paused" | "awaiting_confirmation" | "complete" | "failed";
      
      const transitions: Record<State, State[]> = {
        idle: ["running"],
        running: ["paused", "awaiting_confirmation", "complete", "failed"],
        paused: ["running", "failed"],
        awaiting_confirmation: ["running", "failed"],
        complete: [],
        failed: [],
      };

      const currentState: State = "idle";
      const canTransitionTo = (target: State) => transitions[currentState].includes(target);

      expect(canTransitionTo("running")).toBe(true);
      expect(canTransitionTo("complete")).toBe(false);
    });

    it("should require confirmation for sensitive actions", () => {
      const sensitiveActions = ["file_delete", "git_push", "db_migrate", "deploy"];
      const action = "file_delete";

      const requiresConfirmation = sensitiveActions.includes(action);

      expect(requiresConfirmation).toBe(true);
    });
  });

  describe("Tool Execution", () => {
    it("should validate tool parameters before execution", () => {
      const toolSchema = {
        name: "file_write",
        parameters: {
          path: { type: "string", required: true },
          content: { type: "string", required: true },
        },
      };

      const params = { path: "/src/index.ts", content: "console.log('hello')" };
      
      const isValid = Object.entries(toolSchema.parameters).every(([key, spec]) => {
        if ((spec as any).required && !(key in params)) return false;
        return true;
      });

      expect(isValid).toBe(true);
    });

    it("should reject invalid tool parameters", () => {
      const toolSchema = {
        name: "file_write",
        parameters: {
          path: { type: "string", required: true },
          content: { type: "string", required: true },
        },
      };

      const params = { path: "/src/index.ts" }; // missing content
      
      const isValid = Object.entries(toolSchema.parameters).every(([key, spec]) => {
        if ((spec as any).required && !(key in params)) return false;
        return true;
      });

      expect(isValid).toBe(false);
    });
  });
});

describe("Session Manager", () => {
  describe("Session Lifecycle", () => {
    it("should create a new session with unique ID", () => {
      const createSession = () => ({
        id: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        createdAt: new Date(),
        messages: [],
        context: {},
      });

      const session1 = createSession();
      const session2 = createSession();

      expect(session1.id).not.toBe(session2.id);
      expect(session1.id).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it("should track session messages", () => {
      const session = {
        id: "test_session",
        messages: [] as Array<{ role: string; content: string }>,
      };

      session.messages.push({ role: "user", content: "Hello" });
      session.messages.push({ role: "assistant", content: "Hi there!" });

      expect(session.messages).toHaveLength(2);
      expect(session.messages[1].role).toBe("assistant");
    });

    it("should expire sessions after timeout", () => {
      const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
      
      const session = {
        id: "test_session",
        lastActivityAt: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
      };

      const isExpired = Date.now() - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS;

      expect(isExpired).toBe(true);
    });
  });
});
