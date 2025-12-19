/**
 * KIRO IDE - MCP (Model Context Protocol) Connection Manager
 * 
 * Manages connections to MCP servers for:
 * - Tool discovery and invocation
 * - Resource access
 * - Prompt templates
 * - Server lifecycle management
 */

// ════════════════════════════════════════════════════════════════════════════
// MCP SERVER TYPES
// ════════════════════════════════════════════════════════════════════════════

export type MCPTransport = "stdio" | "sse" | "websocket";

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  
  // Connection
  transport: MCPTransport;
  command?: string; // For stdio transport
  args?: string[];
  url?: string; // For sse/websocket transport
  
  // Authentication
  authType: "none" | "api_key" | "oauth" | "bearer";
  authConfig?: {
    apiKeyEnvVar?: string;
    oauthClientId?: string;
    oauthScopes?: string[];
    bearerTokenEnvVar?: string;
  };
  
  // Environment
  env?: Record<string, string>;
  
  // Settings
  enabled: boolean;
  autoConnect: boolean;
  timeout: number; // ms
  retryAttempts: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      default?: any;
    }>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[];
}

export interface MCPServerCapabilities {
  tools?: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
  experimental?: Record<string, any>;
}

export type MCPConnectionStatus = 
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "reconnecting";

export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  capabilities: MCPServerCapabilities | null;
  lastConnected: Date | null;
  lastError: string | null;
  reconnectAttempts: number;
}

// ════════════════════════════════════════════════════════════════════════════
// MCP MANAGER STATE
// ════════════════════════════════════════════════════════════════════════════

export interface MCPManagerState {
  servers: MCPServerState[];
  activeConnections: string[]; // Server IDs
  toolRegistry: Map<string, { serverId: string; tool: MCPTool }>;
  resourceRegistry: Map<string, { serverId: string; resource: MCPResource }>;
}

export function createInitialMCPState(): MCPManagerState {
  return {
    servers: [],
    activeConnections: [],
    toolRegistry: new Map(),
    resourceRegistry: new Map(),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT SERVER CONFIGS
// ════════════════════════════════════════════════════════════════════════════

export const DEFAULT_MCP_SERVERS: MCPServerConfig[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Access and manage local files",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/"],
    authType: "none",
    enabled: true,
    autoConnect: true,
    timeout: 30000,
    retryAttempts: 3,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Interact with GitHub repositories",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    authType: "bearer",
    authConfig: {
      bearerTokenEnvVar: "GITHUB_TOKEN",
    },
    enabled: false,
    autoConnect: false,
    timeout: 30000,
    retryAttempts: 3,
  },
  {
    id: "git",
    name: "Git",
    description: "Git operations for version control",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-git"],
    authType: "none",
    enabled: true,
    autoConnect: true,
    timeout: 30000,
    retryAttempts: 3,
  },
  {
    id: "memory",
    name: "Memory",
    description: "Persistent memory for context",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    authType: "none",
    enabled: true,
    autoConnect: true,
    timeout: 30000,
    retryAttempts: 3,
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Web search via Brave",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    authType: "api_key",
    authConfig: {
      apiKeyEnvVar: "BRAVE_API_KEY",
    },
    enabled: false,
    autoConnect: false,
    timeout: 30000,
    retryAttempts: 3,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Interact with Slack workspaces",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    authType: "oauth",
    authConfig: {
      oauthClientId: "",
      oauthScopes: ["channels:read", "chat:write", "users:read"],
    },
    enabled: false,
    autoConnect: false,
    timeout: 30000,
    retryAttempts: 3,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// SERVER OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

export function addServer(
  state: MCPManagerState,
  config: MCPServerConfig
): MCPManagerState {
  const serverState: MCPServerState = {
    config,
    status: "disconnected",
    capabilities: null,
    lastConnected: null,
    lastError: null,
    reconnectAttempts: 0,
  };

  return {
    ...state,
    servers: [...state.servers, serverState],
  };
}

export function removeServer(
  state: MCPManagerState,
  serverId: string
): MCPManagerState {
  return {
    ...state,
    servers: state.servers.filter((s) => s.config.id !== serverId),
    activeConnections: state.activeConnections.filter((id) => id !== serverId),
  };
}

export function updateServerConfig(
  state: MCPManagerState,
  serverId: string,
  updates: Partial<MCPServerConfig>
): MCPManagerState {
  return {
    ...state,
    servers: state.servers.map((s) =>
      s.config.id === serverId
        ? { ...s, config: { ...s.config, ...updates } }
        : s
    ),
  };
}

export function updateServerStatus(
  state: MCPManagerState,
  serverId: string,
  status: MCPConnectionStatus,
  error?: string
): MCPManagerState {
  return {
    ...state,
    servers: state.servers.map((s) =>
      s.config.id === serverId
        ? {
            ...s,
            status,
            lastError: error || null,
            lastConnected: status === "connected" ? new Date() : s.lastConnected,
            reconnectAttempts: status === "reconnecting" ? s.reconnectAttempts + 1 : 0,
          }
        : s
    ),
    activeConnections:
      status === "connected"
        ? [...new Set([...state.activeConnections, serverId])]
        : state.activeConnections.filter((id) => id !== serverId),
  };
}

export function setServerCapabilities(
  state: MCPManagerState,
  serverId: string,
  capabilities: MCPServerCapabilities
): MCPManagerState {
  // Update tool registry
  const newToolRegistry = new Map(state.toolRegistry);
  const newResourceRegistry = new Map(state.resourceRegistry);

  // Clear existing entries for this server
  for (const [key, value] of newToolRegistry.entries()) {
    if (value.serverId === serverId) {
      newToolRegistry.delete(key);
    }
  }
  for (const [key, value] of newResourceRegistry.entries()) {
    if (value.serverId === serverId) {
      newResourceRegistry.delete(key);
    }
  }

  // Add new entries
  if (capabilities.tools) {
    for (const tool of capabilities.tools) {
      newToolRegistry.set(`${serverId}:${tool.name}`, { serverId, tool });
    }
  }
  if (capabilities.resources) {
    for (const resource of capabilities.resources) {
      newResourceRegistry.set(resource.uri, { serverId, resource });
    }
  }

  return {
    ...state,
    servers: state.servers.map((s) =>
      s.config.id === serverId ? { ...s, capabilities } : s
    ),
    toolRegistry: newToolRegistry,
    resourceRegistry: newResourceRegistry,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// TOOL OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

export interface ToolInvocation {
  id: string;
  serverId: string;
  toolName: string;
  arguments: Record<string, any>;
  timestamp: Date;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  duration?: number;
}

export function getAllTools(state: MCPManagerState): {
  serverId: string;
  tool: MCPTool;
}[] {
  return Array.from(state.toolRegistry.values());
}

export function getToolsByServer(
  state: MCPManagerState,
  serverId: string
): MCPTool[] {
  const server = state.servers.find((s) => s.config.id === serverId);
  return server?.capabilities?.tools || [];
}

export function findTool(
  state: MCPManagerState,
  toolName: string
): { serverId: string; tool: MCPTool } | null {
  // Search by full name (serverId:toolName) first
  const fullMatch = state.toolRegistry.get(toolName);
  if (fullMatch) return fullMatch;

  // Search by tool name only
  for (const [key, value] of state.toolRegistry.entries()) {
    if (value.tool.name === toolName) {
      return value;
    }
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// RESOURCE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

export function getAllResources(state: MCPManagerState): {
  serverId: string;
  resource: MCPResource;
}[] {
  return Array.from(state.resourceRegistry.values());
}

export function getResourcesByServer(
  state: MCPManagerState,
  serverId: string
): MCPResource[] {
  const server = state.servers.find((s) => s.config.id === serverId);
  return server?.capabilities?.resources || [];
}

// ════════════════════════════════════════════════════════════════════════════
// CONNECTION HEALTH
// ════════════════════════════════════════════════════════════════════════════

export interface ConnectionHealth {
  serverId: string;
  serverName: string;
  status: MCPConnectionStatus;
  uptime: number | null; // ms since last connect
  toolCount: number;
  resourceCount: number;
  lastError: string | null;
  isHealthy: boolean;
}

export function getConnectionHealth(state: MCPManagerState): ConnectionHealth[] {
  const now = new Date();
  
  return state.servers.map((server) => ({
    serverId: server.config.id,
    serverName: server.config.name,
    status: server.status,
    uptime: server.lastConnected
      ? now.getTime() - server.lastConnected.getTime()
      : null,
    toolCount: server.capabilities?.tools?.length || 0,
    resourceCount: server.capabilities?.resources?.length || 0,
    lastError: server.lastError,
    isHealthy: server.status === "connected" && !server.lastError,
  }));
}

export function getOverallHealth(state: MCPManagerState): {
  totalServers: number;
  connectedServers: number;
  totalTools: number;
  totalResources: number;
  hasErrors: boolean;
  status: "healthy" | "degraded" | "unhealthy";
} {
  const health = getConnectionHealth(state);
  const connected = health.filter((h) => h.status === "connected").length;
  const hasErrors = health.some((h) => h.lastError !== null);
  
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (connected === 0 && state.servers.length > 0) {
    status = "unhealthy";
  } else if (connected < state.servers.filter((s) => s.config.enabled).length) {
    status = "degraded";
  } else if (hasErrors) {
    status = "degraded";
  }

  return {
    totalServers: state.servers.length,
    connectedServers: connected,
    totalTools: state.toolRegistry.size,
    totalResources: state.resourceRegistry.size,
    hasErrors,
    status,
  };
}
