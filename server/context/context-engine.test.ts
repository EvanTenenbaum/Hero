/**
 * Context Engine Unit Tests
 * 
 * Comprehensive tests for Sprint 5: Context Engine
 * - Gemini embeddings
 * - Hybrid search
 * - Context retrieval and formatting
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ════════════════════════════════════════════════════════════════════════════
// GEMINI EMBEDDING TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Gemini Embedding Service", () => {
  describe("Configuration", () => {
    it("should have correct embedding dimensions", async () => {
      const { EMBEDDING_CONFIG } = await import("./geminiEmbedding");
      expect(EMBEDDING_CONFIG.dimensions).toBe(768);
    });

    it("should have correct model name", async () => {
      const { EMBEDDING_CONFIG } = await import("./geminiEmbedding");
      expect(EMBEDDING_CONFIG.model).toBe("gemini-embedding-001");
    });

    it("should have valid batch size", async () => {
      const { EMBEDDING_CONFIG } = await import("./geminiEmbedding");
      expect(EMBEDDING_CONFIG.maxBatchSize).toBeGreaterThan(0);
      expect(EMBEDDING_CONFIG.maxBatchSize).toBeLessThanOrEqual(100);
    });
  });

  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", async () => {
      const { cosineSimilarity } = await import("./geminiEmbedding");
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it("should return 0 for orthogonal vectors", async () => {
      const { cosineSimilarity } = await import("./geminiEmbedding");
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
    });

    it("should return -1 for opposite vectors", async () => {
      const { cosineSimilarity } = await import("./geminiEmbedding");
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5);
    });

    it("should handle zero vectors gracefully", async () => {
      const { cosineSimilarity } = await import("./geminiEmbedding");
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });
  });

  describe("findTopK", () => {
    it("should return top K most similar vectors", async () => {
      const { findTopK } = await import("./geminiEmbedding");
      const query = [1, 0, 0];
      const candidates = [
        { id: 1, embedding: [1, 0, 0] },      // similarity = 1
        { id: 2, embedding: [0.9, 0.1, 0] },  // similarity ≈ 0.99
        { id: 3, embedding: [0, 1, 0] },      // similarity = 0
        { id: 4, embedding: [0.5, 0.5, 0] },  // similarity ≈ 0.71
      ];

      const results = findTopK(query, candidates, 2);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
    });

    it("should respect minimum score threshold", async () => {
      const { findTopK } = await import("./geminiEmbedding");
      const query = [1, 0, 0];
      const candidates = [
        { id: 1, embedding: [1, 0, 0] },
        { id: 2, embedding: [0, 1, 0] },
        { id: 3, embedding: [-1, 0, 0] },
      ];

      const results = findTopK(query, candidates, 10, 0.5);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it("should handle empty candidates", async () => {
      const { findTopK } = await import("./geminiEmbedding");
      const results = findTopK([1, 0, 0], [], 5);
      expect(results).toHaveLength(0);
    });
  });

  describe("getEmbeddingCacheStats", () => {
    it("should return cache statistics", async () => {
      const { getEmbeddingCacheStats } = await import("./geminiEmbedding");
      const stats = getEmbeddingCacheStats();
      
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
      expect(typeof stats.size).toBe("number");
      expect(typeof stats.maxSize).toBe("number");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// HYBRID SEARCH TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Hybrid Search", () => {
  describe("Module Structure", () => {
    it("should export hybridSearch function", async () => {
      const module = await import("./hybridSearch");
      expect(typeof module.hybridSearch).toBe("function");
    });

    it("should export keywordSearch function", async () => {
      const module = await import("./hybridSearch");
      expect(typeof module.keywordSearch).toBe("function");
    });

    it("should export semanticSearch function", async () => {
      const module = await import("./hybridSearch");
      expect(typeof module.semanticSearch).toBe("function");
    });

    it("should export graphSearch function", async () => {
      const module = await import("./hybridSearch");
      expect(typeof module.graphSearch).toBe("function");
    });

    it("should export selectWithinBudget function", async () => {
      const module = await import("./hybridSearch");
      expect(typeof module.selectWithinBudget).toBe("function");
    });
  });

  describe("selectWithinBudget", () => {
    it("should select chunks within token budget", async () => {
      const { selectWithinBudget } = await import("./hybridSearch");
      
      const chunks = [
        { id: 1, filePath: "a.ts", name: "fn1", chunkType: "function", content: "x", summary: null, startLine: 1, endLine: 10, score: 0.9, matchType: "semantic" as const, tokenCount: 100 },
        { id: 2, filePath: "b.ts", name: "fn2", chunkType: "function", content: "y", summary: null, startLine: 1, endLine: 10, score: 0.8, matchType: "semantic" as const, tokenCount: 100 },
        { id: 3, filePath: "c.ts", name: "fn3", chunkType: "function", content: "z", summary: null, startLine: 1, endLine: 10, score: 0.7, matchType: "semantic" as const, tokenCount: 100 },
      ];

      // With minChunks=3 default, it will include all 3 even if over budget
      const selected = selectWithinBudget(chunks, 500);
      expect(selected.length).toBeLessThanOrEqual(3);
      
      const totalTokens = selected.reduce((sum, c) => sum + c.tokenCount, 0);
      expect(totalTokens).toBeLessThanOrEqual(500);
    });

    it("should prioritize higher scored chunks", async () => {
      const { selectWithinBudget } = await import("./hybridSearch");
      
      const chunks = [
        { id: 1, filePath: "a.ts", name: "fn1", chunkType: "function", content: "x", summary: null, startLine: 1, endLine: 10, score: 0.5, matchType: "semantic" as const, tokenCount: 100 },
        { id: 2, filePath: "b.ts", name: "fn2", chunkType: "function", content: "y", summary: null, startLine: 1, endLine: 10, score: 0.9, matchType: "semantic" as const, tokenCount: 100 },
        { id: 3, filePath: "c.ts", name: "fn3", chunkType: "function", content: "z", summary: null, startLine: 1, endLine: 10, score: 0.7, matchType: "semantic" as const, tokenCount: 100 },
      ];

      const selected = selectWithinBudget(chunks, 200);
      expect(selected[0].id).toBe(2); // Highest score first
    });

    it("should handle empty chunks array", async () => {
      const { selectWithinBudget } = await import("./hybridSearch");
      const selected = selectWithinBudget([], 1000);
      expect(selected).toHaveLength(0);
    });

    it("should respect minimum chunks requirement", async () => {
      const { selectWithinBudget } = await import("./hybridSearch");
      
      const chunks = [
        { id: 1, filePath: "a.ts", name: "fn1", chunkType: "function", content: "x", summary: null, startLine: 1, endLine: 10, score: 0.9, matchType: "semantic" as const, tokenCount: 500 },
        { id: 2, filePath: "b.ts", name: "fn2", chunkType: "function", content: "y", summary: null, startLine: 1, endLine: 10, score: 0.8, matchType: "semantic" as const, tokenCount: 500 },
        { id: 3, filePath: "c.ts", name: "fn3", chunkType: "function", content: "z", summary: null, startLine: 1, endLine: 10, score: 0.7, matchType: "semantic" as const, tokenCount: 500 },
      ];

      // Even with low budget, should get at least minChunks
      const selected = selectWithinBudget(chunks, 100, { minChunks: 2 });
      expect(selected.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT SERVICE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Context Service", () => {
  describe("Module Structure", () => {
    it("should export getContextForQuery function", async () => {
      const module = await import("./contextService");
      expect(typeof module.getContextForQuery).toBe("function");
    });

    it("should export getFileContext function", async () => {
      const module = await import("./contextService");
      expect(typeof module.getFileContext).toBe("function");
    });

    it("should export getSymbolContext function", async () => {
      const module = await import("./contextService");
      expect(typeof module.getSymbolContext).toBe("function");
    });

    it("should export formatCompactContext function", async () => {
      const module = await import("./contextService");
      expect(typeof module.formatCompactContext).toBe("function");
    });

    it("should export formatXMLContext function", async () => {
      const module = await import("./contextService");
      expect(typeof module.formatXMLContext).toBe("function");
    });
  });

  describe("formatCompactContext", () => {
    it("should format chunks in compact form", async () => {
      const { formatCompactContext } = await import("./contextService");
      
      const chunks = [
        { id: 1, filePath: "src/utils.ts", name: "formatDate", chunkType: "function", content: "code", summary: null, startLine: 10, endLine: 20, score: 0.9, matchType: "semantic" as const, tokenCount: 50 },
      ];

      const result = formatCompactContext(chunks);
      expect(result).toContain("Relevant code");
      expect(result).toContain("formatDate");
      expect(result).toContain("src/utils.ts");
    });

    it("should handle empty chunks", async () => {
      const { formatCompactContext } = await import("./contextService");
      const result = formatCompactContext([]);
      expect(result).toBe("");
    });

    it("should truncate long lists", async () => {
      const { formatCompactContext } = await import("./contextService");
      
      const chunks = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        filePath: `file${i}.ts`,
        name: `fn${i}`,
        chunkType: "function",
        content: "code",
        summary: null,
        startLine: 1,
        endLine: 10,
        score: 0.9 - i * 0.01,
        matchType: "semantic" as const,
        tokenCount: 50,
      }));

      const result = formatCompactContext(chunks);
      expect(result).toContain("and 5 more");
    });
  });

  describe("formatXMLContext", () => {
    it("should format chunks as XML", async () => {
      const { formatXMLContext } = await import("./contextService");
      
      const chunks = [
        { id: 1, filePath: "src/utils.ts", name: "formatDate", chunkType: "function", content: "function formatDate() {}", summary: null, startLine: 10, endLine: 20, score: 0.9, matchType: "semantic" as const, tokenCount: 50 },
      ];

      const result = formatXMLContext(chunks);
      expect(result).toContain("<context>");
      expect(result).toContain("</context>");
      expect(result).toContain("<chunk");
      expect(result).toContain("file=\"src/utils.ts\"");
      expect(result).toContain("type=\"function\"");
    });

    it("should escape XML special characters", async () => {
      const { formatXMLContext } = await import("./contextService");
      
      const chunks = [
        { id: 1, filePath: "src/utils.ts", name: "compare", chunkType: "function", content: "if (a < b && c > d) {}", summary: null, startLine: 1, endLine: 5, score: 0.9, matchType: "semantic" as const, tokenCount: 20 },
      ];

      const result = formatXMLContext(chunks);
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).toContain("&amp;");
    });

    it("should handle empty chunks", async () => {
      const { formatXMLContext } = await import("./contextService");
      const result = formatXMLContext([]);
      expect(result).toBe("<context></context>");
    });
  });

  describe("getLanguageFromPath", () => {
    it("should detect TypeScript", async () => {
      const { getLanguageFromPath } = await import("./contextService");
      expect(getLanguageFromPath("src/utils.ts")).toBe("typescript");
    });

    it("should detect TSX", async () => {
      const { getLanguageFromPath } = await import("./contextService");
      expect(getLanguageFromPath("src/App.tsx")).toBe("tsx");
    });

    it("should detect JavaScript", async () => {
      const { getLanguageFromPath } = await import("./contextService");
      expect(getLanguageFromPath("src/index.js")).toBe("javascript");
    });

    it("should detect Python", async () => {
      const { getLanguageFromPath } = await import("./contextService");
      expect(getLanguageFromPath("main.py")).toBe("python");
    });

    it("should return text for unknown extensions", async () => {
      const { getLanguageFromPath } = await import("./contextService");
      expect(getLanguageFromPath("file.xyz")).toBe("text");
    });
  });

  describe("getChunkTypeEmoji", () => {
    it("should return correct emoji for function", async () => {
      const { getChunkTypeEmoji } = await import("./contextService");
      expect(getChunkTypeEmoji("function")).toBe("⚡");
    });

    it("should return correct emoji for class", async () => {
      const { getChunkTypeEmoji } = await import("./contextService");
      expect(getChunkTypeEmoji("class")).toBe("📦");
    });

    it("should return correct emoji for component", async () => {
      const { getChunkTypeEmoji } = await import("./contextService");
      expect(getChunkTypeEmoji("component")).toBe("🧩");
    });

    it("should return default emoji for unknown type", async () => {
      const { getChunkTypeEmoji } = await import("./contextService");
      expect(getChunkTypeEmoji("unknown")).toBe("📝");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT ROUTER TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Context Router", () => {
  describe("Module Structure", () => {
    it("should export contextRouter", async () => {
      const module = await import("./router");
      expect(module.contextRouter).toBeDefined();
    });

    it("should have hybridSearch procedure", async () => {
      const { contextRouter } = await import("./router");
      expect(contextRouter._def.procedures.hybridSearch).toBeDefined();
    });

    it("should have getContext procedure", async () => {
      const { contextRouter } = await import("./router");
      expect(contextRouter._def.procedures.getContext).toBeDefined();
    });

    it("should have getFileContext procedure", async () => {
      const { contextRouter } = await import("./router");
      expect(contextRouter._def.procedures.getFileContext).toBeDefined();
    });

    it("should have getSymbolContext procedure", async () => {
      const { contextRouter } = await import("./router");
      expect(contextRouter._def.procedures.getSymbolContext).toBeDefined();
    });

    it("should have generateEmbeddings procedure", async () => {
      const { contextRouter } = await import("./router");
      expect(contextRouter._def.procedures.generateEmbeddings).toBeDefined();
    });

    it("should have getEmbeddingCacheStats procedure", async () => {
      const { contextRouter } = await import("./router");
      expect(contextRouter._def.procedures.getEmbeddingCacheStats).toBeDefined();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS (Mocked)
// ════════════════════════════════════════════════════════════════════════════

describe("Context Engine Integration", () => {
  describe("Search Pipeline", () => {
    it("should handle search with all options", async () => {
      const { hybridSearch } = await import("./hybridSearch");
      
      // This will return empty results since no DB, but should not throw
      const result = await hybridSearch("test query", {
        projectId: 1,
        limit: 10,
        enableSemantic: true,
        enableKeyword: true,
        enableGraph: false,
        semanticWeight: 0.6,
        keywordWeight: 0.4,
        graphWeight: 0,
      });

      expect(result).toHaveProperty("chunks");
      expect(result).toHaveProperty("totalTokens");
      expect(result).toHaveProperty("truncated");
      expect(result).toHaveProperty("searchTimeMs");
      expect(Array.isArray(result.chunks)).toBe(true);
    });

    it("should handle context retrieval", async () => {
      const { getContextForQuery } = await import("./contextService");
      
      const result = await getContextForQuery({
        projectId: 1,
        query: "test function",
        maxTokens: 4000,
      });

      expect(result).toHaveProperty("chunks");
      expect(result).toHaveProperty("promptContext");
      expect(result).toHaveProperty("totalTokens");
      expect(result).toHaveProperty("truncated");
      expect(result).toHaveProperty("searchTimeMs");
      expect(result).toHaveProperty("chunkCount");
      expect(result).toHaveProperty("fileCount");
    });
  });

  describe("Error Handling", () => {
    it("should handle empty query gracefully", async () => {
      const { hybridSearch } = await import("./hybridSearch");
      
      // Short query should still work
      const result = await hybridSearch("a", {
        projectId: 1,
        limit: 10,
      });

      expect(result.chunks).toHaveLength(0);
    });

    it("should handle invalid project ID", async () => {
      const { hybridSearch } = await import("./hybridSearch");
      
      const result = await hybridSearch("test", {
        projectId: -1,
        limit: 10,
      });

      expect(result.chunks).toHaveLength(0);
    });
  });
});
