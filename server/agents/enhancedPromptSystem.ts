import { countTokens, truncateToTokenLimit } from '../utils/tokenizer';
import { logger } from '../_core/logger';

/**
 * @file server/agents/enhancedPromptSystem.ts
 * @description Enhanced prompt system for the HERO IDE agent, dynamically constructing
 *              high-quality prompts based on task, context, and state.
 */

// --- Configuration and Constants ---

/**
 * Defines the maximum token limit for different LLM models.
 * This is used for dynamic context window management.
 */
const LLM_TOKEN_LIMITS = {
    'GPT-4-Turbo': 128000,
    'GPT-4o': 128000,
    'Gemini-2.5-Pro': 1000000,
    'Claude-3-Opus': 200000,
    'Default': 8000,
};

/**
 * Defines the minimum required tokens reserved for the LLM's response.
 */
const RESPONSE_TOKEN_RESERVATION = 4096;

// --- Core Interfaces ---

/**
 * Represents the structure of a prompt template with defined placeholders.
 */
export interface PromptTemplate {
    /** A unique identifier for the template. */
    id: string;
    /** The core instruction or system message. */
    systemInstruction: string;
    /** The main user query template, containing placeholders like {{TASK_DESCRIPTION}}. */
    userQueryTemplate: string;
    /** Optional section for few-shot examples. */
    fewShotExamples?: string;
    /** Optional section for chain-of-thought instructions. */
    chainOfThoughtInstruction?: string;
    /** Expected output format instructions (e.g., JSON schema). */
    outputFormatInstruction: string;
}

/**
 * Defines the structure for dynamic context data injected into the prompt.
 */
export interface PromptContext {
    /** The current project's technology stack (e.g., 'TypeScript, React, Node.js'). */
    techStack: string;
    /** Relevant coding conventions or style guides. */
    codingConventions: string;
    /** A summary of the relevant file structure or path. */
    fileStructureSummary: string;
    /** The content of the file currently being worked on. */
    currentFileContent: string;
    /** Relevant code snippets from neighboring files or dependencies. */
    relatedCodeSnippets: string;
    /** The current execution state or error trace. */
    executionState: string;
    /** User-specific preferences (e.g., preferred variable naming style). */
    userPreferences: Record<string, string>;
}

/**
 * Defines the specific task the agent is performing.
 */
export type AgentTaskType = 'CODE_GENERATION' | 'DEBUGGING' | 'REFACTORING' | 'DOCUMENTATION' | 'TEST_GENERATION' | 'ARCHITECTURE_REVIEW';

/**
 * Defines the LLM model being targeted.
 */
export type LLMModel = keyof typeof LLM_TOKEN_LIMITS;

// --- Task-Specific Prompt Templates ---

/**
 * A collection of predefined templates for different agent tasks.
 */
export const TaskSpecificPrompts: Record<AgentTaskType, PromptTemplate> = {
    CODE_GENERATION: {
        id: 'CODE_GEN_V1',
        systemInstruction: `You are an expert TypeScript developer, HERO, specializing in clean, idiomatic, and robust code generation. Adhere strictly to the provided context and conventions.`,
        userQueryTemplate: `Generate the code required to implement the following feature: {{TASK_DESCRIPTION}}.
        
        The implementation must be placed within the context of the current file:
        {{CURRENT_FILE_CONTENT}}
        
        Consider the related code snippets for context:
        {{RELATED_CODE_SNIPPETS}}`,
        chainOfThoughtInstruction: `Before outputting the final code, first provide a brief plan outlining the necessary steps, the function signatures you will use, and any potential side effects.`,
        outputFormatInstruction: `Output ONLY the final, complete code block, enclosed in a single \`\`\`typescript block. Do not include any explanatory text outside the code block.`,
    },
    DEBUGGING: {
        id: 'DEBUG_V1',
        systemInstruction: `You are an elite debugger, HERO, capable of diagnosing complex issues in TypeScript applications. Your goal is to identify the root cause and provide the minimal, correct fix.`,
        userQueryTemplate: `Analyze the following error and the current file content to identify and fix the bug.
        
        Error/Execution State:
        {{EXECUTION_STATE}}
        
        Current File Content:
        {{CURRENT_FILE_CONTENT}}
        
        Task: {{TASK_DESCRIPTION}}`,
        chainOfThoughtInstruction: `First, state the root cause of the error. Then, describe the proposed fix and why it resolves the issue.`,
        outputFormatInstruction: `Provide the output in a structured JSON format:
        {
          "rootCause": "...",
          "proposedFix": "...",
          "filePatches": [
            {
              "filePath": "...",
              "patch": "..." // Unified diff or specific line changes
            }
          ]
        }`,
    },
    REFACTORING: {
        id: 'REFACTOR_V1',
        systemInstruction: `You are a master refactorer, HERO, focused on improving code quality, readability, and performance without changing external behavior.`,
        userQueryTemplate: `Refactor the code in the current file based on the following goal: {{TASK_DESCRIPTION}}.
        
        Current File Content:
        {{CURRENT_FILE_CONTENT}}`,
        outputFormatInstruction: `Output ONLY the refactored, complete code block, enclosed in a single \`\`\`typescript block.`,
    },
    DOCUMENTATION: {
        id: 'DOC_V1',
        systemInstruction: `You are a meticulous technical writer, HERO, generating high-quality JSDoc documentation for TypeScript code.`,
        userQueryTemplate: `Generate comprehensive JSDoc comments for all exported functions, classes, and interfaces in the following file content:
        
        {{CURRENT_FILE_CONTENT}}
        
        Task: {{TASK_DESCRIPTION}}`,
        outputFormatInstruction: `Output ONLY the complete file content with the new JSDoc comments integrated, enclosed in a single \`\`\`typescript block.`,
    },
    TEST_GENERATION: {
        id: 'TEST_V1',
        systemInstruction: `You are an expert in test-driven development, HERO, generating comprehensive and idiomatic unit tests using Jest or Vitest.`,
        userQueryTemplate: `Generate unit tests for the functions and logic contained within the following file content. The tests should cover edge cases and ensure high coverage.
        
        File Content to Test:
        {{CURRENT_FILE_CONTENT}}
        
        Task: {{TASK_DESCRIPTION}}`,
        outputFormatInstruction: `Output ONLY the complete test file content, enclosed in a single \`\`\`typescript block.`,
    },
    ARCHITECTURE_REVIEW: {
        id: 'ARCH_V1',
        systemInstruction: `You are a senior architect, HERO, providing critical and constructive feedback on design and structure.`,
        userQueryTemplate: `Review the provided file content and context against the following architectural goal: {{TASK_DESCRIPTION}}.
        
        Current File Content:
        {{CURRENT_FILE_CONTENT}}
        
        Related Context:
        {{RELATED_CODE_SNIPPETS}}`,
        chainOfThoughtInstruction: `First, summarize the current architecture. Then, list 3-5 key recommendations for improvement, justifying each one.`,
        outputFormatInstruction: `Provide the review in a structured Markdown format with clear headings for Summary and Recommendations.`,
    }
};

// --- Context Injector ---

/**
 * Manages the injection of dynamic context into a prompt template,
 * including token counting and truncation for context window management.
 */
export class ContextInjector {
    private model: LLMModel;
    private maxContextTokens: number;

    /**
     * @param model The target LLM model to determine token limits.
     */
    constructor(model: LLMModel = 'GPT-4-Turbo') {
        this.model = model;
        this.maxContextTokens = this.calculateMaxContextTokens(model);
    }

    /**
     * Calculates the maximum tokens available for context, reserving space for the response.
     * @param model The LLM model.
     * @returns The maximum tokens allowed for the input context.
     */
    private calculateMaxContextTokens(model: LLMModel): number {
        const totalLimit = LLM_TOKEN_LIMITS[model] || LLM_TOKEN_LIMITS['Default'];
        return totalLimit - RESPONSE_TOKEN_RESERVATION;
    }

    /**
     * Injects context data into the raw prompt string, managing the context window size.
     * @param rawPrompt The prompt string with placeholders.
     * @param context The dynamic context data.
     * @returns The context-aware prompt string.
     */
    public inject(rawPrompt: string, context: PromptContext): string {
        let prompt = rawPrompt;
        let currentTokenCount = countTokens(prompt);

        // 1. Inject static context first
        prompt = prompt.replace(/{{TECH_STACK}}/g, context.techStack);
        prompt = prompt.replace(/{{CODING_CONVENTIONS}}/g, context.codingConventions);
        prompt = prompt.replace(/{{FILE_STRUCTURE_SUMMARY}}/g, context.fileStructureSummary);
        prompt = prompt.replace(/{{USER_PREFERENCES}}/g, JSON.stringify(context.userPreferences));

        // 2. Inject dynamic, large context fields with truncation
        const largeFields: Array<keyof PromptContext> = [
            'currentFileContent',
            'relatedCodeSnippets',
            'executionState',
        ];

        for (const field of largeFields) {
            const placeholder = `{{${field.toUpperCase()}}}`;
            let content = context[field] as string;

            if (content) {
                // Calculate remaining tokens for this field
                currentTokenCount = countTokens(prompt.replace(placeholder, '')); // Count prompt without this placeholder
                const remainingTokens = this.maxContextTokens - currentTokenCount;

                if (remainingTokens <= 0) {
                    logger.warn(`Context window exceeded before injecting ${field}. Truncating to empty.`);
                    content = `[Context truncated due to token limit: ${this.maxContextTokens}]`;
                } else {
                    content = truncateToTokenLimit(content, remainingTokens);
                }
            } else {
                content = `[No ${field} provided]`;
            }

            prompt = prompt.replace(new RegExp(placeholder, 'g'), content);
        }

        // 3. Final token check
        const finalTokenCount = countTokens(prompt);
        if (finalTokenCount > this.maxContextTokens) {
            logger.error(`Final prompt exceeds token limit (${finalTokenCount}/${this.maxContextTokens}). This should not happen.`);
            // Fallback: Truncate the entire prompt if necessary (less ideal)
            prompt = truncateToTokenLimit(prompt, this.maxContextTokens);
        }

        return prompt;
    }
}

// --- Prompt Builder ---

/**
 * Constructs the final, executable prompt string from a template and dynamic data.
 */
export class PromptBuilder {
    private injector: ContextInjector;
    private model: LLMModel;

    /**
     * @param model The target LLM model.
     */
    constructor(model: LLMModel = 'GPT-4-Turbo') {
        this.model = model;
        this.injector = new ContextInjector(model);
    }

    /**
     * Builds the complete prompt string for the LLM.
     * @param taskType The type of task being performed.
     * @param taskDescription The specific goal of the task.
     * @param context The dynamic project and execution context.
     * @param fewShotExamples Optional few-shot examples to inject.
     * @returns The final, ready-to-use prompt string.
     */
    public buildPrompt(
        taskType: AgentTaskType,
        taskDescription: string,
        context: PromptContext,
        fewShotExamples?: string,
    ): string {
        const template = TaskSpecificPrompts[taskType];

        if (!template) {
            throw new Error(`Unsupported task type: ${taskType}`);
        }

        // 1. Construct the raw prompt components
        let rawPrompt = '';

        // System Instruction (always first)
        rawPrompt += `SYSTEM INSTRUCTION:\n${template.systemInstruction}\n\n`;

        // Few-Shot Examples (if provided or in template)
        const examples = fewShotExamples || template.fewShotExamples;
        if (examples) {
            rawPrompt += `FEW-SHOT EXAMPLES:\n${examples}\n\n`;
        }

        // Chain-of-Thought Instruction (if available)
        if (template.chainOfThoughtInstruction) {
            rawPrompt += `CHAIN-OF-THOUGHT INSTRUCTION:\n${template.chainOfThoughtInstruction}\n\n`;
        }

        // Output Format Instruction (always included)
        rawPrompt += `OUTPUT FORMAT INSTRUCTION:\n${template.outputFormatInstruction}\n\n`;

        // User Query Template (main content)
        let userQuery = template.userQueryTemplate.replace(/{{TASK_DESCRIPTION}}/g, taskDescription);
        
        // Inject placeholders for static context that might be in the query template
        userQuery = userQuery.replace(/{{TECH_STACK}}/g, '{{TECH_STACK}}');
        userQuery = userQuery.replace(/{{CODING_CONVENTIONS}}/g, '{{CODING_CONVENTIONS}}');
        
        rawPrompt += `USER QUERY:\n${userQuery}`;

        // 2. Inject Context and manage token window
        try {
            const finalPrompt = this.injector.inject(rawPrompt, context);
            logger.info(`Prompt built for ${taskType}. Tokens: ${countTokens(finalPrompt)}/${this.injector['maxContextTokens']}`);
            return finalPrompt;
        } catch (error) {
            logger.error({ error }, `Error during context injection for ${taskType}`);
            throw new Error(`Failed to construct prompt: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// --- Output Formatter (Example) ---

/**
 * Defines a utility for parsing structured output from the LLM.
 */
export class OutputFormatter {
    /**
     * Attempts to extract a JSON object from a raw LLM response string.
     * @param response The raw text response from the LLM.
     * @returns The parsed JSON object or null if parsing fails.
     */
    public static parseJson(response: string): Record<string, any> | null {
        try {
            // Regex to find the first JSON block (often enclosed in ```json or just { ... })
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
            let jsonString = jsonMatch ? jsonMatch[1] : response.trim();

            // Attempt to clean up common LLM errors (e.g., trailing commas, comments)
            jsonString = jsonString.replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas

            // If it doesn't start with { or [, try to find the start/end
            if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
                const start = jsonString.indexOf('{');
                const end = jsonString.lastIndexOf('}');
                if (start !== -1 && end !== -1 && end > start) {
                    jsonString = jsonString.substring(start, end + 1);
                }
            }

            return JSON.parse(jsonString);
        } catch (e) {
            logger.warn({ error: e }, 'Failed to parse JSON output from LLM response.');
            return null;
        }
    }

    /**
     * Extracts the content of a specific code block (e.g., ```typescript) from the response.
     * @param response The raw text response from the LLM.
     * @param language The language tag (e.g., 'typescript', 'json').
     * @returns The extracted code content or null.
     */
    public static extractCodeBlock(response: string, language: string = 'typescript'): string | null {
        const regex = new RegExp(`\`\`\`${language}\\s*([\\s\\S]*?)\\s*\`\`\``, 'i');
        const match = response.match(regex);
        return match ? match[1].trim() : null;
    }
}
