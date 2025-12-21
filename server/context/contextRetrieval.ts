/**
 * Context Retrieval Service - Provides relevant code context for agent prompts
 * Sprint 2: Context Engine Search
 */

import { hybridSearch, searchByName, SearchResult, SearchOptions } from "./semanticSearch";

export interface RetrievalContext {
  chunks: ContextChunk[];
  totalTokens: number;
  truncated: boolean;
  searchQuery: string;
}

export interface ContextChunk {
  filePath: string;
  name: string | null;
  type: string;
  content: string;
  lines: { start: number; end: number };
  relevanceScore: number;
}

export interface RetrievalOptions {
  projectId: number;
  maxTokens?: number;
  maxChunks?: number;
  chunkTypes?: string[];
  includeImports?: boolean;
  includeRelated?: boolean;
}

const DEFAULT_MAX_TOKENS = 8000;
const DEFAULT_MAX_CHUNKS = 20;
const TOKENS_PER_CHAR = 0.25; // Rough estimate

/**
 * Retrieve relevant context for an agent query
 */
export async function retrieveContext(
  query: string,
  options: RetrievalOptions
): Promise<RetrievalContext> {
  const {
    projectId,
    maxTokens = DEFAULT_MAX_TOKENS,
    maxChunks = DEFAULT_MAX_CHUNKS,
    chunkTypes,
    includeImports = true,
    includeRelated = false
  } = options;

  // Perform hybrid search
  const searchResults = await hybridSearch(query, {
    projectId,
    limit: maxChunks * 2, // Get extra for filtering
    chunkTypes,
    minScore: 0.2
  });

  // Convert to context chunks with token budgeting
  const chunks: ContextChunk[] = [];
  let totalTokens = 0;
  let truncated = false;

  for (const result of searchResults) {
    const chunkTokens = estimateTokens(result.content);
    
    // Check if adding this chunk would exceed budget
    if (totalTokens + chunkTokens > maxTokens) {
      truncated = true;
      
      // Try to include a truncated version
      const remainingTokens = maxTokens - totalTokens;
      if (remainingTokens > 100) {
        const truncatedContent = truncateToTokens(result.content, remainingTokens);
        chunks.push({
          filePath: result.filePath,
          name: result.name,
          type: result.chunkType,
          content: truncatedContent + "\n// ... truncated",
          lines: { start: result.startLine, end: result.endLine },
          relevanceScore: result.score
        });
        totalTokens += remainingTokens;
      }
      break;
    }

    chunks.push({
      filePath: result.filePath,
      name: result.name,
      type: result.chunkType,
      content: result.content,
      lines: { start: result.startLine, end: result.endLine },
      relevanceScore: result.score
    });
    totalTokens += chunkTokens;

    if (chunks.length >= maxChunks) {
      truncated = searchResults.length > maxChunks;
      break;
    }
  }

  return {
    chunks,
    totalTokens,
    truncated,
    searchQuery: query
  };
}

/**
 * Retrieve context for a specific symbol (function, class, etc.)
 */
export async function retrieveSymbolContext(
  symbolName: string,
  options: RetrievalOptions
): Promise<RetrievalContext> {
  const { projectId, maxTokens = DEFAULT_MAX_TOKENS } = options;

  // Search for the symbol by name
  const results = await searchByName(symbolName, {
    projectId,
    limit: 10
  });

  const chunks: ContextChunk[] = [];
  let totalTokens = 0;

  for (const result of results) {
    const chunkTokens = estimateTokens(result.content);
    if (totalTokens + chunkTokens > maxTokens) break;

    chunks.push({
      filePath: result.filePath,
      name: result.name,
      type: result.chunkType,
      content: result.content,
      lines: { start: result.startLine, end: result.endLine },
      relevanceScore: result.score
    });
    totalTokens += chunkTokens;
  }

  return {
    chunks,
    totalTokens,
    truncated: results.length > chunks.length,
    searchQuery: symbolName
  };
}

/**
 * Format context for inclusion in agent prompt
 */
export function formatContextForPrompt(context: RetrievalContext): string {
  if (context.chunks.length === 0) {
    return "No relevant code context found.";
  }

  const sections: string[] = [];
  
  sections.push(`## Relevant Code Context (${context.chunks.length} chunks, ~${context.totalTokens} tokens)`);
  
  if (context.truncated) {
    sections.push("*Note: Context was truncated to fit token budget.*\n");
  }

  for (const chunk of context.chunks) {
    const header = `### ${chunk.type}: ${chunk.name || "anonymous"} (${chunk.filePath}:${chunk.lines.start}-${chunk.lines.end})`;
    const relevance = `*Relevance: ${(chunk.relevanceScore * 100).toFixed(1)}%*`;
    const code = "```typescript\n" + chunk.content + "\n```";
    
    sections.push(`${header}\n${relevance}\n${code}`);
  }

  return sections.join("\n\n");
}

/**
 * Create a compact context summary for smaller prompts
 */
export function formatCompactContext(context: RetrievalContext): string {
  if (context.chunks.length === 0) {
    return "";
  }

  const summaries = context.chunks.map(chunk => {
    const location = `${chunk.filePath}:${chunk.lines.start}`;
    return `- ${chunk.type} \`${chunk.name || "anonymous"}\` at ${location}`;
  });

  return `**Related code:**\n${summaries.join("\n")}`;
}

/**
 * Estimate token count for text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

/**
 * Truncate text to approximately fit token budget
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = Math.floor(maxTokens / TOKENS_PER_CHAR);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

/**
 * Get context statistics for a project
 */
export async function getContextStats(projectId: number): Promise<{
  totalChunks: number;
  indexedFiles: number;
  averageChunkSize: number;
  chunksByType: Record<string, number>;
}> {
  // This would query the database for stats
  // For now, return placeholder
  return {
    totalChunks: 0,
    indexedFiles: 0,
    averageChunkSize: 0,
    chunksByType: {}
  };
}
