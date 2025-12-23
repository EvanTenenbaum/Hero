/**
 * Hero IDE Core Features Tests
 *
 * NOTE: Some tests require database integration and are skipped in unit test mode.
 */

import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Skip database-dependent tests in unit test mode
const skipDbTests = !process.env.TEST_DATABASE_URL;

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("Hero IDE Core Features", () => {
  describe("auth.me", () => {
    it("returns user when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.auth.me();
      
      expect(result).toBeDefined();
      expect(result?.openId).toBe("test-user-123");
      expect(result?.email).toBe("test@example.com");
    });

    it("returns null when not authenticated", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.auth.me();
      
      expect(result).toBeNull();
    });
  });

  describe("projects router", () => {
    it("requires authentication for list", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.projects.list()).rejects.toThrow();
    });

    it("requires authentication for create", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.projects.create({
          name: "test-project",
          description: "Test description",
        })
      ).rejects.toThrow();
    });
  });

  describe("agents router", () => {
    it("requires authentication for list", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.agents.list()).rejects.toThrow();
    });

    it("requires authentication for create", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.agents.create({
          name: "test-agent",
          type: "custom",
          maxSteps: 10,
          uncertaintyThreshold: 70,
          budgetLimit: "1.00",
          requireApproval: true,
        })
      ).rejects.toThrow();
    });
  });

  describe("chat router", () => {
    it("requires authentication for conversations", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.chat.conversations()).rejects.toThrow();
    });
  });

  describe("settings router", () => {
    it("requires authentication for get", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.settings.get()).rejects.toThrow();
    });

    it("requires authentication for secrets", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.settings.secrets({})).rejects.toThrow();
    });
  });
});

describe("Input Validation", () => {
  describe("projects.create", () => {
    it("validates project name is required", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.projects.create({
          name: "",
          description: "Test",
        })
      ).rejects.toThrow();
    });
  });

  describe("agents.create", () => {
    it("validates agent name is required", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.agents.create({
          name: "",
          type: "custom",
          maxSteps: 10,
          uncertaintyThreshold: 70,
          budgetLimit: "1.00",
          requireApproval: true,
        })
      ).rejects.toThrow();
    });
  });
});

describe.skipIf(skipDbTests)("Authenticated Operations", () => {
  describe("projects", () => {
    it("can list projects when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.projects.list();
      
      expect(Array.isArray(result)).toBe(true);
    });

    it("can create a project when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.projects.create({
        name: "test-project-" + Date.now(),
        description: "Test description",
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe("agents", () => {
    it("can list agents when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.agents.list();
      
      expect(Array.isArray(result)).toBe(true);
    });

    it("can create an agent when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.agents.create({
        name: "test-agent-" + Date.now(),
        type: "custom",
        maxSteps: 10,
        uncertaintyThreshold: 70,
        budgetLimit: "1.00",
        requireApproval: true,
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe("chat", () => {
    it("can list conversations when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.chat.conversations();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("settings", () => {
    it("can get settings when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.settings.get();
      
      expect(result).toBeDefined();
    });

    it("can get secrets when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.settings.secrets({});
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
