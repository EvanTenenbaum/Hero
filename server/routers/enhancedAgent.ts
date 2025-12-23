/**
 * Enhanced Agent Router - Phase 2 Integration
 *
 * Provides tRPC endpoints for the enhanced agent system with
 * feature flag integration for gradual rollout.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getFeatureFlags, isFeatureEnabled } from './featureFlags';
import {
  createSafeEnhancedAgent,
  processMessageSafe,
  checkEnhancedAgentHealth
} from '../agents/safeEnhancedAgentWrapper';
import { AgentTaskType } from '../agents/enhancedPromptSystem';
import * as db from '../db';
import { logger } from '../_core/logger';

// ════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const taskTypeSchema = z.enum([
  'CODE_GENERATION',
  'CODE_REVIEW',
  'DEBUGGING',
  'DOCUMENTATION',
  'TESTING',
  'REFACTORING',
  'ARCHITECTURE',
  'GENERAL'
]);

const chatContextSchema = z.object({
  projectFiles: z.array(z.string()).default([]),
  currentFile: z.string().optional(),
  currentFileContent: z.string().optional(),
  techStack: z.string().default(''),
  recentMessages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).default([]),
});

const executeEnhancedSchema = z.object({
  message: z.string().min(1).max(100000),
  projectId: z.number(),
  taskType: taskTypeSchema.optional().default('CODE_GENERATION'),
  context: chatContextSchema.optional(),
  sessionId: z.string().optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const enhancedAgentRouter = router({
  /**
   * Execute a message through the enhanced agent system
   */
  execute: protectedProcedure
    .input(executeEnhancedSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      // Check feature flags
      const flags = getFeatureFlags(input.projectId);
      const anyEnhancedFeaturesEnabled =
        flags.enableAgentMemory ||
        flags.enableAgentLearning ||
        flags.enableAgentReflection ||
        flags.enableAgentAdaptive;

      if (!anyEnhancedFeaturesEnabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Enhanced agent features are not enabled for this project. Use feature flags to enable.',
        });
      }

      // Verify project ownership
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Generate session ID if not provided
      const sessionId = input.sessionId || `session-${ctx.user.id}-${Date.now()}`;

      try {
        // Create the enhanced agent
        const agent = await createSafeEnhancedAgent({
          userId: ctx.user.id,
          projectId: input.projectId,
          sessionId,
          model: 'gemini-2.5-flash',
          maxTokens: 8192,
        });

        if (!agent) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create enhanced agent',
          });
        }

        // Build context
        const context = input.context || {
          projectFiles: [],
          techStack: project.settings?.language || '',
          recentMessages: [],
        };

        // Process the message
        const result = await processMessageSafe(
          agent,
          input.message,
          context,
          input.taskType as AgentTaskType
        );

        const durationMs = Date.now() - startTime;

        logger.info({
          userId: ctx.user.id,
          projectId: input.projectId,
          taskType: input.taskType,
          durationMs,
          learningApplied: result.learningApplied,
          memoryUsed: result.memoryUsed,
        }, 'Enhanced agent execution completed');

        return {
          success: true,
          response: result.response,
          toolsUsed: result.toolsUsed,
          filesModified: result.filesModified,
          executionTimeMs: result.executionTimeMs,
          confidence: result.confidence,
          learningApplied: result.learningApplied,
          memoryUsed: result.memoryUsed,
          sessionId,
        };

      } catch (error) {
        logger.error({ error, userId: ctx.user.id, projectId: input.projectId }, 'Enhanced agent execution failed');

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Enhanced agent execution failed',
        });
      }
    }),

  /**
   * Get enhanced agent status and feature flags
   */
  status: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ input }) => {
      const flags = getFeatureFlags(input.projectId);
      const health = await checkEnhancedAgentHealth();

      return {
        enabled: flags.enableAgentMemory || flags.enableAgentLearning ||
                 flags.enableAgentReflection || flags.enableAgentAdaptive,
        features: {
          memory: flags.enableAgentMemory,
          learning: flags.enableAgentLearning,
          reflection: flags.enableAgentReflection,
          adaptive: flags.enableAgentAdaptive,
        },
        health: {
          healthy: health.healthy,
          database: health.database,
          errors: health.errors,
        },
      };
    }),

  /**
   * Check if enhanced features are available
   */
  isAvailable: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        return { available: false, reason: 'Project not found' };
      }

      const flags = getFeatureFlags(input.projectId);
      const health = await checkEnhancedAgentHealth();

      const anyEnabled = flags.enableAgentMemory || flags.enableAgentLearning ||
                         flags.enableAgentReflection || flags.enableAgentAdaptive;

      if (!anyEnabled) {
        return {
          available: false,
          reason: 'No enhanced features enabled. Contact admin to enable feature flags.'
        };
      }

      if (!health.healthy) {
        return {
          available: false,
          reason: `Health check failed: ${health.errors.join(', ')}`
        };
      }

      return { available: true };
    }),

  /**
   * Get available task types
   */
  getTaskTypes: protectedProcedure
    .query(() => {
      return {
        taskTypes: [
          { id: 'CODE_GENERATION', name: 'Code Generation', description: 'Generate new code' },
          { id: 'CODE_REVIEW', name: 'Code Review', description: 'Review and improve existing code' },
          { id: 'DEBUGGING', name: 'Debugging', description: 'Find and fix bugs' },
          { id: 'DOCUMENTATION', name: 'Documentation', description: 'Write or improve documentation' },
          { id: 'TESTING', name: 'Testing', description: 'Write tests for code' },
          { id: 'REFACTORING', name: 'Refactoring', description: 'Improve code structure' },
          { id: 'ARCHITECTURE', name: 'Architecture', description: 'Design system architecture' },
          { id: 'GENERAL', name: 'General', description: 'General assistance' },
        ],
      };
    }),
});

export type EnhancedAgentRouter = typeof enhancedAgentRouter;
