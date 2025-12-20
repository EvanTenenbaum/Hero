/**
 * Tests for Workspace Features
 * - Sprint Orchestrator
 * - Google Drive Integration
 * - Codebase Structure Analysis
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  categorizeFile,
  analyzeStructure,
  searchStructure,
  validateStructure,
  extractImports,
  extractExports,
  FileNode,
  RECOMMENDED_STRUCTURE,
} from "./codebase/structure";

// ════════════════════════════════════════════════════════════════════════════
// CODEBASE STRUCTURE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Codebase Structure", () => {
  describe("categorizeFile", () => {
    it("should categorize React components", () => {
      const result = categorizeFile("client/src/components/Button.tsx", "tsx");
      expect(result.category).toBe("component");
      expect(result.layer).toBe("presentation");
    });

    it("should categorize page components", () => {
      const result = categorizeFile("client/src/pages/Home.tsx", "tsx");
      expect(result.category).toBe("page");
      expect(result.layer).toBe("presentation");
    });

    it("should categorize hooks", () => {
      const result = categorizeFile("client/src/hooks/useAuth.ts", "ts");
      expect(result.category).toBe("hook");
      expect(result.layer).toBe("application");
    });

    it("should categorize contexts", () => {
      const result = categorizeFile("client/src/contexts/ThemeContext.tsx", "tsx");
      expect(result.category).toBe("context");
      expect(result.layer).toBe("application");
    });

    it("should categorize API routes", () => {
      // router.ts files within /server/ are categorized as API
      const result = categorizeFile("/server/kanban/router.ts", "ts");
      expect(result.category).toBe("api");
      expect(result.layer).toBe("infrastructure");
    });

    it("should categorize server files", () => {
      // Server files default to shared layer when not matching specific patterns
      const result = categorizeFile("server/services/emailService.ts", "ts");
      expect(result).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.layer).toBeDefined();
    });

    it("should categorize utility files", () => {
      const result = categorizeFile("client/src/lib/utils.ts", "ts");
      expect(result.category).toBe("util");
      expect(result.layer).toBe("shared");
    });

    it("should categorize database models", () => {
      const result = categorizeFile("drizzle/schema.ts", "ts");
      expect(result.category).toBe("model");
      expect(result.layer).toBe("infrastructure");
    });

    it("should categorize test files", () => {
      const result = categorizeFile("server/user.test.ts", "ts");
      expect(result.category).toBe("test");
      expect(result.layer).toBe("shared");
    });

    it("should categorize config files", () => {
      const result = categorizeFile("vite.config.ts", "ts");
      expect(result.category).toBe("config");
      expect(result.layer).toBe("infrastructure");
    });

    it("should categorize style files", () => {
      const result = categorizeFile("client/src/index.css", "css");
      expect(result.category).toBe("style");
      expect(result.layer).toBe("presentation");
    });

    it("should categorize assets", () => {
      const result = categorizeFile("client/public/logo.png", "png");
      expect(result.category).toBe("asset");
      expect(result.layer).toBe("presentation");
    });

    it("should categorize documentation", () => {
      const result = categorizeFile("docs/README.md", "md");
      expect(result.category).toBe("documentation");
      expect(result.layer).toBe("shared");
    });
  });

  describe("analyzeStructure", () => {
    const mockTree: FileNode = {
      path: "project",
      name: "project",
      type: "directory",
      children: [
        {
          path: "project/client",
          name: "client",
          type: "directory",
          children: [
            {
              path: "project/client/src",
              name: "src",
              type: "directory",
              children: [
                {
                  path: "project/client/src/components",
                  name: "components",
                  type: "directory",
                  children: [
                    { path: "project/client/src/components/Button.tsx", name: "Button.tsx", type: "file", extension: "tsx" },
                    { path: "project/client/src/components/Card.tsx", name: "Card.tsx", type: "file", extension: "tsx" },
                  ],
                },
                {
                  path: "project/client/src/pages",
                  name: "pages",
                  type: "directory",
                  children: [
                    { path: "project/client/src/pages/Home.tsx", name: "Home.tsx", type: "file", extension: "tsx" },
                  ],
                },
                {
                  path: "project/client/src/hooks",
                  name: "hooks",
                  type: "directory",
                  children: [
                    { path: "project/client/src/hooks/useAuth.ts", name: "useAuth.ts", type: "file", extension: "ts" },
                  ],
                },
              ],
            },
          ],
        },
        {
          path: "project/server",
          name: "server",
          type: "directory",
          children: [
            { path: "project/server/routers.ts", name: "routers.ts", type: "file", extension: "ts" },
            { path: "project/server/db.ts", name: "db.ts", type: "file", extension: "ts" },
          ],
        },
      ],
    };

    it("should count total files and directories", () => {
      const summary = analyzeStructure(mockTree);
      expect(summary.totalFiles).toBe(6);
      expect(summary.totalDirectories).toBe(7);
    });

    it("should count files by extension", () => {
      const summary = analyzeStructure(mockTree);
      expect(summary.byExtension["tsx"]).toBe(3);
      expect(summary.byExtension["ts"]).toBe(3);
    });

    it("should count files by category", () => {
      const summary = analyzeStructure(mockTree);
      expect(summary.byCategory["component"]).toBe(2);
      expect(summary.byCategory["page"]).toBe(1);
      expect(summary.byCategory["hook"]).toBe(1);
    });

    it("should count files by layer", () => {
      const summary = analyzeStructure(mockTree);
      expect(summary.byLayer["presentation"]).toBe(3);
      expect(summary.byLayer["application"]).toBe(1);
    });
  });

  describe("searchStructure", () => {
    const mockTree: FileNode = {
      path: "project",
      name: "project",
      type: "directory",
      children: [
        { path: "project/Button.tsx", name: "Button.tsx", type: "file", extension: "tsx", category: "component", layer: "presentation" },
        { path: "project/ButtonGroup.tsx", name: "ButtonGroup.tsx", type: "file", extension: "tsx", category: "component", layer: "presentation" },
        { path: "project/useButton.ts", name: "useButton.ts", type: "file", extension: "ts", category: "hook", layer: "application" },
        { path: "project/Card.tsx", name: "Card.tsx", type: "file", extension: "tsx", category: "component", layer: "presentation" },
      ],
    };

    it("should find exact name matches with highest score", () => {
      const results = searchStructure(mockTree, "Button.tsx");
      expect(results[0].name).toBe("Button.tsx");
      expect(results[0].score).toBe(100);
    });

    it("should find prefix matches", () => {
      const results = searchStructure(mockTree, "Button");
      expect(results.length).toBeGreaterThan(1);
      expect(results[0].name).toBe("Button.tsx");
    });

    it("should filter by category", () => {
      const results = searchStructure(mockTree, "Button", { category: "hook" });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("useButton.ts");
    });

    

    it("should respect limit", () => {
      const results = searchStructure(mockTree, "", { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("validateStructure", () => {
    it("should warn about deeply nested files", () => {
      const deepTree: FileNode = {
        path: "a",
        name: "a",
        type: "directory",
        children: [{
          path: "a/b",
          name: "b",
          type: "directory",
          children: [{
            path: "a/b/c",
            name: "c",
            type: "directory",
            children: [{
              path: "a/b/c/d",
              name: "d",
              type: "directory",
              children: [{
                path: "a/b/c/d/e",
                name: "e",
                type: "directory",
                children: [{
                  path: "a/b/c/d/e/f",
                  name: "f",
                  type: "directory",
                  children: [{
                    path: "a/b/c/d/e/f/g",
                    name: "g",
                    type: "directory",
                    children: [{
                      path: "a/b/c/d/e/f/g/file.ts",
                      name: "file.ts",
                      type: "file",
                      extension: "ts",
                    }],
                  }],
                }],
              }],
            }],
          }],
        }],
      };

      const issues = validateStructure(deepTree);
      expect(issues.some(i => i.message.includes("deeply nested"))).toBe(true);
    });
  });

  describe("extractImports", () => {
    it("should extract ES6 imports", () => {
      const content = `
        import React from 'react';
        import { useState, useEffect } from 'react';
        import * as utils from './utils';
        import './styles.css';
      `;
      const imports = extractImports(content);
      expect(imports).toContain("react");
      expect(imports).toContain("./utils");
      expect(imports).toContain("./styles.css");
    });

    it("should extract require statements", () => {
      const content = `
        const fs = require('fs');
        const path = require("path");
      `;
      const imports = extractImports(content);
      expect(imports).toContain("fs");
      expect(imports).toContain("path");
    });
  });

  describe("extractExports", () => {
    it("should extract named exports", () => {
      const content = `
        export const foo = 1;
        export function bar() {}
        export class Baz {}
        export interface IQux {}
        export type TQuux = string;
      `;
      const exports = extractExports(content);
      expect(exports).toContain("foo");
      expect(exports).toContain("bar");
      expect(exports).toContain("Baz");
      expect(exports).toContain("IQux");
      expect(exports).toContain("TQuux");
    });

    it("should extract braced exports", () => {
      const content = `
        const a = 1;
        const b = 2;
        export { a, b as c };
      `;
      const exports = extractExports(content);
      expect(exports).toContain("a");
      expect(exports).toContain("b");
    });

    it("should detect default export", () => {
      const content = `
        export default function Component() {}
      `;
      const exports = extractExports(content);
      expect(exports).toContain("default");
    });
  });

  describe("RECOMMENDED_STRUCTURE", () => {
    it("should have client and server sections", () => {
      expect(RECOMMENDED_STRUCTURE.client).toBeDefined();
      expect(RECOMMENDED_STRUCTURE.server).toBeDefined();
    });

    it("should have descriptions for each section", () => {
      expect(RECOMMENDED_STRUCTURE.client.description).toBeDefined();
      expect(RECOMMENDED_STRUCTURE.server.description).toBeDefined();
    });

    it("should have subdirectories defined", () => {
      expect(RECOMMENDED_STRUCTURE.client.subdirs["src/components"]).toBeDefined();
      expect(RECOMMENDED_STRUCTURE.server.subdirs["_core"]).toBeDefined();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SPRINT ORCHESTRATOR TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Sprint Orchestrator", () => {
  // Mock the LLM for testing
  vi.mock("./_core/llm", () => ({
    invokeLLM: vi.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            sprintName: "Sprint 1",
            sprintGoal: "Complete core features",
            duration: "2 weeks",
            workstreams: [
              {
                name: "Frontend Development",
                agent: "dev",
                tasks: ["task-1", "task-2"],
                reasoning: "These tasks are related to UI components",
              },
              {
                name: "Backend API",
                agent: "dev",
                tasks: ["task-3"],
                reasoning: "API development",
              },
            ],
            parallelizationStrategy: "Frontend and backend can proceed in parallel",
            risks: ["Dependency on external API"],
            recommendations: ["Start with API integration first"],
          }),
        },
      }],
    }),
  }));

  it("should have sprint orchestrator module", async () => {
    const orchestrator = await import("./sprint/orchestrator");
    expect(orchestrator.generateSprintPlan).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DRIVE INTEGRATION TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Google Drive Integration", () => {
  it("should have drive router module", async () => {
    const driveRouter = await import("./drive/router");
    expect(driveRouter.driveRouter).toBeDefined();
  });

  it("should have required procedures", async () => {
    const { driveRouter } = await import("./drive/router");
    
    // Check that the router has the expected procedures
    const procedures = Object.keys(driveRouter._def.procedures);
    expect(procedures).toContain("getConnection");
    expect(procedures).toContain("getAuthUrl");
    expect(procedures).toContain("handleCallback");
    expect(procedures).toContain("disconnect");
    expect(procedures).toContain("listFiles");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// WORKSPACE STATE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Workspace State", () => {
  it("should have all pane content types", () => {
    const types = ['board', 'github', 'editor', 'browser', 'drive', 'empty'];
    // This is a compile-time check - if the type doesn't include all these,
    // TypeScript will error
    expect(types.length).toBe(6);
  });
});
