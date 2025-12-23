/**
 * Cloud Chat Agent Service
 * 
 * Extends the chat agent service to execute actions in the E2B cloud sandbox.
 * This bridges the gap between the chat interface and the cloud execution engine.
 * 
 * @module server/cloudChatAgent
 */

import { ChatContext, ChatAgentResult, ExecuteMessageOptions, ChatAgentService } from './chatAgent';
import { CloudExecutionEngine, createCloudExecutionEngine, CloudToolName } from './agents/cloudExecutionEngine';
import { invokeLLM, Message } from './_core/llm';
import { agentLogger } from './agents/logger';
import { AgentType } from './agents/promptTemplates';
import * as db from './db';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface CloudChatContext extends ChatContext {
  projectId: number;
  useCloudSandbox?: boolean;
}

export interface CloudChatResult extends ChatAgentResult {
  executionResult?: {
    steps: Array<{
      toolName: string;
      action: string;
      status: string;
      output?: unknown;
      error?: string;
    }>;
    sandboxId?: string;
  };
}

export interface ParsedToolCall {
  toolName: CloudToolName;
  action: string;
  description: string;
  input: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════════════════
// CLOUD CHAT AGENT SERVICE
// ════════════════════════════════════════════════════════════════════════════

export class CloudChatAgentService {
  private baseService: ChatAgentService;
  private activeEngines: Map<string, CloudExecutionEngine> = new Map();
  private cloudLogger = agentLogger;

  constructor() {
    this.baseService = new ChatAgentService();
  }

  /**
   * Execute a user message with cloud sandbox support.
   */
  async executeMessageWithCloud(
    options: ExecuteMessageOptions & { projectId: number; useCloudSandbox?: boolean }
  ): Promise<CloudChatResult> {
    const { message, agentType, context, userId, projectId, useCloudSandbox = true } = options;
    const startTime = Date.now();

    try {
      // First, get the base result from the base service
      const baseResult = await this.baseService.executeMessage(options);
      
      if (!baseResult.success) {
        return baseResult as CloudChatResult;
      }

      // If cloud sandbox is disabled, return the base result
      if (!useCloudSandbox) {
        return baseResult as CloudChatResult;
      }

      // Get or create the cloud execution engine for this project
      const engineKey = `${userId}_${projectId}`;
      let engine = this.activeEngines.get(engineKey);
      
      if (!engine) {
        engine = createCloudExecutionEngine({
          userId,
          agentType,
          projectId,
          goal: message,
        });
        
        // Initialize the engine (starts sandbox, hydrates project)
        await engine.initialize();
        this.activeEngines.set(engineKey, engine);
      }

      // Parse the LLM response to extract tool calls
      const llmResponse = await this.getLLMResponse(baseResult.prompt, message, context);
      const toolCalls = this.parseToolCalls(llmResponse);

      // If there are tool calls, execute them
      if (toolCalls.length > 0) {
        engine.addSteps(toolCalls);
        
        // Set up confirmation handler
        engine.setOnConfirmationRequired(async (step) => {
          // For now, auto-approve low-risk actions
          // In a real implementation, this would prompt the user
          return step.safetyCheck?.riskLevel !== 'high';
        });

        const executionResult = await engine.start();

        return {
          ...baseResult,
          response: llmResponse,
          executionResult: {
            steps: executionResult.steps.map(s => ({
              toolName: s.toolName,
              action: s.action,
              status: s.status,
              output: s.result?.output,
              error: s.result?.error,
            })),
            sandboxId: executionResult.sandboxId,
          },
          durationMs: Date.now() - startTime,
        };
      }

      // No tool calls, just return the LLM response
      return {
        ...baseResult,
        response: llmResponse,
        durationMs: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.cloudLogger.error(
        `Cloud chat execution failed: ${errorMessage}`,
        agentType,
        userId,
        { data: { error: errorMessage, projectId } }
      );

      return {
        success: false,
        agentType,
        prompt: '',
        safetyCheck: { allowed: false, requiresConfirmation: false, riskLevel: 'low' },
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get LLM response for the message.
   */
  private async getLLMResponse(
    systemPrompt: string,
    userMessage: string,
    context?: ChatContext
  ): Promise<string> {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (context?.conversationHistory) {
      for (const msg of context.conversationHistory.slice(-10)) {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await invokeLLM({ messages });

    // Extract content from the response
    const choice = response.choices[0];
    if (!choice) {
      return '';
    }
    
    const content = choice.message.content;
    if (typeof content === 'string') {
      return content;
    }
    
    // Handle array content
    if (Array.isArray(content)) {
      return content
        .filter(c => c.type === 'text')
        .map(c => (c as { type: 'text'; text: string }).text)
        .join('\n');
    }
    
    return '';
  }

  /**
   * Parse tool calls from LLM response.
   * The LLM is expected to output tool calls in a structured format.
   */
  private parseToolCalls(response: string): ParsedToolCall[] {
    const toolCalls: ParsedToolCall[] = [];

    // Look for tool call patterns in the response
    // Format: <tool name="tool_name" action="action_description">
    //           <param name="param_name">value</param>
    //         </tool>
    const toolPattern = /<tool\s+name="([^"]+)"\s+action="([^"]+)">([\s\S]*?)<\/tool>/g;
    const paramPattern = /<param\s+name="([^"]+)">([^<]*)<\/param>/g;

    let toolMatch;
    while ((toolMatch = toolPattern.exec(response)) !== null) {
      const [, toolName, action, paramsContent] = toolMatch;
      const input: Record<string, unknown> = {};

      let paramMatch;
      while ((paramMatch = paramPattern.exec(paramsContent)) !== null) {
        const [, paramName, paramValue] = paramMatch;
        // Try to parse as JSON, otherwise use as string
        try {
          input[paramName] = JSON.parse(paramValue);
        } catch {
          input[paramName] = paramValue;
        }
      }

      // Validate tool name
      if (this.isValidToolName(toolName)) {
        toolCalls.push({
          toolName: toolName as CloudToolName,
          action,
          description: action,
          input,
        });
      }
    }

    // Also support JSON format for tool calls
    // Format: {"tools": [{"name": "tool_name", "action": "...", "input": {...}}]}
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.tools && Array.isArray(parsed.tools)) {
          for (const tool of parsed.tools) {
            if (this.isValidToolName(tool.name)) {
              toolCalls.push({
                toolName: tool.name as CloudToolName,
                action: tool.action || tool.name,
                description: tool.description || tool.action || tool.name,
                input: tool.input || tool.params || {},
              });
            }
          }
        }
      }
    } catch {
      // JSON parsing failed, ignore
    }

    return toolCalls;
  }

  /**
   * Check if a tool name is valid.
   */
  private isValidToolName(name: string): boolean {
    const validTools: CloudToolName[] = [
      'read_file', 'write_file', 'edit_file', 'delete_file',
      'list_directory', 'create_directory', 'file_exists', 'search_files',
      'run_command', 'run_script', 'install_packages',
      'submit_pr', 'create_branch', 'commit_changes', 'push_changes',
      'get_diff', 'get_status',
    ];
    return validTools.includes(name as CloudToolName);
  }

  /**
   * Get the active execution engine for a project.
   */
  getActiveEngine(userId: number, projectId: number): CloudExecutionEngine | undefined {
    return this.activeEngines.get(`${userId}_${projectId}`);
  }

  /**
   * Close the execution engine for a project.
   */
  async closeEngine(userId: number, projectId: number): Promise<void> {
    const engineKey = `${userId}_${projectId}`;
    const engine = this.activeEngines.get(engineKey);
    if (engine) {
      await engine.cleanup();
      this.activeEngines.delete(engineKey);
    }
  }

  /**
   * Close all active engines.
   */
  async closeAllEngines(): Promise<void> {
    const entries = Array.from(this.activeEngines.entries());
    for (const [key, engine] of entries) {
      await engine.cleanup();
    }
    this.activeEngines.clear();
  }

  /**
   * Delegate to base service methods
   */
  executeMessage(options: ExecuteMessageOptions): Promise<ChatAgentResult> {
    return this.baseService.executeMessage(options);
  }

  getPromptForAgent(agentType: AgentType, context?: any): string {
    return this.baseService.getPromptForAgent(agentType, context);
  }

  getAvailableAgentTypes() {
    return this.baseService.getAvailableAgentTypes();
  }

  isValidAgentType(type: string): type is AgentType {
    return this.baseService.isValidAgentType(type);
  }
}

// Export singleton instance
export const cloudChatAgentService = new CloudChatAgentService();
