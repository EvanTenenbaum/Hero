/**
 * Meta Router - tRPC endpoints for the self-modifying IDE
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { agentLogs, AgentLog } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  META_AGENT_SYSTEM_PROMPT,
  isProtectedFile,
  getProtectionReason,
  CODEBASE_STRUCTURE,
} from "./metaAgentPrompt";
import {
  readProjectFile,
  writeProjectFile,
  checkFilePermission,
  validateTypeScript,
  generateDiff,
  applyChangesAtomically,
  FileChange,
} from "./fileModificationService";
import {
  readProjectFile as readCloudFile,
  writeProjectFile as writeCloudFile,
  validateTypeScript as validateCloudTypeScript,
  generateDiff as generateCloudDiff,
  applyChangesAtomically as applyCloudChangesAtomically,
} from "./cloudFileModificationService";
import { SandboxManager } from "../services/sandboxManager";
import { invokeLLM } from "../_core/llm";

export const metaRouter = router({
  /**
   * Get the meta agent system prompt
   */
  getSystemPrompt: protectedProcedure.query(() => {
    return {
      prompt: META_AGENT_SYSTEM_PROMPT,
      codebaseStructure: CODEBASE_STRUCTURE,
    };
  }),

  /**
   * Check if a file is protected
   */
  checkFileProtection: protectedProcedure
    .input(z.object({ filePath: z.string() }))
    .query(({ input }) => {
      const isProtected = isProtectedFile(input.filePath);
      const reason = getProtectionReason(input.filePath);
      const permission = checkFilePermission(input.filePath);
      
      return {
        isProtected,
        reason,
        requiresConfirmation: permission.requiresConfirmation,
      };
    }),

  /**
   * Read a file from the project
   */
  readFile: protectedProcedure
    .input(z.object({ filePath: z.string() }))
    .query(async ({ input }) => {
      const content = await readProjectFile(input.filePath);
      return { content, exists: content !== null };
    }),

  /**
   * Preview changes before applying
   */
  previewChanges: protectedProcedure
    .input(z.object({
      changes: z.array(z.object({
        filePath: z.string(),
        newContent: z.string(),
        changeType: z.enum(["create", "modify", "delete"]),
      })),
    }))
    .mutation(async ({ input }) => {
      const previews = [];
      
      for (const change of input.changes) {
        const originalContent = await readProjectFile(change.filePath);
        const diff = generateDiff(originalContent, change.newContent, change.filePath);
        const permission = checkFilePermission(change.filePath);
        
        previews.push({
          filePath: change.filePath,
          changeType: change.changeType,
          diff,
          isProtected: permission.requiresConfirmation,
          protectionReason: permission.reason,
        });
      }
      
      return { previews };
    }),

  /**
   * Apply changes to the codebase
   */
  applyChanges: protectedProcedure
    .input(z.object({
      changes: z.array(z.object({
        filePath: z.string(),
        newContent: z.string(),
        changeType: z.enum(["create", "modify", "delete"]),
      })),
      confirmedProtectedFiles: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check for unconfirmed protected files
      const unconfirmedProtected = [];
      for (const change of input.changes) {
        if (isProtectedFile(change.filePath)) {
          if (!input.confirmedProtectedFiles?.includes(change.filePath)) {
            unconfirmedProtected.push({
              filePath: change.filePath,
              reason: getProtectionReason(change.filePath),
            });
          }
        }
      }
      
      if (unconfirmedProtected.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Some protected files require confirmation",
          cause: { unconfirmedProtected },
        });
      }
      
      // Prepare file changes
      const fileChanges: FileChange[] = [];
      for (const change of input.changes) {
        const originalContent = await readProjectFile(change.filePath);
        fileChanges.push({
          filePath: change.filePath,
          originalContent,
          newContent: change.newContent,
          changeType: change.changeType,
        });
      }
      
      // Apply changes atomically
      const result = await applyChangesAtomically(fileChanges);
      
      // Log the modification
      const db = await getDb();
      if (db) {
        await db.insert(agentLogs).values({
        userId: ctx.user.id,
        agentType: "meta",
        event: result.success 
          ? `Applied ${result.appliedChanges.length} file changes`
          : `Failed: ${result.failedChanges.map(f => f.error).join(", ")}`,
        level: result.success ? "info" : "error",
        data: {
          changes: input.changes.map(c => ({ path: c.filePath, type: c.changeType })),
          result,
        },
        });
      }
      
      return result;
    }),

  /**
   * Validate TypeScript compilation
   */
  validateTypeScript: protectedProcedure.mutation(async () => {
    return await validateTypeScript();
  }),

  /**
   * Get modification history
   */
  getModificationHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const logs = await db
        .select()
        .from(agentLogs)
        .where(eq(agentLogs.agentType, "meta"))
        .orderBy(desc(agentLogs.createdAt))
        .limit(input.limit);
      
      return logs.map((log: AgentLog) => ({
        id: log.id,
        level: log.level,
        event: log.event,
        data: log.data,
        createdAt: log.createdAt,
      }));
    }),

  /**
   * Chat with the meta agent to get code suggestions
   */
  chat: protectedProcedure
    .input(z.object({
      message: z.string(),
      context: z.object({
        currentFile: z.string().optional(),
        selectedCode: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      // Build context for the LLM
      let contextPrompt = "";
      
      if (input.context?.currentFile) {
        const fileContent = await readProjectFile(input.context.currentFile);
        if (fileContent) {
          contextPrompt += `\n\nCurrent file (${input.context.currentFile}):\n\`\`\`\n${fileContent.slice(0, 5000)}\n\`\`\``;
        }
      }
      
      if (input.context?.selectedCode) {
        contextPrompt += `\n\nSelected code:\n\`\`\`\n${input.context.selectedCode}\n\`\`\``;
      }
      
      // Call LLM
      const response = await invokeLLM({
        messages: [
          { role: "system", content: META_AGENT_SYSTEM_PROMPT },
          { role: "user", content: input.message + contextPrompt },
        ],
      });
      
      const messageContent = response.choices[0]?.message?.content;
      const assistantMessage = typeof messageContent === "string" ? messageContent : "I couldn't generate a response.";
      
      // Parse any code blocks from the response
      const codeBlockRegex = /```(?:tsx?|jsx?|css|json)?\n([\s\S]*?)```/g;
      const codeBlocks: { language: string; code: string }[] = [];
      let match;
      
      while ((match = codeBlockRegex.exec(assistantMessage)) !== null) {
        codeBlocks.push({
          language: match[0].split("\n")[0].replace("```", "") || "typescript",
          code: match[1],
        });
      }
      
      return {
        message: assistantMessage,
        codeBlocks,
        suggestedChanges: codeBlocks.length > 0,
      };
    }),

  /**
   * Get list of project files for browsing
   */
  listFiles: protectedProcedure
    .input(z.object({ directory: z.string().default("") }))
    .query(async ({ input }) => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const projectRoot = process.cwd();
      const targetDir = path.join(projectRoot, input.directory);
      
      try {
        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        
        return entries
          .filter(entry => {
            // Filter out node_modules, .git, etc.
            const name = entry.name;
            return !name.startsWith(".") && 
                   name !== "node_modules" && 
                   name !== "dist" &&
                   name !== "build";
          })
          .map(entry => ({
            name: entry.name,
            path: path.join(input.directory, entry.name),
            isDirectory: entry.isDirectory(),
            isProtected: isProtectedFile(path.join(input.directory, entry.name)),
          }));
      } catch {
        return [];
      }
    }),

  // ════════════════════════════════════════════════════════════════════════════
  // CLOUD SANDBOX FILE OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Read a file from the cloud sandbox
   */
  cloudReadFile: protectedProcedure
    .input(z.object({ 
      projectId: z.number(),
      filePath: z.string() 
    }))
    .query(async ({ input }) => {
      const sandboxManager = SandboxManager.getInstance();
      const sandbox = await sandboxManager.getOrCreateSandbox(input.projectId);
      
      if (!sandbox) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox not available" });
      }
      
      const content = await readCloudFile(sandbox, input.filePath);
      return { content, exists: content !== null };
    }),

  /**
   * Preview changes in cloud sandbox before applying
   */
  cloudPreviewChanges: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      changes: z.array(z.object({
        filePath: z.string(),
        newContent: z.string(),
        changeType: z.enum(["create", "modify", "delete"]),
      })),
    }))
    .mutation(async ({ input }) => {
      const sandboxManager = SandboxManager.getInstance();
      const sandbox = await sandboxManager.getOrCreateSandbox(input.projectId);
      
      if (!sandbox) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox not available" });
      }
      
      const previews = [];
      
      for (const change of input.changes) {
        const originalContent = await readCloudFile(sandbox, change.filePath);
        const diff = generateCloudDiff(originalContent, change.newContent, change.filePath);
        const permission = checkFilePermission(change.filePath);
        
        previews.push({
          filePath: change.filePath,
          changeType: change.changeType,
          diff,
          isProtected: permission.requiresConfirmation,
          protectionReason: permission.reason,
        });
      }
      
      return { previews };
    }),

  /**
   * Apply changes to the cloud sandbox
   */
  cloudApplyChanges: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      changes: z.array(z.object({
        filePath: z.string(),
        newContent: z.string(),
        changeType: z.enum(["create", "modify", "delete"]),
      })),
      confirmedProtectedFiles: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sandboxManager = SandboxManager.getInstance();
      const sandbox = await sandboxManager.getOrCreateSandbox(input.projectId);
      
      if (!sandbox) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox not available" });
      }
      
      // Check for unconfirmed protected files
      const unconfirmedProtected = [];
      for (const change of input.changes) {
        if (isProtectedFile(change.filePath)) {
          if (!input.confirmedProtectedFiles?.includes(change.filePath)) {
            unconfirmedProtected.push({
              filePath: change.filePath,
              reason: getProtectionReason(change.filePath),
            });
          }
        }
      }
      
      if (unconfirmedProtected.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Some protected files require confirmation",
          cause: { unconfirmedProtected },
        });
      }
      
      // Prepare file changes
      const fileChanges = [];
      for (const change of input.changes) {
        const originalContent = await readCloudFile(sandbox, change.filePath);
        fileChanges.push({
          filePath: change.filePath,
          originalContent,
          newContent: change.newContent,
          changeType: change.changeType,
        });
      }
      
      // Apply changes atomically in the sandbox
      const result = await applyCloudChangesAtomically(sandbox, fileChanges);
      
      // Log the modification
      const db = await getDb();
      if (db) {
        await db.insert(agentLogs).values({
          userId: ctx.user.id,
          agentType: "meta",
          level: "info",
          event: "cloud_file_modification",
          data: {
            projectId: input.projectId,
            filesModified: input.changes.map(c => c.filePath),
            success: result.success,
          },
        });
      }
      
      return result;
    }),

  /**
   * Validate TypeScript in cloud sandbox
   */
  cloudValidateTypeScript: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const sandboxManager = SandboxManager.getInstance();
      const sandbox = await sandboxManager.getOrCreateSandbox(input.projectId);
      
      if (!sandbox) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox not available" });
      }
      
      return validateCloudTypeScript(sandbox);
    }),

  /**
   * List files in cloud sandbox
   */
  cloudListFiles: protectedProcedure
    .input(z.object({ 
      projectId: z.number(),
      directory: z.string().default("") 
    }))
    .query(async ({ input }) => {
      const sandboxManager = SandboxManager.getInstance();
      const sandbox = await sandboxManager.getOrCreateSandbox(input.projectId);
      
      if (!sandbox) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox not available" });
      }
      
      const { REPO_PATH } = await import("../services/sandboxManager");
      const targetDir = `${REPO_PATH}/${input.directory}`.replace(/\/+/g, '/');
      
      try {
        const result = await sandbox.commands.run(
          `find "${targetDir}" -maxdepth 1 -type f -o -type d | head -100`
        );
        
        const entries = result.stdout.split('\n')
          .filter(line => line && line !== targetDir)
          .map(fullPath => {
            const name = fullPath.split('/').pop() || '';
            const relativePath = fullPath.replace(REPO_PATH + '/', '');
            return {
              name,
              path: relativePath,
              isDirectory: !name.includes('.'),
              isProtected: isProtectedFile(relativePath),
            };
          })
          .filter(entry => {
            return !entry.name.startsWith('.') && 
                   entry.name !== 'node_modules' && 
                   entry.name !== 'dist';
          });
        
        return entries;
      } catch {
        return [];
      }
    }),
});
