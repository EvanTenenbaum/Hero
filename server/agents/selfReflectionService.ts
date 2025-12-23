/**
 * Self-Reflection Service
 * 
 * Enables post-execution analysis of agent actions, error pattern recognition,
 * success pattern identification, and automatic prompt improvement suggestions.
 */

import { z } from 'zod';
import { invokeLLM } from '../_core/llm';
import { logger } from '../_core/logger';

// --- Input Validation Schemas ---

const AgentActionSchema = z.object({
    toolName: z.string().min(1).max(100),
    input: z.record(z.string(), z.any()),
    output: z.unknown(),
    isSuccessful: z.boolean(),
    error: z.string().max(10000).optional(),
    durationMs: z.number().nonnegative(),
    timestamp: z.date(),
});

const ExecutionResultSchema = z.object({
    taskId: z.string().min(1).max(128),
    taskDescription: z.string().min(1).max(50000),
    actions: z.array(AgentActionSchema).max(1000),
    finalOutput: z.unknown(),
    isSuccessful: z.boolean(),
    totalDurationMs: z.number().nonnegative(),
    errorMessage: z.string().max(10000).optional(),
    timestamp: z.date(),
});

// --- Type Definitions ---

/**
 * Represents a single action taken by the agent during execution.
 */
export interface AgentAction {
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
    isSuccessful: boolean;
    error?: string;
    durationMs: number;
    timestamp: Date;
}

/**
 * Represents the complete result of an agent execution.
 */
export interface ExecutionResult {
    taskId: string;
    taskDescription: string;
    actions: AgentAction[];
    finalOutput: unknown;
    isSuccessful: boolean;
    totalDurationMs: number;
    errorMessage?: string;
    timestamp: Date;
}

/**
 * Represents a stored reflection for future reference.
 */
export interface StoredReflection {
    id: string;
    taskId: string;
    analysis: ReflectionAnalysis;
    timestamp: Date;
}

/**
 * The detailed analysis generated from reflecting on an execution.
 */
export interface ReflectionAnalysis {
    taskId: string;
    summary: string;
    rootCauseIfFailed?: string;
    successFactors?: string[];
    inefficiencies: string[];
    suggestedImprovements: string[];
    patternCategory: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
    confidenceScore: number;
    metaLearningInsight: string;
}

/**
 * Represents a suggestion for improving the agent's behavior.
 */
export interface ImprovementSuggestion {
    type: 'PROMPT' | 'TOOL_USAGE' | 'STRATEGY' | 'CONTEXT';
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    suggestedChange: string;
}

// --- Pattern Matcher ---

/**
 * Identifies recurring patterns in execution history.
 */
export class PatternMatcher {
    private reflectionMemory: StoredReflection[] = [];

    /**
     * Stores a reflection for future pattern matching.
     */
    public storeReflection(reflection: StoredReflection): void {
        this.reflectionMemory.push(reflection);
        // Keep only last 100 reflections
        if (this.reflectionMemory.length > 100) {
            this.reflectionMemory = this.reflectionMemory.slice(-100);
        }
    }

    /**
     * Retrieves all stored reflections.
     */
    public getReflections(): StoredReflection[] {
        return [...this.reflectionMemory];
    }

    /**
     * Identifies recurring error patterns from past reflections.
     */
    public async identifyRecurringErrorPatterns(limit: number = 5): Promise<string[]> {
        const failedReflections = this.reflectionMemory
            .filter(r => r.analysis.patternCategory === 'FAILURE')
            .slice(-limit);

        const errorPatterns: Map<string, number> = new Map();
        
        for (const reflection of failedReflections) {
            const rootCause = reflection.analysis.rootCauseIfFailed;
            if (rootCause) {
                const count = errorPatterns.get(rootCause) || 0;
                errorPatterns.set(rootCause, count + 1);
            }
        }

        return Array.from(errorPatterns.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([pattern]) => pattern);
    }

    /**
     * Identifies recurring success patterns from past reflections.
     */
    public async identifyRecurringSuccessPatterns(limit: number = 5): Promise<string[]> {
        const successfulReflections = this.reflectionMemory
            .filter(r => r.analysis.patternCategory === 'SUCCESS')
            .slice(-limit);

        const successPatterns: Map<string, number> = new Map();
        
        for (const reflection of successfulReflections) {
            const factors = reflection.analysis.successFactors || [];
            for (const factor of factors) {
                const count = successPatterns.get(factor) || 0;
                successPatterns.set(factor, count + 1);
            }
        }

        return Array.from(successPatterns.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([pattern]) => pattern);
    }

    /**
     * Matches the current execution against known patterns.
     */
    public matchAgainstKnownPatterns(result: ExecutionResult): {
        matchedPattern: string | null;
        confidence: number;
        recommendation: string;
    } {
        const recentReflections = this.reflectionMemory.slice(-20);
        
        // Simple keyword matching for demonstration
        const taskKeywords = result.taskDescription.toLowerCase().split(' ');
        
        for (const reflection of recentReflections) {
            const storedKeywords = reflection.analysis.summary.toLowerCase().split(' ');
            const overlap = taskKeywords.filter(k => storedKeywords.includes(k)).length;
            const similarity = overlap / Math.max(taskKeywords.length, storedKeywords.length);
            
            if (similarity > 0.5) {
                return {
                    matchedPattern: reflection.analysis.summary,
                    confidence: similarity,
                    recommendation: reflection.analysis.patternCategory === 'SUCCESS'
                        ? `Follow the successful strategy: ${reflection.analysis.successFactors?.join(', ')}`
                        : `Avoid the failure pattern: ${reflection.analysis.rootCauseIfFailed}`,
                };
            }
        }

        return {
            matchedPattern: null,
            confidence: 0,
            recommendation: 'No matching pattern found. Proceed with standard approach.',
        };
    }
}

// --- Improvement Suggester ---

/**
 * Generates improvement suggestions based on execution results and patterns.
 */
export class ImprovementSuggester {
    private patternMatcher: PatternMatcher;

    constructor(patternMatcher: PatternMatcher) {
        this.patternMatcher = patternMatcher;
    }

    /**
     * Generates improvement suggestions based on an execution result.
     */
    public async suggestImprovements(executionResult: ExecutionResult): Promise<ImprovementSuggestion[]> {
        const suggestions: ImprovementSuggestion[] = [];

        // 1. Suggestions based on failure
        if (!executionResult.isSuccessful && executionResult.errorMessage) {
            suggestions.push({
                type: 'PROMPT',
                description: 'Add explicit error handling guidance to the system prompt.',
                priority: 'HIGH',
                suggestedChange: `Include instruction: "When encountering errors similar to '${executionResult.errorMessage.substring(0, 100)}', try alternative approaches before failing."`,
            });
        }

        // 2. Suggestions based on inefficiency (long duration)
        const avgActionDuration = executionResult.totalDurationMs / Math.max(executionResult.actions.length, 1);
        if (avgActionDuration > 5000) {
            suggestions.push({
                type: 'STRATEGY',
                description: 'Optimize the execution strategy for faster completion.',
                priority: 'MEDIUM',
                suggestedChange: 'Consider batching similar operations or using more efficient tool combinations.',
            });
        }

        // 3. Suggestions based on recurring patterns
        try {
            const recurringErrors = await this.patternMatcher.identifyRecurringErrorPatterns(10);
            if (recurringErrors.length > 0) {
                suggestions.push({
                    type: 'PROMPT',
                    description: `Address the most common recurring error pattern.`,
                    priority: 'HIGH',
                    suggestedChange: `Update system instructions to guard against: ${recurringErrors[0]}`,
                });
            }
        } catch (error) {
            logger.warn({ error }, 'Error identifying recurring patterns');
        }

        // 4. Suggestions based on tool usage
        const failedToolCalls = executionResult.actions.filter(a => !a.isSuccessful);
        if (failedToolCalls.length > 0) {
            const failedTool = failedToolCalls[0];
            suggestions.push({
                type: 'TOOL_USAGE',
                description: `Improve usage instructions for tool: ${failedTool.toolName}`,
                priority: 'MEDIUM',
                suggestedChange: `Add usage examples to prevent errors like: ${failedTool.error}`,
            });
        }

        return suggestions;
    }
}

// --- Reflection Analyzer ---

/**
 * Analyzes execution results to generate detailed reflections.
 */
export class ReflectionAnalyzer {
    private patternMatcher: PatternMatcher;

    constructor(patternMatcher: PatternMatcher) {
        this.patternMatcher = patternMatcher;
    }

    /**
     * Generates a detailed analysis of the execution result.
     */
    public async analyze(result: ExecutionResult): Promise<ReflectionAnalysis> {
        logger.info(`Starting reflection analysis for task ID: ${result.taskId}`);

        const prompt = this.buildAnalysisPrompt(result);

        try {
            const llmResponse = await invokeLLM({
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert AI agent analyst. Analyze the execution result and provide a structured reflection.
Output your analysis as a JSON object with the following structure:
{
  "summary": "Brief summary of what happened",
  "rootCauseIfFailed": "Root cause if the task failed, or null",
  "successFactors": ["List of factors that contributed to success"],
  "inefficiencies": ["List of inefficiencies observed"],
  "suggestedImprovements": ["List of suggested improvements"],
  "patternCategory": "SUCCESS or FAILURE or PARTIAL",
  "confidenceScore": 0.0 to 1.0,
  "metaLearningInsight": "Key insight for future executions"
}`
                    },
                    { role: 'user', content: prompt }
                ],
            });

            const content = llmResponse.choices[0]?.message?.content;
            const responseText = typeof content === 'string' ? content : '';
            
            // Parse the JSON response
            const analysis = this.parseAnalysisResponse(responseText, result);

            // Enhance with meta-learning
            await this.enhanceAnalysisWithMetaLearning(analysis);

            return analysis;

        } catch (error) {
            logger.error({ error }, `Failed to generate analysis for task ${result.taskId}`);
            return this.createFallbackAnalysis(result);
        }
    }

    /**
     * Parses the LLM response into a ReflectionAnalysis object.
     */
    private parseAnalysisResponse(response: string, result: ExecutionResult): ReflectionAnalysis {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    taskId: result.taskId,
                    summary: parsed.summary || 'Analysis completed',
                    rootCauseIfFailed: parsed.rootCauseIfFailed,
                    successFactors: parsed.successFactors || [],
                    inefficiencies: parsed.inefficiencies || [],
                    suggestedImprovements: parsed.suggestedImprovements || [],
                    patternCategory: parsed.patternCategory || (result.isSuccessful ? 'SUCCESS' : 'FAILURE'),
                    confidenceScore: parsed.confidenceScore || 0.5,
                    metaLearningInsight: parsed.metaLearningInsight || '',
                };
            }
        } catch (e) {
            logger.warn({ error: e }, 'Failed to parse analysis response');
        }
        
        return this.createFallbackAnalysis(result);
    }

    /**
     * Enhances analysis with meta-learning insights from past reflections.
     */
    private async enhanceAnalysisWithMetaLearning(analysis: ReflectionAnalysis): Promise<void> {
        try {
            const recurringErrors = await this.patternMatcher.identifyRecurringErrorPatterns(10);
            const recurringSuccesses = await this.patternMatcher.identifyRecurringSuccessPatterns(10);

            if (recurringErrors.length > 0) {
                analysis.metaLearningInsight += ` | Recurring error pattern: ${recurringErrors[0]}`;
            }
            if (recurringSuccesses.length > 0) {
                analysis.metaLearningInsight += ` | Reliable strategy: ${recurringSuccesses[0]}`;
            }
        } catch (error) {
            logger.warn({ error }, 'Could not enhance analysis with meta-learning');
        }
    }

    /**
     * Builds the analysis prompt for the LLM.
     */
    private buildAnalysisPrompt(result: ExecutionResult): string {
        const actionLog = result.actions.map(a =>
            `- Tool: ${a.toolName}, Success: ${a.isSuccessful}, Duration: ${a.durationMs}ms${a.error ? `, Error: ${a.error}` : ''}`
        ).join('\n');

        return `Analyze the following agent execution:

Task ID: ${result.taskId}
Task Description: ${result.taskDescription}
Overall Success: ${result.isSuccessful}
Total Duration: ${result.totalDurationMs}ms
${result.errorMessage ? `Error: ${result.errorMessage}` : ''}

Actions Taken:
${actionLog}

Provide a detailed reflection analysis.`;
    }

    /**
     * Creates a fallback analysis when LLM analysis fails.
     */
    private createFallbackAnalysis(result: ExecutionResult): ReflectionAnalysis {
        return {
            taskId: result.taskId,
            summary: result.isSuccessful 
                ? 'Task completed successfully' 
                : `Task failed: ${result.errorMessage || 'Unknown error'}`,
            rootCauseIfFailed: result.isSuccessful ? undefined : result.errorMessage,
            successFactors: result.isSuccessful ? ['Task completed without errors'] : [],
            inefficiencies: [],
            suggestedImprovements: result.isSuccessful ? [] : ['Review error handling'],
            patternCategory: result.isSuccessful ? 'SUCCESS' : 'FAILURE',
            confidenceScore: 0.5,
            metaLearningInsight: 'Fallback analysis - LLM unavailable',
        };
    }
}

// --- Self-Reflection Service ---

/**
 * Main service for agent self-reflection capabilities.
 */
export class SelfReflectionService {
    private patternMatcher: PatternMatcher;
    private analyzer: ReflectionAnalyzer;
    private suggester: ImprovementSuggester;

    constructor() {
        this.patternMatcher = new PatternMatcher();
        this.analyzer = new ReflectionAnalyzer(this.patternMatcher);
        this.suggester = new ImprovementSuggester(this.patternMatcher);
    }

    /**
     * Performs a complete reflection on an execution result.
     */
    public async reflect(result: ExecutionResult): Promise<{
        analysis: ReflectionAnalysis;
        suggestions: ImprovementSuggestion[];
        patternMatch: ReturnType<PatternMatcher['matchAgainstKnownPatterns']>;
    }> {
        logger.info(`Performing reflection for task: ${result.taskId}`);

        // 1. Check for matching patterns
        const patternMatch = this.patternMatcher.matchAgainstKnownPatterns(result);

        // 2. Analyze the execution
        const analysis = await this.analyzer.analyze(result);

        // 3. Generate improvement suggestions
        const suggestions = await this.suggester.suggestImprovements(result);

        // 4. Store the reflection for future pattern matching
        const storedReflection: StoredReflection = {
            id: `reflection-${Date.now()}`,
            taskId: result.taskId,
            analysis,
            timestamp: new Date(),
        };
        this.patternMatcher.storeReflection(storedReflection);

        return { analysis, suggestions, patternMatch };
    }

    /**
     * Gets insights from past reflections.
     */
    public async getMetaInsights(): Promise<{
        totalReflections: number;
        successRate: number;
        topErrorPatterns: string[];
        topSuccessStrategies: string[];
    }> {
        const reflections = this.patternMatcher.getReflections();
        const successCount = reflections.filter(r => r.analysis.patternCategory === 'SUCCESS').length;

        return {
            totalReflections: reflections.length,
            successRate: reflections.length > 0 ? successCount / reflections.length : 0,
            topErrorPatterns: await this.patternMatcher.identifyRecurringErrorPatterns(5),
            topSuccessStrategies: await this.patternMatcher.identifyRecurringSuccessPatterns(5),
        };
    }
}

// Export singleton instance
export const selfReflectionService = new SelfReflectionService();
