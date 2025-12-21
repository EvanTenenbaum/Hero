/**
 * Hybrid Search Service
 * 
 * Combines keyword search, semantic search, and graph-based retrieval
 * with configurable weights and intelligent context ranking.
 * 
 * Based on research:
 * - Cursor's hybrid search (keyword + semantic)
 * - Sourcegraph's multi-retriever architecture
 * - Anthropic's context engineering principles
 */

import { eq, like, or, and, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { contextChunks, contextQueries } from "../../drizzle/schema";
import { 
  generateQueryEmbedding, 
  cosineSimilarity, 
  findTopK,
  EMBEDDING_CONFIG 
} from "./geminiEmbedding";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

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
  matchType: "semantic" | "keyword" | "hybrid" | "graph";
  tokenCount: number;
}

export interface SearchOptions {
  projectId: number;
  limit?: number;
  chunkTypes?: string[];
  filePaths?: string[];
  minScore?: number;
  
  // Search mode configuration
  enableSemantic?: boolean;
  enableKeyword?: boolean;
  enableGraph?: boolean;
  
  // Weight configuration (must sum to 1.0)
  semanticWeight?: number;
  keywordWeight?: number;
  graphWeight?: number;
  
  // Recency and proximity boosts
  recencyBoost?: boolean;
  proximityBoost?: boolean;
  currentFile?: string;
}

export interface RankedContext {
  chunks: SearchResult[];
  totalTokens: number;
  truncated: boolean;
  searchTimeMs: number;
  queryEmbedding?: number[];
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_LIMIT = 20;
const DEFAULT_MIN_SCORE = 0.2;

// Default weights based on research (semantic-first approach)
const DEFAULT_WEIGHTS = {
  semantic: 0.6,
  keyword: 0.3,
  graph: 0.1,
};

// Boost factors
const RECENCY_DECAY_DAYS = 30; // Half-life for recency decay
const PROXIMITY_BOOST_FACTOR = 1.2; // Boost for files near current file

// ════════════════════════════════════════════════════════════════════════════
// KEYWORD SEARCH
// ════════════════════════════════════════════════════════════════════════════

/**
 * Perform keyword search using trigram-like matching
 */
async function keywordSearch(
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const db = await getDb();
  if (!db) return [];

  const { projectId, limit = DEFAULT_LIMIT, chunkTypes, filePaths } = options;

  // Extract keywords from query
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  // Build keyword conditions
  const keywordConditions = keywords.map(keyword =>
    or(
      like(contextChunks.keywords, `%${keyword}%`),
      like(contextChunks.name, `%${keyword}%`),
      like(contextChunks.content, `%${keyword}%`)
    )
  );

  // Build base conditions
  const conditions = [
    eq(contextChunks.projectId, projectId),
    or(...keywordConditions)
  ];

  // Add chunk type filter
  if (chunkTypes && chunkTypes.length > 0) {
    conditions.push(inArray(contextChunks.chunkType, chunkTypes as any));
  }

  // Add file path filter
  if (filePaths && filePaths.length > 0) {
    const fileConditions = filePaths.map(fp => like(contextChunks.filePath, `%${fp}%`));
    const fileOr = or(...fileConditions);
    if (fileOr) conditions.push(fileOr);
  }

  const results = await db
    .select({
      id: contextChunks.id,
      filePath: contextChunks.filePath,
      name: contextChunks.name,
      chunkType: contextChunks.chunkType,
      content: contextChunks.content,
      summary: contextChunks.summary,
      startLine: contextChunks.startLine,
      endLine: contextChunks.endLine,
      keywords: contextChunks.keywords,
      tokenCount: contextChunks.tokenCount,
    })
    .from(contextChunks)
    .where(and(...conditions))
    .limit(limit * 2);

  // Score results by keyword match count and position
  return results.map(chunk => {
    const text = `${chunk.name || ""} ${chunk.keywords || ""} ${chunk.content}`.toLowerCase();
    const matchCount = keywords.filter(k => text.includes(k)).length;
    const nameMatch = keywords.some(k => (chunk.name || "").toLowerCase().includes(k)) ? 0.2 : 0;
    const score = (matchCount / keywords.length) + nameMatch;

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
      matchType: "keyword" as const,
      tokenCount: chunk.tokenCount || estimateTokens(chunk.content),
    };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Extract meaningful keywords from query
 */
function extractKeywords(query: string): string[] {
  // Remove common stop words and short words
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare",
    "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
    "from", "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "and", "but", "if", "or",
    "because", "until", "while", "this", "that", "these", "those", "what",
    "which", "who", "whom", "whose", "it", "its", "i", "me", "my", "we",
    "our", "you", "your", "he", "him", "his", "she", "her", "they", "them",
    "their", "find", "show", "get", "make", "use", "code", "function"
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // Limit to 10 keywords
}

// ════════════════════════════════════════════════════════════════════════════
// SEMANTIC SEARCH
// ════════════════════════════════════════════════════════════════════════════

/**
 * Perform semantic search using vector similarity
 */
async function semanticSearch(
  query: string,
  options: SearchOptions
): Promise<{ results: SearchResult[]; queryEmbedding: number[] }> {
  const db = await getDb();
  if (!db) return { results: [], queryEmbedding: [] };

  const { projectId, limit = DEFAULT_LIMIT, chunkTypes, filePaths, minScore = DEFAULT_MIN_SCORE } = options;

  // Generate query embedding
  const queryResult = await generateQueryEmbedding(query);
  const queryEmbedding = queryResult.embedding;

  // Check if we got a valid embedding
  if (queryEmbedding.every(v => v === 0)) {
    console.warn("[HybridSearch] Failed to generate query embedding");
    return { results: [], queryEmbedding };
  }

  // Build conditions
  const conditions = [eq(contextChunks.projectId, projectId)];

  if (chunkTypes && chunkTypes.length > 0) {
    conditions.push(inArray(contextChunks.chunkType, chunkTypes as any));
  }

  if (filePaths && filePaths.length > 0) {
    const fileConditions = filePaths.map(fp => like(contextChunks.filePath, `%${fp}%`));
    const fileOr = or(...fileConditions);
    if (fileOr) conditions.push(fileOr);
  }

  // Get all chunks with embeddings
  const chunks = await db
    .select({
      id: contextChunks.id,
      filePath: contextChunks.filePath,
      name: contextChunks.name,
      chunkType: contextChunks.chunkType,
      content: contextChunks.content,
      summary: contextChunks.summary,
      startLine: contextChunks.startLine,
      endLine: contextChunks.endLine,
      embedding: contextChunks.embedding,
      tokenCount: contextChunks.tokenCount,
    })
    .from(contextChunks)
    .where(and(...conditions));

  // Filter chunks with valid embeddings and calculate similarity
  const chunksWithEmbeddings = chunks.filter(c => 
    c.embedding !== null && 
    Array.isArray(c.embedding) && 
    c.embedding.length === EMBEDDING_CONFIG.dimensions
  );

  if (chunksWithEmbeddings.length === 0) {
    return { results: [], queryEmbedding };
  }

  // Calculate similarities
  const results = chunksWithEmbeddings
    .map(chunk => ({
      id: chunk.id,
      filePath: chunk.filePath,
      name: chunk.name,
      chunkType: chunk.chunkType,
      content: chunk.content,
      summary: chunk.summary,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      score: cosineSimilarity(queryEmbedding, chunk.embedding as number[]),
      matchType: "semantic" as const,
      tokenCount: chunk.tokenCount || estimateTokens(chunk.content),
    }))
    .filter(c => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { results, queryEmbedding };
}

// ════════════════════════════════════════════════════════════════════════════
// GRAPH-BASED SEARCH
// ════════════════════════════════════════════════════════════════════════════

/**
 * Perform graph-based search using import/export relationships
 */
async function graphSearch(
  seedChunkIds: number[],
  options: SearchOptions
): Promise<SearchResult[]> {
  const db = await getDb();
  if (!db || seedChunkIds.length === 0) return [];

  const { projectId, limit = DEFAULT_LIMIT } = options;

  // Get seed chunks to find their imports/exports
  const seedChunks = await db
    .select({
      id: contextChunks.id,
      imports: contextChunks.imports,
      exports: contextChunks.exports,
      references: contextChunks.references,
    })
    .from(contextChunks)
    .where(inArray(contextChunks.id, seedChunkIds));

  // Collect all referenced symbols
  const referencedSymbols = new Set<string>();
  for (const chunk of seedChunks) {
    if (chunk.imports) {
      (chunk.imports as string[]).forEach(imp => referencedSymbols.add(imp));
    }
    if (chunk.references) {
      (chunk.references as string[]).forEach(ref => referencedSymbols.add(ref));
    }
  }

  if (referencedSymbols.size === 0) return [];

  // Find chunks that export these symbols
  const symbolArray = Array.from(referencedSymbols);
  const relatedChunks = await db
    .select({
      id: contextChunks.id,
      filePath: contextChunks.filePath,
      name: contextChunks.name,
      chunkType: contextChunks.chunkType,
      content: contextChunks.content,
      summary: contextChunks.summary,
      startLine: contextChunks.startLine,
      endLine: contextChunks.endLine,
      exports: contextChunks.exports,
      tokenCount: contextChunks.tokenCount,
    })
    .from(contextChunks)
    .where(
      and(
        eq(contextChunks.projectId, projectId),
        // Note: We filter out seed chunks after the query
        eq(contextChunks.projectId, projectId)
      )
    )
    .limit(limit * 3);

  // Score by how many symbols they export that we reference
  return relatedChunks
    .map(chunk => {
      const exports = (chunk.exports as string[]) || [];
      const matchCount = exports.filter(exp => referencedSymbols.has(exp)).length;
      const score = matchCount > 0 ? matchCount / Math.max(referencedSymbols.size, 1) : 0;

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
        matchType: "graph" as const,
        tokenCount: chunk.tokenCount || estimateTokens(chunk.content),
      };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ════════════════════════════════════════════════════════════════════════════
// HYBRID SEARCH
// ════════════════════════════════════════════════════════════════════════════

/**
 * Perform hybrid search combining all retrieval methods
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions
): Promise<RankedContext> {
  const startTime = Date.now();
  const {
    limit = DEFAULT_LIMIT,
    enableSemantic = true,
    enableKeyword = true,
    enableGraph = true,
    semanticWeight = DEFAULT_WEIGHTS.semantic,
    keywordWeight = DEFAULT_WEIGHTS.keyword,
    graphWeight = DEFAULT_WEIGHTS.graph,
    recencyBoost = false,
    proximityBoost = false,
    currentFile,
    minScore = DEFAULT_MIN_SCORE,
  } = options;

  // Run searches in parallel
  const [keywordResults, semanticResults] = await Promise.all([
    enableKeyword ? keywordSearch(query, { ...options, limit: limit * 2 }) : [],
    enableSemantic ? semanticSearch(query, { ...options, limit: limit * 2 }) : { results: [], queryEmbedding: [] },
  ]);

  const semanticData = semanticResults as { results: SearchResult[]; queryEmbedding: number[] };

  // Merge and deduplicate results
  const resultMap = new Map<number, SearchResult & { scores: { semantic: number; keyword: number; graph: number } }>();

  // Add semantic results
  for (const result of semanticData.results) {
    resultMap.set(result.id, {
      ...result,
      scores: { semantic: result.score, keyword: 0, graph: 0 },
    });
  }

  // Add/merge keyword results
  for (const result of keywordResults) {
    const existing = resultMap.get(result.id);
    if (existing) {
      existing.scores.keyword = result.score;
    } else {
      resultMap.set(result.id, {
        ...result,
        scores: { semantic: 0, keyword: result.score, graph: 0 },
      });
    }
  }

  // Run graph search using top semantic/keyword results as seeds
  if (enableGraph && resultMap.size > 0) {
    const seedIds = Array.from(resultMap.keys()).slice(0, 5);
    const graphResults = await graphSearch(seedIds, options);

    for (const result of graphResults) {
      const existing = resultMap.get(result.id);
      if (existing) {
        existing.scores.graph = result.score;
      } else {
        resultMap.set(result.id, {
          ...result,
          scores: { semantic: 0, keyword: 0, graph: result.score },
        });
      }
    }
  }

  // Calculate combined scores with weights
  const combinedResults = Array.from(resultMap.values()).map(result => {
    let combinedScore = 
      result.scores.semantic * semanticWeight +
      result.scores.keyword * keywordWeight +
      result.scores.graph * graphWeight;

    // Apply proximity boost
    if (proximityBoost && currentFile) {
      const proximity = calculateProximity(result.filePath, currentFile);
      combinedScore *= (1 + proximity * (PROXIMITY_BOOST_FACTOR - 1));
    }

    return {
      ...result,
      score: combinedScore,
      matchType: "hybrid" as const,
    };
  });

  // Sort by combined score and apply token budget
  const sortedResults = combinedResults
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score);

  // Log query for analytics
  await logSearchQuery(options.projectId, query, sortedResults.length, Date.now() - startTime);

  return {
    chunks: sortedResults.slice(0, limit),
    totalTokens: sortedResults.reduce((sum, r) => sum + r.tokenCount, 0),
    truncated: sortedResults.length > limit,
    searchTimeMs: Date.now() - startTime,
    queryEmbedding: semanticData.queryEmbedding,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT RANKING WITH TOKEN BUDGET
// ════════════════════════════════════════════════════════════════════════════

/**
 * Select optimal chunks within a token budget using knapsack-like selection
 */
export function selectWithinBudget(
  chunks: SearchResult[],
  maxTokens: number,
  options: {
    diversityWeight?: number;
    minChunks?: number;
  } = {}
): SearchResult[] {
  const { diversityWeight = 0.1, minChunks = 3 } = options;

  if (chunks.length === 0) return [];

  // Sort by score descending
  const sorted = [...chunks].sort((a, b) => b.score - a.score);

  const selected: SearchResult[] = [];
  let totalTokens = 0;
  const selectedFiles = new Set<string>();

  for (const chunk of sorted) {
    // Check if adding this chunk would exceed budget
    if (totalTokens + chunk.tokenCount > maxTokens && selected.length >= minChunks) {
      break;
    }

    // Apply diversity penalty for same-file chunks
    let adjustedScore = chunk.score;
    if (selectedFiles.has(chunk.filePath)) {
      adjustedScore *= (1 - diversityWeight);
    }

    // Add chunk if it improves the selection
    if (selected.length < minChunks || adjustedScore > 0.1) {
      selected.push(chunk);
      totalTokens += chunk.tokenCount;
      selectedFiles.add(chunk.filePath);
    }
  }

  return selected;
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Estimate token count for text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate file proximity (0-1) based on path similarity
 */
function calculateProximity(filePath: string, currentFile: string): number {
  const pathA = filePath.split("/");
  const pathB = currentFile.split("/");

  let commonParts = 0;
  for (let i = 0; i < Math.min(pathA.length, pathB.length); i++) {
    if (pathA[i] === pathB[i]) {
      commonParts++;
    } else {
      break;
    }
  }

  return commonParts / Math.max(pathA.length, pathB.length);
}

/**
 * Log search query for analytics
 */
async function logSearchQuery(
  projectId: number,
  query: string,
  resultCount: number,
  searchTimeMs: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(contextQueries).values({
      projectId,
      userId: 0, // System query
      query,
      queryType: "hybrid",
      resultCount,
      searchTimeMs,
    });
  } catch (error) {
    console.error("[HybridSearch] Failed to log query:", error);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export { keywordSearch, semanticSearch, graphSearch };
