/**
 * Gemini Embedding Service
 * 
 * Native integration with Google's Gemini embedding API (gemini-embedding-001)
 * using task-specific embeddings for optimal code retrieval.
 * 
 * Based on research:
 * - Cursor's 7-step indexing process
 * - Sourcegraph's multi-retriever architecture
 * - Gemini's MRL (Matryoshka Representation Learning) technique
 */

import { ENV } from "../_core/env";

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Embedding model configuration
 * Using 768 dimensions as recommended by Gemini docs for optimal quality/storage balance
 * MTEB score: 67.99 (vs 68.16 for 2048 - minimal difference)
 */
export const EMBEDDING_CONFIG = {
  model: "gemini-embedding-001",
  dimensions: 768, // Recommended: 768, 1536, or 3072
  maxInputTokens: 2048,
  maxBatchSize: 100,
  rateLimitDelayMs: 100,
} as const;

/**
 * Task types for optimized embeddings
 * Per Gemini docs, using task-specific embeddings improves retrieval accuracy
 */
export type EmbeddingTaskType = 
  | "RETRIEVAL_DOCUMENT"    // For indexing code chunks
  | "CODE_RETRIEVAL_QUERY"  // For natural language queries about code
  | "RETRIEVAL_QUERY"       // For general search queries
  | "SEMANTIC_SIMILARITY"   // For comparing code similarity
  | "CLUSTERING"            // For grouping similar code
  | "CLASSIFICATION";       // For categorizing code

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  model: string;
  taskType: EmbeddingTaskType;
}

export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  totalTokens: number;
  failedIndices: number[];
  processingTimeMs: number;
}

interface GeminiEmbedResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

// ════════════════════════════════════════════════════════════════════════════
// GEMINI API CLIENT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get the Gemini API key from environment
 */
function getApiKey(): string {
  const apiKey = ENV.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Call the Gemini embedding API directly
 */
async function callGeminiEmbedding(
  contents: string[],
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT",
  outputDimensionality: number = EMBEDDING_CONFIG.dimensions
): Promise<GeminiEmbedResponse> {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_CONFIG.model}:batchEmbedContents?key=${apiKey}`;

  // Build requests for batch embedding
  const requests = contents.map(content => ({
    model: `models/${EMBEDDING_CONFIG.model}`,
    content: {
      parts: [{ text: truncateText(content) }]
    },
    taskType,
    outputDimensionality
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data as GeminiEmbedResponse;
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Truncate text to fit within token limits
 * Gemini embedding has 2048 token limit (~8000 chars)
 */
function truncateText(text: string, maxChars: number = 8000): string {
  if (text.length <= maxChars) return text;
  // Truncate at a sensible boundary (newline or space)
  const truncated = text.slice(0, maxChars);
  const lastNewline = truncated.lastIndexOf("\n");
  const lastSpace = truncated.lastIndexOf(" ");
  const boundary = Math.max(lastNewline, lastSpace, maxChars - 100);
  return truncated.slice(0, boundary) + "...";
}

/**
 * Estimate token count from text (rough approximation)
 * Gemini uses ~4 chars per token for code
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Normalize a vector to unit length
 * Required for dimensions < 3072 per Gemini docs
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 (opposite) and 1 (identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;
  
  return dotProduct / magnitude;
}

// ════════════════════════════════════════════════════════════════════════════
// EMBEDDING GENERATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate embedding for a single text
 * 
 * @param text - The text to embed
 * @param taskType - The task type for optimized embeddings
 * @returns Embedding result with vector and metadata
 */
export async function generateEmbedding(
  text: string,
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT"
): Promise<EmbeddingResult> {
  const startTime = Date.now();
  
  try {
    const response = await callGeminiEmbedding([text], taskType);
    
    if (!response.embeddings || response.embeddings.length === 0) {
      throw new Error("No embedding returned from Gemini API");
    }
    
    // Normalize the embedding (required for 768 dimensions)
    const embedding = normalizeVector(response.embeddings[0].values);
    
    return {
      embedding,
      tokenCount: estimateTokens(text),
      model: EMBEDDING_CONFIG.model,
      taskType,
    };
  } catch (error) {
    console.error("[GeminiEmbedding] Failed to generate embedding:", error);
    // Return zero vector on failure (allows graceful degradation)
    return {
      embedding: new Array(EMBEDDING_CONFIG.dimensions).fill(0),
      tokenCount: 0,
      model: EMBEDDING_CONFIG.model,
      taskType,
    };
  }
}

/**
 * Generate embeddings for code chunks (optimized for document retrieval)
 */
export async function generateCodeEmbedding(code: string): Promise<EmbeddingResult> {
  return generateEmbedding(code, "RETRIEVAL_DOCUMENT");
}

/**
 * Generate embedding for a search query (optimized for code retrieval)
 */
export async function generateQueryEmbedding(query: string): Promise<EmbeddingResult> {
  return generateEmbedding(query, "CODE_RETRIEVAL_QUERY");
}

/**
 * Generate embeddings for multiple texts in batch
 * 
 * @param texts - Array of texts to embed
 * @param taskType - The task type for all embeddings
 * @returns Batch result with all embeddings and metadata
 */
export async function generateBatchEmbeddings(
  texts: string[],
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT"
): Promise<BatchEmbeddingResult> {
  const startTime = Date.now();
  const results: EmbeddingResult[] = [];
  const failedIndices: number[] = [];
  let totalTokens = 0;

  // Process in batches to respect rate limits
  for (let i = 0; i < texts.length; i += EMBEDDING_CONFIG.maxBatchSize) {
    const batch = texts.slice(i, i + EMBEDDING_CONFIG.maxBatchSize);
    
    try {
      const response = await callGeminiEmbedding(batch, taskType);
      
      for (let j = 0; j < batch.length; j++) {
        const globalIndex = i + j;
        
        if (response.embeddings && response.embeddings[j]) {
          const embedding = normalizeVector(response.embeddings[j].values);
          const tokenCount = estimateTokens(batch[j]);
          
          results[globalIndex] = {
            embedding,
            tokenCount,
            model: EMBEDDING_CONFIG.model,
            taskType,
          };
          totalTokens += tokenCount;
        } else {
          // Mark as failed
          failedIndices.push(globalIndex);
          results[globalIndex] = {
            embedding: new Array(EMBEDDING_CONFIG.dimensions).fill(0),
            tokenCount: 0,
            model: EMBEDDING_CONFIG.model,
            taskType,
          };
        }
      }
    } catch (error) {
      console.error(`[GeminiEmbedding] Batch ${i} failed:`, error);
      // Mark all items in this batch as failed
      for (let j = 0; j < batch.length; j++) {
        const globalIndex = i + j;
        failedIndices.push(globalIndex);
        results[globalIndex] = {
          embedding: new Array(EMBEDDING_CONFIG.dimensions).fill(0),
          tokenCount: 0,
          model: EMBEDDING_CONFIG.model,
          taskType,
        };
      }
    }

    // Rate limiting delay between batches
    if (i + EMBEDDING_CONFIG.maxBatchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, EMBEDDING_CONFIG.rateLimitDelayMs));
    }
  }

  return {
    embeddings: results,
    totalTokens,
    failedIndices,
    processingTimeMs: Date.now() - startTime,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// SIMILARITY SEARCH
// ════════════════════════════════════════════════════════════════════════════

/**
 * Find top-k most similar vectors using cosine similarity
 */
export function findTopK(
  queryVector: number[],
  candidates: Array<{ id: number; embedding: number[] }>,
  k: number = 10,
  minScore: number = 0.0
): Array<{ id: number; similarity: number }> {
  const similarities = candidates
    .map(candidate => ({
      id: candidate.id,
      similarity: cosineSimilarity(queryVector, candidate.embedding)
    }))
    .filter(item => item.similarity >= minScore);
  
  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  return similarities.slice(0, k);
}

/**
 * Compute similarity matrix for a set of embeddings
 * Useful for clustering and duplicate detection
 */
export function computeSimilarityMatrix(
  embeddings: number[][]
): number[][] {
  const n = embeddings.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      matrix[i][j] = similarity;
      matrix[j][i] = similarity;
    }
  }
  
  return matrix;
}

// ════════════════════════════════════════════════════════════════════════════
// EMBEDDING CACHE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Simple in-memory cache for embeddings
 * Keyed by content hash to avoid redundant API calls
 */
const embeddingCache = new Map<string, EmbeddingResult>();
const CACHE_MAX_SIZE = 1000;

/**
 * Generate a simple hash for cache key
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Get cached embedding or generate new one
 */
export async function getCachedEmbedding(
  text: string,
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT"
): Promise<EmbeddingResult> {
  const cacheKey = `${taskType}:${hashContent(text)}`;
  
  const cached = embeddingCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const result = await generateEmbedding(text, taskType);
  
  // Evict oldest entries if cache is full
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }
  
  embeddingCache.set(cacheKey, result);
  return result;
}

/**
 * Clear the embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Get cache statistics
 */
export function getEmbeddingCacheStats(): { size: number; maxSize: number } {
  return {
    size: embeddingCache.size,
    maxSize: CACHE_MAX_SIZE,
  };
}
