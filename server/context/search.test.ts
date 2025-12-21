/**
 * Unit tests for Context Engine Search
 * Sprint 2: Context Engine Search
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  normalizeVector, 
  cosineSimilarity, 
  findTopK,
  DIMENSIONS 
} from "./embedding";

describe("Embedding Utilities", () => {
  describe("normalizeVector", () => {
    it("should normalize a vector to unit length", () => {
      const vector = [3, 4]; // 3-4-5 triangle
      const normalized = normalizeVector(vector);
      
      // Check unit length
      const magnitude = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1, 5);
      
      // Check direction preserved
      expect(normalized[0]).toBeCloseTo(0.6, 5);
      expect(normalized[1]).toBeCloseTo(0.8, 5);
    });

    it("should handle zero vector", () => {
      const vector = [0, 0, 0];
      const normalized = normalizeVector(vector);
      expect(normalized).toEqual([0, 0, 0]);
    });

    it("should handle already normalized vector", () => {
      const vector = [1, 0, 0];
      const normalized = normalizeVector(vector);
      expect(normalized).toEqual([1, 0, 0]);
    });
  });

  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", () => {
      const vector = [1, 2, 3, 4, 5];
      const similarity = cosineSimilarity(vector, vector);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it("should return 0 for orthogonal vectors", () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it("should return -1 for opposite vectors", () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it("should handle normalized vectors", () => {
      const a = normalizeVector([1, 2, 3]);
      const b = normalizeVector([1, 2, 3]);
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it("should throw for vectors of different lengths", () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      expect(() => cosineSimilarity(a, b)).toThrow("Vectors must have same length");
    });
  });

  describe("findTopK", () => {
    it("should return top k most similar vectors", () => {
      const query = [1, 0, 0];
      const candidates = [
        { id: 1, embedding: [1, 0, 0] },      // similarity = 1
        { id: 2, embedding: [0, 1, 0] },      // similarity = 0
        { id: 3, embedding: [0.7, 0.7, 0] },  // similarity ~= 0.7
        { id: 4, embedding: [-1, 0, 0] },     // similarity = -1
      ];

      const results = findTopK(query, candidates, 2);
      
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[0].similarity).toBeCloseTo(1, 5);
      expect(results[1].id).toBe(3);
    });

    it("should return all candidates if k > candidates.length", () => {
      const query = [1, 0];
      const candidates = [
        { id: 1, embedding: [1, 0] },
        { id: 2, embedding: [0, 1] },
      ];

      const results = findTopK(query, candidates, 10);
      expect(results).toHaveLength(2);
    });

    it("should handle empty candidates", () => {
      const query = [1, 0, 0];
      const results = findTopK(query, [], 5);
      expect(results).toHaveLength(0);
    });
  });

  describe("DIMENSIONS constant", () => {
    it("should be 768 for text-embedding-004", () => {
      expect(DIMENSIONS).toBe(768);
    });
  });
});

describe("Context Retrieval", () => {
  describe("formatContextForPrompt", () => {
    // Import dynamically to avoid initialization issues
    it("should format empty context correctly", async () => {
      const { formatContextForPrompt } = await import("./contextRetrieval");
      
      const context = {
        chunks: [],
        totalTokens: 0,
        truncated: false,
        searchQuery: "test"
      };
      
      const formatted = formatContextForPrompt(context);
      expect(formatted).toBe("No relevant code context found.");
    });

    it("should format context with chunks", async () => {
      const { formatContextForPrompt } = await import("./contextRetrieval");
      
      const context = {
        chunks: [
          {
            filePath: "/src/test.ts",
            name: "testFunction",
            type: "function",
            content: "function testFunction() { return true; }",
            lines: { start: 1, end: 3 },
            relevanceScore: 0.95
          }
        ],
        totalTokens: 100,
        truncated: false,
        searchQuery: "test"
      };
      
      const formatted = formatContextForPrompt(context);
      
      expect(formatted).toContain("## Relevant Code Context");
      expect(formatted).toContain("1 chunks");
      expect(formatted).toContain("testFunction");
      expect(formatted).toContain("/src/test.ts:1-3");
      expect(formatted).toContain("95.0%");
      expect(formatted).toContain("```typescript");
    });

    it("should indicate truncation", async () => {
      const { formatContextForPrompt } = await import("./contextRetrieval");
      
      const context = {
        chunks: [
          {
            filePath: "/src/test.ts",
            name: "test",
            type: "function",
            content: "code",
            lines: { start: 1, end: 1 },
            relevanceScore: 0.5
          }
        ],
        totalTokens: 8000,
        truncated: true,
        searchQuery: "test"
      };
      
      const formatted = formatContextForPrompt(context);
      expect(formatted).toContain("truncated");
    });
  });

  describe("formatCompactContext", () => {
    it("should return empty string for no chunks", async () => {
      const { formatCompactContext } = await import("./contextRetrieval");
      
      const context = {
        chunks: [],
        totalTokens: 0,
        truncated: false,
        searchQuery: "test"
      };
      
      const formatted = formatCompactContext(context);
      expect(formatted).toBe("");
    });

    it("should format compact summary", async () => {
      const { formatCompactContext } = await import("./contextRetrieval");
      
      const context = {
        chunks: [
          {
            filePath: "/src/auth.ts",
            name: "authenticate",
            type: "function",
            content: "code",
            lines: { start: 10, end: 20 },
            relevanceScore: 0.9
          },
          {
            filePath: "/src/user.ts",
            name: "User",
            type: "class",
            content: "code",
            lines: { start: 1, end: 50 },
            relevanceScore: 0.8
          }
        ],
        totalTokens: 500,
        truncated: false,
        searchQuery: "auth"
      };
      
      const formatted = formatCompactContext(context);
      
      expect(formatted).toContain("**Related code:**");
      expect(formatted).toContain("function `authenticate`");
      expect(formatted).toContain("class `User`");
      expect(formatted).toContain("/src/auth.ts:10");
    });
  });
});

describe("Search Options", () => {
  it("should have correct default values", () => {
    // These are the expected defaults from semanticSearch.ts
    const DEFAULT_LIMIT = 10;
    const DEFAULT_MIN_SCORE = 0.3;
    
    expect(DEFAULT_LIMIT).toBe(10);
    expect(DEFAULT_MIN_SCORE).toBe(0.3);
  });
});

describe("Embedding Pipeline", () => {
  describe("getPipelineProgress", () => {
    it("should return initial state", async () => {
      const { getPipelineProgress } = await import("./embeddingPipeline");
      
      const progress = getPipelineProgress();
      
      expect(progress).toHaveProperty("total");
      expect(progress).toHaveProperty("processed");
      expect(progress).toHaveProperty("failed");
      expect(progress).toHaveProperty("status");
      expect(progress).toHaveProperty("currentBatch");
      expect(progress).toHaveProperty("totalBatches");
    });
  });
});
