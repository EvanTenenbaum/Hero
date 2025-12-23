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
import { eq, and } from 'drizzle-orm';
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
    description?: string
  ): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      const db = await getDb();
      if (!db) {
        return { success: false, error: 'Database not available' };
      }

      // Check if project exists
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        return { success: false, error: 'Project not found' };
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
  async listSecrets(projectId: number): Promise<SecretMetadata[]> {
    const db = await getDb();
    if (!db) return [];

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
  async getSecret(projectId: number, key: string): Promise<SecretWithValue | null> {
    const db = await getDb();
    if (!db) return null;

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
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDb();
      if (!db) {
        return { success: false, error: 'Database not available' };
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
    key: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDb();
      if (!db) {
        return { success: false, error: 'Database not available' };
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
   */
  async bulkImportSecrets(
    projectId: number,
    secrets: Record<string, string>,
    overwrite: boolean = false
  ): Promise<{ success: boolean; imported: number; skipped: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const [key, value] of Object.entries(secrets)) {
      // Validate key format
      if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
        errors.push(`Invalid key format: ${key}`);
        skipped++;
        continue;
      }

      const existing = await this.getSecret(projectId, key);

      if (existing) {
        if (overwrite) {
          const result = await this.updateSecret(projectId, key, value);
          if (result.success) {
            imported++;
          } else {
            errors.push(`Failed to update ${key}: ${result.error}`);
            skipped++;
          }
        } else {
          skipped++;
        }
      } else {
        const result = await this.addSecret(projectId, key, value);
        if (result.success) {
          imported++;
        } else {
          errors.push(`Failed to add ${key}: ${result.error}`);
          skipped++;
        }
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
