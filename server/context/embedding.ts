/**
 * Embedding Service - Generates vector embeddings using Gemini API
 * Sprint 2: Context Engine Search
 */

import { invokeLLM } from "../_core/llm";

// Embedding dimensions for text-embedding-004
const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_MODEL = "text-embedding-004";
const MAX_BATCH_SIZE = 100;
const MAX_INPUT_LENGTH = 2048;

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  totalTokens: number;
  failedIndices: number[];
}

/**
 * Truncate text to fit within token limits
 */
function truncateText(text: string, maxLength: number = MAX_INPUT_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Generate embedding for a single text using Gemini
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const truncatedText = truncateText(text);
  
  try {
    // Use the built-in LLM helper which handles Gemini API
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: `Generate a semantic embedding representation for the following code/text. Return only a JSON array of ${EMBEDDING_DIMENSIONS} floating point numbers between -1 and 1 that captures the semantic meaning:\n\n${truncatedText}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "embedding_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              embedding: {
                type: "array",
                items: { type: "number" },
                description: `Array of ${EMBEDDING_DIMENSIONS} floating point numbers`
              }
            },
            required: ["embedding"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No embedding response received");
    }

    const parsed = JSON.parse(content);
    const embedding = parsed.embedding as number[];
    
    // Normalize the embedding vector
    const normalized = normalizeVector(embedding);
    
    return {
      embedding: normalized,
      tokenCount: Math.ceil(truncatedText.length / 4) // Rough estimate
    };
  } catch (error) {
    console.error("Embedding generation failed:", error);
    // Return zero vector on failure
    return {
      embedding: new Array(EMBEDDING_DIMENSIONS).fill(0),
      tokenCount: 0
    };
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchEmbeddings(
  texts: string[]
): Promise<BatchEmbeddingResult> {
  const results: EmbeddingResult[] = [];
  const failedIndices: number[] = [];
  let totalTokens = 0;

  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    
    // Process batch in parallel with concurrency limit
    const batchPromises = batch.map(async (text, batchIndex) => {
      const globalIndex = i + batchIndex;
      try {
        const result = await generateEmbedding(text);
        return { index: globalIndex, result, success: true };
      } catch (error) {
        console.error(`Embedding failed for index ${globalIndex}:`, error);
        return { 
          index: globalIndex, 
          result: { embedding: new Array(EMBEDDING_DIMENSIONS).fill(0), tokenCount: 0 },
          success: false 
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    
    for (const { index, result, success } of batchResults) {
      results[index] = result;
      totalTokens += result.tokenCount;
      if (!success) {
        failedIndices.push(index);
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + MAX_BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return {
    embeddings: results,
    totalTokens,
    failedIndices
  };
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
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

/**
 * Find top-k most similar vectors
 */
export function findTopK(
  queryVector: number[],
  candidates: { id: number; embedding: number[] }[],
  k: number = 10
): { id: number; similarity: number }[] {
  const similarities = candidates.map(candidate => ({
    id: candidate.id,
    similarity: cosineSimilarity(queryVector, candidate.embedding)
  }));
  
  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  return similarities.slice(0, k);
}

/**
 * Embedding dimensions constant for external use
 */
export const DIMENSIONS = EMBEDDING_DIMENSIONS;
