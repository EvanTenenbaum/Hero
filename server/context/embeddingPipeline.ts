/**
 * Embedding Pipeline - Batch processes chunks to generate embeddings
 * Sprint 2: Context Engine Search
 */

import { eq, isNull, and } from "drizzle-orm";
import { getDb } from "../db";
import { contextChunks } from "../../drizzle/schema";
import { generateEmbedding, DIMENSIONS } from "./embedding";

const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 3;

export interface PipelineProgress {
  total: number;
  processed: number;
  failed: number;
  status: "idle" | "running" | "completed" | "error";
  currentBatch: number;
  totalBatches: number;
}

// Track pipeline state
let pipelineState: PipelineProgress = {
  total: 0,
  processed: 0,
  failed: 0,
  status: "idle",
  currentBatch: 0,
  totalBatches: 0
};

let isRunning = false;
let shouldStop = false;

/**
 * Get current pipeline progress
 */
export function getPipelineProgress(): PipelineProgress {
  return { ...pipelineState };
}

/**
 * Stop the running pipeline
 */
export function stopPipeline(): void {
  shouldStop = true;
}

/**
 * Process chunks without embeddings for a project
 */
export async function processProjectEmbeddings(
  projectId: number,
  onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineProgress> {
  if (isRunning) {
    throw new Error("Pipeline is already running");
  }

  isRunning = true;
  shouldStop = false;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all chunks without embeddings
    const chunksToProcess = await db
      .select({
        id: contextChunks.id,
        content: contextChunks.content,
        name: contextChunks.name,
        chunkType: contextChunks.chunkType
      })
      .from(contextChunks)
      .where(
        and(
          eq(contextChunks.projectId, projectId),
          isNull(contextChunks.embedding)
        )
      );

    pipelineState = {
      total: chunksToProcess.length,
      processed: 0,
      failed: 0,
      status: "running",
      currentBatch: 0,
      totalBatches: Math.ceil(chunksToProcess.length / BATCH_SIZE)
    };

    if (onProgress) onProgress(pipelineState);

    // Process in batches
    for (let i = 0; i < chunksToProcess.length && !shouldStop; i += BATCH_SIZE) {
      const batch = chunksToProcess.slice(i, i + BATCH_SIZE);
      pipelineState.currentBatch = Math.floor(i / BATCH_SIZE) + 1;

      // Process batch with concurrency limit
      const batchPromises: Promise<void>[] = [];
      
      for (let j = 0; j < batch.length; j += CONCURRENCY_LIMIT) {
        const concurrentBatch = batch.slice(j, j + CONCURRENCY_LIMIT);
        
        const results = await Promise.allSettled(
          concurrentBatch.map(async (chunk: { id: number; content: string; name: string | null; chunkType: string }) => {
            // Create embedding text from chunk content and metadata
            const embeddingText = createEmbeddingText(chunk);
            const result = await generateEmbedding(embeddingText);
            
            // Store embedding in database
            await db
              .update(contextChunks)
              .set({
                embedding: result.embedding,
                embeddingModel: "gemini-embedding"
              })
              .where(eq(contextChunks.id, chunk.id));
            
            return result;
          })
        );

        // Update progress
        for (const result of results) {
          if (result.status === "fulfilled") {
            pipelineState.processed++;
          } else {
            pipelineState.failed++;
            console.error("Embedding failed:", result.reason);
          }
        }

        if (onProgress) onProgress(pipelineState);
      }

      // Small delay between batches
      if (i + BATCH_SIZE < chunksToProcess.length && !shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    pipelineState.status = shouldStop ? "idle" : "completed";
    if (onProgress) onProgress(pipelineState);

    return pipelineState;
  } catch (error) {
    pipelineState.status = "error";
    if (onProgress) onProgress(pipelineState);
    throw error;
  } finally {
    isRunning = false;
    shouldStop = false;
  }
}

/**
 * Create text for embedding from chunk data
 */
function createEmbeddingText(chunk: {
  content: string;
  name: string | null;
  chunkType: string;
}): string {
  // Combine name and content for better semantic understanding
  const prefix = `${chunk.chunkType}: ${chunk.name}\n`;
  return prefix + chunk.content;
}

/**
 * Get embedding statistics for a project
 */
export async function getEmbeddingStats(projectId: number): Promise<{
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  percentComplete: number;
}> {
  const db = await getDb();
  if (!db) return { total: 0, withEmbeddings: 0, withoutEmbeddings: 0, percentComplete: 0 };
  
  const allChunks = await db
    .select({ id: contextChunks.id, embedding: contextChunks.embedding })
    .from(contextChunks)
    .where(eq(contextChunks.projectId, projectId));

  const withEmbeddings = allChunks.filter((c: { id: number; embedding: number[] | null }) => c.embedding !== null).length;
  const total = allChunks.length;

  return {
    total,
    withEmbeddings,
    withoutEmbeddings: total - withEmbeddings,
    percentComplete: total > 0 ? Math.round((withEmbeddings / total) * 100) : 0
  };
}
