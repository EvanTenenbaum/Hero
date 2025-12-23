/**
 * Enhanced Cloud Chat Agent
 * 
 * Integrates all Phase 1 and Phase 2 improvements into a unified
 * intelligent agent system with memory, learning, and adaptive behavior.
 */

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
import { PromptBuilder, PromptContext, AgentTaskType } from './enhancedPromptSystem';
import { selfReflectionService, ExecutionResult, AgentAction } from './selfReflectionService';
import { executionPatternLearner, ExecutionRecord, ToolCall } from './executionPatternLearner';
import { adaptiveAgentController, AgentTask, AgentStrategy, AgentResult } from './adaptiveAgentController';

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
    recentMessages: Message[];
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
        this.config = {
            model: 'gpt-4o',
            maxTokens: 4096,
            enableMemory: true,
            enableLearning: true,
            enableReflection: true,
            enableAdaptive: true,
            ...config,
        };
        this.promptBuilder = new PromptBuilder(this.config.model as any);
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
        this.startTime = Date.now();
        this.actions = [];
        let learningApplied = false;
        let memoryUsed = false;

        logger.info(`Processing message for user ${this.config.userId}, project ${this.config.projectId}`);

        try {
            // 1. Check for learned patterns (if enabled)
            if (this.config.enableLearning) {
                const suggestedSequence = executionPatternLearner.suggestSequence(userMessage);
                if (suggestedSequence) {
                    logger.info(`Found learned pattern with ${suggestedSequence.length} steps`);
                    learningApplied = true;
                }
            }

            // 2. Recall relevant memories (if enabled)
            let memoryContext = '';
            if (this.config.enableMemory) {
                const memories = await agentMemoryService.recall(userMessage, {
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
                    logger.info(`Retrieved ${memories.length} relevant memories`);
                }
            }

            // 3. Build intelligent context
            const contextSources = this.buildContextSources(context, memoryContext);
            const budget: ContextBudget = {
                maxTokens: 128000,
                reservedForResponse: this.config.maxTokens || 4096,
                reservedForTools: 2000,
                availableForContext: 128000 - (this.config.maxTokens || 4096) - 2000,
            };
            const builtContext = intelligentContextManager.buildOptimalContext(
                userMessage,
                contextSources,
                budget
            );

            // 4. Build the prompt
            const promptContext: PromptContext = {
                techStack: context.techStack,
                codingConventions: 'Follow TypeScript best practices',
                fileStructureSummary: context.projectFiles.slice(0, 20).join('\n'),
                currentFileContent: context.currentFileContent || '',
                relatedCodeSnippets: builtContext.prompt.project || '',
                executionState: '',
                userPreferences: {},
            };

            // 5. Execute with adaptive controller (if enabled)
            let response: string;
            let confidence: number;

            if (this.config.enableAdaptive) {
                const agentTask: AgentTask = {
                    id: `task-${Date.now()}`,
                    description: userMessage,
                    type: taskType,
                    context: context.currentFileContent,
                };

                const { result, metrics } = await adaptiveAgentController.executeTask(
                    agentTask,
                    async (task, strategy) => this.executeWithStrategy(task, strategy, promptContext, context)
                );

                response = result.output;
                confidence = metrics.confidence;
            } else {
                // Direct execution without adaptive controller
                const result = await this.executeDirect(userMessage, promptContext, context);
                response = result.output;
                confidence = 0.7;
            }

            // 6. Log the execution
            await auditLogger.logAgentExecution(
                this.config.userId,
                this.config.projectId,
                taskType,
                userMessage,
                response,
                this.config.sessionId
            );

            // 7. Record execution for learning
            if (this.config.enableLearning) {
                const executionRecord: ExecutionRecord = {
                    id: `exec-${Date.now()}`,
                    userQuery: userMessage,
                    toolSequence: this.actions.map(a => a.toolName),
                    toolCalls: this.actions.map(a => ({
                        toolName: a.toolName,
                        input: a.input,
                        output: a.output,
                        success: a.isSuccessful,
                        durationMs: a.durationMs,
                        timestamp: a.timestamp,
                    })),
                    success: true,
                    totalDurationMs: Date.now() - this.startTime,
                    timestamp: new Date(),
                };
                executionPatternLearner.recordExecution(executionRecord);
            }

            // 8. Perform self-reflection (if enabled)
            if (this.config.enableReflection) {
                const executionResult: ExecutionResult = {
                    taskId: `task-${Date.now()}`,
                    taskDescription: userMessage,
                    actions: this.actions,
                    finalOutput: response,
                    isSuccessful: true,
                    totalDurationMs: Date.now() - this.startTime,
                    timestamp: new Date(),
                };
                
                // Fire and forget - don't block the response
                selfReflectionService.reflect(executionResult).catch(err => 
                    logger.warn({ error: err }, 'Self-reflection failed')
                );
            }

            // 9. Store short-term memory
            if (this.config.enableMemory) {
                const memoryItem: ShortTermMemoryItem = {
                    sessionId: this.config.sessionId,
                    userId: this.config.userId,
                    projectId: this.config.projectId,
                    memoryKey: `interaction-${Date.now()}`,
                    memoryValue: {
                        query: userMessage.substring(0, 200),
                        responsePreview: response.substring(0, 200),
                        taskType,
                    },
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                };
                agentMemoryService.remember(memoryItem).catch(err =>
                    logger.warn({ error: err }, 'Failed to store memory')
                );
            }

            return {
                response,
                toolsUsed: this.actions.map(a => a.toolName),
                filesModified: this.extractModifiedFiles(),
                executionTimeMs: Date.now() - this.startTime,
                confidence,
                learningApplied,
                memoryUsed,
            };

        } catch (error) {
            logger.error({ error }, 'Error processing message');
            
            // Record failure for learning
            if (this.config.enableLearning) {
                const executionRecord: ExecutionRecord = {
                    id: `exec-${Date.now()}`,
                    userQuery: userMessage,
                    toolSequence: this.actions.map(a => a.toolName),
                    toolCalls: this.actions.map(a => ({
                        toolName: a.toolName,
                        input: a.input,
                        output: a.output,
                        success: a.isSuccessful,
                        durationMs: a.durationMs,
                        timestamp: a.timestamp,
                    })),
                    success: false,
                    totalDurationMs: Date.now() - this.startTime,
                    timestamp: new Date(),
                };
                executionPatternLearner.recordExecution(executionRecord);
            }

            throw error;
        }
    }

    /**
     * Executes a task with a specific strategy.
     */
    private async executeWithStrategy(
        task: AgentTask,
        strategy: AgentStrategy,
        promptContext: PromptContext,
        chatContext: ChatContext
    ): Promise<AgentResult> {
        logger.info(`Executing with strategy: ${strategy}`);

        switch (strategy) {
            case AgentStrategy.DirectExecution:
                return this.executeDirect(task.description, promptContext, chatContext);

            case AgentStrategy.PlanAndExecute:
                return this.executePlanAndExecute(task, promptContext, chatContext);

            case AgentStrategy.ReflectiveAnalysis:
                return this.executeReflective(task, promptContext, chatContext);

            case AgentStrategy.MultiAgentCollaboration:
                return this.executeMultiAgent(task, promptContext, chatContext);

            default:
                return this.executeDirect(task.description, promptContext, chatContext);
        }
    }

    /**
     * Direct execution strategy - single LLM call.
     */
    private async executeDirect(
        query: string,
        promptContext: PromptContext,
        chatContext: ChatContext
    ): Promise<AgentResult> {
        const tools = dynamicToolRegistry.getToolsForLLM();
        
        const messages: Message[] = [
            {
                role: 'system',
                content: `You are HERO, an expert AI coding assistant. Help the user with their request.
                
Project Context:
- Tech Stack: ${promptContext.techStack}
- Current File: ${chatContext.currentFile || 'None'}

Available tools: ${tools.map(t => t.function.name).join(', ')}`,
            },
            ...chatContext.recentMessages.slice(-10),
            { role: 'user', content: query },
        ];

        const startTime = Date.now();
        const response = await invokeLLM({
            messages,
            tools: tools as Tool[],
            maxTokens: this.config.maxTokens,
        });

        const content = response.choices[0]?.message?.content;
        const output = typeof content === 'string' ? content : '';

        this.recordAction('llm_call', { query }, output, true, Date.now() - startTime);

        return {
            output,
            success: true,
            message: 'Direct execution completed',
        };
    }

    /**
     * Plan and execute strategy - creates a plan first, then executes.
     */
    private async executePlanAndExecute(
        task: AgentTask,
        promptContext: PromptContext,
        chatContext: ChatContext
    ): Promise<AgentResult> {
        // Step 1: Generate a plan
        const planMessages: Message[] = [
            {
                role: 'system',
                content: `You are a planning agent. Create a step-by-step plan to accomplish the task.
Output a JSON array of steps, each with: { "step": number, "action": string, "tool": string | null }`,
            },
            { role: 'user', content: task.description },
        ];

        const planResponse = await invokeLLM({ messages: planMessages, maxTokens: 1000 });
        const planContent = planResponse.choices[0]?.message?.content;
        const planText = typeof planContent === 'string' ? planContent : '[]';

        this.recordAction('plan_generation', { task: task.description }, planText, true, 0);

        // Step 2: Execute the plan
        return this.executeDirect(
            `Execute this plan: ${planText}\n\nOriginal task: ${task.description}`,
            promptContext,
            chatContext
        );
    }

    /**
     * Reflective analysis strategy - analyzes before acting.
     */
    private async executeReflective(
        task: AgentTask,
        promptContext: PromptContext,
        chatContext: ChatContext
    ): Promise<AgentResult> {
        // Step 1: Analyze the task
        const analysisMessages: Message[] = [
            {
                role: 'system',
                content: `You are an analysis agent. Before taking action, analyze the task to identify:
1. Key requirements
2. Potential challenges
3. Best approach
4. Risk factors`,
            },
            { role: 'user', content: task.description },
        ];

        const analysisResponse = await invokeLLM({ messages: analysisMessages, maxTokens: 500 });
        const analysisContent = analysisResponse.choices[0]?.message?.content;
        const analysis = typeof analysisContent === 'string' ? analysisContent : '';

        this.recordAction('task_analysis', { task: task.description }, analysis, true, 0);

        // Step 2: Execute with analysis context
        return this.executeDirect(
            `Based on this analysis:\n${analysis}\n\nComplete the task: ${task.description}`,
            promptContext,
            chatContext
        );
    }

    /**
     * Multi-agent collaboration strategy - uses orchestrator.
     */
    private async executeMultiAgent(
        task: AgentTask,
        promptContext: PromptContext,
        chatContext: ChatContext
    ): Promise<AgentResult> {
        // Create a workflow with multiple agent steps
        const steps: WorkflowStepInput[] = [
            {
                id: 'analyze',
                agentType: 'pm',
                task: `Analyze requirements: ${task.description}`,
                inputs: { context: promptContext },
                dependsOn: [],
            },
            {
                id: 'implement',
                agentType: 'developer',
                task: `Implement solution: ${task.description}`,
                inputs: { context: promptContext },
                dependsOn: ['analyze'],
            },
            {
                id: 'review',
                agentType: 'qa',
                task: 'Review implementation for quality',
                inputs: {},
                dependsOn: ['implement'],
            },
        ];

        const workflow = this.orchestrator.createWorkflow(`Task: ${task.id}`, steps);
        
        // For now, fall back to direct execution
        // Full orchestration would require more infrastructure
        logger.info(`Created workflow ${workflow.id} with ${steps.length} steps`);
        
        return this.executeDirect(task.description, promptContext, chatContext);
    }

    /**
     * Builds context sources for intelligent context management.
     */
    private buildContextSources(context: ChatContext, memoryContext: string): ContextSource[] {
        const sources: ContextSource[] = [];

        if (context.currentFileContent) {
            sources.push({
                type: 'project_file',
                priority: 10,
                content: context.currentFileContent,
                tokens: countTokens(context.currentFileContent),
            });
        }

        if (memoryContext) {
            sources.push({
                type: 'session_log',
                priority: 8,
                content: memoryContext,
                tokens: countTokens(memoryContext),
            });
        }

        // Add recent messages as context
        const messagesText = context.recentMessages
            .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : ''}`)
            .join('\n');
        
        if (messagesText) {
            sources.push({
                type: 'session_log',
                priority: 7,
                content: messagesText,
                tokens: countTokens(messagesText),
            });
        }

        return sources;
    }

    /**
     * Records an action for tracking and learning.
     */
    private recordAction(
        toolName: string,
        input: Record<string, unknown>,
        output: unknown,
        success: boolean,
        durationMs: number
    ): void {
        this.actions.push({
            toolName,
            input,
            output,
            isSuccessful: success,
            durationMs,
            timestamp: new Date(),
        });
    }

    /**
     * Extracts modified files from actions.
     */
    private extractModifiedFiles(): string[] {
        const files: string[] = [];
        for (const action of this.actions) {
            if (action.toolName === 'write_file' && action.input.path) {
                files.push(action.input.path as string);
            }
        }
        return files;
    }
}

// Factory function for creating enhanced agents
export function createEnhancedAgent(config: EnhancedAgentConfig): EnhancedCloudChatAgent {
    return new EnhancedCloudChatAgent(config);
}
