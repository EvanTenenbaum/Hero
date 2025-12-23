/**
 * GitHub Integration Unit Tests
 * Sprint 4: GitHub Integration
 *
 * NOTE: Some tests require database integration and are skipped in unit test mode.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// Skip database-dependent tests in unit test mode
const skipDbTests = !process.env.TEST_DATABASE_URL;

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
  describe("OAuth Procedures", () => {
    describe("github.getAuthUrl", () => {
      it("returns a valid GitHub OAuth URL", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        const result = await caller.github.getAuthUrl();
        
        // Should return an object with url property
        expect(result).toHaveProperty("url");
        expect(typeof result.url).toBe("string");
        // URL should contain github.com/login/oauth/authorize
        expect(result.url).toContain("github.com/login/oauth/authorize");
      });
    });

    describe("github.getConnection", () => {
      it("returns not connected for new users", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        const result = await caller.github.getConnection();
        
        expect(result.connected).toBe(false);
        expect(result.username).toBeNull();
      });
    });

    describe("github.isConnected", () => {
      it("returns false for users without GitHub connection", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        const result = await caller.github.isConnected();
        
        expect(result.connected).toBe(false);
      });
    });

    describe("github.handleCallback", () => {
      it("validates state parameter", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        // Invalid state should throw
        await expect(
          caller.github.handleCallback({
            code: "test-code",
            state: "invalid-state",
          })
        ).rejects.toThrow();
      });

      it("validates state belongs to current user", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        // State for different user should throw
        const wrongUserState = Buffer.from(JSON.stringify({
          userId: 999, // Different user
          timestamp: Date.now(),
        })).toString("base64");
        
        await expect(
          caller.github.handleCallback({
            code: "test-code",
            state: wrongUserState,
          })
        ).rejects.toThrow("Invalid state");
      });
    });

    describe.skipIf(skipDbTests)("github.disconnect", () => {
      it("succeeds even when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        const result = await caller.github.disconnect();
        
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Repository Procedures", () => {
    describe("github.listRepos", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.listRepos({})
        ).rejects.toThrow("GitHub not connected");
      });

      it("validates pagination parameters", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        // Page must be positive
        await expect(
          caller.github.listRepos({ page: 0 })
        ).rejects.toThrow();
        
        // perPage has max limit
        await expect(
          caller.github.listRepos({ perPage: 101 })
        ).rejects.toThrow();
      });
    });

    describe("github.getRepo", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.getRepo({ owner: "test", repo: "test-repo" })
        ).rejects.toThrow("GitHub not connected");
      });

      it("requires owner and repo parameters", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.getRepo({ owner: "", repo: "test-repo" })
        ).rejects.toThrow();
      });
    });

    describe("github.searchRepos", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.searchRepos({ query: "test" })
        ).rejects.toThrow("GitHub not connected");
      });

      it("requires non-empty query", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.searchRepos({ query: "" })
        ).rejects.toThrow();
      });
    });
  });

  describe("Branch Procedures", () => {
    describe("github.listBranches", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.listBranches({ owner: "test", repo: "test-repo" })
        ).rejects.toThrow("GitHub not connected");
      });
    });

    describe("github.createBranch", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.createBranch({
            owner: "test",
            repo: "test-repo",
            branchName: "feature/test",
            sourceSha: "abc123",
          })
        ).rejects.toThrow("GitHub not connected");
      });

      it("validates branch name", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.createBranch({
            owner: "test",
            repo: "test-repo",
            branchName: "",
            sourceSha: "abc123",
          })
        ).rejects.toThrow();
      });
    });
  });

  describe("File/Content Procedures", () => {
    describe("github.getContents", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.getContents({ owner: "test", repo: "test-repo" })
        ).rejects.toThrow("GitHub not connected");
      });
    });

    describe("github.getFileContent", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.getFileContent({
            owner: "test",
            repo: "test-repo",
            path: "README.md",
          })
        ).rejects.toThrow("GitHub not connected");
      });

      it("requires path parameter", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.getFileContent({
            owner: "test",
            repo: "test-repo",
            path: "",
          })
        ).rejects.toThrow();
      });
    });

    describe("github.updateFile", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.updateFile({
            owner: "test",
            repo: "test-repo",
            path: "README.md",
            content: "# Test",
            message: "Update README",
          })
        ).rejects.toThrow("GitHub not connected");
      });

      it("requires commit message", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.updateFile({
            owner: "test",
            repo: "test-repo",
            path: "README.md",
            content: "# Test",
            message: "",
          })
        ).rejects.toThrow();
      });
    });

    describe("github.deleteFile", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.deleteFile({
            owner: "test",
            repo: "test-repo",
            path: "README.md",
            message: "Delete README",
            sha: "abc123",
          })
        ).rejects.toThrow("GitHub not connected");
      });

      it("requires sha parameter", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.deleteFile({
            owner: "test",
            repo: "test-repo",
            path: "README.md",
            message: "Delete README",
            sha: "",
          })
        ).rejects.toThrow();
      });
    });
  });

  describe("Commit Procedures", () => {
    describe("github.listCommits", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.listCommits({ owner: "test", repo: "test-repo" })
        ).rejects.toThrow("GitHub not connected");
      });
    });

    describe("github.getCommit", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.getCommit({
            owner: "test",
            repo: "test-repo",
            sha: "abc123",
          })
        ).rejects.toThrow("GitHub not connected");
      });

      it("requires sha parameter", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.getCommit({
            owner: "test",
            repo: "test-repo",
            sha: "",
          })
        ).rejects.toThrow();
      });
    });
  });

  describe("Pull Request Procedures", () => {
    describe("github.listPullRequests", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.listPullRequests({ owner: "test", repo: "test-repo" })
        ).rejects.toThrow("GitHub not connected");
      });

      it("validates state parameter", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        // Invalid state should throw
        await expect(
          caller.github.listPullRequests({
            owner: "test",
            repo: "test-repo",
            // @ts-expect-error - Testing invalid state
            state: "invalid",
          })
        ).rejects.toThrow();
      });
    });

    describe("github.getPullRequest", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.getPullRequest({
            owner: "test",
            repo: "test-repo",
            pullNumber: 1,
          })
        ).rejects.toThrow("GitHub not connected");
      });
    });

    describe("github.createPullRequest", () => {
      it("throws error when not connected", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.createPullRequest({
            owner: "test",
            repo: "test-repo",
            title: "Test PR",
            head: "feature/test",
            base: "main",
          })
        ).rejects.toThrow("GitHub not connected");
      });

      it("requires title, head, and base", async () => {
        const ctx = createAuthContext();
        const caller = appRouter.createCaller(ctx);
        
        await expect(
          caller.github.createPullRequest({
            owner: "test",
            repo: "test-repo",
            title: "",
            head: "feature/test",
            base: "main",
          })
        ).rejects.toThrow();
      });
    });
  });
});
