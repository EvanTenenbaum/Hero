/**
 * Feature Flags Router
 *
 * Admin-controlled feature flags for gradual rollout of enhanced agent features.
 * Provides endpoints for managing and querying feature flags.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { agentLogs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface FeatureFlags {
  // Enhanced Agent Features
  enableAgentMemory: boolean;
  enableAgentLearning: boolean;
  enableAgentReflection: boolean;
  enableAgentAdaptive: boolean;

  // Cloud Sandbox Features
  enableCloudSandbox: boolean;
  enableCloudExecution: boolean;

  // KIRO-inspired Features (Phase 3)
  enableSteering: boolean;
  enableSpecs: boolean;
  enableHooks: boolean;
}

// Default feature flags (all disabled for safe rollout)
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableAgentMemory: false,
  enableAgentLearning: false,
  enableAgentReflection: false,
  enableAgentAdaptive: false,
  enableCloudSandbox: true, // Already implemented
  enableCloudExecution: true, // Already implemented
  enableSteering: false,
  enableSpecs: false,
  enableHooks: false,
};

// In-memory feature flag cache (per-project)
const featureFlagCache = new Map<number, FeatureFlags>();

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get feature flags for a project.
 * Returns defaults if no project-specific flags are set.
 */
export function getFeatureFlags(projectId?: number): FeatureFlags {
  // Check environment overrides first (global)
  const envFlags: Partial<FeatureFlags> = {
    enableAgentMemory: process.env.HERO_ENABLE_AGENT_MEMORY === 'true',
    enableAgentLearning: process.env.HERO_ENABLE_AGENT_LEARNING === 'true',
    enableAgentReflection: process.env.HERO_ENABLE_AGENT_REFLECTION === 'true',
    enableAgentAdaptive: process.env.HERO_ENABLE_AGENT_ADAPTIVE === 'true',
    enableSteering: process.env.HERO_ENABLE_STEERING === 'true',
    enableSpecs: process.env.HERO_ENABLE_SPECS === 'true',
    enableHooks: process.env.HERO_ENABLE_HOOKS === 'true',
  };

  // Merge defaults with env overrides
  const baseFlags = { ...DEFAULT_FEATURE_FLAGS, ...envFlags };

  // Check project-specific overrides
  if (projectId && featureFlagCache.has(projectId)) {
    const projectFlags = featureFlagCache.get(projectId)!;
    return { ...baseFlags, ...projectFlags };
  }

  return baseFlags;
}

/**
 * Set feature flags for a project.
 */
export function setProjectFeatureFlags(projectId: number, flags: Partial<FeatureFlags>): void {
  const current = featureFlagCache.get(projectId) || { ...DEFAULT_FEATURE_FLAGS };
  featureFlagCache.set(projectId, { ...current, ...flags });
}

/**
 * Check if a specific feature is enabled.
 */
export function isFeatureEnabled(feature: keyof FeatureFlags, projectId?: number): boolean {
  const flags = getFeatureFlags(projectId);
  return flags[feature];
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const featureFlagsRouter = router({
  /**
   * Get all feature flags for a project (or global defaults)
   */
  get: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(({ input }) => {
      return getFeatureFlags(input.projectId);
    }),

  /**
   * Set feature flags for a project (admin only)
   */
  set: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      flags: z.object({
        enableAgentMemory: z.boolean().optional(),
        enableAgentLearning: z.boolean().optional(),
        enableAgentReflection: z.boolean().optional(),
        enableAgentAdaptive: z.boolean().optional(),
        enableCloudSandbox: z.boolean().optional(),
        enableCloudExecution: z.boolean().optional(),
        enableSteering: z.boolean().optional(),
        enableSpecs: z.boolean().optional(),
        enableHooks: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can modify feature flags',
        });
      }

      setProjectFeatureFlags(input.projectId, input.flags);

      // Log the change
      const db = await getDb();
      if (db) {
        await db.insert(agentLogs).values({
          userId: ctx.user.id,
          agentType: 'system',
          event: 'feature_flags_updated',
          level: 'info',
          data: {
            projectId: input.projectId,
            flags: input.flags,
          },
        });
      }

      return {
        success: true,
        flags: getFeatureFlags(input.projectId),
      };
    }),

  /**
   * Reset feature flags to defaults for a project
   */
  reset: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can modify feature flags',
        });
      }

      featureFlagCache.delete(input.projectId);

      return {
        success: true,
        flags: getFeatureFlags(input.projectId),
      };
    }),

  /**
   * Check if a specific feature is enabled
   */
  isEnabled: protectedProcedure
    .input(z.object({
      feature: z.enum([
        'enableAgentMemory',
        'enableAgentLearning',
        'enableAgentReflection',
        'enableAgentAdaptive',
        'enableCloudSandbox',
        'enableCloudExecution',
        'enableSteering',
        'enableSpecs',
        'enableHooks',
      ]),
      projectId: z.number().optional(),
    }))
    .query(({ input }) => {
      return {
        feature: input.feature,
        enabled: isFeatureEnabled(input.feature, input.projectId),
      };
    }),
});

export type FeatureFlagsRouter = typeof featureFlagsRouter;
