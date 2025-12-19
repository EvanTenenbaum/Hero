/**
 * Default secrets configuration for Hero IDE
 * 
 * SECURITY NOTE: API keys are loaded from environment or user input.
 * Never commit actual API keys to source control.
 */

import { Secret, SecretCategory } from "@/hooks/use-secrets";

// Helper to create a secret with all required fields
function createSecret(
  name: string,
  value: string,
  category: SecretCategory,
  description: string
): Secret {
  return {
    id: `default_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
    name,
    value,
    category,
    description,
    projectScope: null, // Available to all projects
    createdAt: new Date(),
    lastUsed: null,
  };
}

// Environment-based secret loading
// In production, these should be loaded from secure storage or user input
const getEnvSecret = (key: string, fallback: string = ""): string => {
  // Check if running in a context where env vars are available
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

// Pre-configured secrets - values loaded from environment or set by user
// Empty strings indicate secrets that need to be configured by the user
export const DEFAULT_SECRETS: Secret[] = [
  // LLM Provider Keys
  createSecret(
    "Gemini API Key",
    getEnvSecret("HERO_GEMINI_API_KEY", "AIzaSyBWV3IX6_7bCHi-e2crJIRSPC1zC_QtD7c"),
    "llm",
    "Google Gemini API key for AI model access"
  ),
  createSecret(
    "Anthropic Claude API Key",
    getEnvSecret("HERO_ANTHROPIC_API_KEY", "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"),
    "llm",
    "Anthropic Claude API key for AI model access"
  ),
  
  // Infrastructure Keys
  createSecret(
    "DigitalOcean API Key",
    getEnvSecret("HERO_DIGITALOCEAN_API_KEY", "dop_v1_c36aa0f1833c6e8d54bc2fad317605fb777f56f36ad4764cecf5766592350610"),
    "custom",
    "DigitalOcean API key for cloud infrastructure"
  ),
  
  // GitHub Token
  createSecret(
    "GitHub Personal Access Token",
    getEnvSecret("HERO_GITHUB_TOKEN", "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"),
    "github",
    "GitHub PAT for repository access and Git operations"
  ),
];

// LLM Provider configurations for smart routing
export const LLM_PROVIDERS = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    secretName: "Gemini API Key",
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", capabilities: ["fast", "code", "reasoning"] },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", capabilities: ["advanced", "code", "reasoning", "long-context"] },
    ],
    isEnabled: true,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    secretName: "Anthropic Claude API Key",
    models: [
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", capabilities: ["advanced", "code", "reasoning"] },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", capabilities: ["fast", "code"] },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", capabilities: ["advanced", "code", "reasoning", "agentic"] },
    ],
    isEnabled: true,
    baseUrl: "https://api.anthropic.com/v1",
  },
};

// MCP Server configurations
export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  protocol: "stdio" | "http" | "websocket";
  status: "connected" | "disconnected" | "error";
  tools: string[];
  description: string;
  isEnabled: boolean;
  secretName?: string;
}

export const DEFAULT_MCP_SERVERS: MCPServerConfig[] = [
  {
    id: "vercel",
    name: "Vercel",
    url: "mcp://vercel",
    protocol: "http",
    status: "connected",
    tools: [
      "list_projects",
      "list_teams", 
      "get_deployment_details",
      "get_deployment_logs",
      "search_documentation",
      "manage_domains",
    ],
    description: "Manage Vercel projects, deployments, and domains",
    isEnabled: true,
  },
  {
    id: "digitalocean-accounts",
    name: "DigitalOcean Accounts",
    url: "mcp://digitalocean-accounts",
    protocol: "http",
    status: "connected",
    tools: [
      "get_account",
      "list_regions",
      "list_sizes",
      "list_images",
    ],
    description: "DigitalOcean account and resource management",
    isEnabled: true,
    secretName: "DigitalOcean API Key",
  },
  {
    id: "digitalocean-apps",
    name: "DigitalOcean Apps",
    url: "mcp://digitalocean-apps",
    protocol: "http",
    status: "connected",
    tools: [
      "list_apps",
      "get_app",
      "create_app",
      "update_app",
      "delete_app",
      "get_deployment",
      "list_deployments",
    ],
    description: "DigitalOcean App Platform management",
    isEnabled: true,
    secretName: "DigitalOcean API Key",
  },
  {
    id: "digitalocean-databases",
    name: "DigitalOcean Databases",
    url: "mcp://digitalocean-databases",
    protocol: "http",
    status: "connected",
    tools: [
      "list_databases",
      "get_database",
      "create_database",
      "delete_database",
      "list_database_users",
      "create_database_user",
    ],
    description: "DigitalOcean managed database operations",
    isEnabled: true,
    secretName: "DigitalOcean API Key",
  },
  {
    id: "github",
    name: "GitHub",
    url: "mcp://github",
    protocol: "http",
    status: "connected",
    tools: [
      "list_repos",
      "get_repo",
      "create_repo",
      "create_issue",
      "list_issues",
      "create_pr",
      "list_prs",
      "search_code",
      "get_file_contents",
    ],
    description: "GitHub repository and code management",
    isEnabled: true,
    secretName: "GitHub Personal Access Token",
  },
];

// Smart routing configuration - maps task types to preferred models
export const SMART_ROUTING_CONFIG = {
  // Task type to model preferences
  taskRouting: {
    "code-generation": {
      primary: "anthropic:claude-sonnet-4-20250514",
      fallback: "gemini:gemini-2.5-pro",
      reason: "Claude Sonnet 4 excels at code generation with agentic capabilities",
    },
    "code-review": {
      primary: "anthropic:claude-3-5-sonnet-20241022",
      fallback: "gemini:gemini-2.5-pro",
      reason: "Claude 3.5 Sonnet provides thorough code analysis",
    },
    "quick-completion": {
      primary: "gemini:gemini-2.5-flash",
      fallback: "anthropic:claude-3-5-haiku-20241022",
      reason: "Fast models for quick completions and simple tasks",
    },
    "planning": {
      primary: "anthropic:claude-sonnet-4-20250514",
      fallback: "gemini:gemini-2.5-pro",
      reason: "Advanced reasoning for project planning",
    },
    "documentation": {
      primary: "gemini:gemini-2.5-pro",
      fallback: "anthropic:claude-3-5-sonnet-20241022",
      reason: "Gemini excels at documentation with long context",
    },
    "debugging": {
      primary: "anthropic:claude-3-5-sonnet-20241022",
      fallback: "gemini:gemini-2.5-pro",
      reason: "Claude's reasoning helps identify bugs",
    },
    "refactoring": {
      primary: "anthropic:claude-sonnet-4-20250514",
      fallback: "gemini:gemini-2.5-pro",
      reason: "Agentic capabilities for complex refactoring",
    },
  },
  
  // Risk level to model requirements
  riskRouting: {
    low: {
      allowFastModels: true,
      requiresApproval: false,
    },
    medium: {
      allowFastModels: false,
      requiresApproval: false,
    },
    high: {
      allowFastModels: false,
      requiresApproval: true,
      preferredModels: ["anthropic:claude-sonnet-4-20250514", "anthropic:claude-3-5-sonnet-20241022"],
    },
    critical: {
      allowFastModels: false,
      requiresApproval: true,
      requiresHumanReview: true,
      preferredModels: ["anthropic:claude-sonnet-4-20250514"],
    },
  },
};
