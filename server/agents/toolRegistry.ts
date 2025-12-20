/**
 * Tool Registry Module
 * 
 * Manages available tools for agents with permission controls.
 * Each tool has defined inputs, outputs, and safety requirements.
 */

import { checkSafety, SafetyCheckResult } from './safetyChecker';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'file' | 'terminal' | 'search' | 'git' | 'database' | 'network' | 'ai';
  parameters: ToolParameter[];
  requiresConfirmation: boolean;
  allowedAgentTypes?: string[]; // If undefined, all agents can use
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ToolExecutionRequest {
  toolId: string;
  parameters: Record<string, unknown>;
  agentType: string;
  userId: number;
  projectId?: number;
}

export interface ToolExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  safetyCheck?: SafetyCheckResult;
  durationMs?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT TOOLS
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_TOOLS: ToolDefinition[] = [
  // ── File Tools ─────────────────────────────────────────────────────────────
  {
    id: 'read_file',
    name: 'Read File',
    description: 'Read the contents of a file',
    category: 'file',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to the file', required: true },
      { name: 'startLine', type: 'number', description: 'Start line (optional)', required: false },
      { name: 'endLine', type: 'number', description: 'End line (optional)', required: false },
    ],
    requiresConfirmation: false,
    riskLevel: 'low',
  },
  {
    id: 'write_file',
    name: 'Write File',
    description: 'Write content to a file (creates if not exists)',
    category: 'file',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to the file', required: true },
      { name: 'content', type: 'string', description: 'Content to write', required: true },
    ],
    requiresConfirmation: true,
    riskLevel: 'medium',
  },
  {
    id: 'edit_file',
    name: 'Edit File',
    description: 'Make targeted edits to a file',
    category: 'file',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to the file', required: true },
      { name: 'edits', type: 'array', description: 'Array of {find, replace} objects', required: true },
    ],
    requiresConfirmation: true,
    riskLevel: 'medium',
  },
  {
    id: 'delete_file',
    name: 'Delete File',
    description: 'Delete a file',
    category: 'file',
    parameters: [
      { name: 'path', type: 'string', description: 'Path to the file', required: true },
    ],
    requiresConfirmation: true,
    riskLevel: 'high',
  },
  {
    id: 'list_files',
    name: 'List Files',
    description: 'List files in a directory',
    category: 'file',
    parameters: [
      { name: 'path', type: 'string', description: 'Directory path', required: true },
      { name: 'recursive', type: 'boolean', description: 'Include subdirectories', required: false, default: false },
    ],
    requiresConfirmation: false,
    riskLevel: 'low',
  },
  
  // ── Search Tools ───────────────────────────────────────────────────────────
  {
    id: 'search_codebase',
    name: 'Search Codebase',
    description: 'Search for text or patterns in the codebase',
    category: 'search',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
      { name: 'filePattern', type: 'string', description: 'File pattern to search (e.g., *.ts)', required: false },
      { name: 'maxResults', type: 'number', description: 'Maximum results', required: false, default: 20 },
    ],
    requiresConfirmation: false,
    riskLevel: 'low',
  },
  {
    id: 'search_web',
    name: 'Search Web',
    description: 'Search the web for information',
    category: 'search',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
      { name: 'maxResults', type: 'number', description: 'Maximum results', required: false, default: 5 },
    ],
    requiresConfirmation: false,
    allowedAgentTypes: ['research', 'pm'],
    riskLevel: 'low',
  },
  
  // ── Terminal Tools ─────────────────────────────────────────────────────────
  {
    id: 'run_terminal',
    name: 'Run Terminal Command',
    description: 'Execute a shell command',
    category: 'terminal',
    parameters: [
      { name: 'command', type: 'string', description: 'Command to execute', required: true },
      { name: 'cwd', type: 'string', description: 'Working directory', required: false },
      { name: 'timeout', type: 'number', description: 'Timeout in ms', required: false, default: 30000 },
    ],
    requiresConfirmation: true,
    riskLevel: 'high',
  },
  
  // ── Git Tools ──────────────────────────────────────────────────────────────
  {
    id: 'git_status',
    name: 'Git Status',
    description: 'Get git repository status',
    category: 'git',
    parameters: [],
    requiresConfirmation: false,
    riskLevel: 'low',
  },
  {
    id: 'git_diff',
    name: 'Git Diff',
    description: 'Show git diff',
    category: 'git',
    parameters: [
      { name: 'path', type: 'string', description: 'File path (optional)', required: false },
      { name: 'staged', type: 'boolean', description: 'Show staged changes', required: false, default: false },
    ],
    requiresConfirmation: false,
    riskLevel: 'low',
  },
  {
    id: 'git_commit',
    name: 'Git Commit',
    description: 'Create a git commit',
    category: 'git',
    parameters: [
      { name: 'message', type: 'string', description: 'Commit message', required: true },
      { name: 'files', type: 'array', description: 'Files to commit (optional, defaults to all staged)', required: false },
    ],
    requiresConfirmation: true,
    riskLevel: 'medium',
  },
  {
    id: 'git_push',
    name: 'Git Push',
    description: 'Push commits to remote',
    category: 'git',
    parameters: [
      { name: 'remote', type: 'string', description: 'Remote name', required: false, default: 'origin' },
      { name: 'branch', type: 'string', description: 'Branch name', required: false },
    ],
    requiresConfirmation: true,
    allowedAgentTypes: ['devops'],
    riskLevel: 'high',
  },
  
  // ── AI Tools ───────────────────────────────────────────────────────────────
  {
    id: 'ask_ai',
    name: 'Ask AI',
    description: 'Query the AI for analysis or suggestions',
    category: 'ai',
    parameters: [
      { name: 'prompt', type: 'string', description: 'Question or prompt', required: true },
      { name: 'context', type: 'string', description: 'Additional context', required: false },
    ],
    requiresConfirmation: false,
    riskLevel: 'low',
  },
  
  // ── Project Tools ──────────────────────────────────────────────────────────
  {
    id: 'create_note',
    name: 'Create Note',
    description: 'Create a project note',
    category: 'database',
    parameters: [
      { name: 'title', type: 'string', description: 'Note title', required: true },
      { name: 'content', type: 'string', description: 'Note content', required: true },
      { name: 'category', type: 'string', description: 'Note category', required: false, default: 'context' },
    ],
    requiresConfirmation: false,
    riskLevel: 'low',
  },
  {
    id: 'create_task',
    name: 'Create Task',
    description: 'Create a project task',
    category: 'database',
    parameters: [
      { name: 'title', type: 'string', description: 'Task title', required: true },
      { name: 'description', type: 'string', description: 'Task description', required: false },
      { name: 'priority', type: 'string', description: 'Priority (low/medium/high)', required: false, default: 'medium' },
    ],
    requiresConfirmation: true,
    allowedAgentTypes: ['pm'],
    riskLevel: 'low',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// TOOL REGISTRY CLASS
// ════════════════════════════════════════════════════════════════════════════

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private executors: Map<string, (params: Record<string, unknown>) => Promise<unknown>> = new Map();
  
  constructor() {
    // Register default tools
    for (const tool of DEFAULT_TOOLS) {
      this.tools.set(tool.id, tool);
    }
  }
  
  /**
   * Register a new tool
   */
  registerTool(tool: ToolDefinition, executor?: (params: Record<string, unknown>) => Promise<unknown>): void {
    this.tools.set(tool.id, tool);
    if (executor) {
      this.executors.set(tool.id, executor);
    }
  }
  
  /**
   * Get a tool by ID
   */
  getTool(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }
  
  /**
   * Get all tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get tools available to a specific agent type
   */
  getToolsForAgent(agentType: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => {
      if (!tool.allowedAgentTypes) return true;
      return tool.allowedAgentTypes.includes(agentType);
    });
  }
  
  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }
  
  /**
   * Check if an agent can use a tool
   */
  canAgentUseTool(agentType: string, toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;
    if (!tool.allowedAgentTypes) return true;
    return tool.allowedAgentTypes.includes(agentType);
  }
  
  /**
   * Validate tool parameters
   */
  validateParameters(toolId: string, params: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { valid: false, errors: [`Tool not found: ${toolId}`] };
    }
    
    const errors: string[] = [];
    
    for (const param of tool.parameters) {
      const value = params[param.name];
      
      // Check required parameters
      if (param.required && (value === undefined || value === null)) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }
      
      // Type checking
      if (value !== undefined && value !== null) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== param.type && param.type !== 'object') {
          errors.push(`Parameter ${param.name} should be ${param.type}, got ${actualType}`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Execute a tool
   */
  async executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.tools.get(request.toolId);
    
    if (!tool) {
      return { success: false, error: `Tool not found: ${request.toolId}` };
    }
    
    // Check agent permissions
    if (!this.canAgentUseTool(request.agentType, request.toolId)) {
      return { success: false, error: `Agent type ${request.agentType} cannot use tool ${request.toolId}` };
    }
    
    // Validate parameters
    const validation = this.validateParameters(request.toolId, request.parameters);
    if (!validation.valid) {
      return { success: false, error: `Invalid parameters: ${validation.errors.join(', ')}` };
    }
    
    // Run safety check
    const actionString = this.buildActionString(tool, request.parameters);
    const safetyCheck = checkSafety(actionString);
    
    if (!safetyCheck.allowed) {
      return { 
        success: false, 
        error: `Blocked by safety rule: ${safetyCheck.reason}`,
        safetyCheck,
      };
    }
    
    // Execute the tool
    const executor = this.executors.get(request.toolId);
    if (!executor) {
      // Return a mock result for tools without executors
      return {
        success: true,
        output: { message: `Tool ${request.toolId} executed (no executor registered)` },
        safetyCheck,
        durationMs: Date.now() - startTime,
      };
    }
    
    try {
      const output = await executor(request.parameters);
      return {
        success: true,
        output,
        safetyCheck,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        safetyCheck,
        durationMs: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Build an action string for safety checking
   */
  private buildActionString(tool: ToolDefinition, params: Record<string, unknown>): string {
    switch (tool.category) {
      case 'file':
        if (tool.id === 'delete_file') {
          return `delete:${params.path}`;
        }
        if (tool.id === 'edit_file' || tool.id === 'write_file') {
          return `edit:${params.path}`;
        }
        return `read:${params.path}`;
      
      case 'terminal':
        return String(params.command || '');
      
      case 'git':
        if (tool.id === 'git_push') {
          return `git push ${params.remote || 'origin'} ${params.branch || ''}`.trim();
        }
        return `git ${tool.id.replace('git_', '')}`;
      
      case 'network':
        return `fetch:${params.url}`;
      
      default:
        return tool.id;
    }
  }
  
  /**
   * Generate tool documentation for prompts
   */
  generateToolDocs(agentType: string): string {
    const tools = this.getToolsForAgent(agentType);
    const lines: string[] = ['## Available Tools\n'];
    
    for (const tool of tools) {
      lines.push(`### ${tool.name}`);
      lines.push(`${tool.description}`);
      lines.push(`- ID: \`${tool.id}\``);
      lines.push(`- Requires confirmation: ${tool.requiresConfirmation ? 'Yes' : 'No'}`);
      
      if (tool.parameters.length > 0) {
        lines.push('- Parameters:');
        for (const param of tool.parameters) {
          const required = param.required ? '(required)' : '(optional)';
          lines.push(`  - \`${param.name}\` (${param.type}) ${required}: ${param.description}`);
        }
      }
      
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export const toolRegistry = new ToolRegistry();

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get the global tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
  return toolRegistry;
}

/**
 * Register a tool executor
 */
export function registerToolExecutor(
  toolId: string,
  executor: (params: Record<string, unknown>) => Promise<unknown>
): void {
  const tool = toolRegistry.getTool(toolId);
  if (tool) {
    toolRegistry.registerTool(tool, executor);
  }
}
