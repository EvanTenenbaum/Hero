/**
 * Cloud Sandbox Router
 * 
 * Provides tRPC endpoints for cloud sandbox management including:
 * - Sandbox lifecycle (start, stop, status)
 * - File operations
 * - Terminal execution
 * - Git sync operations
 * 
 * @module server/routers/cloudSandbox
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { sandboxManager, REPO_PATH } from '../services/sandboxManager';
import { projectHydrator } from '../services/projectHydrator';
// Secrets are injected during hydration via projectHydrator
import * as db from '../db';

// ════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const startSandboxInput = z.object({
  projectId: z.number(),
});

const stopSandboxInput = z.object({
  projectId: z.number(),
});

const sandboxStatusInput = z.object({
  projectId: z.number(),
});

const executeCommandInput = z.object({
  projectId: z.number(),
  command: z.string().min(1).max(10000),
  workingDir: z.string().optional(),
  timeoutMs: z.number().min(1000).max(300000).default(30000),
});

const readFileInput = z.object({
  projectId: z.number(),
  path: z.string().min(1).max(1000),
});

const writeFileInput = z.object({
  projectId: z.number(),
  path: z.string().min(1).max(1000),
  content: z.string(),
});

const listFilesInput = z.object({
  projectId: z.number(),
  path: z.string().default('.'),
});

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

async function verifyProjectAccess(projectId: number, userId: number) {
  const project = await db.getProjectById(projectId, userId);
  if (!project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found or access denied',
    });
  }
  return project;
}

function validatePath(path: string): void {
  if (path.includes('..') || path.includes('\0')) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid path: path traversal not allowed',
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CLOUD SANDBOX ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const cloudSandboxRouter = router({
  /**
   * Start a cloud sandbox for a project
   */
  start: protectedProcedure
    .input(startSandboxInput)
    .mutation(async ({ ctx, input }) => {
      const project = await verifyProjectAccess(input.projectId, ctx.user.id);
      
      if (!project.useCloudSandbox) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cloud sandbox is not enabled for this project',
        });
      }

      try {
        const sandbox = await sandboxManager.getOrStartSandbox(String(input.projectId));
        
        // Hydrate the project if it has a GitHub repo
        if (project.repoOwner && project.repoName) {
          await projectHydrator.hydrate(sandbox, project as any);
        }

        return {
          success: true,
          sandboxId: String(input.projectId),
          repoPath: REPO_PATH,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to start sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Stop a cloud sandbox for a project
   */
  stop: protectedProcedure
    .input(stopSandboxInput)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(input.projectId, ctx.user.id);
      
      try {
        await sandboxManager.closeSandbox(String(input.projectId));
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to stop sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Get sandbox status for a project
   */
  status: protectedProcedure
    .input(sandboxStatusInput)
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(input.projectId, ctx.user.id);
      
      const isRunning = sandboxManager.hasSandbox(String(input.projectId));
      const info = sandboxManager.getSandboxInfo(String(input.projectId));
      
      return {
        isRunning,
        ...(info && {
          createdAt: info.createdAt,
          lastAccessedAt: info.lastAccessedAt,
          isHealthy: info.isHealthy,
        }),
      };
    }),

  /**
   * Execute a command in the sandbox
   */
  execute: protectedProcedure
    .input(executeCommandInput)
    .mutation(async ({ ctx, input }) => {
      const project = await verifyProjectAccess(input.projectId, ctx.user.id);
      
      if (!project.useCloudSandbox) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cloud sandbox is not enabled for this project',
        });
      }

      const sandbox = await sandboxManager.getOrStartSandbox(String(input.projectId));
      
      try {
        const workDir = input.workingDir 
          ? `${REPO_PATH}/${input.workingDir}`.replace(/\/+/g, '/')
          : REPO_PATH;
        
        const result = await sandbox.commands.run(
          `cd ${workDir} && ${input.command}`,
          { timeoutMs: input.timeoutMs }
        );
        
        return {
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Read a file from the sandbox
   */
  readFile: protectedProcedure
    .input(readFileInput)
    .query(async ({ ctx, input }) => {
      const project = await verifyProjectAccess(input.projectId, ctx.user.id);
      
      if (!project.useCloudSandbox) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cloud sandbox is not enabled for this project',
        });
      }

      validatePath(input.path);
      
      const sandbox = await sandboxManager.getOrStartSandbox(String(input.projectId));
      
      try {
        const fullPath = `${REPO_PATH}/${input.path}`.replace(/\/+/g, '/');
        const content = await sandbox.files.read(fullPath);
        
        return {
          success: true,
          content,
          path: input.path,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File not found: ${input.path}`,
        });
      }
    }),

  /**
   * Write a file to the sandbox
   */
  writeFile: protectedProcedure
    .input(writeFileInput)
    .mutation(async ({ ctx, input }) => {
      const project = await verifyProjectAccess(input.projectId, ctx.user.id);
      
      if (!project.useCloudSandbox) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cloud sandbox is not enabled for this project',
        });
      }

      validatePath(input.path);
      
      const sandbox = await sandboxManager.getOrStartSandbox(String(input.projectId));
      
      try {
        const fullPath = `${REPO_PATH}/${input.path}`.replace(/\/+/g, '/');
        await sandbox.files.write(fullPath, input.content);
        
        return {
          success: true,
          path: input.path,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * List files in a directory
   */
  listFiles: protectedProcedure
    .input(listFilesInput)
    .query(async ({ ctx, input }) => {
      const project = await verifyProjectAccess(input.projectId, ctx.user.id);
      
      if (!project.useCloudSandbox) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cloud sandbox is not enabled for this project',
        });
      }

      validatePath(input.path);
      
      const sandbox = await sandboxManager.getOrStartSandbox(String(input.projectId));
      
      try {
        const fullPath = `${REPO_PATH}/${input.path}`.replace(/\/+/g, '/');
        const result = await sandbox.commands.run(
          `ls -la ${fullPath}`,
          { timeoutMs: 10000 }
        );
        
        // Parse ls output into structured data
        const lines = result.stdout.split('\n').filter(l => l.trim() && !l.startsWith('total'));
        const files = lines.map(line => {
          const parts = line.split(/\s+/);
          if (parts.length >= 9) {
            const permissions = parts[0];
            const size = parseInt(parts[4], 10);
            const name = parts.slice(8).join(' ');
            const isDirectory = permissions.startsWith('d');
            return { name, size, isDirectory, permissions };
          }
          return null;
        }).filter(Boolean);
        
        return {
          success: true,
          path: input.path,
          files,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});

export type CloudSandboxRouter = typeof cloudSandboxRouter;
