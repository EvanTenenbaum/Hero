/**
 * Chunk Storage Service
 * 
 * Handles storing, retrieving, and searching code chunks in the database.
 */

import { getDb } from "../db";
import { contextChunks, contextIndexStatus, InsertContextChunk, ContextChunk } from "../../drizzle/schema";
import { eq, and, like, or, desc, sql, inArray } from "drizzle-orm";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface ChunkSearchOptions {
  projectId: number;
  query?: string;
  chunkTypes?: string[];
  filePath?: string;
  limit?: number;
  offset?: number;
}

export interface ChunkSearchResult {
  chunks: ContextChunk[];
  total: number;
  searchTimeMs: number;
}

// ════════════════════════════════════════════════════════════════════════════
// STORAGE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Store multiple chunks in the database
 */
export async function storeChunks(
  chunks: Omit<InsertContextChunk, "id" | "createdAt" | "updatedAt" | "lastIndexedAt">[]
): Promise<number> {
  const db = await getDb();
  if (!db || chunks.length === 0) return 0;
  
  try {
    // Insert in batches of 100 to avoid query size limits
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await db.insert(contextChunks).values(batch as InsertContextChunk[]);
      inserted += batch.length;
    }
    
    return inserted;
  } catch (err) {
    console.error("[ChunkStorage] Failed to store chunks:", err);
    throw err;
  }
}

/**
 * Delete all chunks for a file
 */
export async function deleteChunksForFile(
  projectId: number,
  filePath: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    const result = await db
      .delete(contextChunks)
      .where(
        and(
          eq(contextChunks.projectId, projectId),
          eq(contextChunks.filePath, filePath)
        )
      );
    
    return (result as any)[0]?.affectedRows || 0;
  } catch (err) {
    console.error("[ChunkStorage] Failed to delete chunks:", err);
    throw err;
  }
}

/**
 * Delete all chunks for a project
 */
export async function deleteChunksForProject(projectId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    const result = await db
      .delete(contextChunks)
      .where(eq(contextChunks.projectId, projectId));
    
    return (result as any)[0]?.affectedRows || 0;
  } catch (err) {
    console.error("[ChunkStorage] Failed to delete project chunks:", err);
    throw err;
  }
}

/**
 * Get chunks by file path
 */
export async function getChunksByFile(
  projectId: number,
  filePath: string
): Promise<ContextChunk[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db
      .select()
      .from(contextChunks)
      .where(
        and(
          eq(contextChunks.projectId, projectId),
          eq(contextChunks.filePath, filePath)
        )
      )
      .orderBy(contextChunks.startLine);
  } catch (err) {
    console.error("[ChunkStorage] Failed to get chunks:", err);
    return [];
  }
}

/**
 * Get chunk by ID
 */
export async function getChunkById(chunkId: number): Promise<ContextChunk | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const results = await db
      .select()
      .from(contextChunks)
      .where(eq(contextChunks.id, chunkId))
      .limit(1);
    
    return results[0] || null;
  } catch (err) {
    console.error("[ChunkStorage] Failed to get chunk:", err);
    return null;
  }
}

/**
 * Get chunks by IDs
 */
export async function getChunksByIds(chunkIds: number[]): Promise<ContextChunk[]> {
  const db = await getDb();
  if (!db || chunkIds.length === 0) return [];
  
  try {
    return await db
      .select()
      .from(contextChunks)
      .where(inArray(contextChunks.id, chunkIds));
  } catch (err) {
    console.error("[ChunkStorage] Failed to get chunks:", err);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SEARCH FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Search chunks by keyword (trigram-style matching)
 */
export async function searchChunksByKeyword(
  options: ChunkSearchOptions
): Promise<ChunkSearchResult> {
  const db = await getDb();
  if (!db) return { chunks: [], total: 0, searchTimeMs: 0 };
  
  const startTime = Date.now();
  const { projectId, query, chunkTypes, filePath, limit = 20, offset = 0 } = options;
  
  try {
    // Build conditions
    const conditions = [eq(contextChunks.projectId, projectId)];
    
    if (filePath) {
      conditions.push(eq(contextChunks.filePath, filePath));
    }
    
    if (chunkTypes && chunkTypes.length > 0) {
      conditions.push(inArray(contextChunks.chunkType, chunkTypes as any));
    }
    
    // Keyword search on keywords, name, and content
    if (query) {
      const searchPattern = `%${query}%`;
      conditions.push(
        or(
          like(contextChunks.keywords, searchPattern),
          like(contextChunks.name, searchPattern),
          like(contextChunks.content, searchPattern)
        )!
      );
    }
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contextChunks)
      .where(and(...conditions));
    
    const total = countResult[0]?.count || 0;
    
    // Get chunks
    const chunks = await db
      .select()
      .from(contextChunks)
      .where(and(...conditions))
      .orderBy(desc(contextChunks.updatedAt))
      .limit(limit)
      .offset(offset);
    
    return {
      chunks,
      total,
      searchTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error("[ChunkStorage] Search failed:", err);
    return { chunks: [], total: 0, searchTimeMs: Date.now() - startTime };
  }
}

/**
 * Search chunks by name (exact or partial match)
 */
export async function searchChunksByName(
  projectId: number,
  name: string,
  limit: number = 10
): Promise<ContextChunk[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db
      .select()
      .from(contextChunks)
      .where(
        and(
          eq(contextChunks.projectId, projectId),
          like(contextChunks.name, `%${name}%`)
        )
      )
      .limit(limit);
  } catch (err) {
    console.error("[ChunkStorage] Name search failed:", err);
    return [];
  }
}

/**
 * Get chunks by type
 */
export async function getChunksByType(
  projectId: number,
  chunkType: string,
  limit: number = 50
): Promise<ContextChunk[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db
      .select()
      .from(contextChunks)
      .where(
        and(
          eq(contextChunks.projectId, projectId),
          eq(contextChunks.chunkType, chunkType as any)
        )
      )
      .orderBy(contextChunks.name)
      .limit(limit);
  } catch (err) {
    console.error("[ChunkStorage] Type search failed:", err);
    return [];
  }
}

/**
 * Get all functions/components/hooks for a project
 */
export async function getProjectSymbols(
  projectId: number
): Promise<{ functions: ContextChunk[]; components: ContextChunk[]; hooks: ContextChunk[]; classes: ContextChunk[]; types: ContextChunk[] }> {
  const db = await getDb();
  if (!db) return { functions: [], components: [], hooks: [], classes: [], types: [] };
  
  try {
    const allChunks = await db
      .select()
      .from(contextChunks)
      .where(
        and(
          eq(contextChunks.projectId, projectId),
          inArray(contextChunks.chunkType, ["function", "component", "hook", "class", "interface", "type"])
        )
      )
      .orderBy(contextChunks.name);
    
    return {
      functions: allChunks.filter(c => c.chunkType === "function"),
      components: allChunks.filter(c => c.chunkType === "component"),
      hooks: allChunks.filter(c => c.chunkType === "hook"),
      classes: allChunks.filter(c => c.chunkType === "class"),
      types: allChunks.filter(c => c.chunkType === "interface" || c.chunkType === "type"),
    };
  } catch (err) {
    console.error("[ChunkStorage] Failed to get symbols:", err);
    return { functions: [], components: [], hooks: [], classes: [], types: [] };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// INDEX STATUS FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get index status for a project
 */
export async function getIndexStatus(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const results = await db
      .select()
      .from(contextIndexStatus)
      .where(eq(contextIndexStatus.projectId, projectId))
      .limit(1);
    
    return results[0] || null;
  } catch (err) {
    console.error("[ChunkStorage] Failed to get index status:", err);
    return null;
  }
}

/**
 * Update index status
 */
export async function updateIndexStatus(
  projectId: number,
  updates: Partial<{
    status: "idle" | "indexing" | "completed" | "failed";
    totalFiles: number;
    indexedFiles: number;
    totalChunks: number;
    lastFullIndexAt: Date;
    lastIncrementalAt: Date;
    indexDurationMs: number;
    lastError: string | null;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    const existing = await db
      .select()
      .from(contextIndexStatus)
      .where(eq(contextIndexStatus.projectId, projectId))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(contextIndexStatus).values({
        projectId,
        ...updates,
      } as any);
    } else {
      await db
        .update(contextIndexStatus)
        .set(updates)
        .where(eq(contextIndexStatus.projectId, projectId));
    }
  } catch (err) {
    console.error("[ChunkStorage] Failed to update index status:", err);
  }
}

/**
 * Get chunk statistics for a project
 */
export async function getChunkStats(projectId: number): Promise<{
  totalChunks: number;
  totalFiles: number;
  chunksByType: Record<string, number>;
  totalTokens: number;
}> {
  const db = await getDb();
  if (!db) return { totalChunks: 0, totalFiles: 0, chunksByType: {}, totalTokens: 0 };
  
  try {
    // Get total chunks and files
    const statsResult = await db
      .select({
        totalChunks: sql<number>`count(*)`,
        totalFiles: sql<number>`count(distinct ${contextChunks.filePath})`,
        totalTokens: sql<number>`sum(${contextChunks.tokenCount})`,
      })
      .from(contextChunks)
      .where(eq(contextChunks.projectId, projectId));
    
    // Get chunks by type
    const typeResult = await db
      .select({
        type: contextChunks.chunkType,
        count: sql<number>`count(*)`,
      })
      .from(contextChunks)
      .where(eq(contextChunks.projectId, projectId))
      .groupBy(contextChunks.chunkType);
    
    const chunksByType: Record<string, number> = {};
    for (const row of typeResult) {
      chunksByType[row.type] = row.count;
    }
    
    return {
      totalChunks: statsResult[0]?.totalChunks || 0,
      totalFiles: statsResult[0]?.totalFiles || 0,
      chunksByType,
      totalTokens: statsResult[0]?.totalTokens || 0,
    };
  } catch (err) {
    console.error("[ChunkStorage] Failed to get stats:", err);
    return { totalChunks: 0, totalFiles: 0, chunksByType: {}, totalTokens: 0 };
  }
}
