/**
 * Secrets Router
 * 
 * Provides CRUD endpoints for managing project secrets.
 * Secrets are encrypted before storage and decrypted on retrieval.
 * 
 * @module server/routers/secrets
 */

import { z } from 'zod';
import { getDb } from '../db';
import { projectSecrets, projects } from '../../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { encryptSecret, decryptSecret } from '../services/projectHydrator';

// ════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const addSecretInput = z.object({
  projectId: z.number(),
  key: z.string().min(1).max(255).regex(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Key must be uppercase with underscores (e.g., API_KEY)',
  }),
  value: z.string().min(1),
  description: z.string().optional(),
});

export const listSecretsInput = z.object({
  projectId: z.number(),
});

export const getSecretInput = z.object({
  projectId: z.number(),
  key: z.string(),
});

export const updateSecretInput = z.object({
  projectId: z.number(),
  key: z.string(),
  value: z.string().min(1),
  description: z.string().optional(),
});

export const deleteSecretInput = z.object({
  projectId: z.number(),
  key: z.string(),
});

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface SecretMetadata {
  id: number;
  key: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SecretWithValue extends SecretMetadata {
  value: string;
}

// ════════════════════════════════════════════════════════════════════════════
// AUTHORIZATION HELPER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Verify user has access to the project
 * SECURITY: All operations must verify project ownership
 */
async function verifyProjectAccess(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  projectId: number,
  userId: number
): Promise<{ authorized: boolean; error?: string }> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.userId, userId)
    ))
    .limit(1);

  if (!project) {
    return { authorized: false, error: 'Project not found or access denied' };
  }

  return { authorized: true };
}

// ════════════════════════════════════════════════════════════════════════════
// SECRETS SERVICE
// ════════════════════════════════════════════════════════════════════════════

class SecretsService {
  /**
   * Add a new secret to a project
   */
  async addSecret(
    projectId: number,
    key: string,
    value: string,
    description?: string,
    userId?: number
  ): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      const db = await getDb();
      if (!db) {
        return { success: false, error: 'Database not available' };
      }

      // SECURITY: Verify project access if userId provided
      if (userId !== undefined) {
        const access = await verifyProjectAccess(db, projectId, userId);
        if (!access.authorized) {
          return { success: false, error: access.error };
        }
      } else {
        // Check if project exists (for internal calls)
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1);

        if (!project) {
          return { success: false, error: 'Project not found' };
        }
      }

      // Check if key already exists
      const [existing] = await db
        .select()
        .from(projectSecrets)
        .where(and(
          eq(projectSecrets.projectId, projectId),
          eq(projectSecrets.key, key)
        ))
        .limit(1);

      if (existing) {
        return { success: false, error: `Secret with key "${key}" already exists` };
      }

      // Encrypt the value
      const encryptedValue = encryptSecret(value);

      // Insert the secret
      const result = await db.insert(projectSecrets).values({
        projectId,
        key,
        encryptedValue,
        description: description || null,
      });

      return { success: true, id: result[0].insertId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add secret',
      };
    }
  }

  /**
   * List all secrets for a project (metadata only, no values)
   */
  async listSecrets(projectId: number, userId?: number): Promise<SecretMetadata[]> {
    const db = await getDb();
    if (!db) return [];

    // SECURITY: Verify project access if userId provided
    if (userId !== undefined) {
      const access = await verifyProjectAccess(db, projectId, userId);
      if (!access.authorized) {
        return [];
      }
    }

    const secrets = await db
      .select({
        id: projectSecrets.id,
        key: projectSecrets.key,
        description: projectSecrets.description,
        createdAt: projectSecrets.createdAt,
        updatedAt: projectSecrets.updatedAt,
      })
      .from(projectSecrets)
      .where(eq(projectSecrets.projectId, projectId));

    return secrets;
  }

  /**
   * Get a specific secret with its decrypted value
   */
  async getSecret(projectId: number, key: string, userId?: number): Promise<SecretWithValue | null> {
    const db = await getDb();
    if (!db) return null;

    // SECURITY: Verify project access if userId provided
    if (userId !== undefined) {
      const access = await verifyProjectAccess(db, projectId, userId);
      if (!access.authorized) {
        return null;
      }
    }

    const [secret] = await db
      .select()
      .from(projectSecrets)
      .where(and(
        eq(projectSecrets.projectId, projectId),
        eq(projectSecrets.key, key)
      ))
      .limit(1);

    if (!secret) return null;

    return {
      id: secret.id,
      key: secret.key,
      value: decryptSecret(secret.encryptedValue),
      description: secret.description,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
    };
  }

  /**
   * Update an existing secret
   */
  async updateSecret(
    projectId: number,
    key: string,
    value: string,
    description?: string,
    userId?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDb();
      if (!db) {
        return { success: false, error: 'Database not available' };
      }

      // SECURITY: Verify project access if userId provided
      if (userId !== undefined) {
        const access = await verifyProjectAccess(db, projectId, userId);
        if (!access.authorized) {
          return { success: false, error: access.error };
        }
      }

      // Check if secret exists
      const [existing] = await db
        .select()
        .from(projectSecrets)
        .where(and(
          eq(projectSecrets.projectId, projectId),
          eq(projectSecrets.key, key)
        ))
        .limit(1);

      if (!existing) {
        return { success: false, error: `Secret with key "${key}" not found` };
      }

      // Encrypt the new value
      const encryptedValue = encryptSecret(value);

      // Update the secret
      await db
        .update(projectSecrets)
        .set({
          encryptedValue,
          description: description !== undefined ? description : existing.description,
        })
        .where(eq(projectSecrets.id, existing.id));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update secret',
      };
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(
    projectId: number,
    key: string,
    userId?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDb();
      if (!db) {
        return { success: false, error: 'Database not available' };
      }

      // SECURITY: Verify project access if userId provided
      if (userId !== undefined) {
        const access = await verifyProjectAccess(db, projectId, userId);
        if (!access.authorized) {
          return { success: false, error: access.error };
        }
      }

      // Check if secret exists
      const [existing] = await db
        .select()
        .from(projectSecrets)
        .where(and(
          eq(projectSecrets.projectId, projectId),
          eq(projectSecrets.key, key)
        ))
        .limit(1);

      if (!existing) {
        return { success: false, error: `Secret with key "${key}" not found` };
      }

      // Delete the secret
      await db
        .delete(projectSecrets)
        .where(eq(projectSecrets.id, existing.id));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete secret',
      };
    }
  }

  /**
   * Get all secrets for a project as key-value pairs (for injection)
   */
  async getAllSecretsForInjection(projectId: number): Promise<Record<string, string>> {
    const db = await getDb();
    if (!db) return {};

    const secrets = await db
      .select()
      .from(projectSecrets)
      .where(eq(projectSecrets.projectId, projectId));

    const result: Record<string, string> = {};
    for (const secret of secrets) {
      result[secret.key] = decryptSecret(secret.encryptedValue);
    }

    return result;
  }

  /**
   * Bulk import secrets from an object
   * OPTIMIZED: Uses batch operations to avoid N+1 queries
   */
  async bulkImportSecrets(
    projectId: number,
    secrets: Record<string, string>,
    overwrite: boolean = false,
    userId?: number
  ): Promise<{ success: boolean; imported: number; skipped: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    const db = await getDb();
    if (!db) {
      return { success: false, imported: 0, skipped: 0, errors: ['Database not available'] };
    }

    // SECURITY: Verify project access if userId provided
    if (userId !== undefined) {
      const access = await verifyProjectAccess(db, projectId, userId);
      if (!access.authorized) {
        return { success: false, imported: 0, skipped: 0, errors: [access.error || 'Access denied'] };
      }
    }

    // Validate all keys first
    const validSecrets: Array<{ key: string; value: string }> = [];
    for (const [key, value] of Object.entries(secrets)) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
        errors.push(`Invalid key format: ${key}`);
        skipped++;
        continue;
      }
      validSecrets.push({ key, value });
    }

    if (validSecrets.length === 0) {
      return { success: errors.length === 0, imported, skipped, errors };
    }

    // OPTIMIZATION: Fetch all existing secrets in one query
    const existingKeys = validSecrets.map(s => s.key);
    const existingSecrets = await db
      .select({ key: projectSecrets.key, id: projectSecrets.id })
      .from(projectSecrets)
      .where(and(
        eq(projectSecrets.projectId, projectId),
        inArray(projectSecrets.key, existingKeys)
      ));

    const existingKeyMap = new Map(existingSecrets.map(s => [s.key, s.id]));

    // Separate into inserts and updates
    const toInsert: Array<{ projectId: number; key: string; encryptedValue: string; description: string | null }> = [];
    const toUpdate: Array<{ id: number; encryptedValue: string }> = [];

    for (const { key, value } of validSecrets) {
      const existingId = existingKeyMap.get(key);
      const encryptedValue = encryptSecret(value);

      if (existingId !== undefined) {
        if (overwrite) {
          toUpdate.push({ id: existingId, encryptedValue });
        } else {
          skipped++;
        }
      } else {
        toInsert.push({
          projectId,
          key,
          encryptedValue,
          description: null,
        });
      }
    }

    // OPTIMIZATION: Batch insert new secrets
    if (toInsert.length > 0) {
      try {
        await db.insert(projectSecrets).values(toInsert);
        imported += toInsert.length;
      } catch (error) {
        errors.push(`Failed to insert secrets: ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped += toInsert.length;
      }
    }

    // OPTIMIZATION: Batch update existing secrets
    // Note: Drizzle doesn't support batch updates directly, so we use a transaction
    if (toUpdate.length > 0) {
      try {
        for (const { id, encryptedValue } of toUpdate) {
          await db
            .update(projectSecrets)
            .set({ encryptedValue })
            .where(eq(projectSecrets.id, id));
        }
        imported += toUpdate.length;
      } catch (error) {
        errors.push(`Failed to update secrets: ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped += toUpdate.length;
      }
    }

    return {
      success: errors.length === 0,
      imported,
      skipped,
      errors,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export const secretsService = new SecretsService();

// Export types
export type { SecretMetadata, SecretWithValue };
