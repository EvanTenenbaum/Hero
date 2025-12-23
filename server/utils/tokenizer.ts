/**
 * Tokenizer Utility Module
 * 
 * Provides accurate token counting using tiktoken for context management
 * in the HERO IDE agent system.
 */

import { Tiktoken, TiktokenEncoding, get_encoding } from 'tiktoken';
import { logger } from '../_core/logger';

/**
 * Defines the mapping of internal model names to the Tiktoken encoding names.
 */
type SupportedModel = 'gpt-4' | 'gpt-3.5-turbo' | 'gemini-pro' | 'default';

/**
 * A map to cache initialized Tiktoken encoders for performance.
 */
const tokenizerCache = new Map<string, Tiktoken>();

/**
 * Determines the appropriate Tiktoken encoding name based on the provided model identifier.
 * @param model The application's model identifier.
 * @returns The corresponding Tiktoken encoding name.
 */
function getEncodingName(model: SupportedModel): TiktokenEncoding {
    switch (model) {
        case 'gpt-4':
        case 'gpt-3.5-turbo':
        case 'gemini-pro':
            return 'cl100k_base';
        case 'default':
        default:
            return 'cl100k_base';
    }
}

/**
 * Retrieves or initializes the Tiktoken encoder for a given model.
 * Caches the result for subsequent calls.
 * @param model The application's model identifier.
 * @returns The initialized Tiktoken encoder, or null if initialization fails.
 */
function getTokenizer(model: SupportedModel): Tiktoken | null {
    const encodingName = getEncodingName(model);

    if (tokenizerCache.has(encodingName)) {
        return tokenizerCache.get(encodingName)!;
    }

    try {
        const tokenizer = get_encoding(encodingName);
        tokenizerCache.set(encodingName, tokenizer);
        return tokenizer;
    } catch (error) {
        logger.warn({ encoding: encodingName }, 'Failed to load encoding. Using estimation fallback.');
        return null;
    }
}

/**
 * Estimates the number of tokens in a string using a simple character-to-token ratio.
 * This is a fast, robust fallback when the full tokenizer is unavailable.
 *
 * @param text The input string.
 * @returns The estimated number of tokens.
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Accurately counts the number of tokens in a given text using the specified model's encoding.
 * Falls back to estimation if the tokenizer fails to load or process the text.
 *
 * @param text The input string to count tokens for.
 * @param model The model identifier to determine the correct encoding. Defaults to 'default'.
 * @returns The accurate token count, or an estimated count if an error occurs.
 */
export function countTokens(text: string, model: SupportedModel = 'default'): number {
    if (!text) {
        return 0;
    }

    try {
        const tokenizer = getTokenizer(model);
        if (!tokenizer) {
            return estimateTokens(text);
        }
        const tokens = tokenizer.encode(text);
        return tokens.length;
    } catch (error) {
        logger.error({ model }, 'Error counting tokens. Falling back to estimation.');
        return estimateTokens(text);
    }
}

/**
 * Truncates a string to ensure it does not exceed a specified maximum token limit.
 *
 * @param text The input string to potentially truncate.
 * @param maxTokens The maximum number of tokens allowed.
 * @param model The model identifier to use for tokenization. Defaults to 'default'.
 * @returns The truncated string, or the original string if it's within the limit.
 */
export function truncateToTokenLimit(text: string, maxTokens: number, model: SupportedModel = 'default'): string {
    if (!text || maxTokens <= 0) {
        return '';
    }

    try {
        const tokenizer = getTokenizer(model);
        if (!tokenizer) {
            // Fallback to character-based truncation
            const estimatedChars = maxTokens * 4;
            return text.length <= estimatedChars ? text : text.substring(0, estimatedChars) + '...';
        }

        const tokens = tokenizer.encode(text);

        if (tokens.length <= maxTokens) {
            return text;
        }

        // Truncate the token array
        const truncatedTokens = tokens.slice(0, maxTokens);

        // Decode the truncated tokens back into a string
        const decoder = new TextDecoder();
        const truncatedText = decoder.decode(tokenizer.decode(truncatedTokens));

        return truncatedText;

    } catch (error) {
        logger.error({ maxTokens }, 'Error truncating text. Using character-based fallback.');
        // Fallback to character-based truncation
        const estimatedChars = maxTokens * 4;
        return text.length <= estimatedChars ? text : text.substring(0, estimatedChars) + '...';
    }
}
