/**
 * KIRO IDE - PM Command System
 * 
 * The AI PM can configure the entire IDE through natural language commands.
 * This module parses and executes configuration commands for:
 * - API integrations (LLM providers)
 * - MCP server connections
 * - Agent rules and behaviors
 * - Budget limits and governance
 * - Secrets management
 * - GitHub integration
 * - Project preferences
 * - Autonomy mode transitions
 */

// ════════════════════════════════════════════════════════════════════════════
// COMMAND TYPES
// ════════════════════════════════════════════════════════════════════════════

export type CommandCategory =
  | "integration"
  | "mcp"
  | "agent"
  | "governance"
  | "secrets"
  | "github"
  | "project"
  | "roadmap"
  | "settings";

export type CommandAction =
  | "add"
  | "remove"
  | "update"
  | "enable"
  | "disable"
  | "configure"
  | "connect"
  | "disconnect"
  | "set"
  | "get"
  | "list"
  | "create"
  | "delete"
  | "move"
  | "assign";

export interface ParsedCommand {
  category: CommandCategory;
  action: CommandAction;
  target: string;
  parameters: Record<string, any>;
  confidence: number;
  rawInput: string;
  alternatives?: ParsedCommand[];
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  suggestedFollowUp?: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// COMMAND PATTERNS
// ════════════════════════════════════════════════════════════════════════════

interface CommandPattern {
  pattern: RegExp;
  category: CommandCategory;
  action: CommandAction;
  extractParams: (match: RegExpMatchArray) => Record<string, any>;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // Integration commands
  {
    pattern: /(?:add|setup|configure|connect)\s+(?:the\s+)?(\w+)\s+(?:api|integration|provider)/i,
    category: "integration",
    action: "add",
    extractParams: (match) => ({ provider: match[1].toLowerCase() }),
  },
  {
    pattern: /(?:remove|delete|disconnect)\s+(?:the\s+)?(\w+)\s+(?:api|integration|provider)/i,
    category: "integration",
    action: "remove",
    extractParams: (match) => ({ provider: match[1].toLowerCase() }),
  },
  {
    pattern: /set\s+(?:the\s+)?(\w+)\s+api\s+key\s+(?:to\s+)?(.+)/i,
    category: "integration",
    action: "configure",
    extractParams: (match) => ({ provider: match[1].toLowerCase(), apiKey: match[2].trim() }),
  },
  {
    pattern: /(?:enable|activate)\s+(?:the\s+)?(\w+)\s+(?:api|integration|provider)/i,
    category: "integration",
    action: "enable",
    extractParams: (match) => ({ provider: match[1].toLowerCase() }),
  },
  {
    pattern: /(?:disable|deactivate)\s+(?:the\s+)?(\w+)\s+(?:api|integration|provider)/i,
    category: "integration",
    action: "disable",
    extractParams: (match) => ({ provider: match[1].toLowerCase() }),
  },

  // MCP commands
  {
    pattern: /(?:add|setup|configure)\s+(?:the\s+)?(?:mcp\s+)?server\s+(?:called\s+|named\s+)?["']?([^"']+)["']?/i,
    category: "mcp",
    action: "add",
    extractParams: (match) => ({ serverName: match[1].trim() }),
  },
  {
    pattern: /(?:connect|start)\s+(?:to\s+)?(?:the\s+)?(?:mcp\s+)?server\s+["']?([^"']+)["']?/i,
    category: "mcp",
    action: "connect",
    extractParams: (match) => ({ serverName: match[1].trim() }),
  },
  {
    pattern: /(?:disconnect|stop)\s+(?:from\s+)?(?:the\s+)?(?:mcp\s+)?server\s+["']?([^"']+)["']?/i,
    category: "mcp",
    action: "disconnect",
    extractParams: (match) => ({ serverName: match[1].trim() }),
  },
  {
    pattern: /list\s+(?:all\s+)?(?:mcp\s+)?servers/i,
    category: "mcp",
    action: "list",
    extractParams: () => ({}),
  },

  // Agent commands
  {
    pattern: /(?:create|add)\s+(?:a\s+)?(?:new\s+)?agent\s+(?:type\s+)?(?:called\s+|named\s+)?["']?([^"']+)["']?/i,
    category: "agent",
    action: "create",
    extractParams: (match) => ({ agentType: match[1].trim() }),
  },
  {
    pattern: /set\s+(?:the\s+)?agent\s+(?:rule|setting)\s+["']?([^"']+)["']?\s+(?:to\s+)?["']?([^"']+)["']?/i,
    category: "agent",
    action: "configure",
    extractParams: (match) => ({ rule: match[1].trim(), value: match[2].trim() }),
  },
  {
    pattern: /(?:configure|update)\s+(?:the\s+)?(\w+)\s+agent\s+(?:to\s+)?(.+)/i,
    category: "agent",
    action: "update",
    extractParams: (match) => ({ agentType: match[1], config: match[2].trim() }),
  },

  // Governance commands
  {
    pattern: /set\s+(?:the\s+)?(?:autonomy\s+)?mode\s+(?:to\s+)?(\w+)/i,
    category: "governance",
    action: "set",
    extractParams: (match) => ({ mode: match[1].toLowerCase() }),
  },
  {
    pattern: /(?:switch|change)\s+(?:to\s+)?(\w+)\s+mode/i,
    category: "governance",
    action: "set",
    extractParams: (match) => ({ mode: match[1].toLowerCase() }),
  },
  {
    pattern: /set\s+(?:the\s+)?(?:budget|token)\s+limit\s+(?:to\s+)?(\d+)/i,
    category: "governance",
    action: "configure",
    extractParams: (match) => ({ limit: parseInt(match[1]), type: "budget" }),
  },
  {
    pattern: /set\s+(?:the\s+)?(?:cost|spending)\s+limit\s+(?:to\s+)?\$?(\d+(?:\.\d+)?)/i,
    category: "governance",
    action: "configure",
    extractParams: (match) => ({ limit: parseFloat(match[1]), type: "cost" }),
  },
  {
    pattern: /(?:halt|stop|pause)\s+(?:the\s+)?system/i,
    category: "governance",
    action: "set",
    extractParams: () => ({ action: "halt" }),
  },
  {
    pattern: /(?:resume|continue|start)\s+(?:the\s+)?system/i,
    category: "governance",
    action: "set",
    extractParams: () => ({ action: "resume" }),
  },

  // Secrets commands
  {
    pattern: /(?:add|store|save)\s+(?:a\s+)?(?:new\s+)?secret\s+(?:called\s+|named\s+)?["']?([^"']+)["']?/i,
    category: "secrets",
    action: "add",
    extractParams: (match) => ({ secretName: match[1].trim() }),
  },
  {
    pattern: /(?:remove|delete)\s+(?:the\s+)?secret\s+["']?([^"']+)["']?/i,
    category: "secrets",
    action: "remove",
    extractParams: (match) => ({ secretName: match[1].trim() }),
  },
  {
    pattern: /list\s+(?:all\s+)?secrets/i,
    category: "secrets",
    action: "list",
    extractParams: () => ({}),
  },

  // GitHub commands
  {
    pattern: /(?:connect|link|setup)\s+(?:to\s+)?github/i,
    category: "github",
    action: "connect",
    extractParams: () => ({}),
  },
  {
    pattern: /(?:disconnect|unlink)\s+(?:from\s+)?github/i,
    category: "github",
    action: "disconnect",
    extractParams: () => ({}),
  },
  {
    pattern: /(?:clone|import)\s+(?:the\s+)?(?:repo|repository)\s+["']?([^"']+)["']?/i,
    category: "github",
    action: "add",
    extractParams: (match) => ({ repoUrl: match[1].trim() }),
  },
  {
    pattern: /(?:create|open)\s+(?:a\s+)?(?:new\s+)?(?:pr|pull\s+request)\s+(?:for\s+)?["']?([^"']+)["']?/i,
    category: "github",
    action: "create",
    extractParams: (match) => ({ title: match[1].trim(), type: "pr" }),
  },

  // Project commands
  {
    pattern: /(?:create|new)\s+(?:a\s+)?project\s+(?:called\s+|named\s+)?["']?([^"']+)["']?/i,
    category: "project",
    action: "create",
    extractParams: (match) => ({ projectName: match[1].trim() }),
  },
  {
    pattern: /(?:open|switch\s+to)\s+(?:the\s+)?project\s+["']?([^"']+)["']?/i,
    category: "project",
    action: "set",
    extractParams: (match) => ({ projectName: match[1].trim() }),
  },
  {
    pattern: /set\s+(?:the\s+)?(?:project\s+)?(?:default\s+)?(?:model|llm)\s+(?:to\s+)?(\w+)/i,
    category: "project",
    action: "configure",
    extractParams: (match) => ({ setting: "defaultModel", value: match[1] }),
  },

  // Roadmap commands
  {
    pattern: /(?:add|create)\s+(?:a\s+)?(?:new\s+)?task\s+(?:called\s+|named\s+|for\s+)?["']?([^"']+)["']?/i,
    category: "roadmap",
    action: "add",
    extractParams: (match) => ({ title: match[1].trim() }),
  },
  {
    pattern: /(?:set|change|update)\s+(?:the\s+)?task\s+["']?([^"']+)["']?\s+(?:status\s+)?(?:to\s+)?(\w+)/i,
    category: "roadmap",
    action: "update",
    extractParams: (match) => ({ taskTitle: match[1].trim(), status: match[2].toLowerCase() }),
  },
  {
    pattern: /(?:set|change)\s+(?:the\s+)?priority\s+(?:of\s+)?["']?([^"']+)["']?\s+(?:to\s+)?(\w+)/i,
    category: "roadmap",
    action: "update",
    extractParams: (match) => ({ taskTitle: match[1].trim(), priority: match[2].toLowerCase() }),
  },
  {
    pattern: /(?:assign|give)\s+(?:the\s+)?task\s+["']?([^"']+)["']?\s+(?:to\s+)?(?:an?\s+)?(\w+)/i,
    category: "roadmap",
    action: "assign",
    extractParams: (match) => ({ taskTitle: match[1].trim(), assignee: match[2] }),
  },
  {
    pattern: /(?:create|plan|suggest)\s+(?:a\s+)?(?:new\s+)?sprint/i,
    category: "roadmap",
    action: "create",
    extractParams: () => ({ type: "sprint" }),
  },
  {
    pattern: /(?:smart\s+)?(?:order|reorder|organize)\s+(?:the\s+)?tasks/i,
    category: "roadmap",
    action: "update",
    extractParams: () => ({ action: "smartOrder" }),
  },
  {
    pattern: /(?:move|reorder)\s+(?:the\s+)?task\s+["']?([^"']+)["']?\s+(?:to\s+)?(?:position\s+)?(\d+|top|bottom)/i,
    category: "roadmap",
    action: "move",
    extractParams: (match) => ({ taskTitle: match[1].trim(), position: match[2] }),
  },

  // Settings commands
  {
    pattern: /(?:set|change)\s+(?:the\s+)?theme\s+(?:to\s+)?(\w+)/i,
    category: "settings",
    action: "set",
    extractParams: (match) => ({ setting: "theme", value: match[1].toLowerCase() }),
  },
  {
    pattern: /(?:enable|turn\s+on)\s+(.+)/i,
    category: "settings",
    action: "enable",
    extractParams: (match) => ({ feature: match[1].trim() }),
  },
  {
    pattern: /(?:disable|turn\s+off)\s+(.+)/i,
    category: "settings",
    action: "disable",
    extractParams: (match) => ({ feature: match[1].trim() }),
  },
];

// ════════════════════════════════════════════════════════════════════════════
// COMMAND PARSER
// ════════════════════════════════════════════════════════════════════════════

export function parseCommand(input: string): ParsedCommand | null {
  const normalizedInput = input.trim().toLowerCase();
  
  for (const pattern of COMMAND_PATTERNS) {
    const match = input.match(pattern.pattern);
    if (match) {
      return {
        category: pattern.category,
        action: pattern.action,
        target: match[1] || "",
        parameters: pattern.extractParams(match),
        confidence: calculateConfidence(input, pattern),
        rawInput: input,
      };
    }
  }

  // Fallback: try to infer from keywords
  const inferred = inferCommand(normalizedInput);
  if (inferred && inferred.category && inferred.action) {
    return {
      category: inferred.category,
      action: inferred.action,
      target: inferred.target || "",
      parameters: inferred.parameters || {},
      confidence: 0.5,
      rawInput: input,
    };
  }

  return null;
}

function calculateConfidence(input: string, pattern: CommandPattern): number {
  // Base confidence from pattern match
  let confidence = 0.8;
  
  // Boost for exact keyword matches
  const keywords = ["add", "remove", "set", "configure", "enable", "disable", "create", "delete"];
  for (const keyword of keywords) {
    if (input.toLowerCase().includes(keyword)) {
      confidence += 0.05;
    }
  }

  return Math.min(confidence, 1.0);
}

function inferCommand(input: string): Partial<ParsedCommand> | null {
  // Keyword-based inference
  const categoryKeywords: Record<CommandCategory, string[]> = {
    integration: ["api", "provider", "openai", "anthropic", "claude", "gpt", "gemini"],
    mcp: ["mcp", "server", "tool", "protocol"],
    agent: ["agent", "behavior", "rule"],
    governance: ["mode", "autonomy", "budget", "limit", "halt", "resume"],
    secrets: ["secret", "key", "token", "credential", "password"],
    github: ["github", "repo", "repository", "pr", "pull request", "commit", "branch"],
    project: ["project", "workspace"],
    roadmap: ["task", "sprint", "roadmap", "priority", "status", "backlog"],
    settings: ["setting", "preference", "theme", "config"],
  };

  const actionKeywords: Record<CommandAction, string[]> = {
    add: ["add", "create", "new", "setup"],
    remove: ["remove", "delete", "clear"],
    update: ["update", "change", "modify", "edit"],
    enable: ["enable", "activate", "turn on"],
    disable: ["disable", "deactivate", "turn off"],
    configure: ["configure", "set", "adjust"],
    connect: ["connect", "link", "attach"],
    disconnect: ["disconnect", "unlink", "detach"],
    set: ["set", "switch"],
    get: ["get", "show", "display", "what"],
    list: ["list", "show all", "display all"],
    create: ["create", "make", "generate"],
    delete: ["delete", "remove", "destroy"],
    move: ["move", "reorder", "arrange"],
    assign: ["assign", "give", "delegate"],
  };

  let detectedCategory: CommandCategory | null = null;
  let detectedAction: CommandAction | null = null;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((k) => input.includes(k))) {
      detectedCategory = category as CommandCategory;
      break;
    }
  }

  for (const [action, keywords] of Object.entries(actionKeywords)) {
    if (keywords.some((k) => input.includes(k))) {
      detectedAction = action as CommandAction;
      break;
    }
  }

  if (detectedCategory && detectedAction) {
    return {
      category: detectedCategory,
      action: detectedAction,
      target: "",
      parameters: {},
    };
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// COMMAND EXECUTOR
// ════════════════════════════════════════════════════════════════════════════

export interface CommandExecutor {
  // Integration commands
  addIntegration: (provider: string, config?: any) => Promise<CommandResult>;
  removeIntegration: (provider: string) => Promise<CommandResult>;
  configureIntegration: (provider: string, config: any) => Promise<CommandResult>;
  enableIntegration: (provider: string) => Promise<CommandResult>;
  disableIntegration: (provider: string) => Promise<CommandResult>;

  // MCP commands
  addMCPServer: (name: string, config?: any) => Promise<CommandResult>;
  connectMCPServer: (name: string) => Promise<CommandResult>;
  disconnectMCPServer: (name: string) => Promise<CommandResult>;
  listMCPServers: () => Promise<CommandResult>;

  // Agent commands
  createAgentType: (name: string, config?: any) => Promise<CommandResult>;
  configureAgent: (name: string, config: any) => Promise<CommandResult>;

  // Governance commands
  setAutonomyMode: (mode: string) => Promise<CommandResult>;
  setBudgetLimit: (type: string, limit: number) => Promise<CommandResult>;
  haltSystem: () => Promise<CommandResult>;
  resumeSystem: () => Promise<CommandResult>;

  // Secrets commands
  addSecret: (name: string, value?: string) => Promise<CommandResult>;
  removeSecret: (name: string) => Promise<CommandResult>;
  listSecrets: () => Promise<CommandResult>;

  // GitHub commands
  connectGitHub: () => Promise<CommandResult>;
  disconnectGitHub: () => Promise<CommandResult>;
  cloneRepository: (url: string) => Promise<CommandResult>;
  createPullRequest: (title: string, config?: any) => Promise<CommandResult>;

  // Project commands
  createProject: (name: string) => Promise<CommandResult>;
  openProject: (name: string) => Promise<CommandResult>;
  configureProject: (setting: string, value: any) => Promise<CommandResult>;

  // Roadmap commands
  addTask: (title: string, config?: any) => Promise<CommandResult>;
  updateTask: (title: string, updates: any) => Promise<CommandResult>;
  assignTask: (title: string, assignee: string) => Promise<CommandResult>;
  createSprint: (config?: any) => Promise<CommandResult>;
  smartOrderTasks: () => Promise<CommandResult>;
  moveTask: (title: string, position: string | number) => Promise<CommandResult>;

  // Settings commands
  setSetting: (key: string, value: any) => Promise<CommandResult>;
  enableFeature: (feature: string) => Promise<CommandResult>;
  disableFeature: (feature: string) => Promise<CommandResult>;
}

export async function executeCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  try {
    switch (command.category) {
      case "integration":
        return await executeIntegrationCommand(command, executor);
      case "mcp":
        return await executeMCPCommand(command, executor);
      case "agent":
        return await executeAgentCommand(command, executor);
      case "governance":
        return await executeGovernanceCommand(command, executor);
      case "secrets":
        return await executeSecretsCommand(command, executor);
      case "github":
        return await executeGitHubCommand(command, executor);
      case "project":
        return await executeProjectCommand(command, executor);
      case "roadmap":
        return await executeRoadmapCommand(command, executor);
      case "settings":
        return await executeSettingsCommand(command, executor);
      default:
        return {
          success: false,
          message: `Unknown command category: ${command.category}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Command execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function executeIntegrationCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  const { provider, apiKey } = command.parameters;
  
  switch (command.action) {
    case "add":
      return executor.addIntegration(provider);
    case "remove":
      return executor.removeIntegration(provider);
    case "configure":
      return executor.configureIntegration(provider, { apiKey });
    case "enable":
      return executor.enableIntegration(provider);
    case "disable":
      return executor.disableIntegration(provider);
    default:
      return { success: false, message: `Unknown integration action: ${command.action}` };
  }
}

async function executeMCPCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  const { serverName } = command.parameters;
  
  switch (command.action) {
    case "add":
      return executor.addMCPServer(serverName);
    case "connect":
      return executor.connectMCPServer(serverName);
    case "disconnect":
      return executor.disconnectMCPServer(serverName);
    case "list":
      return executor.listMCPServers();
    default:
      return { success: false, message: `Unknown MCP action: ${command.action}` };
  }
}

async function executeAgentCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  const { agentType, rule, value, config } = command.parameters;
  
  switch (command.action) {
    case "create":
      return executor.createAgentType(agentType);
    case "configure":
    case "update":
      return executor.configureAgent(agentType || rule, { [rule]: value, config });
    default:
      return { success: false, message: `Unknown agent action: ${command.action}` };
  }
}

async function executeGovernanceCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  const { mode, limit, type, action } = command.parameters;
  
  switch (command.action) {
    case "set":
      if (action === "halt") return executor.haltSystem();
      if (action === "resume") return executor.resumeSystem();
      if (mode) return executor.setAutonomyMode(mode);
      return { success: false, message: "Missing governance parameter" };
    case "configure":
      if (limit !== undefined && type) {
        return executor.setBudgetLimit(type, limit);
      }
      return { success: false, message: "Missing budget configuration" };
    default:
      return { success: false, message: `Unknown governance action: ${command.action}` };
  }
}

async function executeSecretsCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  const { secretName } = command.parameters;
  
  switch (command.action) {
    case "add":
      return executor.addSecret(secretName);
    case "remove":
      return executor.removeSecret(secretName);
    case "list":
      return executor.listSecrets();
    default:
      return { success: false, message: `Unknown secrets action: ${command.action}` };
  }
}

async function executeGitHubCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  const { repoUrl, title, type } = command.parameters;
  
  switch (command.action) {
    case "connect":
      return executor.connectGitHub();
    case "disconnect":
      return executor.disconnectGitHub();
    case "add":
      if (repoUrl) return executor.cloneRepository(repoUrl);
      return { success: false, message: "Missing repository URL" };
    case "create":
      if (type === "pr" && title) return executor.createPullRequest(title);
      return { success: false, message: "Missing PR details" };
    default:
      return { success: false, message: `Unknown GitHub action: ${command.action}` };
  }
}

async function executeProjectCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  const { projectName, setting, value } = command.parameters;
  
  switch (command.action) {
    case "create":
      return executor.createProject(projectName);
    case "set":
      return executor.openProject(projectName);
    case "configure":
      return executor.configureProject(setting, value);
    default:
      return { success: false, message: `Unknown project action: ${command.action}` };
  }
}

async function executeRoadmapCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  const { title, taskTitle, status, priority, assignee, type, action, position } = command.parameters;
  
  switch (command.action) {
    case "add":
      return executor.addTask(title);
    case "update":
      if (action === "smartOrder") return executor.smartOrderTasks();
      return executor.updateTask(taskTitle, { status, priority });
    case "assign":
      return executor.assignTask(taskTitle, assignee);
    case "create":
      if (type === "sprint") return executor.createSprint();
      return { success: false, message: "Unknown create type" };
    case "move":
      return executor.moveTask(taskTitle, position);
    default:
      return { success: false, message: `Unknown roadmap action: ${command.action}` };
  }
}

async function executeSettingsCommand(
  command: ParsedCommand,
  executor: CommandExecutor
): Promise<CommandResult> {
  const { setting, value, feature } = command.parameters;
  
  switch (command.action) {
    case "set":
      return executor.setSetting(setting, value);
    case "enable":
      return executor.enableFeature(feature);
    case "disable":
      return executor.disableFeature(feature);
    default:
      return { success: false, message: `Unknown settings action: ${command.action}` };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// COMMAND SUGGESTIONS
// ════════════════════════════════════════════════════════════════════════════

export function getCommandSuggestions(partialInput: string): string[] {
  const suggestions: string[] = [];
  const lower = partialInput.toLowerCase();

  const commonCommands = [
    "add openai api",
    "set budget limit to 1000",
    "switch to collaborative mode",
    "create a new task for",
    "connect to github",
    "add mcp server",
    "list all secrets",
    "smart order tasks",
    "create a sprint",
    "set the priority of",
    "enable auto-checkpoint",
    "configure the coding agent",
  ];

  for (const cmd of commonCommands) {
    if (cmd.includes(lower) || lower.split(" ").some((word) => cmd.includes(word))) {
      suggestions.push(cmd);
    }
  }

  return suggestions.slice(0, 5);
}

export function getCommandHelp(category?: CommandCategory): string {
  if (!category) {
    return `
**Available Command Categories:**
- **integration** - Manage LLM API providers (OpenAI, Anthropic, etc.)
- **mcp** - Manage MCP server connections
- **agent** - Configure agent types and behaviors
- **governance** - Set autonomy modes and budget limits
- **secrets** - Manage API keys and credentials
- **github** - GitHub integration and repository management
- **project** - Project creation and configuration
- **roadmap** - Task and sprint management
- **settings** - IDE preferences and features

Say "help [category]" for specific commands.
    `.trim();
  }

  const categoryHelp: Record<CommandCategory, string> = {
    integration: `
**Integration Commands:**
- "Add OpenAI API" - Set up a new LLM provider
- "Set the Anthropic API key to [key]" - Configure API key
- "Enable/Disable [provider] API" - Toggle provider
- "Remove [provider] integration" - Remove provider
    `,
    mcp: `
**MCP Commands:**
- "Add MCP server [name]" - Add a new server
- "Connect to MCP server [name]" - Start connection
- "Disconnect from MCP server [name]" - Stop connection
- "List all MCP servers" - Show configured servers
    `,
    agent: `
**Agent Commands:**
- "Create agent type [name]" - Create new agent type
- "Configure the [type] agent to [config]" - Update agent settings
- "Set agent rule [rule] to [value]" - Set specific rule
    `,
    governance: `
**Governance Commands:**
- "Switch to [directed/collaborative/agentic] mode" - Change autonomy
- "Set budget limit to [amount]" - Set token budget
- "Set cost limit to $[amount]" - Set spending limit
- "Halt the system" - Emergency stop
- "Resume the system" - Continue after halt
    `,
    secrets: `
**Secrets Commands:**
- "Add secret [name]" - Store a new secret
- "Remove secret [name]" - Delete a secret
- "List all secrets" - Show stored secrets
    `,
    github: `
**GitHub Commands:**
- "Connect to GitHub" - Authenticate with GitHub
- "Disconnect from GitHub" - Remove GitHub connection
- "Clone repository [url]" - Clone a repo
- "Create PR for [title]" - Open a pull request
    `,
    project: `
**Project Commands:**
- "Create project [name]" - Start a new project
- "Open project [name]" - Switch to project
- "Set project model to [model]" - Set default LLM
    `,
    roadmap: `
**Roadmap Commands:**
- "Add task [title]" - Create a new task
- "Set task [title] status to [status]" - Update status
- "Set priority of [title] to [priority]" - Change priority
- "Assign task [title] to [agent/user]" - Assign work
- "Create a sprint" - Plan a new sprint
- "Smart order tasks" - Optimize task order
- "Move task [title] to [position]" - Reorder tasks
    `,
    settings: `
**Settings Commands:**
- "Set theme to [dark/light]" - Change theme
- "Enable [feature]" - Turn on a feature
- "Disable [feature]" - Turn off a feature
    `,
  };

  return categoryHelp[category]?.trim() || "No help available for this category.";
}
