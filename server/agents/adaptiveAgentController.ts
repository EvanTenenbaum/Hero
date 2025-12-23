/**
 * Adaptive Agent Controller
 * 
 * Dynamically adjusts agent behavior based on task complexity,
 * selects appropriate strategies, and manages fallback mechanisms.
 */

import { z } from 'zod';
import { invokeLLM } from '../_core/llm';
import { logger } from '../_core/logger';

// --- Input Validation Schemas ---

const AgentTaskSchema = z.object({
    id: z.string().min(1).max(128),
    description: z.string().min(1).max(50000),
    type: z.string().min(1).max(100),
    context: z.string().max(100000).optional(),
});

// --- Enums and Types ---

/**
 * Defines the possible complexity levels of a task.
 */
export enum TaskComplexity {
    Simple = 'SIMPLE',
    Moderate = 'MODERATE',
    Complex = 'COMPLEX',
    Critical = 'CRITICAL',
}

/**
 * Defines the available execution strategies for the agent.
 */
export enum AgentStrategy {
    DirectExecution = 'DIRECT_EXECUTION',
    PlanAndExecute = 'PLAN_AND_EXECUTE',
    ReflectiveAnalysis = 'REFLECTIVE_ANALYSIS',
    MultiAgentCollaboration = 'MULTI_AGENT_COLLABORATION',
}

/**
 * Represents the input structure for any task.
 */
export interface AgentTask {
    id: string;
    description: string;
    type: string;
    context?: string;
}

/**
 * Represents the current state and metrics of the agent.
 */
export interface AgentMetrics {
    confidence: number;
    attempts: number;
    currentStrategy: AgentStrategy;
    complexity: TaskComplexity;
}

/**
 * Represents the result of an agent's execution attempt.
 */
export interface AgentResult {
    output: string;
    success: boolean;
    message: string;
}

// --- Task Complexity Analyzer ---

/**
 * Analyzes tasks to determine their complexity level.
 */
export class TaskComplexityAnalyzer {
    /**
     * Estimates the complexity of a given task.
     */
    public async analyze(task: AgentTask): Promise<TaskComplexity> {
        // Validate input
        const validatedTask = AgentTaskSchema.parse(task);
        const prompt = `Analyze the following task and respond with ONLY one word: SIMPLE, MODERATE, COMPLEX, or CRITICAL.

Task Type: ${task.type}
Description: ${task.description}
Context: ${task.context ? task.context.substring(0, 500) : 'None'}

Complexity:`;

        try {
            const llmResponse = await invokeLLM({
                messages: [
                    { role: 'system', content: 'You are a task complexity analyzer. Respond with only one word.' },
                    { role: 'user', content: prompt }
                ],
                maxTokens: 10,
            });

            const content = llmResponse.choices[0]?.message?.content;
            const complexityString = (typeof content === 'string' ? content : '').trim().toUpperCase();

            if (Object.values(TaskComplexity).includes(complexityString as TaskComplexity)) {
                return complexityString as TaskComplexity;
            }

            logger.warn(`Unknown complexity: ${complexityString}. Defaulting to MODERATE.`);
            return TaskComplexity.Moderate;

        } catch (error) {
            logger.error({ error }, 'Error analyzing task complexity');
            return TaskComplexity.Moderate;
        }
    }

    /**
     * Quick heuristic-based complexity estimation (no LLM call).
     */
    public quickEstimate(task: AgentTask): TaskComplexity {
        const description = task.description.toLowerCase();
        const contextLength = task.context?.length || 0;

        // Simple heuristics
        if (description.includes('simple') || description.includes('basic') || contextLength < 500) {
            return TaskComplexity.Simple;
        }
        if (description.includes('complex') || description.includes('refactor') || contextLength > 5000) {
            return TaskComplexity.Complex;
        }
        if (description.includes('critical') || description.includes('security') || description.includes('production')) {
            return TaskComplexity.Critical;
        }

        return TaskComplexity.Moderate;
    }
}

// --- Strategy Selector ---

/**
 * Selects the appropriate execution strategy based on task characteristics.
 */
export class StrategySelector {
    private strategyMap: Map<TaskComplexity, AgentStrategy[]> = new Map([
        [TaskComplexity.Simple, [AgentStrategy.DirectExecution]],
        [TaskComplexity.Moderate, [AgentStrategy.DirectExecution, AgentStrategy.PlanAndExecute]],
        [TaskComplexity.Complex, [AgentStrategy.PlanAndExecute, AgentStrategy.ReflectiveAnalysis]],
        [TaskComplexity.Critical, [AgentStrategy.ReflectiveAnalysis, AgentStrategy.MultiAgentCollaboration]],
    ]);

    /**
     * Selects the primary strategy for a given complexity level.
     */
    public selectStrategy(complexity: TaskComplexity): AgentStrategy {
        const strategies = this.strategyMap.get(complexity) || [AgentStrategy.DirectExecution];
        return strategies[0];
    }

    /**
     * Gets fallback strategies for a given complexity level.
     */
    public getFallbackStrategies(complexity: TaskComplexity): AgentStrategy[] {
        const strategies = this.strategyMap.get(complexity) || [AgentStrategy.DirectExecution];
        return strategies.slice(1);
    }

    /**
     * Determines if a strategy escalation is needed based on metrics.
     */
    public shouldEscalate(metrics: AgentMetrics): boolean {
        return metrics.confidence < 0.3 || metrics.attempts >= 3;
    }
}

// --- Confidence Tracker ---

/**
 * Tracks and updates agent confidence during execution.
 */
export class ConfidenceTracker {
    private baseConfidence: number = 0.7;
    private confidenceHistory: number[] = [];

    /**
     * Calculates initial confidence based on task complexity.
     */
    public getInitialConfidence(complexity: TaskComplexity): number {
        const complexityModifiers: Record<TaskComplexity, number> = {
            [TaskComplexity.Simple]: 0.9,
            [TaskComplexity.Moderate]: 0.7,
            [TaskComplexity.Complex]: 0.5,
            [TaskComplexity.Critical]: 0.3,
        };
        return complexityModifiers[complexity] || this.baseConfidence;
    }

    /**
     * Updates confidence based on execution result.
     */
    public updateConfidence(currentConfidence: number, success: boolean): number {
        const adjustment = success ? 0.1 : -0.2;
        const newConfidence = Math.max(0, Math.min(1, currentConfidence + adjustment));
        this.confidenceHistory.push(newConfidence);
        return newConfidence;
    }

    /**
     * Gets the confidence trend (positive = improving, negative = declining).
     */
    public getConfidenceTrend(): number {
        if (this.confidenceHistory.length < 2) return 0;
        const recent = this.confidenceHistory.slice(-5);
        const first = recent[0];
        const last = recent[recent.length - 1];
        return last - first;
    }

    /**
     * Resets the confidence tracker for a new task.
     */
    public reset(): void {
        this.confidenceHistory = [];
    }
}

// --- Fallback Manager ---

/**
 * Manages fallback strategies when primary approaches fail.
 */
export class FallbackManager {
    private maxAttempts: number = 3;
    private humanEscalationThreshold: number = 0.2;

    /**
     * Determines the next action when an attempt fails.
     */
    public getNextAction(metrics: AgentMetrics, availableFallbacks: AgentStrategy[]): {
        action: 'retry' | 'escalate_strategy' | 'escalate_human' | 'abort';
        nextStrategy?: AgentStrategy;
        reason: string;
    } {
        // Check if we should escalate to human
        if (metrics.confidence < this.humanEscalationThreshold) {
            return {
                action: 'escalate_human',
                reason: `Confidence too low (${metrics.confidence.toFixed(2)}). Human intervention recommended.`,
            };
        }

        // Check if we have fallback strategies
        if (availableFallbacks.length > 0 && metrics.attempts < this.maxAttempts) {
            return {
                action: 'escalate_strategy',
                nextStrategy: availableFallbacks[0],
                reason: `Attempting fallback strategy: ${availableFallbacks[0]}`,
            };
        }

        // Check if we can retry with current strategy
        if (metrics.attempts < this.maxAttempts) {
            return {
                action: 'retry',
                reason: `Retrying with current strategy. Attempt ${metrics.attempts + 1}/${this.maxAttempts}`,
            };
        }

        // All options exhausted
        return {
            action: 'abort',
            reason: `Max attempts (${this.maxAttempts}) reached. Task cannot be completed automatically.`,
        };
    }

    /**
     * Checks if human escalation is required.
     */
    public requiresHumanEscalation(metrics: AgentMetrics): boolean {
        return metrics.confidence < this.humanEscalationThreshold;
    }
}

// --- Adaptive Agent Controller ---

/**
 * Main controller that orchestrates adaptive agent behavior.
 */
export class AdaptiveAgentController {
    private complexityAnalyzer: TaskComplexityAnalyzer;
    private strategySelector: StrategySelector;
    private confidenceTracker: ConfidenceTracker;
    private fallbackManager: FallbackManager;

    constructor() {
        this.complexityAnalyzer = new TaskComplexityAnalyzer();
        this.strategySelector = new StrategySelector();
        this.confidenceTracker = new ConfidenceTracker();
        this.fallbackManager = new FallbackManager();
    }

    /**
     * Executes a task with adaptive behavior.
     */
    public async executeTask(
        task: AgentTask,
        executor: (task: AgentTask, strategy: AgentStrategy) => Promise<AgentResult>
    ): Promise<{
        result: AgentResult;
        metrics: AgentMetrics;
        executionPath: string[];
    }> {
        logger.info(`Starting adaptive execution for task: ${task.id}`);
        this.confidenceTracker.reset();

        // 1. Analyze task complexity
        const complexity = await this.complexityAnalyzer.analyze(task);
        logger.info(`Task complexity: ${complexity}`);

        // 2. Select initial strategy
        let currentStrategy = this.strategySelector.selectStrategy(complexity);
        const fallbackStrategies = this.strategySelector.getFallbackStrategies(complexity);
        const executionPath: string[] = [currentStrategy];

        // 3. Initialize metrics
        const metrics: AgentMetrics = {
            confidence: this.confidenceTracker.getInitialConfidence(complexity),
            attempts: 0,
            currentStrategy,
            complexity,
        };

        // 4. Execution loop
        let result: AgentResult = { output: '', success: false, message: 'Not executed' };
        let remainingFallbacks = [...fallbackStrategies];

        while (true) {
            metrics.attempts++;
            logger.info(`Attempt ${metrics.attempts} with strategy: ${currentStrategy}`);

            try {
                result = await executor(task, currentStrategy);
                metrics.confidence = this.confidenceTracker.updateConfidence(metrics.confidence, result.success);

                if (result.success) {
                    logger.info(`Task completed successfully with strategy: ${currentStrategy}`);
                    break;
                }
            } catch (error) {
                logger.error({ error }, `Execution error with strategy ${currentStrategy}`);
                result = {
                    output: '',
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
                metrics.confidence = this.confidenceTracker.updateConfidence(metrics.confidence, false);
            }

            // Determine next action
            const nextAction = this.fallbackManager.getNextAction(metrics, remainingFallbacks);
            logger.info(`Next action: ${nextAction.action} - ${nextAction.reason}`);

            if (nextAction.action === 'escalate_strategy' && nextAction.nextStrategy) {
                currentStrategy = nextAction.nextStrategy;
                metrics.currentStrategy = currentStrategy;
                remainingFallbacks = remainingFallbacks.slice(1);
                executionPath.push(currentStrategy);
            } else if (nextAction.action === 'retry') {
                // Continue with current strategy
            } else {
                // abort or escalate_human
                result.message = nextAction.reason;
                break;
            }
        }

        return { result, metrics, executionPath };
    }

    /**
     * Gets a quick complexity estimate without LLM call.
     */
    public quickAnalyze(task: AgentTask): {
        complexity: TaskComplexity;
        recommendedStrategy: AgentStrategy;
        initialConfidence: number;
    } {
        const complexity = this.complexityAnalyzer.quickEstimate(task);
        return {
            complexity,
            recommendedStrategy: this.strategySelector.selectStrategy(complexity),
            initialConfidence: this.confidenceTracker.getInitialConfidence(complexity),
        };
    }
}

// Export singleton instance
export const adaptiveAgentController = new AdaptiveAgentController();
