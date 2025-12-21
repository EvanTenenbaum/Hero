/**
 * Semantic Search Service - Vector similarity search for code chunks
 * Sprint 2: Context Engine Search
 */

import { eq, like, or, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { contextChunks, contextQueries } from "../../drizzle/schema";
import { generateEmbedding, cosineSimilarity, findTopK } from "./embedding";

export interface SearchResult {
  id: number;
  filePath: string;
  name: string | null;
  chunkType: string;
  content: string;
  summary: string | null;
  startLine: number;
  endLine: number;
  score: number;
  matchType: "semantic" | "keyword" | "hybrid";
}

export interface SearchOptions {
  projectId: number;
  limit?: number;
  chunkTypes?: string[];
  minScore?: number;
  includeKeyword?: boolean;
  includeSemantic?: boolean;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_MIN_SCORE = 0.3;

/**
 * Perform semantic search using vector similarity
 */
export async function semanticSearch(
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const db = await getDb();
  if (!db) return [];

  const {
    projectId,
    limit = DEFAULT_LIMIT,
    chunkTypes,
    minScore = DEFAULT_MIN_SCORE
  } = options;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Get all chunks with embeddings for this project
  let queryBuilder = db
    .select({
      id: contextChunks.id,
      filePath: contextChunks.filePath,
      name: contextChunks.name,
      chunkType: contextChunks.chunkType,
      content: contextChunks.content,
      summary: contextChunks.summary,
      startLine: contextChunks.startLine,
      endLine: contextChunks.endLine,
      embedding: contextChunks.embedding
    })
    .from(contextChunks)
    .where(eq(contextChunks.projectId, projectId));

  const chunks = await queryBuilder;

  // Filter chunks with embeddings and calculate similarity
  const chunksWithEmbeddings = chunks
    .filter(c => c.embedding !== null)
    .map(c => ({
      ...c,
      embedding: c.embedding as number[]
    }));

  if (chunksWithEmbeddings.length === 0) {
    return [];
  }

  // Calculate similarities
  const similarities = chunksWithEmbeddings.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding.embedding, chunk.embedding)
  }));

  // Filter by chunk types if specified
  let filtered = similarities;
  if (chunkTypes && chunkTypes.length > 0) {
    filtered = filtered.filter(c => chunkTypes.includes(c.chunkType));
  }

  // Filter by minimum score and sort
  const results = filtered
    .filter(c => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(c => ({
      id: c.id,
      filePath: c.filePath,
      name: c.name,
      chunkType: c.chunkType,
      content: c.content,
      summary: c.summary,
      startLine: c.startLine,
      endLine: c.endLine,
      score: c.score,
      matchType: "semantic" as const
    }));

  // Log query for analytics
  await logQuery(db, projectId, query, "semantic", results.length);

  return results;
}

/**
 * Perform keyword search using trigram matching
 */
export async function keywordSearch(
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const db = await getDb();
  if (!db) return [];

  const {
    projectId,
    limit = DEFAULT_LIMIT,
    chunkTypes
  } = options;

  // Split query into keywords
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  
  if (keywords.length === 0) {
    return [];
  }

  // Build keyword conditions
  const keywordConditions = keywords.map(keyword => 
    or(
      like(contextChunks.keywords, `%${keyword}%`),
      like(contextChunks.name, `%${keyword}%`),
      like(contextChunks.content, `%${keyword}%`)
    )
  );

  // Query with keyword matching
  let results = await db
    .select({
      id: contextChunks.id,
      filePath: contextChunks.filePath,
      name: contextChunks.name,
      chunkType: contextChunks.chunkType,
      content: contextChunks.content,
      summary: contextChunks.summary,
      startLine: contextChunks.startLine,
      endLine: contextChunks.endLine,
      keywords: contextChunks.keywords
    })
    .from(contextChunks)
    .where(
      and(
        eq(contextChunks.projectId, projectId),
        or(...keywordConditions)
      )
    )
    .limit(limit * 2); // Get more for scoring

  // Filter by chunk types if specified
  if (chunkTypes && chunkTypes.length > 0) {
    results = results.filter(c => chunkTypes.includes(c.chunkType));
  }

  // Score results by keyword match count
  const scored = results.map(chunk => {
    const text = `${chunk.name || ""} ${chunk.keywords || ""} ${chunk.content}`.toLowerCase();
    const matchCount = keywords.filter(k => text.includes(k)).length;
    const score = matchCount / keywords.length;
    return {
      id: chunk.id,
      filePath: chunk.filePath,
      name: chunk.name,
      chunkType: chunk.chunkType,
      content: chunk.content,
      summary: chunk.summary,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      score,
      matchType: "keyword" as const
    };
  });

  // Sort by score and limit
  const finalResults = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Log query for analytics
  await logQuery(db, projectId, query, "keyword", finalResults.length);

  return finalResults;
}

/**
 * Perform hybrid search combining semantic and keyword
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const db = await getDb();
  if (!db) return [];

  const {
    limit = DEFAULT_LIMIT,
    includeSemantic = true,
    includeKeyword = true
  } = options;

  // Run both searches in parallel
  const [semanticResults, keywordResults] = await Promise.all([
    includeSemantic ? semanticSearch(query, { ...options, limit: limit * 2 }) : [],
    includeKeyword ? keywordSearch(query, { ...options, limit: limit * 2 }) : []
  ]);

  // Merge and deduplicate results
  const resultMap = new Map<number, SearchResult>();
  
  // Add semantic results with weight
  for (const result of semanticResults) {
    resultMap.set(result.id, {
      ...result,
      score: result.score * 0.7, // Semantic weight
      matchType: "hybrid"
    });
  }

  // Add/merge keyword results with weight
  for (const result of keywordResults) {
    const existing = resultMap.get(result.id);
    if (existing) {
      // Combine scores
      existing.score += result.score * 0.3; // Keyword weight
    } else {
      resultMap.set(result.id, {
        ...result,
        score: result.score * 0.3,
        matchType: "hybrid"
      });
    }
  }

  // Sort by combined score and limit
  const finalResults = Array.from(resultMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Log query for analytics
  await logQuery(db, options.projectId, query, "hybrid", finalResults.length);

  return finalResults;
}

/**
 * Search by symbol name (exact or fuzzy)
 */
export async function searchByName(
  name: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const db = await getDb();
  if (!db) return [];

  const { projectId, limit = DEFAULT_LIMIT, chunkTypes } = options;

  let query = db
    .select({
      id: contextChunks.id,
      filePath: contextChunks.filePath,
      name: contextChunks.name,
      chunkType: contextChunks.chunkType,
      content: contextChunks.content,
      summary: contextChunks.summary,
      startLine: contextChunks.startLine,
      endLine: contextChunks.endLine
    })
    .from(contextChunks)
    .where(
      and(
        eq(contextChunks.projectId, projectId),
        like(contextChunks.name, `%${name}%`)
      )
    )
    .limit(limit);

  let results = await query;

  // Filter by chunk types if specified
  if (chunkTypes && chunkTypes.length > 0) {
    results = results.filter(c => chunkTypes.includes(c.chunkType));
  }

  return results.map(c => ({
    ...c,
    score: c.name?.toLowerCase() === name.toLowerCase() ? 1.0 : 0.8,
    matchType: "keyword" as const
  }));
}

/**
 * Log search query for analytics
 */
async function logQuery(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  projectId: number,
  query: string,
  queryType: "keyword" | "semantic" | "hybrid",
  resultCount: number
): Promise<void> {
  try {
    await db.insert(contextQueries).values({
      projectId,
      userId: 0, // System query, no user context
      query,
      queryType,
      resultCount
    });
  } catch (error) {
    console.error("Failed to log query:", error);
  }
}
