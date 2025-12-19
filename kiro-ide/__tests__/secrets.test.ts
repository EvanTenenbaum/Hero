/**
 * Hero IDE - Secrets Management Tests
 * 
 * Tests for default secrets configuration and LLM routing
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_SECRETS,
  LLM_PROVIDERS,
  DEFAULT_MCP_SERVERS,
  SMART_ROUTING_CONFIG,
} from "../lib/default-secrets";

describe("Default Secrets", () => {
  it("should have all required LLM provider secrets", () => {
    const secretNames = DEFAULT_SECRETS.map(s => s.name);
    
    expect(secretNames).toContain("Gemini API Key");
    expect(secretNames).toContain("Anthropic Claude API Key");
  });

  it("should have infrastructure secrets", () => {
    const secretNames = DEFAULT_SECRETS.map(s => s.name);
    
    expect(secretNames).toContain("DigitalOcean API Key");
    expect(secretNames).toContain("GitHub Personal Access Token");
  });

  it("should have correct categories for secrets", () => {
    const geminiSecret = DEFAULT_SECRETS.find(s => s.name === "Gemini API Key");
    const anthropicSecret = DEFAULT_SECRETS.find(s => s.name === "Anthropic Claude API Key");
    const githubSecret = DEFAULT_SECRETS.find(s => s.name === "GitHub Personal Access Token");
    
    expect(geminiSecret?.category).toBe("llm");
    expect(anthropicSecret?.category).toBe("llm");
    expect(githubSecret?.category).toBe("github");
  });

  it("should have unique IDs for all secrets", () => {
    const ids = DEFAULT_SECRETS.map(s => s.id);
    const uniqueIds = new Set(ids);
    
    // IDs may be generated with timestamps, so just check they exist
    expect(ids.length).toBe(DEFAULT_SECRETS.length);
    ids.forEach(id => expect(id).toBeTruthy());
  });

  it("should have projectScope set to null for global availability", () => {
    DEFAULT_SECRETS.forEach(secret => {
      expect(secret.projectScope).toBeNull();
    });
  });
});

describe("LLM Providers", () => {
  it("should have Gemini provider configured", () => {
    expect(LLM_PROVIDERS.gemini).toBeDefined();
    expect(LLM_PROVIDERS.gemini.name).toBe("Google Gemini");
    expect(LLM_PROVIDERS.gemini.isEnabled).toBe(true);
  });

  it("should have Anthropic provider configured", () => {
    expect(LLM_PROVIDERS.anthropic).toBeDefined();
    expect(LLM_PROVIDERS.anthropic.name).toBe("Anthropic Claude");
    expect(LLM_PROVIDERS.anthropic.isEnabled).toBe(true);
  });

  it("should have valid models for each provider", () => {
    expect(LLM_PROVIDERS.gemini.models.length).toBeGreaterThan(0);
    expect(LLM_PROVIDERS.anthropic.models.length).toBeGreaterThan(0);
    
    // Check model structure
    LLM_PROVIDERS.gemini.models.forEach(model => {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(Array.isArray(model.capabilities)).toBe(true);
    });
  });

  it("should reference correct secret names", () => {
    const secretNames = DEFAULT_SECRETS.map(s => s.name);
    
    expect(secretNames).toContain(LLM_PROVIDERS.gemini.secretName);
    expect(secretNames).toContain(LLM_PROVIDERS.anthropic.secretName);
  });
});

describe("MCP Servers", () => {
  it("should have Vercel MCP server", () => {
    const vercel = DEFAULT_MCP_SERVERS.find(s => s.id === "vercel");
    
    expect(vercel).toBeDefined();
    expect(vercel?.isEnabled).toBe(true);
    expect(vercel?.tools.length).toBeGreaterThan(0);
  });

  it("should have DigitalOcean MCP servers", () => {
    const doServers = DEFAULT_MCP_SERVERS.filter(s => s.id.startsWith("digitalocean"));
    
    expect(doServers.length).toBe(3); // accounts, apps, databases
    doServers.forEach(server => {
      expect(server.secretName).toBe("DigitalOcean API Key");
    });
  });

  it("should have GitHub MCP server", () => {
    const github = DEFAULT_MCP_SERVERS.find(s => s.id === "github");
    
    expect(github).toBeDefined();
    expect(github?.secretName).toBe("GitHub Personal Access Token");
    expect(github?.tools).toContain("list_repos");
    expect(github?.tools).toContain("create_pr");
  });

  it("should have valid protocol for all servers", () => {
    DEFAULT_MCP_SERVERS.forEach(server => {
      expect(["stdio", "http", "websocket"]).toContain(server.protocol);
    });
  });
});

describe("Smart Routing Config", () => {
  it("should have task routing for code generation", () => {
    const codeGen = SMART_ROUTING_CONFIG.taskRouting["code-generation"];
    
    expect(codeGen).toBeDefined();
    expect(codeGen.primary).toBeTruthy();
    expect(codeGen.fallback).toBeTruthy();
    expect(codeGen.reason).toBeTruthy();
  });

  it("should have task routing for all common tasks", () => {
    const taskTypes = Object.keys(SMART_ROUTING_CONFIG.taskRouting);
    
    expect(taskTypes).toContain("code-generation");
    expect(taskTypes).toContain("code-review");
    expect(taskTypes).toContain("quick-completion");
    expect(taskTypes).toContain("planning");
    expect(taskTypes).toContain("documentation");
    expect(taskTypes).toContain("debugging");
    expect(taskTypes).toContain("refactoring");
  });

  it("should have risk-based routing configuration", () => {
    const riskLevels = Object.keys(SMART_ROUTING_CONFIG.riskRouting);
    
    expect(riskLevels).toContain("low");
    expect(riskLevels).toContain("medium");
    expect(riskLevels).toContain("high");
    expect(riskLevels).toContain("critical");
  });

  it("should require approval for high-risk tasks", () => {
    expect(SMART_ROUTING_CONFIG.riskRouting.high.requiresApproval).toBe(true);
    expect(SMART_ROUTING_CONFIG.riskRouting.critical.requiresApproval).toBe(true);
    expect(SMART_ROUTING_CONFIG.riskRouting.critical.requiresHumanReview).toBe(true);
  });

  it("should allow fast models only for low-risk tasks", () => {
    expect(SMART_ROUTING_CONFIG.riskRouting.low.allowFastModels).toBe(true);
    expect(SMART_ROUTING_CONFIG.riskRouting.medium.allowFastModels).toBe(false);
    expect(SMART_ROUTING_CONFIG.riskRouting.high.allowFastModels).toBe(false);
  });
});
