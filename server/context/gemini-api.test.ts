/**
 * Gemini API Key Validation Test
 * 
 * Validates that the GEMINI_API_KEY environment variable is set
 * and can successfully call the Gemini embedding API.
 */

import { describe, it, expect } from "vitest";

describe("Gemini API Key Validation", () => {
  it("should have GEMINI_API_KEY environment variable set", () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey?.length).toBeGreaterThan(10);
  });

  it.skipIf(!process.env.GEMINI_API_KEY?.startsWith('AI'))("should successfully call Gemini embedding API", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Skipping API test - no API key configured");
      return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: {
          parts: [{ text: "Hello, world!" }],
        },
        outputDimensionality: 768,
      }),
    });

    const data = await response.json();

    // Log error if not OK
    if (!response.ok) {
      console.error("API Error:", response.status, data);
    }

    // Check response status
    expect(response.ok).toBe(true);

    // Verify we got an embedding back
    expect(data.embedding).toBeDefined();
    expect(data.embedding.values).toBeDefined();
    expect(Array.isArray(data.embedding.values)).toBe(true);
    expect(data.embedding.values.length).toBe(768);
  }, 30000); // 30 second timeout for API call
});
