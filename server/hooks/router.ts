/**
 * HERO Hooks Router
 *
 * tRPC router for managing agent lifecycle hooks.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import * as db from '../db';
import { isFeatureEnabled } from '../routers/featureFlags';
import {
  registerHook,
  updateHook,
  deleteHook,
  getHook,
  listHooks,
  listHooksByType,
  runHooks,
  HookType,
  HookActionType,
  HookContext,
} from './hooksService';

// ════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const hookTypeSchema = z.enum([
  'pre_execution',
  'post_execution',
  'on_file_change',
  'on_error',
  'on_approval_required',
  'on_checkpoint',
]);

const hookActionTypeSchema = z.enum([
  'validate',
  'transform',
  'notify',
  'log',
  'execute',
  'guard',
]);

const hookConditionSchema = z.object({
  agentTypes: z.array(z.string()).optional(),
  filePatterns: z.array(z.string()).optional(),
  messagePatterns: z.array(z.string()).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
}).optional();

const hookActionSchema = z.object({
  validationPrompt: z.string().optional(),
  blockedMessage: z.string().optional(),
  transformPrompt: z.string().optional(),
  notifyEndpoint: z.string().optional(),
  notifyTemplate: z.string().optional(),
  executeScript: z.string().optional(),
  executePrompt: z.string().optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  logTemplate: z.string().optional(),
});

const createHookSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: hookTypeSchema,
  actionType: hookActionTypeSchema,
  enabled: z.boolean().default(true),
  priority: z.number().min(0).max(100).default(50),
  condition: hookConditionSchema,
  action: hookActionSchema,
  projectId: z.number().optional(),
});

const updateHookSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: hookTypeSchema.optional(),
  actionType: hookActionTypeSchema.optional(),
  enabled: z.boolean().optional(),
  priority: z.number().min(0).max(100).optional(),
  condition: hookConditionSchema,
  action: hookActionSchema.optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const hooksRouter = router({
  /**
   * List all hooks
   */
  list: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      type: hookTypeSchema.optional(),
    }).optional())
    .query(async ({ input }) => {
      if (input?.type) {
        return listHooksByType(input.type as HookType, input?.projectId);
      }
      return listHooks(input?.projectId);
    }),

  /**
   * Get a hook by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const hook = getHook(input.id);
      if (!hook) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hook not found',
        });
      }
      return hook;
    }),

  /**
   * Create a new hook
   */
  create: protectedProcedure
    .input(createHookSchema)
    .mutation(async ({ ctx, input }) => {
      // Check feature flag if project-specific
      if (input.projectId && !isFeatureEnabled('enableHooks', input.projectId)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Hooks feature is not enabled for this project',
        });
      }

      // Verify project ownership if project-specific
      if (input.projectId) {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }
      }

      const hook = registerHook({
        name: input.name,
        description: input.description,
        type: input.type as HookType,
        actionType: input.actionType as HookActionType,
        enabled: input.enabled,
        priority: input.priority,
        condition: input.condition,
        action: input.action,
        projectId: input.projectId,
      });

      return hook;
    }),

  /**
   * Update a hook
   */
  update: protectedProcedure
    .input(updateHookSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = getHook(input.id);
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hook not found',
        });
      }

      // Verify project ownership if project-specific
      if (existing.projectId) {
        const project = await db.getProjectById(existing.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to update this hook',
          });
        }
      }

      const { id, ...updates } = input;
      const hook = updateHook(id, updates);

      if (!hook) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update hook',
        });
      }

      return hook;
    }),

  /**
   * Delete a hook
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = getHook(input.id);
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hook not found',
        });
      }

      // Don't allow deleting default hooks
      if (input.id.startsWith('default-')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete default hooks',
        });
      }

      // Verify project ownership if project-specific
      if (existing.projectId) {
        const project = await db.getProjectById(existing.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to delete this hook',
          });
        }
      }

      const deleted = deleteHook(input.id);
      return { success: deleted };
    }),

  /**
   * Toggle hook enabled state
   */
  toggle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = getHook(input.id);
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hook not found',
        });
      }

      const hook = updateHook(input.id, { enabled: !existing.enabled });
      return hook;
    }),

  /**
   * Test a hook with sample context
   */
  test: protectedProcedure
    .input(z.object({
      hookId: z.string(),
      context: z.object({
        projectId: z.number(),
        agentType: z.enum(['pm', 'developer', 'qa', 'devops', 'research']),
        message: z.string().optional(),
        files: z.array(z.string()).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const hook = getHook(input.hookId);
      if (!hook) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hook not found',
        });
      }

      const context: HookContext = {
        userId: ctx.user.id,
        projectId: input.context.projectId,
        agentType: input.context.agentType,
        message: input.context.message,
        files: input.context.files,
        executionId: `test-${Date.now()}`,
      };

      const result = await runHooks(hook.type, context);
      return result;
    }),

  /**
   * Get hook types and action types
   */
  getTypes: protectedProcedure
    .query(() => {
      return {
        hookTypes: [
          { id: 'pre_execution', name: 'Pre-Execution', description: 'Run before agent starts a task' },
          { id: 'post_execution', name: 'Post-Execution', description: 'Run after agent completes a task' },
          { id: 'on_file_change', name: 'On File Change', description: 'Run when agent modifies a file' },
          { id: 'on_error', name: 'On Error', description: 'Run when agent encounters an error' },
          { id: 'on_approval_required', name: 'On Approval', description: 'Run when agent needs user approval' },
          { id: 'on_checkpoint', name: 'On Checkpoint', description: 'Run when agent creates a checkpoint' },
        ],
        actionTypes: [
          { id: 'validate', name: 'Validate', description: 'Run validation and potentially block' },
          { id: 'transform', name: 'Transform', description: 'Transform the input/output' },
          { id: 'notify', name: 'Notify', description: 'Send notification (no blocking)' },
          { id: 'log', name: 'Log', description: 'Just log (no blocking)' },
          { id: 'execute', name: 'Execute', description: 'Run custom script/LLM prompt' },
          { id: 'guard', name: 'Guard', description: 'Safety guard (can block)' },
        ],
      };
    }),

  /**
   * Check if hooks feature is available
   */
  isAvailable: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const enabled = isFeatureEnabled('enableHooks', input.projectId);
      return {
        available: enabled,
        reason: !enabled ? 'Hooks feature flag is disabled' : undefined,
      };
    }),
});

export type HooksRouter = typeof hooksRouter;
