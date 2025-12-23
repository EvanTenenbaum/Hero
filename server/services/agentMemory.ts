/**
 * Agent Memory Service
 * 
 * Provides short-term and long-term memory capabilities for agents
 * in the HERO IDE system.
 */

import {
  mysqlTable,
  serial,
  varchar,
  int,
  json,
  timestamp,
  float,
  index,
} from 'drizzle-orm/mysql-core';
import { eq, and, sql, gte, desc } from 'drizzle-orm';
import { getDb } from '../db';
import { logger } from '../_core/logger';

// --- Database Schema ---

/**
 * Short-term agent memory table.
 */
export const agentMemoryShortTerm = mysqlTable(
  'agent_memory_short_term',
  {
    id: serial('id').primaryKey(),
    sessionId: varchar('session_id', { length: 64 }).notNull(),
    userId: int('user_id').notNull(),
    projectId: int('project_id'),
    memoryKey: varchar('memory_key', { length: 255 }).notNull(),
    memoryValue: json('memory_value').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
  },
  (table) => ({
    sessionIdx: index('session_idx').on(table.sessionId, table.userId),
    expirationIdx: index('expiration_idx').on(table.expiresAt),
  })
);

/**
 * Long-term agent memory table.
 */
export const agentMemoryLongTerm = mysqlTable(
  'agent_memory_long_term',
  {
    id: serial('id').primaryKey(),
    userId: int('user_id').notNull(),
    projectId: int('project_id'),
    memoryType: varchar('memory_type', { length: 30 }).notNull(),
    memoryKey: varchar('memory_key', { length: 255 }).notNull(),
    memoryValue: json('memory_value').notNull(),
    relevanceScore: float('relevance_score').default(1.0).notNull(),
    accessCount: int('access_count').default(0).notNull(),
    lastAccessedAt: timestamp('last_accessed_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
  },
  (table) => ({
    userTypeIdx: index('user_type_idx').on(table.userId, table.memoryType),
    projectKeyIdx: index('project_key_idx').on(table.projectId, table.memoryKey),
  })
);

// --- Type Definitions ---

export type MemoryType = 'project_knowledge' | 'user_preference' | 'success_pattern' | 'failure_pattern';

export interface BaseMemoryItem {
    id?: number;
    userId: number;
    projectId?: number | null;
    memoryKey: string;
    memoryValue: unknown;
}

export interface ShortTermMemoryItem extends BaseMemoryItem {
    sessionId: string;
    expiresAt: Date;
}

export interface LongTermMemoryItem extends BaseMemoryItem {
    memoryType: MemoryType;
    relevanceScore?: number;
    accessCount?: number;
    lastAccessedAt?: Date;
}

export type MemoryItem = ShortTermMemoryItem | LongTermMemoryItem;

export interface RecallContext {
    userId: number;
    projectId?: number | null;
    sessionId?: string;
    limit?: number;
    includeShortTerm?: boolean;
    includeLongTerm?: boolean;
    memoryTypes?: MemoryType[];
}

export interface Knowledge {
    id: number;
    key: string;
    content: unknown;
    relevanceScore: number;
}

export interface UserPreferences {
    theme: string;
    editorSettings: Record<string, unknown>;
    preferredLanguage: string;
    [key: string]: unknown;
}

export interface Pattern {
    context: string;
    actionSequence: string[];
    result: 'success' | 'failure';
    timestamp: Date;
    metadata: Record<string, unknown>;
}

// --- Memory Service Class ---

/**
 * Service responsible for managing the agent's memory.
 */
export class AgentMemoryService {
    /**
     * Stores a memory item.
     */
    public async remember(item: MemoryItem): Promise<void> {
        try {
            const db = await getDb();
            if (!db) {
                logger.error('Database not available');
                return;
            }

            if ('sessionId' in item && 'expiresAt' in item) {
                // Short-term memory
                await db.insert(agentMemoryShortTerm).values({
                    sessionId: item.sessionId,
                    userId: item.userId,
                    projectId: item.projectId ?? null,
                    memoryKey: item.memoryKey,
                    memoryValue: item.memoryValue,
                    expiresAt: item.expiresAt,
                });
            } else if ('memoryType' in item) {
                // Long-term memory
                await db.insert(agentMemoryLongTerm).values({
                    userId: item.userId,
                    projectId: item.projectId ?? null,
                    memoryType: item.memoryType,
                    memoryKey: item.memoryKey,
                    memoryValue: item.memoryValue,
                    relevanceScore: item.relevanceScore ?? 1.0,
                    accessCount: item.accessCount ?? 0,
                });
            } else {
                throw new Error('Invalid memory item structure.');
            }
        } catch (error) {
            logger.error({ error }, 'Error storing memory');
            throw new Error('Failed to store memory item.');
        }
    }

    /**
     * Retrieves relevant memories based on a query and context.
     */
    public async recall(query: string, context: RecallContext): Promise<MemoryItem[]> {
        const { userId, projectId, sessionId, limit = 10, includeShortTerm = true, includeLongTerm = true, memoryTypes } = context;
        const results: MemoryItem[] = [];

        try {
            const db = await getDb();
            if (!db) {
                logger.error('Database not available');
                return [];
            }

            // Recall Short-Term Memory
            if (includeShortTerm && sessionId) {
                const shortTermResults = await db
                    .select()
                    .from(agentMemoryShortTerm)
                    .where(
                        and(
                            eq(agentMemoryShortTerm.userId, userId),
                            eq(agentMemoryShortTerm.sessionId, sessionId),
                            gte(agentMemoryShortTerm.expiresAt, new Date())
                        )
                    )
                    .limit(limit);

                results.push(...shortTermResults.map(r => ({
                    ...r,
                    memoryValue: r.memoryValue,
                    expiresAt: r.expiresAt,
                } as ShortTermMemoryItem)));
            }

            // Recall Long-Term Memory
            if (includeLongTerm) {
                const conditions = [eq(agentMemoryLongTerm.userId, userId)];

                if (projectId !== undefined && projectId !== null) {
                    conditions.push(eq(agentMemoryLongTerm.projectId, projectId));
                }

                const longTermResults = await db
                    .select()
                    .from(agentMemoryLongTerm)
                    .where(and(...conditions))
                    .orderBy(desc(agentMemoryLongTerm.relevanceScore))
                    .limit(limit - results.length);

                // Filter by memory types if specified
                const filtered = memoryTypes && memoryTypes.length > 0
                    ? longTermResults.filter(r => memoryTypes.includes(r.memoryType as MemoryType))
                    : longTermResults;

                results.push(...filtered.map(r => ({
                    ...r,
                    memoryType: r.memoryType as MemoryType,
                    memoryValue: r.memoryValue,
                } as LongTermMemoryItem)));

                // Update access count (fire and forget)
                for (const item of filtered) {
                    db.update(agentMemoryLongTerm)
                        .set({
                            accessCount: sql`access_count + 1`,
                            lastAccessedAt: new Date(),
                        })
                        .where(eq(agentMemoryLongTerm.id, item.id))
                        .catch(err => logger.warn({ error: err }, 'Failed to update access count'));
                }
            }

            // Simple filtering based on query
            const filteredResults = results.filter(item =>
                item.memoryKey.toLowerCase().includes(query.toLowerCase()) ||
                JSON.stringify(item.memoryValue).toLowerCase().includes(query.toLowerCase())
            );

            return filteredResults.slice(0, limit);

        } catch (error) {
            logger.error({ error }, 'Error recalling memory');
            return [];
        }
    }

    /**
     * Deletes a memory item by its ID.
     */
    public async forget(itemId: number): Promise<void> {
        try {
            const db = await getDb();
            if (!db) {
                logger.error('Database not available');
                return;
            }

            // Try short-term first
            await db.delete(agentMemoryShortTerm).where(eq(agentMemoryShortTerm.id, itemId));
            // Then try long-term
            await db.delete(agentMemoryLongTerm).where(eq(agentMemoryLongTerm.id, itemId));
        } catch (error) {
            logger.error({ error, itemId }, 'Error forgetting memory');
            throw new Error('Failed to delete memory item.');
        }
    }

    /**
     * Retrieves project-specific knowledge.
     */
    public async getProjectKnowledge(projectId: number): Promise<Knowledge[]> {
        try {
            const db = await getDb();
            if (!db) return [];

            const results = await db
                .select({
                    id: agentMemoryLongTerm.id,
                    key: agentMemoryLongTerm.memoryKey,
                    content: agentMemoryLongTerm.memoryValue,
                    relevanceScore: agentMemoryLongTerm.relevanceScore,
                })
                .from(agentMemoryLongTerm)
                .where(
                    and(
                        eq(agentMemoryLongTerm.projectId, projectId),
                        eq(agentMemoryLongTerm.memoryType, 'project_knowledge')
                    )
                )
                .orderBy(desc(agentMemoryLongTerm.relevanceScore));

            return results as Knowledge[];
        } catch (error) {
            logger.error({ error }, 'Error retrieving project knowledge');
            return [];
        }
    }

    /**
     * Retrieves user preferences.
     */
    public async getUserPreferences(userId: number): Promise<UserPreferences> {
        try {
            const db = await getDb();
            if (!db) {
                return { theme: 'dark', editorSettings: {}, preferredLanguage: 'typescript' };
            }

            const results = await db
                .select()
                .from(agentMemoryLongTerm)
                .where(
                    and(
                        eq(agentMemoryLongTerm.userId, userId),
                        eq(agentMemoryLongTerm.memoryType, 'user_preference')
                    )
                );

            const preferences: Partial<UserPreferences> = {};
            results.forEach(item => {
                (preferences as Record<string, unknown>)[item.memoryKey] = item.memoryValue;
            });

            return {
                theme: preferences.theme || 'dark',
                editorSettings: preferences.editorSettings || {},
                preferredLanguage: preferences.preferredLanguage || 'typescript',
                ...preferences,
            } as UserPreferences;

        } catch (error) {
            logger.error({ error }, 'Error retrieving user preferences');
            return { theme: 'dark', editorSettings: {}, preferredLanguage: 'typescript' };
        }
    }

    /**
     * Records an execution pattern.
     */
    public async recordPattern(pattern: Pattern, type: 'success' | 'failure'): Promise<void> {
        const memoryType: MemoryType = type === 'success' ? 'success_pattern' : 'failure_pattern';
        const userId = (pattern.metadata.userId as number) || 0;
        const projectId = (pattern.metadata.projectId as number) || null;

        const memoryItem: LongTermMemoryItem = {
            userId,
            projectId,
            memoryType,
            memoryKey: `${type}_pattern_${pattern.context.substring(0, 50)}`,
            memoryValue: pattern,
            relevanceScore: type === 'success' ? 1.5 : 0.8,
        };

        await this.remember(memoryItem);
    }

    /**
     * Cleans up expired short-term memories.
     */
    public async cleanupExpiredMemories(): Promise<number> {
        try {
            const db = await getDb();
            if (!db) return 0;

            const now = new Date();
            const result = await db
                .delete(agentMemoryShortTerm)
                .where(sql`expires_at < NOW()`);

            // Return 0 since we can't easily get affected rows count
            return 0;
        } catch (error) {
            logger.error({ error }, 'Error during memory cleanup');
            return 0;
        }
    }
}

// Export singleton instance
export const agentMemoryService = new AgentMemoryService();
