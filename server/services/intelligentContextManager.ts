/**
 * Intelligent Context Manager
 * 
 * Manages the selection, scoring, and truncation of context sources
 * to fit within a predefined token budget for LLM interactions.
 */

import { invokeLLM } from '../_core/llm';
import { logger } from '../_core/logger';

/**
 * Represents a chat message.
 */
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}

/**
 * Defines a single piece of context data.
 */
export interface ContextSource {
    /** The type of context (e.g., 'file', 'documentation', 'chat_history'). */
    type: string;
    /** Importance level (higher is better). Used for initial sorting. */
    priority: number;
    /** The actual content string. */
    content: string;
    /** Pre-calculated number of tokens in the content. */
    tokens: number;
    /** Optional additional data. */
    metadata?: Record<string, unknown>;
}

/**
 * Defines the token budget for context building.
 */
export interface ContextBudget {
    /** Total maximum tokens allowed for the entire prompt. */
    maxTokens: number;
    /** Tokens reserved for the LLM's response. */
    reservedForResponse: number;
    /** Tokens reserved for tool definitions or system instructions. */
    reservedForTools: number;
    /** Calculated available tokens for context (maxTokens - reserved). */
    availableForContext: number;
}

/**
 * Defines the structure for the final constructed prompt context components.
 */
export interface PromptContext {
    /** Context related to the current project structure or state. */
    project?: string;
    /** Context related to the user's profile or preferences. */
    user?: string;
    /** Context related to the current session or environment. */
    session?: string;
    /** Context related to the specific task being performed. */
    task?: string;
}

/**
 * The result of the context building process.
 */
export interface BuiltContext {
    /** Structured components of the final prompt. */
    prompt: PromptContext;
    /** The sources that were successfully included (potentially truncated). */
    sources: ContextSource[];
    /** The total number of tokens used by the included context. */
    totalTokens: number;
    /** True if the context had to be truncated due to budget constraints. */
    truncated: boolean;
    /** Sources that were included but had their content truncated. */
    truncatedSources: ContextSource[];
}

/**
 * Manages the selection, scoring, and truncation of context sources
 * to fit within a predefined token budget for LLM interactions.
 */
export class IntelligentContextManager {

    private readonly DEFAULT_MODEL = 'gpt-4o';

    /**
     * Counts tokens in text using estimation.
     * @param text The string to count tokens for.
     * @param _model The LLM model name (unused, for API compatibility).
     * @returns The estimated number of tokens.
     */
    public countTokens(text: string, _model: string = this.DEFAULT_MODEL): number {
        if (!text) return 0;
        // Use a slightly more accurate estimation than the quick one
        return Math.ceil(text.length / 3.5);
    }

    /**
     * Provides a quick, rough estimation of token count.
     * @param text The string to estimate tokens for.
     * @returns The estimated number of tokens (length / 4).
     */
    public estimateTokens(text: string): number {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    /**
     * Scores the relevance of a content string to a given query.
     * Uses a simple keyword-based approach (0 to 1).
     * @param content The context content.
     * @param query The user's query or task description.
     * @returns A relevance score between 0 and 1.
     */
    public scoreRelevance(content: string, query: string): number {
        if (!content || !query) return 0;

        const contentLower = content.toLowerCase();
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        if (queryWords.length === 0) return 0.5;

        let matchCount = 0;
        for (const word of queryWords) {
            if (contentLower.includes(word)) {
                matchCount++;
            }
        }

        const score = matchCount / queryWords.length;
        return Math.min(1, score * score);
    }

    /**
     * Truncates a string to fit within a specified token limit.
     * @param text The text to truncate.
     * @param maxTokens The maximum allowed token count.
     * @returns The truncated string.
     */
    public truncateToTokenLimit(text: string, maxTokens: number): string {
        if (this.countTokens(text) <= maxTokens) {
            return text;
        }

        const estimatedCharsPerToken = 3.5;
        const targetLength = Math.floor(maxTokens * estimatedCharsPerToken);
        const ellipsis = '... [TRUNCATED]';

        let truncatedText = text.substring(0, targetLength);

        while (this.countTokens(truncatedText + ellipsis) > maxTokens && truncatedText.length > 0) {
            truncatedText = truncatedText.substring(0, truncatedText.length - 10);
        }

        return truncatedText.trim() + ellipsis;
    }

    /**
     * Summarizes a conversation history using an LLM to fit within a token limit.
     * @param messages The array of chat messages.
     * @param maxTokens The maximum tokens allowed for the summary.
     * @returns A promise that resolves to the summarized conversation string.
     */
    public async summarizeConversation(messages: Message[], maxTokens: number): Promise<string> {
        if (messages.length === 0) {
            return '';
        }

        const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
        const currentTokens = this.countTokens(conversationText);

        if (currentTokens <= maxTokens) {
            return conversationText;
        }

        const systemPrompt = `You are an expert summarizer. Condense the following conversation history into a concise summary that captures the main topics, decisions, and outstanding questions. The summary must not exceed ${maxTokens} tokens.`;

        try {
            const result = await invokeLLM({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: conversationText },
                ],
            });

            const content = result.choices[0]?.message?.content;
            const summary = typeof content === 'string' ? content : '';
            logger.info(`[IntelligentContextManager] Conversation summarized. Original tokens: ${currentTokens}, Summary tokens: ${this.countTokens(summary)}`);
            return summary;
        } catch (error) {
            logger.error({ error }, '[IntelligentContextManager] Failed to summarize conversation');
            return this.truncateToTokenLimit(conversationText, maxTokens);
        }
    }

    /**
     * Builds the optimal context by scoring, sorting, and truncating sources
     * to fit within the given token budget.
     *
     * @param query The user's current query or task.
     * @param sources The list of available context sources.
     * @param budget The token budget constraints.
     * @returns The constructed context object.
     */
    public buildOptimalContext(
        query: string,
        sources: ContextSource[],
        budget: ContextBudget
    ): BuiltContext {
        let currentTokens = 0;
        const includedSources: ContextSource[] = [];
        const truncatedSources: ContextSource[] = [];
        let truncated = false;

        const availableBudget = budget.availableForContext;

        if (availableBudget <= 0) {
            logger.warn('[IntelligentContextManager] Context budget is zero or negative.');
            return {
                prompt: {},
                sources: [],
                totalTokens: 0,
                truncated: true,
                truncatedSources: [],
            };
        }

        // 1. Score and augment sources
        const scoredSources = sources.map(source => {
            const relevance = this.scoreRelevance(source.content, query);
            const combinedScore = (source.priority * 0.7) + (relevance * 0.3);
            return {
                ...source,
                relevanceScore: relevance,
                combinedScore: combinedScore,
            };
        });

        // 2. Sort by combined score (descending)
        scoredSources.sort((a, b) => b.combinedScore - a.combinedScore);

        // 3. Include sources until budget is exhausted
        for (const source of scoredSources) {
            const remainingBudget = availableBudget - currentTokens;

            if (remainingBudget <= 0) {
                truncated = true;
                break;
            }

            if (source.tokens <= remainingBudget) {
                includedSources.push(source);
                currentTokens += source.tokens;
            } else {
                const truncatedContent = this.truncateToTokenLimit(source.content, remainingBudget);
                const truncatedTokens = this.countTokens(truncatedContent);

                if (truncatedTokens > 0) {
                    const truncatedSource: ContextSource = {
                        ...source,
                        content: truncatedContent,
                        tokens: truncatedTokens,
                        metadata: {
                            ...source.metadata,
                            originalTokens: source.tokens,
                            isTruncated: true,
                        }
                    };
                    includedSources.push(truncatedSource);
                    truncatedSources.push(truncatedSource);
                    currentTokens += truncatedTokens;
                    truncated = true;
                }
                break;
            }
        }

        // 4. Structure the final prompt context
        const prompt: PromptContext = {};
        const contextMap = new Map<string, string[]>();

        for (const source of includedSources) {
            if (!contextMap.has(source.type)) {
                contextMap.set(source.type, []);
            }
            contextMap.get(source.type)!.push(source.content);
        }

        if (contextMap.has('project_file')) {
            prompt.project = contextMap.get('project_file')!.join('\n---\n');
        }
        if (contextMap.has('user_preference')) {
            prompt.user = contextMap.get('user_preference')!.join('\n---\n');
        }
        if (contextMap.has('session_log')) {
            prompt.session = contextMap.get('session_log')!.join('\n---\n');
        }
        if (contextMap.has('task_description')) {
            prompt.task = contextMap.get('task_description')!.join('\n---\n');
        }

        logger.info(`[IntelligentContextManager] Context built. Total tokens: ${currentTokens}/${availableBudget}. Truncated: ${truncated}. Sources: ${includedSources.length}`);

        return {
            prompt,
            sources: includedSources,
            totalTokens: currentTokens,
            truncated,
            truncatedSources,
        };
    }
}

// Export singleton instance
export const intelligentContextManager = new IntelligentContextManager();
