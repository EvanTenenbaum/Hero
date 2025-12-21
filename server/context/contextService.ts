/**
 * Context Service
 * 
 * High-level service for retrieving and formatting context for AI agents.
 * Implements the "Context Engineering" principles from Anthropic's research.
 * 
 * Key principles:
 * 1. Provide sufficient context without overwhelming
 * 2. Structure context for easy comprehension
 * 3. Include relevant metadata (file paths, line numbers)
 * 4. Support token budget management
 */

import { hybridSearch, selectWithinBudget, SearchResult, SearchOptions, RankedContext } from "./hybridSearch";
import { getChunksByFile, getChunkById } from "./chunkStorage";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface ContextRequest {
  projectId: number;
  query: string;
  
  // Token budget
  maxTokens?: number;
  
  // Context preferences
  includeImports?: boolean;
  includeRelated?: boolean;
  currentFile?: string;
  
  // Search configuration
  chunkTypes?: string[];
  filePaths?: string[];
}

export interface FormattedContext {
  // Raw chunks for programmatic use
  chunks: SearchResult[];
  
  // Formatted for prompt injection
  promptContext: string;
  
  // Metadata
  totalTokens: number;
  truncated: boolean;
  searchTimeMs: number;
  chunkCount: number;
  fileCount: number;
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_TOKENS = 8000;
const CONTEXT_HEADER = `## Relevant Code Context`;
const TRUNCATION_NOTICE = `*Note: Context was truncated to fit token budget. Additional relevant code may exist.*`;

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT RETRIEVAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Retrieve and format context for an AI agent query
 */
export async function getContextForQuery(
  request: ContextRequest
): Promise<FormattedContext> {
  const {
    projectId,
    query,
    maxTokens = DEFAULT_MAX_TOKENS,
    includeImports = true,
    includeRelated = false,
    currentFile,
    chunkTypes,
    filePaths,
  } = request;

  // Perform hybrid search
  const searchResult = await hybridSearch(query, {
    projectId,
    limit: 30, // Get extra for budget selection
    chunkTypes,
    filePaths,
    currentFile,
    proximityBoost: !!currentFile,
    enableSemantic: true,
    enableKeyword: true,
    enableGraph: includeRelated,
  });

  // Select chunks within token budget
  const selectedChunks = selectWithinBudget(searchResult.chunks, maxTokens, {
    diversityWeight: 0.15,
    minChunks: 3,
  });

  // Calculate actual token usage
  const totalTokens = selectedChunks.reduce((sum, c) => sum + c.tokenCount, 0);
  const truncated = searchResult.chunks.length > selectedChunks.length;

  // Get unique files
  const uniqueFiles = new Set(selectedChunks.map(c => c.filePath));

  // Format for prompt
  const promptContext = formatContextForPrompt(selectedChunks, {
    query,
    truncated,
    totalTokens,
  });

  return {
    chunks: selectedChunks,
    promptContext,
    totalTokens,
    truncated,
    searchTimeMs: searchResult.searchTimeMs,
    chunkCount: selectedChunks.length,
    fileCount: uniqueFiles.size,
  };
}

/**
 * Get context for a specific file
 */
export async function getFileContext(
  projectId: number,
  filePath: string,
  maxTokens: number = DEFAULT_MAX_TOKENS
): Promise<FormattedContext> {
  const chunks = await getChunksByFile(projectId, filePath);

  // Convert to SearchResult format
  const searchResults: SearchResult[] = chunks.map((chunk, index) => ({
    id: chunk.id,
    filePath: chunk.filePath,
    name: chunk.name,
    chunkType: chunk.chunkType,
    content: chunk.content,
    summary: chunk.summary,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    score: 1 - (index * 0.01), // Maintain order
    matchType: "keyword" as const,
    tokenCount: chunk.tokenCount || estimateTokens(chunk.content),
  }));

  // Select within budget
  const selectedChunks = selectWithinBudget(searchResults, maxTokens);
  const totalTokens = selectedChunks.reduce((sum, c) => sum + c.tokenCount, 0);

  const promptContext = formatContextForPrompt(selectedChunks, {
    query: `File: ${filePath}`,
    truncated: searchResults.length > selectedChunks.length,
    totalTokens,
  });

  return {
    chunks: selectedChunks,
    promptContext,
    totalTokens,
    truncated: searchResults.length > selectedChunks.length,
    searchTimeMs: 0,
    chunkCount: selectedChunks.length,
    fileCount: 1,
  };
}

/**
 * Get context for specific symbols (functions, classes, etc.)
 */
export async function getSymbolContext(
  projectId: number,
  symbolNames: string[],
  maxTokens: number = DEFAULT_MAX_TOKENS
): Promise<FormattedContext> {
  // Search for each symbol
  const allChunks: SearchResult[] = [];

  for (const symbolName of symbolNames) {
    const result = await hybridSearch(symbolName, {
      projectId,
      limit: 5,
      enableKeyword: true,
      enableSemantic: true,
      enableGraph: false,
    });
    allChunks.push(...result.chunks);
  }

  // Deduplicate by ID
  const uniqueChunks = Array.from(
    new Map(allChunks.map(c => [c.id, c])).values()
  );

  // Select within budget
  const selectedChunks = selectWithinBudget(uniqueChunks, maxTokens);
  const totalTokens = selectedChunks.reduce((sum, c) => sum + c.tokenCount, 0);
  const uniqueFiles = new Set(selectedChunks.map(c => c.filePath));

  const promptContext = formatContextForPrompt(selectedChunks, {
    query: `Symbols: ${symbolNames.join(", ")}`,
    truncated: uniqueChunks.length > selectedChunks.length,
    totalTokens,
  });

  return {
    chunks: selectedChunks,
    promptContext,
    totalTokens,
    truncated: uniqueChunks.length > selectedChunks.length,
    searchTimeMs: 0,
    chunkCount: selectedChunks.length,
    fileCount: uniqueFiles.size,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PROMPT FORMATTING
// ════════════════════════════════════════════════════════════════════════════

interface FormatOptions {
  query: string;
  truncated: boolean;
  totalTokens: number;
}

/**
 * Format context chunks for injection into an AI prompt
 * 
 * Format follows best practices:
 * - Clear section headers
 * - File path and line numbers for each chunk
 * - Syntax highlighting hints
 * - Relevance scores for transparency
 */
function formatContextForPrompt(
  chunks: SearchResult[],
  options: FormatOptions
): string {
  if (chunks.length === 0) {
    return `${CONTEXT_HEADER}\n\nNo relevant code context found for: "${options.query}"`;
  }

  const sections: string[] = [];

  // Header with metadata
  sections.push(`${CONTEXT_HEADER}`);
  sections.push(`*Query: "${options.query}" | ${chunks.length} chunks | ~${options.totalTokens} tokens*`);

  if (options.truncated) {
    sections.push(TRUNCATION_NOTICE);
  }

  sections.push(""); // Empty line

  // Group chunks by file for better readability
  const chunksByFile = new Map<string, SearchResult[]>();
  for (const chunk of chunks) {
    const existing = chunksByFile.get(chunk.filePath) || [];
    existing.push(chunk);
    chunksByFile.set(chunk.filePath, existing);
  }

  // Format each file's chunks
  for (const [filePath, fileChunks] of Array.from(chunksByFile.entries())) {
    sections.push(`### 📄 ${filePath}`);

    for (const chunk of fileChunks) {
      const typeEmoji = getChunkTypeEmoji(chunk.chunkType);
      const nameDisplay = chunk.name ? `\`${chunk.name}\`` : "(anonymous)";
      const lineRange = `L${chunk.startLine}-${chunk.endLine}`;
      const relevance = `${(chunk.score * 100).toFixed(0)}%`;

      sections.push(`#### ${typeEmoji} ${chunk.chunkType}: ${nameDisplay} (${lineRange}) [${relevance}]`);

      if (chunk.summary) {
        sections.push(`> ${chunk.summary}`);
      }

      // Determine language for syntax highlighting
      const lang = getLanguageFromPath(filePath);
      sections.push("```" + lang);
      sections.push(chunk.content);
      sections.push("```");
      sections.push(""); // Empty line between chunks
    }
  }

  return sections.join("\n");
}

/**
 * Format context in a compact form for smaller prompts
 */
export function formatCompactContext(chunks: SearchResult[]): string {
  if (chunks.length === 0) {
    return "";
  }

  const lines = ["**Relevant code:**"];

  for (const chunk of chunks.slice(0, 10)) {
    const location = `${chunk.filePath}:${chunk.startLine}`;
    const name = chunk.name || "anonymous";
    lines.push(`- ${chunk.chunkType} \`${name}\` at ${location}`);
  }

  if (chunks.length > 10) {
    lines.push(`- ... and ${chunks.length - 10} more`);
  }

  return lines.join("\n");
}

/**
 * Format context as XML for structured prompts
 */
export function formatXMLContext(chunks: SearchResult[]): string {
  if (chunks.length === 0) {
    return "<context></context>";
  }

  const xmlChunks = chunks.map(chunk => {
    const attrs = [
      `file="${escapeXML(chunk.filePath)}"`,
      `type="${chunk.chunkType}"`,
      `lines="${chunk.startLine}-${chunk.endLine}"`,
      `relevance="${(chunk.score * 100).toFixed(0)}%"`,
    ];
    if (chunk.name) {
      attrs.push(`name="${escapeXML(chunk.name)}"`);
    }

    return `  <chunk ${attrs.join(" ")}>\n${escapeXML(chunk.content)}\n  </chunk>`;
  });

  return `<context>\n${xmlChunks.join("\n")}\n</context>`;
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getChunkTypeEmoji(chunkType: string): string {
  const emojis: Record<string, string> = {
    function: "⚡",
    class: "📦",
    interface: "📋",
    type: "🏷️",
    component: "🧩",
    hook: "🪝",
    constant: "📌",
    import: "📥",
    export: "📤",
    comment: "💬",
    block: "📄",
    file_summary: "📑",
  };
  return emojis[chunkType] || "📝";
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    sql: "sql",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
  };
  return langMap[ext || ""] || "text";
}

function escapeXML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export {
  formatContextForPrompt,
  getChunkTypeEmoji,
  getLanguageFromPath,
};
