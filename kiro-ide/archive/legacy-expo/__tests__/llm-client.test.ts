/**
 * Hero IDE - LLM Client Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMClient, HERO_PM_SYSTEM_PROMPT, LLMMessage, LLMProvider } from "../lib/llm-client";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("LLMClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create client with Gemini API key", () => {
      const client = new LLMClient({
        geminiApiKey: "test-gemini-key",
      });
      
      const providers = client.getAvailableProviders();
      expect(providers).toContain("gemini");
    });

    it("should create client with Anthropic API key", () => {
      const client = new LLMClient({
        anthropicApiKey: "test-anthropic-key",
      });
      
      const providers = client.getAvailableProviders();
      expect(providers).toContain("anthropic");
    });

    it("should create client with both providers", () => {
      const client = new LLMClient({
        geminiApiKey: "test-gemini-key",
        anthropicApiKey: "test-anthropic-key",
      });
      
      const providers = client.getAvailableProviders();
      expect(providers).toContain("gemini");
      expect(providers).toContain("anthropic");
    });

    it("should return empty providers when no keys provided", () => {
      const client = new LLMClient({});
      
      const providers = client.getAvailableProviders();
      expect(providers).toHaveLength(0);
    });

    it("should set default provider", () => {
      const client = new LLMClient({
        geminiApiKey: "test-key",
        defaultProvider: "gemini",
      });
      
      expect(client.getAvailableProviders()).toContain("gemini");
    });
  });

  describe("getAvailableProviders", () => {
    it("should return Gemini when Gemini key is set", () => {
      const client = new LLMClient({
        geminiApiKey: "test-key",
      });
      
      const providers = client.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.some((p: LLMProvider) => p === "gemini")).toBe(true);
    });

    it("should return Anthropic when Anthropic key is set", () => {
      const client = new LLMClient({
        anthropicApiKey: "test-key",
      });
      
      const providers = client.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.some((p: LLMProvider) => p === "anthropic")).toBe(true);
    });

    it("should return empty array when no keys provided", () => {
      const client = new LLMClient({});
      
      const providers = client.getAvailableProviders();
      expect(providers).toHaveLength(0);
    });
  });

  describe("chat - Gemini", () => {
    it("should call Gemini API with correct format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: "Hello! How can I help you?" }]
            }
          }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 8,
            totalTokenCount: 18,
          }
        }),
      });

      const client = new LLMClient({
        geminiApiKey: "test-gemini-key",
        defaultProvider: "gemini",
      });

      const messages: LLMMessage[] = [
        { role: "user", content: "Hello" },
      ];

      const response = await client.chat({
        messages,
        provider: "gemini",
        model: "gemini-2.5-flash",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response.content).toBe("Hello! How can I help you?");
      expect(response.provider).toBe("gemini");
    });

    it("should include system prompt in Gemini request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: "Response" }]
            }
          }],
        }),
      });

      const client = new LLMClient({
        geminiApiKey: "test-key",
      });

      await client.chat({
        messages: [{ role: "user", content: "Test" }],
        provider: "gemini",
        model: "gemini-2.5-flash",
        systemPrompt: "You are a helpful assistant",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.systemInstruction).toBeDefined();
      expect(callBody.systemInstruction.parts[0].text).toBe("You are a helpful assistant");
    });
  });

  describe("chat - Anthropic", () => {
    it("should call Anthropic API with correct format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "Hello from Claude!" }],
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
          model: "claude-sonnet-4-20250514",
        }),
      });

      const client = new LLMClient({
        anthropicApiKey: "test-anthropic-key",
      });

      const response = await client.chat({
        messages: [{ role: "user", content: "Hello" }],
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response.content).toBe("Hello from Claude!");
      expect(response.provider).toBe("anthropic");
    });

    it("should include system prompt in Anthropic request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "Response" }],
        }),
      });

      const client = new LLMClient({
        anthropicApiKey: "test-key",
      });

      await client.chat({
        messages: [{ role: "user", content: "Test" }],
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        systemPrompt: "You are a helpful assistant",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.system).toBe("You are a helpful assistant");
    });

    it("should include correct headers for Anthropic", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "Response" }],
        }),
      });

      const client = new LLMClient({
        anthropicApiKey: "test-anthropic-key",
      });

      await client.chat({
        messages: [{ role: "user", content: "Test" }],
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["x-api-key"]).toBe("test-anthropic-key");
      expect(headers["anthropic-version"]).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should throw error when provider not available", async () => {
      const client = new LLMClient({
        geminiApiKey: "test-key",
      });

      await expect(
        client.chat({
          messages: [{ role: "user", content: "Test" }],
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
        })
      ).rejects.toMatchObject({
        code: "NO_API_KEY",
      });
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: { message: "Invalid API key" } }),
      });

      const client = new LLMClient({
        geminiApiKey: "invalid-key",
      });

      await expect(
        client.chat({
          messages: [{ role: "user", content: "Test" }],
          provider: "gemini",
          model: "gemini-2.5-flash",
        })
      ).rejects.toMatchObject({
        code: "GEMINI_401",
      });
    });

    it("should handle rate limit errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({ error: { message: "Rate limit exceeded" } }),
      });

      const client = new LLMClient({
        geminiApiKey: "test-key",
      });

      await expect(
        client.chat({
          messages: [{ role: "user", content: "Test" }],
          provider: "gemini",
          model: "gemini-2.5-flash",
        })
      ).rejects.toMatchObject({
        code: "GEMINI_429",
        retryable: true,
      });
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const client = new LLMClient({
        geminiApiKey: "test-key",
      });

      await expect(
        client.chat({
          messages: [{ role: "user", content: "Test" }],
          provider: "gemini",
          model: "gemini-2.5-flash",
        })
      ).rejects.toMatchObject({
        code: "UNKNOWN_ERROR",
      });
    });
  });

  describe("HERO_PM_SYSTEM_PROMPT", () => {
    it("should be defined and non-empty", () => {
      expect(HERO_PM_SYSTEM_PROMPT).toBeDefined();
      expect(HERO_PM_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it("should mention Hero IDE", () => {
      expect(HERO_PM_SYSTEM_PROMPT.toLowerCase()).toContain("hero");
    });

    it("should mention PM capabilities", () => {
      const prompt = HERO_PM_SYSTEM_PROMPT.toLowerCase();
      expect(prompt).toContain("project");
    });
  });

  describe("message conversion", () => {
    it("should handle multi-turn conversations for Gemini", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: "I remember you said hello!" }]
            }
          }],
        }),
      });

      const client = new LLMClient({
        geminiApiKey: "test-key",
      });

      const messages: LLMMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "Do you remember what I said?" },
      ];

      await client.chat({
        messages,
        provider: "gemini",
        model: "gemini-2.5-flash",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.contents).toHaveLength(3);
      expect(callBody.contents[0].role).toBe("user");
      expect(callBody.contents[1].role).toBe("model");
      expect(callBody.contents[2].role).toBe("user");
    });

    it("should handle multi-turn conversations for Anthropic", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "I remember!" }],
        }),
      });

      const client = new LLMClient({
        anthropicApiKey: "test-key",
      });

      const messages: LLMMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "Do you remember?" },
      ];

      await client.chat({
        messages,
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages).toHaveLength(3);
    });
  });
});
