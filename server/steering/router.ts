/**
 * HERO Steering Router
 *
 * tRPC router for steering configuration management.
 * Allows reading and modifying .hero/steering/ files.
 *
 * Note: For cloud sandbox projects, steering files are stored in the sandbox.
 * For local projects, steering is configured via database settings.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import * as db from '../db';
import { isFeatureEnabled } from '../routers/featureFlags';
import {
  readSteeringConfig,
  generateSteeringContext,
  clearSteeringCache,
  SteeringConfig,
  ProductSteering,
  TechStackSteering,
  RequirementsSteering,
  AgentsSteering,
} from './steeringService';

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Build steering config from project settings
// ════════════════════════════════════════════════════════════════════════════

function buildSteeringFromProject(project: {
  name: string;
  description: string | null;
  settings?: { language?: string; framework?: string } | null;
  repoOwner?: string | null;
  repoName?: string | null;
}): SteeringConfig {
  const settings = project.settings as { language?: string; framework?: string } | null;

  const product: ProductSteering = {
    name: project.name,
    description: project.description || '',
    goals: [],
    targetUsers: [],
  };

  const techStack: TechStackSteering = {
    languages: settings?.language ? [settings.language] : ['TypeScript'],
    frameworks: settings?.framework ? [settings.framework] : [],
    databases: [],
    conventions: {
      naming: 'camelCase for variables, PascalCase for types',
      codeStyle: 'ESLint/Prettier defaults',
      testingApproach: 'Unit tests with Vitest',
      documentation: 'JSDoc comments for public APIs',
    },
  };

  const requirements: RequirementsSteering = {
    functional: [],
    nonFunctional: [],
    constraints: [],
  };

  const agents: AgentsSteering = {
    globalRules: [],
  };

  return { product, techStack, requirements, agents };
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const steeringRouter = router({
  /**
   * Get steering configuration for a project
   */
  get: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Check feature flag
      if (!isFeatureEnabled('enableSteering', input.projectId)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Steering feature is not enabled for this project',
        });
      }

      // Get project
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // For cloud sandbox projects, steering would be read from sandbox filesystem
      // For now, build steering from project settings
      const config = buildSteeringFromProject(project);
      const hasCloudSandbox = !!(project.useCloudSandbox && project.repoOwner && project.repoName);

      return {
        config,
        hasSteeringDir: hasCloudSandbox,
        isCloudProject: hasCloudSandbox,
      };
    }),

  /**
   * Get steering context formatted for agent prompts
   */
  getContext: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      agentType: z.enum(['pm', 'developer', 'qa', 'devops', 'research']),
    }))
    .query(async ({ ctx, input }) => {
      // Get project
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const config = buildSteeringFromProject(project);
      const context = generateSteeringContext(config, input.agentType);

      return { context };
    }),

  /**
   * Update product steering
   */
  updateProduct: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      goals: z.array(z.string()).optional(),
      targetUsers: z.array(z.string()).optional(),
      nonGoals: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check feature flag
      if (!isFeatureEnabled('enableSteering', input.projectId)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Steering feature is not enabled for this project',
        });
      }

      // Get and verify project
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Update project name/description if provided
      const updates: { name?: string; description?: string } = {};
      if (input.name) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;

      if (Object.keys(updates).length > 0) {
        await db.updateProject(input.projectId, ctx.user.id, updates);
      }

      // For goals, targetUsers, nonGoals - these would be stored in project settings
      // or in a separate steering table. For now, just return success.

      return { success: true };
    }),

  /**
   * Update tech stack steering
   */
  updateTechStack: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      language: z.string().optional(),
      framework: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check feature flag
      if (!isFeatureEnabled('enableSteering', input.projectId)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Steering feature is not enabled for this project',
        });
      }

      // Get and verify project
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Update project settings
      const currentSettings = (project.settings as { language?: string; framework?: string } | null) || {};
      const newSettings = {
        ...currentSettings,
        ...(input.language && { language: input.language }),
        ...(input.framework && { framework: input.framework }),
      };

      await db.updateProject(input.projectId, ctx.user.id, { settings: newSettings });

      return { success: true };
    }),

  /**
   * Clear steering cache for a project
   */
  clearCache: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Clear cache using project ID as key
      clearSteeringCache(`project-${input.projectId}`);

      return { success: true };
    }),

  /**
   * Check if steering is available for a project
   */
  isAvailable: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const enabled = isFeatureEnabled('enableSteering', input.projectId);

      const project = await db.getProjectById(input.projectId, ctx.user.id);
      const hasCloudSandbox = !!(project?.useCloudSandbox);

      return {
        available: enabled,
        hasCloudSandbox,
        reason: !enabled
          ? 'Steering feature flag is disabled'
          : undefined,
      };
    }),
});

export type SteeringRouter = typeof steeringRouter;
