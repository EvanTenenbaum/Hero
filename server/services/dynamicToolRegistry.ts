/**
 * Dynamic Tool Registry
 * 
 * A centralized registry for managing and executing dynamic tools
 * available to the HERO IDE agent system.
 */

import { logger } from '../_core/logger';

/**
 * Context provided to tool handlers during execution.
 */
export interface AgentToolContext {
    userId: number;
    projectId: number;
    sandboxId?: string;
    fileSystem?: {
        readFile: (path: string) => Promise<string>;
        writeFile: (path: string, content: string) => Promise<void>;
        listFiles: (path: string) => Promise<string[]>;
    };
    terminal?: {
        execute: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
    };
}

/**
 * Defines the structure for a single tool parameter.
 */
export interface ToolParameter {
    /** The name of the parameter. */
    name: string;
    /** The TypeScript type of the parameter. */
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    /** A detailed description of the parameter's purpose. */
    description: string;
    /** Whether the parameter is required for the tool execution. */
    required: boolean;
    /** An optional default value for the parameter. */
    default?: unknown;
}

/**
 * Defines the result structure returned by a tool handler.
 */
export interface ToolResult {
    /** Indicates whether the tool execution was successful. */
    success: boolean;
    /** The output data from the tool, if successful. */
    output?: unknown;
    /** An error message, if the tool execution failed. */
    error?: string;
}

/**
 * Type definition for the tool execution handler function.
 */
export type ToolHandler = (ctx: AgentToolContext, args: Record<string, unknown>) => Promise<ToolResult>;

/**
 * Defines the complete structure for a tool registered in the system.
 */
export interface ToolDefinition {
    /** A unique, snake_case name for the tool. */
    name: string;
    /** A brief, descriptive summary of what the tool does. */
    description: string;
    /** An array of parameters the tool accepts. */
    parameters: ToolParameter[];
    /** The function that executes the tool's logic. */
    handler: ToolHandler;
    /** Whether the agent should seek confirmation before executing this tool. */
    requiresConfirmation: boolean;
    /** The category the tool belongs to. */
    category: 'file' | 'terminal' | 'github' | 'search' | 'custom';
    /** Whether the tool is currently enabled for use by the agent. */
    enabled: boolean;
}

/**
 * Defines the structure for a tool definition formatted for LLM function calling.
 */
export interface LLMToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, { type: string; description: string }>;
            required: string[];
        };
    };
}

/**
 * A centralized registry for managing and executing dynamic tools.
 */
export class DynamicToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    constructor() {
        this.registerDefaultTools();
    }

    /**
     * Validates a ToolDefinition object.
     */
    private validateToolDefinition(tool: ToolDefinition): void {
        if (!tool.name || typeof tool.name !== 'string' || tool.name.trim() === '') {
            throw new Error('Tool validation failed: Tool name is required.');
        }
        if (!tool.description || typeof tool.description !== 'string') {
            throw new Error(`Tool validation failed for ${tool.name}: Description is required.`);
        }
        if (!tool.handler || typeof tool.handler !== 'function') {
            throw new Error(`Tool validation failed for ${tool.name}: Handler function is required.`);
        }
        if (!Array.isArray(tool.parameters)) {
            throw new Error(`Tool validation failed for ${tool.name}: Parameters must be an array.`);
        }
        tool.parameters.forEach((param, index) => {
            if (!param.name || !param.type || !param.description) {
                throw new Error(`Tool validation failed for ${tool.name}: Parameter at index ${index} is missing name, type, or description.`);
            }
        });
    }

    /**
     * Registers a new tool with the registry.
     */
    public registerTool(tool: ToolDefinition): void {
        this.validateToolDefinition(tool);
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool registration failed: Tool with name "${tool.name}" already exists.`);
        }
        this.tools.set(tool.name, tool);
    }

    /**
     * Removes a tool from the registry.
     */
    public unregisterTool(name: string): boolean {
        return this.tools.delete(name);
    }

    /**
     * Retrieves a tool definition by its name.
     */
    public getTool(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    /**
     * Retrieves all registered tool definitions.
     */
    public getAllTools(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Retrieves tool definitions filtered by category.
     */
    public getToolsByCategory(category: ToolDefinition['category'] | string): ToolDefinition[] {
        return Array.from(this.tools.values()).filter(tool => tool.category === category);
    }

    /**
     * Enables a specific tool.
     */
    public enableTool(name: string): void {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Cannot enable tool: Tool "${name}" not found.`);
        }
        tool.enabled = true;
    }

    /**
     * Disables a specific tool.
     */
    public disableTool(name: string): void {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Cannot disable tool: Tool "${name}" not found.`);
        }
        tool.enabled = false;
    }

    /**
     * Executes a registered tool with the given context and arguments.
     */
    public async executeTool(name: string, ctx: AgentToolContext, args: Record<string, unknown>): Promise<ToolResult> {
        const tool = this.tools.get(name);

        if (!tool) {
            return { success: false, error: `Tool "${name}" not found.` };
        }

        if (!tool.enabled) {
            return { success: false, error: `Tool "${name}" is currently disabled.` };
        }

        try {
            // Validate required parameters
            for (const param of tool.parameters) {
                if (param.required && args[param.name] === undefined) {
                    return { success: false, error: `Missing required parameter "${param.name}".` };
                }
            }

            return await tool.handler(ctx, args);
        } catch (error) {
            logger.error({ error, toolName: name }, 'Error executing tool');
            return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Formats the currently enabled tools for LLM function calling.
     */
    public getToolsForLLM(): LLMToolDefinition[] {
        return Array.from(this.tools.values())
            .filter(tool => tool.enabled)
            .map(tool => {
                const properties: LLMToolDefinition['function']['parameters']['properties'] = {};
                const required: string[] = [];

                tool.parameters.forEach(param => {
                    properties[param.name] = {
                        type: param.type,
                        description: param.description,
                    };
                    if (param.required) {
                        required.push(param.name);
                    }
                });

                return {
                    type: 'function' as const,
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: {
                            type: 'object' as const,
                            properties,
                            required,
                        },
                    },
                };
            });
    }

    /**
     * Registers the default set of tools for the HERO IDE.
     */
    private registerDefaultTools(): void {
        const defaultTools: ToolDefinition[] = [
            {
                name: 'read_file',
                description: 'Reads the content of a file from the project codebase.',
                parameters: [
                    { name: 'path', type: 'string', description: 'The absolute or relative path to the file.', required: true },
                ],
                handler: async (ctx, args) => {
                    const path = args.path as string;
                    if (!ctx.fileSystem) {
                        return { success: false, error: 'File system context not available.' };
                    }
                    try {
                        const content = await ctx.fileSystem.readFile(path);
                        return { success: true, output: { content } };
                    } catch (e) {
                        return { success: false, error: `Failed to read file ${path}: ${e instanceof Error ? e.message : 'Unknown error'}` };
                    }
                },
                requiresConfirmation: false,
                category: 'file',
                enabled: true,
            },
            {
                name: 'write_file',
                description: 'Writes content to a file, overwriting existing content.',
                parameters: [
                    { name: 'path', type: 'string', description: 'The absolute or relative path to the file.', required: true },
                    { name: 'content', type: 'string', description: 'The full content to write to the file.', required: true },
                ],
                handler: async (ctx, args) => {
                    const path = args.path as string;
                    const content = args.content as string;
                    if (!ctx.fileSystem) {
                        return { success: false, error: 'File system context not available.' };
                    }
                    try {
                        await ctx.fileSystem.writeFile(path, content);
                        return { success: true, output: `Successfully wrote ${content.length} bytes to ${path}.` };
                    } catch (e) {
                        return { success: false, error: `Failed to write file ${path}: ${e instanceof Error ? e.message : 'Unknown error'}` };
                    }
                },
                requiresConfirmation: true,
                category: 'file',
                enabled: true,
            },
            {
                name: 'list_files',
                description: 'Lists files and directories in a given path.',
                parameters: [
                    { name: 'path', type: 'string', description: 'The directory path to list.', required: true },
                ],
                handler: async (ctx, args) => {
                    const path = args.path as string;
                    if (!ctx.fileSystem) {
                        return { success: false, error: 'File system context not available.' };
                    }
                    try {
                        const files = await ctx.fileSystem.listFiles(path);
                        return { success: true, output: { files } };
                    } catch (e) {
                        return { success: false, error: `Failed to list files in ${path}: ${e instanceof Error ? e.message : 'Unknown error'}` };
                    }
                },
                requiresConfirmation: false,
                category: 'file',
                enabled: true,
            },
            {
                name: 'run_terminal',
                description: 'Executes a shell command in the project terminal.',
                parameters: [
                    { name: 'command', type: 'string', description: 'The shell command to execute.', required: true },
                ],
                handler: async (ctx, args) => {
                    const command = args.command as string;
                    if (!ctx.terminal) {
                        return { success: false, error: 'Terminal context not available.' };
                    }
                    try {
                        const result = await ctx.terminal.execute(command);
                        return {
                            success: result.exitCode === 0,
                            output: {
                                stdout: result.stdout,
                                stderr: result.stderr,
                                exitCode: result.exitCode,
                            },
                            error: result.exitCode !== 0 ? `Command exited with code ${result.exitCode}` : undefined,
                        };
                    } catch (e) {
                        return { success: false, error: `Failed to execute command: ${e instanceof Error ? e.message : 'Unknown error'}` };
                    }
                },
                requiresConfirmation: true,
                category: 'terminal',
                enabled: true,
            },
            {
                name: 'search_codebase',
                description: 'Searches for a pattern in the project codebase.',
                parameters: [
                    { name: 'pattern', type: 'string', description: 'The search pattern (regex supported).', required: true },
                    { name: 'path', type: 'string', description: 'The directory to search in.', required: false, default: '.' },
                ],
                handler: async (ctx, args) => {
                    const pattern = args.pattern as string;
                    const path = (args.path as string) || '.';
                    if (!ctx.terminal) {
                        return { success: false, error: 'Terminal context not available.' };
                    }
                    try {
                        const result = await ctx.terminal.execute(`grep -rn "${pattern}" ${path} --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -50`);
                        return {
                            success: true,
                            output: {
                                matches: result.stdout.split('\n').filter(Boolean),
                            },
                        };
                    } catch (e) {
                        return { success: false, error: `Search failed: ${e instanceof Error ? e.message : 'Unknown error'}` };
                    }
                },
                requiresConfirmation: false,
                category: 'search',
                enabled: true,
            },
        ];

        for (const tool of defaultTools) {
            this.tools.set(tool.name, tool);
        }
    }
}

// Export singleton instance
export const dynamicToolRegistry = new DynamicToolRegistry();
