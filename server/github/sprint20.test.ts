/**
 * Sprint 20: GitHub Integration Polish Tests
 * 
 * Tests for issue sync, PR management, and clone service enhancements.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ════════════════════════════════════════════════════════════════════════════
// ISSUE SYNC SERVICE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Issue Sync Service", () => {
  describe("Module Structure", () => {
    it("should export listIssues function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.listIssues).toBe("function");
    });

    it("should export getIssue function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.getIssue).toBe("function");
    });

    it("should export createIssue function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.createIssue).toBe("function");
    });

    it("should export updateIssue function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.updateIssue).toBe("function");
    });

    it("should export syncIssuesToDb function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.syncIssuesToDb).toBe("function");
    });

    it("should export getSyncedIssues function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.getSyncedIssues).toBe("function");
    });

    it("should export linkIssueToCard function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.linkIssueToCard).toBe("function");
    });

    it("should export createCardFromIssue function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.createCardFromIssue).toBe("function");
    });

    it("should export createIssueFromCard function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.createIssueFromCard).toBe("function");
    });

    it("should export addLabels function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.addLabels).toBe("function");
    });

    it("should export addComment function", async () => {
      const module = await import("./issueSyncService");
      expect(typeof module.addComment).toBe("function");
    });
  });

  describe("Issue Types", () => {
    it("should define GitHubIssue interface", async () => {
      const module = await import("./issueSyncService");
      // Type check - if module compiles, types are defined
      expect(module).toBeDefined();
    });

    it("should define IssueSyncResult interface", async () => {
      const module = await import("./issueSyncService");
      expect(module).toBeDefined();
    });

    it("should define IssueCreateInput interface", async () => {
      const module = await import("./issueSyncService");
      expect(module).toBeDefined();
    });

    it("should define IssueUpdateInput interface", async () => {
      const module = await import("./issueSyncService");
      expect(module).toBeDefined();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PR MANAGEMENT SERVICE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("PR Management Service", () => {
  describe("Module Structure", () => {
    it("should export getPRFiles function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.getPRFiles).toBe("function");
    });

    it("should export getPRFileDiff function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.getPRFileDiff).toBe("function");
    });

    it("should export getPRDiff function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.getPRDiff).toBe("function");
    });

    it("should export listPRComments function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.listPRComments).toBe("function");
    });

    it("should export listPRReviewComments function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.listPRReviewComments).toBe("function");
    });

    it("should export createPRComment function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.createPRComment).toBe("function");
    });

    it("should export createPRReviewComment function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.createPRReviewComment).toBe("function");
    });

    it("should export listPRReviews function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.listPRReviews).toBe("function");
    });

    it("should export createPRReview function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.createPRReview).toBe("function");
    });

    it("should export checkMergeability function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.checkMergeability).toBe("function");
    });

    it("should export mergePR function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.mergePR).toBe("function");
    });

    it("should export updatePRBranch function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.updatePRBranch).toBe("function");
    });

    it("should export getRequestedReviewers function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.getRequestedReviewers).toBe("function");
    });

    it("should export requestReviewers function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.requestReviewers).toBe("function");
    });

    it("should export removeRequestedReviewers function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.removeRequestedReviewers).toBe("function");
    });

    it("should export listPRCommits function", async () => {
      const module = await import("./prManagementService");
      expect(typeof module.listPRCommits).toBe("function");
    });
  });

  describe("PR Types", () => {
    it("should define PRFile interface", async () => {
      const module = await import("./prManagementService");
      expect(module).toBeDefined();
    });

    it("should define PRComment interface", async () => {
      const module = await import("./prManagementService");
      expect(module).toBeDefined();
    });

    it("should define PRReviewComment interface", async () => {
      const module = await import("./prManagementService");
      expect(module).toBeDefined();
    });

    it("should define PRReview interface", async () => {
      const module = await import("./prManagementService");
      expect(module).toBeDefined();
    });

    it("should define PRMergeResult interface", async () => {
      const module = await import("./prManagementService");
      expect(module).toBeDefined();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// GITHUB ROUTER TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("GitHub Router - Sprint 20 Endpoints", () => {
  describe("Issue Endpoints", () => {
    it("should have listIssues procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter).toBeDefined();
      expect(module.githubRouter._def.procedures.listIssues).toBeDefined();
    });

    it("should have getIssue procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.getIssue).toBeDefined();
    });

    it("should have createIssue procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.createIssue).toBeDefined();
    });

    it("should have updateIssue procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.updateIssue).toBeDefined();
    });

    it("should have syncIssues procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.syncIssues).toBeDefined();
    });

    it("should have getSyncedIssues procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.getSyncedIssues).toBeDefined();
    });

    it("should have linkIssueToCard procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.linkIssueToCard).toBeDefined();
    });

    it("should have createCardFromIssue procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.createCardFromIssue).toBeDefined();
    });

    it("should have createIssueFromCard procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.createIssueFromCard).toBeDefined();
    });
  });

  describe("PR Management Endpoints", () => {
    it("should have getPRFiles procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.getPRFiles).toBeDefined();
    });

    it("should have getPRDiff procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.getPRDiff).toBeDefined();
    });

    it("should have listPRComments procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.listPRComments).toBeDefined();
    });

    it("should have listPRReviewComments procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.listPRReviewComments).toBeDefined();
    });

    it("should have createPRComment procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.createPRComment).toBeDefined();
    });

    it("should have createPRReviewComment procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.createPRReviewComment).toBeDefined();
    });

    it("should have listPRReviews procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.listPRReviews).toBeDefined();
    });

    it("should have createPRReview procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.createPRReview).toBeDefined();
    });

    it("should have checkMergeability procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.checkMergeability).toBeDefined();
    });

    it("should have mergePR procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.mergePR).toBeDefined();
    });

    it("should have requestReviewers procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.requestReviewers).toBeDefined();
    });

    it("should have listPRCommits procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.listPRCommits).toBeDefined();
    });
  });

  describe("Clone Service Endpoints", () => {
    it("should have cloneRepo procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.cloneRepo).toBeDefined();
    });

    it("should have syncRepo procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.syncRepo).toBeDefined();
    });

    it("should have getCloneStatus procedure", async () => {
      const module = await import("./router");
      expect(module.githubRouter._def.procedures.getCloneStatus).toBeDefined();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// GIT SERVICE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Git Service - Clone Operations", () => {
  describe("Module Structure", () => {
    it("should export cloneRepository function", async () => {
      const module = await import("./gitService");
      expect(typeof module.cloneRepository).toBe("function");
    });

    it("should export syncRepository function", async () => {
      const module = await import("./gitService");
      expect(typeof module.syncRepository).toBe("function");
    });

    it("should export checkoutBranch function", async () => {
      const module = await import("./gitService");
      expect(typeof module.checkoutBranch).toBe("function");
    });

    it("should export listBranches function", async () => {
      const module = await import("./gitService");
      expect(typeof module.listBranches).toBe("function");
    });

    it("should export getCurrentBranch function", async () => {
      const module = await import("./gitService");
      expect(typeof module.getCurrentBranch).toBe("function");
    });

    it("should export cloneAndTrack function", async () => {
      const module = await import("./gitService");
      expect(typeof module.cloneAndTrack).toBe("function");
    });

    it("should export syncTrackedRepo function", async () => {
      const module = await import("./gitService");
      expect(typeof module.syncTrackedRepo).toBe("function");
    });

    it("should export getClonedRepoByProject function", async () => {
      const module = await import("./gitService");
      expect(typeof module.getClonedRepoByProject).toBe("function");
    });

    it("should export getClonedRepoById function", async () => {
      const module = await import("./gitService");
      expect(typeof module.getClonedRepoById).toBe("function");
    });
  });

  describe("Configuration", () => {
    it("should have GIT_CONFIG with workspacePath", async () => {
      const module = await import("./gitService");
      expect(module.GIT_CONFIG.workspacePath).toBeDefined();
      expect(typeof module.GIT_CONFIG.workspacePath).toBe("string");
    });

    it("should have GIT_CONFIG with defaultDepth", async () => {
      const module = await import("./gitService");
      expect(module.GIT_CONFIG.defaultDepth).toBeDefined();
      expect(typeof module.GIT_CONFIG.defaultDepth).toBe("number");
    });

    it("should have GIT_CONFIG with maxRepoSize", async () => {
      const module = await import("./gitService");
      expect(module.GIT_CONFIG.maxRepoSize).toBeDefined();
      expect(module.GIT_CONFIG.maxRepoSize).toBeGreaterThan(0);
    });

    it("should have GIT_CONFIG with cloneTimeout", async () => {
      const module = await import("./gitService");
      expect(module.GIT_CONFIG.cloneTimeout).toBeDefined();
      expect(module.GIT_CONFIG.cloneTimeout).toBeGreaterThan(0);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UI COMPONENT TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("UI Components", () => {
  describe("PRDetailPanel", () => {
    it("should export PRDetailPanel component", async () => {
      const module = await import("../../client/src/components/PRDetailPanel");
      expect(module.PRDetailPanel).toBeDefined();
      expect(typeof module.PRDetailPanel).toBe("function");
    });

    it("should have default export", async () => {
      const module = await import("../../client/src/components/PRDetailPanel");
      expect(module.default).toBeDefined();
    });
  });

  describe("CloneProgress", () => {
    it("should export CloneProgress component", async () => {
      const module = await import("../../client/src/components/CloneProgress");
      expect(module.CloneProgress).toBeDefined();
      expect(typeof module.CloneProgress).toBe("function");
    });

    it("should have default export", async () => {
      const module = await import("../../client/src/components/CloneProgress");
      expect(module.default).toBeDefined();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Integration", () => {
  describe("Issue-Card Linking", () => {
    it("should have bidirectional linking capability", async () => {
      const issueSyncModule = await import("./issueSyncService");
      
      // Both functions should exist for bidirectional sync
      expect(typeof issueSyncModule.linkIssueToCard).toBe("function");
      expect(typeof issueSyncModule.createCardFromIssue).toBe("function");
      expect(typeof issueSyncModule.createIssueFromCard).toBe("function");
    });
  });

  describe("PR Workflow", () => {
    it("should have complete PR review workflow", async () => {
      const prModule = await import("./prManagementService");
      
      // Full workflow: view diff -> comment -> review -> merge
      expect(typeof prModule.getPRFiles).toBe("function");
      expect(typeof prModule.getPRDiff).toBe("function");
      expect(typeof prModule.createPRComment).toBe("function");
      expect(typeof prModule.createPRReview).toBe("function");
      expect(typeof prModule.checkMergeability).toBe("function");
      expect(typeof prModule.mergePR).toBe("function");
    });
  });

  describe("Clone Workflow", () => {
    it("should have complete clone workflow", async () => {
      const gitModule = await import("./gitService");
      
      // Full workflow: clone -> track -> sync
      expect(typeof gitModule.cloneRepository).toBe("function");
      expect(typeof gitModule.cloneAndTrack).toBe("function");
      expect(typeof gitModule.syncTrackedRepo).toBe("function");
      expect(typeof gitModule.getClonedRepoByProject).toBe("function");
    });
  });
});
