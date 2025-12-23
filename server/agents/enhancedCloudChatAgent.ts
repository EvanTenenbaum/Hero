/**
 * Enhanced Cloud Chat Agent
 * 
 * Integrates all Phase 1 and Phase 2 improvements into a unified
 * intelligent agent system with memory, learning, and adaptive behavior.
 */

import { z } from 'zod';
import { invokeLLM, InvokeResult, Message, Tool } from '../_core/llm';
import { logger } from '../_core/logger';

// Import Phase 1 services
import { countTokens, truncateToTokenLimit } from '../utils/tokenizer';
import { agentMemoryService, LongTermMemoryItem, ShortTermMemoryItem } from '../services/agentMemory';
import { intelligentContextManager, ContextSource, ContextBudget } from '../services/intelligentContextManager';
import { dynamicToolRegistry, ToolResult } from '../services/dynamicToolRegistry';
import { auditLogger } from '../services/auditLogger';
import { AgentOrchestrator, WorkflowStepInput } from '../services/agentOrchestrator';

// Import Phase 2 services
import { PromptBuilder, PromptContext as EnhancedPromptContext, AgentTaskType } from './enhancedPromptSystem';
import { selfReflectionService, ExecutionResult, AgentAction } from './selfReflectionService';
import { executionPatternLearner, ExecutionRecord, ToolCall } from './executionPatternLearner';
import { adaptiveAgentController, AgentTask, AgentStrategy, AgentResult } from './adaptiveAgentController';

// --- Input Validation Schemas ---

/**
 * Zod schema for validating EnhancedAgentConfig.
 */
const EnhancedAgentConfigSchema = z.object({
    userId: z.number().int().positive(),
    projectId: z.number().int().positive(),
    sessionId: z.string().min(1).max(128),
    model: z.string().optional(),
    maxTokens: z.number().int().positive().max(32768).optional(),
    enableMemory: z.boolean().optional(),
    enableLearning: z.boolean().optional(),
    enableReflection: z.boolean().optional(),
    enableAdaptive: z.boolean().optional(),
});

/**
 * Zod schema for validating ChatContext.
 */
const ChatContextSchema = z.object({
    projectFiles: z.array(z.string()).max(1000),
    currentFile: z.string().max(500).optional(),
    currentFileContent: z.string().max(1000000).optional(), // 1MB max
    techStack: z.string().max(500),
    recentMessages: z.array(z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
    })).max(100),
});

/**
 * Zod schema for validating user messages.
 */
const UserMessageSchema = z.string().min(1).max(100000); // 100KB max

// --- Type Definitions ---

/**
 * Configuration for the enhanced chat agent.
 */
export interface EnhancedAgentConfig {
    userId: number;
    projectId: number;
    sessionId: string;
    model?: string;
    maxTokens?: number;
    enableMemory?: boolean;
    enableLearning?: boolean;
    enableReflection?: boolean;
    enableAdaptive?: boolean;
}

/**
 * Represents the context for a chat interaction.
 */
export interface ChatContext {
    projectFiles: string[];
    currentFile?: string;
    currentFileContent?: string;
    techStack: string;
    recentMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

/**
 * Represents the result of a chat agent execution.
 */
export interface ChatAgentResult {
    response: string;
    toolsUsed: string[];
    filesModified: string[];
    executionTimeMs: number;
    confidence: number;
    learningApplied: boolean;
    memoryUsed: boolean;
}

// --- Enhanced Cloud Chat Agent ---

/**
 * The main enhanced cloud chat agent that integrates all improvements.
 */
export class EnhancedCloudChatAgent {
    private config: EnhancedAgentConfig;
    private promptBuilder: PromptBuilder;
    private orchestrator: AgentOrchestrator;
    private actions: AgentAction[] = [];
    private startTime: number = 0;

    constructor(config: EnhancedAgentConfig) {
        // Validate config
        const validatedConfig = EnhancedAgentConfigSchema.parse(config);
        
        this.config = {
            model: 'gpt-4o',
            maxTokens: 4096,
            enableMemory: true,
            enableLearning: true,
            enableReflection: true,
            enableAdaptive: true,
            ...validatedConfig,
        };
        this.promptBuilder = new PromptBuilder(this.config.model as 'GPT-4-Turbo');
        this.orchestrator = new AgentOrchestrator();
    }

    /**
     * Processes a user message and generates a response.
     */
    public async processMessage(
        userMessage: string,
        context: ChatContext,
        taskType: AgentTaskType = 'CODE_GENERATION'
    ): Promise<ChatAgentResult> {
        // Validate inputs
        const validatedMessage = UserMessageSchema.parse(userMessage);
        const validatedContext = ChatContextSchema.parse(context);
        
        this.startTime = Date.now();
        this.actions = [];
        let learningApplied = false;
        let memoryUsed = false;

        logger.info({ userId: this.config.userId, projectId: this.config.projectId }, 'Processing message');

        try {
            // 1. Check for learned patterns (if enabled)
            if (this.config.enableLearning) {
                const suggestedSequence = executionPatternLearner.suggestSequence(validatedMessage);
                if (suggestedSequence) {
                    logger.info({ steps: suggestedSequence.length }, 'Found learned pattern');
                    learningApplied = true;
                }
            }

            // 2. Recall relevant memories (if enabled)
            let memoryContext = '';
            if (this.config.enableMemory) {
                const memories = await agentMemoryService.recall(validatedMessage, {
                    userId: this.config.userId,
                    projectId: this.config.projectId,
                    sessionId: this.config.sessionId,
                    limit: 5,
                    includeShortTerm: true,
                    includeLongTerm: true,
                });

                if (memories.length > 0) {
                    memoryContext = memories.map(m => 
                        `[Memory: ${m.memoryKey}] ${JSON.stringify(m.memoryValue)}`
                    ).join('\n');
                    memoryUsed = true;
                    logger.info({ count: memories.length }, 'Retrieved relevant memories');
                }
            }

            // 3. Build intelligent context
            const contextSources = this.buildContextSources(validatedContext, memoryContext);
            const budget: ContextBudget = {
                maxTokens: 128000,
                reservedForResponse: this.config.maxTokens || 4096,
                reservedForTools: 2000,
                availableForContext: 128000 - (this.config.maxTokens || 4096) - 2000,
            };
            const builtContext = intelligentContextManager.buildOptimalContext(
                validatedMessage,
                contextSources,
                budget
            );

            // 4. Build the prompt
            const promptContext: EnhancedPromptContext = {
                techStack: validatedContext.techStack,
                codingConventions: 'Follow TypeScript best practices',
                fileStructureSummary: validatedContext.projectFiles.slice(0, 20).join('\n'),
                currentFileContent: validatedContext.currentFileContent || '',
                relatedCodeSnippets: builtContext.prompt.project || '',
                executionState: '',
                userPreferences: {},
            };

            const prompt = this.promptBuilder.buildPrompt(taskType, validatedMessage, promptContext);

            // 5. Execute with adaptive strategy (if enabled)
            let response: string;
            let confidence = 0.5;
            const toolsUsed: string[] = [];
            const filesModified: string[] = [];

            if (this.config.enableAdaptive) {
                const task: AgentTask = {
                    id: `task-${Date.now()}`,
                    description: validatedMessage,
                    type: taskType,
                    context: JSON.stringify(promptContext),
                };

                const adaptiveResult = await adaptiveAgentController.executeTask(
                    task,
                    async (t, strategy) => this.executeWithStrategy(t, strategy, prompt)
                );

                response = adaptiveResult.result.output || 'Task completed';
                confidence = adaptiveResult.metrics.confidence;
            } else {
                // Direct execution without adaptive strategy
                const result = await this.directExecution(prompt, validatedContext.recentMessages);
                response = result.response;
                toolsUsed.push(...result.toolsUsed);
                filesModified.push(...result.filesModified);
            }

            // 6. Self-reflection (if enabled)
            if (this.config.enableReflection) {
                const executionResult: ExecutionResult = {
                    taskId: `task-${Date.now()}`,
                    taskDescription: validatedMessage,
                    isSuccessful: true,
                    actions: this.actions,
                    finalOutput: response,
                    totalDurationMs: Date.now() - this.startTime,
                    errorMessage: undefined,
                    timestamp: new Date(),
                };

                // Fire and forget - don't block on reflection
                selfReflectionService.reflect(executionResult).catch(err => 
                    logger.warn({ error: err }, 'Self-reflection failed')
                );
            }

            // 7. Record execution pattern (if enabled)
            if (this.config.enableLearning) {
                const record: ExecutionRecord = {
                    id: `exec-${Date.now()}`,
                    userQuery: validatedMessage,
                    toolSequence: toolsUsed,
                    toolCalls: toolsUsed.map((name, i) => ({
                        toolName: name,
                        input: {},
                        output: 'success',
                        success: true,
                        durationMs: 100,
                        timestamp: new Date(this.startTime + i * 100),
                    })),
                    success: true,
                    totalDurationMs: Date.now() - this.startTime,
                    timestamp: new Date(),
                };

                executionPatternLearner.recordExecution(record);
            }

            // 8. Store in short-term memory (if enabled)
            if (this.config.enableMemory) {
                await agentMemoryService.remember({
                    sessionId: this.config.sessionId,
                    userId: this.config.userId,
                    projectId: this.config.projectId,
                    memoryKey: `interaction-${Date.now()}`,
                    memoryValue: {
                        query: validatedMessage.substring(0, 500),
                        response: response.substring(0, 500),
                        taskType,
                    },
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                });
            }

            // 9. Audit log
            await auditLogger.logAction({
                userId: this.config.userId,
                projectId: this.config.projectId,
                executionId: `exec-${Date.now()}`,
                action: 'CHAT_COMPLETION',
                category: 'agent',
                severity: 'info',
                details: {
                    taskType,
                    toolsUsed: toolsUsed.length,
                    filesModified: filesModified.length,
                    executionTimeMs: Date.now() - this.startTime,
                    learningApplied,
                    memoryUsed,
                },
            });

            return {
                response,
                toolsUsed,
                filesModified,
                executionTimeMs: Date.now() - this.startTime,
                confidence,
                learningApplied,
                memoryUsed,
            };

        } catch (error) {
            logger.error({ error, userId: this.config.userId }, 'Error processing message');

            // Audit log the error
            await auditLogger.logAction({
                userId: this.config.userId,
                projectId: this.config.projectId,
                action: 'CHAT_ERROR',
                category: 'agent',
                severity: 'error',
                details: {
                    error: error instanceof Error ? error.message : String(error),
                    taskType,
                },
            });

            throw error;
        }
    }

    /**
     * Builds context sources from the chat context.
     */
    private buildContextSources(context: ChatContext, memoryContext: string): ContextSource[] {
        const sources: ContextSource[] = [];

        if (context.currentFileContent) {
            sources.push({
                type: 'code',
                content: context.currentFileContent,
                priority: 10,
                tokens: countTokens(context.currentFileContent),
                metadata: { file: context.currentFile },
            });
        }

        if (context.projectFiles.length > 0) {
            const projectContent = context.projectFiles.join('\n');
            sources.push({
                type: 'project',
                content: projectContent,
                priority: 5,
                tokens: countTokens(projectContent),
            });
        }

        if (memoryContext) {
            sources.push({
                type: 'session_log',
                content: memoryContext,
                priority: 7,
                tokens: countTokens(memoryContext),
            });
        }

        if (context.recentMessages.length > 0) {
            const conversationContent = context.recentMessages.map(m => 
                `${m.role}: ${typeof m.content === 'string' ? m.content : '[complex]'}`
            ).join('\n');
            sources.push({
                type: 'session_log',
                content: conversationContent,
                priority: 8,
                tokens: countTokens(conversationContent),
            });
        }

        return sources;
    }

    /**
     * Executes a task with a specific strategy.
     */
    private async executeWithStrategy(
        task: AgentTask,
        strategy: AgentStrategy,
        prompt: string
    ): Promise<AgentResult> {
        const result = await this.directExecution(prompt, []);
        
        return {
            success: true,
            output: result.response,
            message: 'Execution completed',
        };
    }

    /**
     * Performs direct LLM execution.
     */
    private async directExecution(
        prompt: string,
        recentMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    ): Promise<{ response: string; toolsUsed: string[]; filesModified: string[] }> {
        const messages: Message[] = [
            { role: 'system', content: prompt },
            ...recentMessages.slice(-10).map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
        ];

        const tools = dynamicToolRegistry.getToolsForLLM();

        const result = await invokeLLM({
            messages,
            tools: tools.length > 0 ? tools : undefined,
            maxTokens: this.config.maxTokens,
        });

        const toolsUsed: string[] = [];
        const filesModified: string[] = [];

        // Process tool calls if any
        const toolCalls = result.choices[0]?.message?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
                toolsUsed.push(toolCall.function.name);
                
                this.actions.push({
                    toolName: toolCall.function.name,
                    input: JSON.parse(toolCall.function.arguments || '{}'),
                    output: 'executed',
                    isSuccessful: true,
                    timestamp: new Date(),
                    durationMs: 0,
                });

                // Track file modifications
                if (toolCall.function.name.includes('write') || 
                    toolCall.function.name.includes('create') ||
                    toolCall.function.name.includes('modify')) {
                    try {
                        const args = JSON.parse(toolCall.function.arguments || '{}');
                        if (args.path || args.filePath) {
                            filesModified.push(args.path || args.filePath);
                        }
                    } catch {
                        // Ignore JSON parse errors
                    }
                }
            }
        }

        const messageContent = result.choices[0]?.message?.content;
        const response = typeof messageContent === 'string' 
            ? messageContent 
            : Array.isArray(messageContent) 
                ? messageContent.map((c: { type: string; text?: string }) => c.type === 'text' ? c.text : '').join('') 
                : '';

        return { response, toolsUsed, filesModified };
    }
}

/**
 * Factory function to create an enhanced agent with validated config.
 */
export function createEnhancedAgent(config: EnhancedAgentConfig): EnhancedCloudChatAgent {
    return new EnhancedCloudChatAgent(config);
}
