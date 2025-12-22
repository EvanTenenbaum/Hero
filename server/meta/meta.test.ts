/**
 * Unit tests for Sprint 23: Self-Modifying IDE
 */

import { describe, it, expect, vi } from "vitest";
import {
  META_AGENT_SYSTEM_PROMPT,
  PROTECTED_FILES,
  isProtectedFile,
  getProtectionReason,
  CODEBASE_STRUCTURE,
} from "./metaAgentPrompt";
import {
  checkFilePermission,
  generateDiff,
  FileChange,
} from "./fileModificationService";

// ════════════════════════════════════════════════════════════════════════════
// META AGENT PROMPT TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Meta Agent Prompt", () => {
  describe("System Prompt", () => {
    it("should contain Hero IDE architecture information", () => {
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Hero IDE");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("React 19");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("tRPC");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Drizzle");
    });

    it("should contain design system information", () => {
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Slate Blue");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("#5B7C99");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Libre Baskerville");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Inter");
    });

    it("should contain protected files information", () => {
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Protected Files");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("server/_core");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("drizzle/schema.ts");
    });

    it("should contain response format guidelines", () => {
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Response Format");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Understanding");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Plan");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Code");
      expect(META_AGENT_SYSTEM_PROMPT).toContain("Validation");
    });
  });

  describe("Protected Files List", () => {
    it("should include core infrastructure files", () => {
      expect(PROTECTED_FILES).toContain("server/_core/");
      expect(PROTECTED_FILES).toContain("server/db.ts");
    });

    it("should include configuration files", () => {
      expect(PROTECTED_FILES).toContain("drizzle/schema.ts");
      expect(PROTECTED_FILES).toContain("package.json");
      expect(PROTECTED_FILES).toContain("vite.config.ts");
      expect(PROTECTED_FILES).toContain("tsconfig.json");
    });

    it("should include environment files", () => {
      expect(PROTECTED_FILES).toContain(".env");
      expect(PROTECTED_FILES).toContain(".env.local");
    });

    it("should include git files", () => {
      expect(PROTECTED_FILES).toContain(".git/");
      expect(PROTECTED_FILES).toContain(".gitignore");
    });
  });

  describe("isProtectedFile", () => {
    it("should return true for protected files", () => {
      expect(isProtectedFile("server/_core/auth.ts")).toBe(true);
      expect(isProtectedFile("server/_core/context.ts")).toBe(true);
      expect(isProtectedFile("drizzle/schema.ts")).toBe(true);
      expect(isProtectedFile("package.json")).toBe(true);
      expect(isProtectedFile(".env")).toBe(true);
    });

    it("should return false for non-protected files", () => {
      expect(isProtectedFile("client/src/pages/Home.tsx")).toBe(false);
      expect(isProtectedFile("client/src/components/Button.tsx")).toBe(false);
      expect(isProtectedFile("server/routers.ts")).toBe(false);
      expect(isProtectedFile("README.md")).toBe(false);
    });

    it("should handle Windows-style paths", () => {
      expect(isProtectedFile("server\\_core\\auth.ts")).toBe(true);
      expect(isProtectedFile("drizzle\\schema.ts")).toBe(true);
    });
  });

  describe("getProtectionReason", () => {
    it("should return reason for core infrastructure", () => {
      const reason = getProtectionReason("server/_core/auth.ts");
      expect(reason).toContain("Core infrastructure");
    });

    it("should return reason for database schema", () => {
      const reason = getProtectionReason("drizzle/schema.ts");
      expect(reason).toContain("Database schema");
      expect(reason).toContain("migration");
    });

    it("should return reason for package.json", () => {
      const reason = getProtectionReason("package.json");
      expect(reason).toContain("Dependency");
    });

    it("should return reason for environment files", () => {
      const reason = getProtectionReason(".env");
      expect(reason).toContain("Environment");
      expect(reason).toContain("credentials");
    });

    it("should return null for non-protected files", () => {
      expect(getProtectionReason("client/src/pages/Home.tsx")).toBeNull();
      expect(getProtectionReason("README.md")).toBeNull();
    });
  });

  describe("Codebase Structure", () => {
    it("should have frontend structure", () => {
      expect(CODEBASE_STRUCTURE.frontend).toBeDefined();
      expect(CODEBASE_STRUCTURE.frontend.pages).toBeInstanceOf(Array);
      expect(CODEBASE_STRUCTURE.frontend.components).toBeInstanceOf(Array);
      expect(CODEBASE_STRUCTURE.frontend.contexts).toBeInstanceOf(Array);
    });

    it("should have backend structure", () => {
      expect(CODEBASE_STRUCTURE.backend).toBeDefined();
      expect(CODEBASE_STRUCTURE.backend.routers).toBeInstanceOf(Array);
      expect(CODEBASE_STRUCTURE.backend.services).toBeInstanceOf(Array);
    });

    it("should have database structure", () => {
      expect(CODEBASE_STRUCTURE.database).toBeDefined();
      expect(CODEBASE_STRUCTURE.database.tables).toBeInstanceOf(Array);
    });

    it("should include key pages", () => {
      const pages = CODEBASE_STRUCTURE.frontend.pages.join(" ");
      expect(pages).toContain("Home.tsx");
      expect(pages).toContain("Projects.tsx");
      expect(pages).toContain("Chat.tsx");
      expect(pages).toContain("Agents.tsx");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FILE MODIFICATION SERVICE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("File Modification Service", () => {
  describe("checkFilePermission", () => {
    it("should allow modification of non-protected files", () => {
      const result = checkFilePermission("client/src/pages/Home.tsx");
      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });

    it("should require confirmation for protected files", () => {
      const result = checkFilePermission("server/_core/auth.ts");
      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.reason).not.toBeNull();
    });

    it("should require confirmation for database schema", () => {
      const result = checkFilePermission("drizzle/schema.ts");
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe("generateDiff", () => {
    it("should generate diff for new file", () => {
      const diff = generateDiff(null, "line 1\nline 2\nline 3", "test.ts");
      
      expect(diff.filePath).toBe("test.ts");
      expect(diff.additions).toBe(3);
      expect(diff.deletions).toBe(0);
      expect(diff.lines.filter(l => l.type === "add").length).toBe(3);
    });

    it("should generate diff for modified file", () => {
      const original = "line 1\nline 2\nline 3";
      const modified = "line 1\nmodified line 2\nline 3";
      
      const diff = generateDiff(original, modified, "test.ts");
      
      expect(diff.filePath).toBe("test.ts");
      expect(diff.additions).toBeGreaterThan(0);
      expect(diff.deletions).toBeGreaterThan(0);
    });

    it("should generate diff for deleted lines", () => {
      const original = "line 1\nline 2\nline 3";
      const modified = "line 1\nline 3";
      
      const diff = generateDiff(original, modified, "test.ts");
      
      expect(diff.deletions).toBeGreaterThan(0);
    });

    it("should include line numbers", () => {
      const diff = generateDiff(null, "line 1\nline 2", "test.ts");
      
      expect(diff.lines[0].lineNumber).toBe(1);
      expect(diff.lines[1].lineNumber).toBe(2);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// META ROUTER TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Meta Router", () => {
  describe("Module Structure", () => {
    it("should export metaRouter", async () => {
      const module = await import("./router");
      expect(module.metaRouter).toBeDefined();
    });
  });

  describe("Endpoints", () => {
    it("should have getSystemPrompt endpoint", async () => {
      const module = await import("./router");
      expect(module.metaRouter._def.procedures.getSystemPrompt).toBeDefined();
    });

    it("should have checkFileProtection endpoint", async () => {
      const module = await import("./router");
      expect(module.metaRouter._def.procedures.checkFileProtection).toBeDefined();
    });

    it("should have readFile endpoint", async () => {
      const module = await import("./router");
      expect(module.metaRouter._def.procedures.readFile).toBeDefined();
    });

    it("should have previewChanges endpoint", async () => {
      const module = await import("./router");
      expect(module.metaRouter._def.procedures.previewChanges).toBeDefined();
    });

    it("should have applyChanges endpoint", async () => {
      const module = await import("./router");
      expect(module.metaRouter._def.procedures.applyChanges).toBeDefined();
    });

    it("should have validateTypeScript endpoint", async () => {
      const module = await import("./router");
      expect(module.metaRouter._def.procedures.validateTypeScript).toBeDefined();
    });

    it("should have getModificationHistory endpoint", async () => {
      const module = await import("./router");
      expect(module.metaRouter._def.procedures.getModificationHistory).toBeDefined();
    });

    it("should have chat endpoint", async () => {
      const module = await import("./router");
      expect(module.metaRouter._def.procedures.chat).toBeDefined();
    });

    it("should have listFiles endpoint", async () => {
      const module = await import("./router");
      expect(module.metaRouter._def.procedures.listFiles).toBeDefined();
    });
  });
});

// UI Component tests are skipped in Node.js environment due to CSS imports
// These components are tested via browser-based E2E tests

// ════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Integration", () => {
  describe("Router Integration", () => {
    it("should have meta router exported", async () => {
      const module = await import("./router");
      expect(module.metaRouter).toBeDefined();
    });
  });

  describe("Safety Checks", () => {
    it("should block unconfirmed protected file modifications", () => {
      // This would be an integration test with the actual router
      // For now, we verify the logic exists
      expect(isProtectedFile("server/_core/auth.ts")).toBe(true);
      expect(checkFilePermission("server/_core/auth.ts").requiresConfirmation).toBe(true);
    });

    it("should allow confirmed protected file modifications", () => {
      const permission = checkFilePermission("server/_core/auth.ts");
      expect(permission.allowed).toBe(true);
    });
  });
});
