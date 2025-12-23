/**
 * Secrets tRPC Router
 * 
 * Provides tRPC endpoints for managing project secrets.
 * Wraps the secretsService with proper authentication and validation.
 * 
 * @module server/routers/secretsRouter
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { secretsService } from './secrets';
import * as db from '../db';

// ════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const addSecretInput = z.object({
  projectId: z.number(),
  key: z.string().min(1).max(255).regex(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Key must be uppercase with underscores (e.g., API_KEY)',
  }),
  value: z.string().min(1),
  description: z.string().optional(),
});

const listSecretsInput = z.object({
  projectId: z.number(),
});

const getSecretInput = z.object({
  projectId: z.number(),
  key: z.string(),
});

const updateSecretInput = z.object({
  projectId: z.number(),
  key: z.string(),
  value: z.string().min(1),
  description: z.string().optional(),
});

const deleteSecretInput = z.object({
  projectId: z.number(),
  key: z.string(),
});

const bulkImportInput = z.object({
  projectId: z.number(),
  secrets: z.record(z.string(), z.string()),
  overwrite: z.boolean().default(false),
});

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

async function verifyProjectAccess(projectId: number, userId: number) {
  // db.getProjectById takes (id, userId) and returns project or null
  const project = await db.getProjectById(projectId, userId);
  if (!project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found or access denied',
    });
  }
  return project;
}

// ════════════════════════════════════════════════════════════════════════════
// SECRETS ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const secretsRouter = router({
  /**
   * Add a new secret to a project
   */
  add: protectedProcedure
    .input(addSecretInput)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(input.projectId, ctx.user.id);
      
      const result = await secretsService.addSecret(
        input.projectId,
        input.key,
        input.value,
        input.description,
        ctx.user.id
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to add secret',
        });
      }
      
      return { success: true, id: result.id };
    }),

  /**
   * List all secrets for a project (metadata only)
   */
  list: protectedProcedure
    .input(listSecretsInput)
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(input.projectId, ctx.user.id);
      
      const secrets = await secretsService.listSecrets(input.projectId, ctx.user.id);
      
      return {
        secrets: secrets.map(s => ({
          id: s.id,
          key: s.key,
          description: s.description,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
      };
    }),

  /**
   * Get a specific secret with its value
   */
  get: protectedProcedure
    .input(getSecretInput)
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(input.projectId, ctx.user.id);
      
      const secret = await secretsService.getSecret(input.projectId, input.key, ctx.user.id);
      
      if (!secret) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Secret "${input.key}" not found`,
        });
      }
      
      return secret;
    }),

  /**
   * Update an existing secret
   */
  update: protectedProcedure
    .input(updateSecretInput)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(input.projectId, ctx.user.id);
      
      const result = await secretsService.updateSecret(
        input.projectId,
        input.key,
        input.value,
        input.description,
        ctx.user.id
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update secret',
        });
      }
      
      return { success: true };
    }),

  /**
   * Delete a secret
   */
  delete: protectedProcedure
    .input(deleteSecretInput)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(input.projectId, ctx.user.id);
      
      const result = await secretsService.deleteSecret(
        input.projectId,
        input.key,
        ctx.user.id
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete secret',
        });
      }
      
      return { success: true };
    }),

  /**
   * Bulk import secrets
   */
  bulkImport: protectedProcedure
    .input(bulkImportInput)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(input.projectId, ctx.user.id);
      
      const result = await secretsService.bulkImportSecrets(
        input.projectId,
        input.secrets,
        input.overwrite,
        ctx.user.id
      );
      
      return result;
    }),
});

export type SecretsRouter = typeof secretsRouter;
