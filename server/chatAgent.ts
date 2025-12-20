/**
 * Chat Agent Service - Sprint 1 Agent Alpha
 * 
 * Connects the chat interface to the agent execution system.
 * Handles prompt assembly, safety checks, and execution coordination.
 */

import { assemblePrompt, getTemplate, PromptContext, AgentType, PromptTemplate } from './agents/promptTemplates';
import { checkSafety, SafetyCheckResult } from './agents/safetyChecker';
import { agentLogger } from './agents/logger';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatContext {
  projectId?: number;
  projectName?: string;
  techStack?: string[];
  conversationHistory?: ChatMessage[];
  openFiles?: string[];
  userRules?: string[];
}

export interface ChatAgentResult {
  success: boolean;
  agentType: AgentType;
  prompt: string;
  safetyCheck: SafetyCheckResult;
  response?: string;
  error?: string;
  executionId?: number;
  tokensUsed?: number;
  durationMs?: number;
}

export interface ExecuteMessageOptions {
  message: string;
  agentType: AgentType;
  context?: ChatContext;
  userId: number;
  skipSafetyCheck?: boolean;
}

/**
 * ChatAgentService handles the integration between user chat and the agent system.
 * It assembles prompts, performs safety checks, and coordinates execution.
 */
export class ChatAgentService {
  private logger = agentLogger;

  /**
   * Execute a user message through the specified agent type.
   */
  async executeMessage(options: ExecuteMessageOptions): Promise<ChatAgentResult> {
    const { message, agentType, context, userId, skipSafetyCheck } = options;
    const startTime = Date.now();

    try {
      // 1. Build prompt context from chat context
      const promptContext = this.buildPromptContext(context);

      // 2. Get template and assemble the full prompt
      const template = getTemplate(agentType);
      if (!template) {
        throw new Error(`No template found for agent type: ${agentType}`);
      }
      const prompt = assemblePrompt(template, promptContext);

      // 3. Perform safety check on the user message
      const safetyCheck = skipSafetyCheck 
        ? { allowed: true, requiresConfirmation: false, riskLevel: 'low' as const }
        : checkSafety(message);

      if (!safetyCheck.allowed) {
        return {
          success: false,
          agentType,
          prompt,
          safetyCheck,
          error: `Action blocked by safety rules: ${safetyCheck.reason}`,
          durationMs: Date.now() - startTime,
        };
      }

      // 4. Log the execution start
      await this.logger.info(
        `Starting chat execution with ${agentType} agent`,
        agentType,
        userId,
        {
          data: {
            messageLength: message.length,
            hasContext: !!context,
            requiresConfirmation: safetyCheck.requiresConfirmation,
          },
        }
      );

      // 5. If confirmation is required, return early with that status
      if (safetyCheck.requiresConfirmation) {
        return {
          success: true,
          agentType,
          prompt,
          safetyCheck,
          response: `This action requires confirmation: ${safetyCheck.reason}`,
          durationMs: Date.now() - startTime,
        };
      }

      // 6. Build the full message array for the LLM
      const messages = this.buildMessages(prompt, message, context?.conversationHistory);

      // 7. Return the prepared execution context
      // Note: Actual LLM invocation happens in the router layer
      return {
        success: true,
        agentType,
        prompt,
        safetyCheck,
        response: JSON.stringify({ messages, agentType }),
        durationMs: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logger.error(
        `Chat execution failed: ${errorMessage}`,
        agentType,
        userId,
        { data: { error: errorMessage } }
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
   * Get the assembled prompt for a specific agent type.
   */
  getPromptForAgent(agentType: AgentType, context?: PromptContext): string {
    const template = getTemplate(agentType);
    if (!template) {
      return `You are a ${agentType} agent. Help the user with their request.`;
    }
    return assemblePrompt(template, context || {});
  }

  /**
   * Build prompt context from chat context.
   */
  private buildPromptContext(context?: ChatContext): PromptContext {
    if (!context) {
      return {};
    }

    return {
      project: context.projectName ? {
        name: context.projectName,
        description: '',
        techStack: context.techStack || [],
        conventions: '',
      } : undefined,
      user: context.userRules?.length ? {
        preferences: '',
        customRules: context.userRules,
      } : undefined,
      session: {
        recentActions: [],
        openFiles: context.openFiles || [],
      },
    };
  }

  /**
   * Build the message array for LLM invocation.
   */
  private buildMessages(
    systemPrompt: string,
    userMessage: string,
    history?: ChatMessage[]
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 messages to avoid context overflow)
    if (history && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add the current user message
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Get available agent types with descriptions.
   */
  getAvailableAgentTypes(): Array<{ type: AgentType; description: string }> {
    return [
      { type: 'pm', description: 'Project Manager - Planning, requirements, task breakdown' },
      { type: 'developer', description: 'Developer - Code writing, debugging, refactoring' },
      { type: 'qa', description: 'QA Engineer - Testing, quality assurance, bug finding' },
      { type: 'devops', description: 'DevOps - Infrastructure, deployment, CI/CD' },
      { type: 'research', description: 'Researcher - Information gathering, documentation' },
    ];
  }

  /**
   * Validate that an agent type is valid.
   */
  isValidAgentType(type: string): type is AgentType {
    return ['pm', 'developer', 'qa', 'devops', 'research'].includes(type);
  }
}

// Export singleton instance
export const chatAgentService = new ChatAgentService();
