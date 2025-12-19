/**
 * Hero IDE - LLM Hook
 * 
 * React hook for using the LLM client with automatic
 * API key loading from the secrets vault.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { LLMClient, LLMProvider, LLMMessage, LLMResponse, LLMError, HERO_PM_SYSTEM_PROMPT } from "@/lib/llm-client";
import { useSecrets } from "./use-secrets";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface UseLLMOptions {
  defaultProvider?: LLMProvider;
  defaultModel?: string;
  enableFallback?: boolean;
}

export interface ChatOptions {
  provider?: LLMProvider;
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
}

export interface UseLLMReturn {
  // State
  isReady: boolean;
  isLoading: boolean;
  error: LLMError | null;
  availableProviders: LLMProvider[];
  
  // Actions
  chat: (messages: LLMMessage[], options?: ChatOptions) => Promise<LLMResponse | null>;
  chatWithPM: (userMessage: string, history?: LLMMessage[], options?: ChatOptions) => Promise<LLMResponse | null>;
  streamChat: (messages: LLMMessage[], onChunk: (chunk: string) => void, options?: ChatOptions) => Promise<LLMResponse | null>;
  clearError: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════════════════════════

export function useLLM(options: UseLLMOptions = {}): UseLLMReturn {
  const { secrets, loading: secretsLoading } = useSecrets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LLMError | null>(null);
  const clientRef = useRef<LLMClient | null>(null);

  // Initialize client when secrets are loaded
  useEffect(() => {
    if (secretsLoading) return;

    // Find API keys from secrets
    const geminiSecret = secrets.find(
      s => s.name.toLowerCase().includes("gemini") && s.category === "llm"
    );
    const anthropicSecret = secrets.find(
      s => (s.name.toLowerCase().includes("anthropic") || s.name.toLowerCase().includes("claude")) 
           && s.category === "llm"
    );

    clientRef.current = new LLMClient({
      geminiApiKey: geminiSecret?.value,
      anthropicApiKey: anthropicSecret?.value,
      defaultProvider: options.defaultProvider || "gemini",
      defaultModel: options.defaultModel,
    });
  }, [secrets, secretsLoading, options.defaultProvider, options.defaultModel]);

  // Get available providers
  const availableProviders = clientRef.current?.getAvailableProviders() || [];
  const isReady = !secretsLoading && clientRef.current !== null && availableProviders.length > 0;

  // Chat function
  const chat = useCallback(async (
    messages: LLMMessage[],
    chatOptions?: ChatOptions
  ): Promise<LLMResponse | null> => {
    if (!clientRef.current) {
      setError({
        code: "NOT_INITIALIZED",
        message: "LLM client not initialized. Please add API keys in Settings > Secrets.",
        provider: chatOptions?.provider || "gemini",
        retryable: false,
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await clientRef.current.chat({
        messages,
        provider: chatOptions?.provider,
        model: chatOptions?.model || "",
        systemPrompt: chatOptions?.systemPrompt,
        maxTokens: chatOptions?.maxTokens,
        temperature: chatOptions?.temperature,
        stream: chatOptions?.stream,
        onChunk: chatOptions?.onChunk,
      });

      return response;
    } catch (err) {
      const llmError = err as LLMError;
      setError(llmError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chat with PM system prompt
  const chatWithPM = useCallback(async (
    userMessage: string,
    history: LLMMessage[] = [],
    chatOptions?: ChatOptions
  ): Promise<LLMResponse | null> => {
    const messages: LLMMessage[] = [
      ...history,
      { role: "user", content: userMessage },
    ];

    return chat(messages, {
      ...chatOptions,
      systemPrompt: chatOptions?.systemPrompt || HERO_PM_SYSTEM_PROMPT,
    });
  }, [chat]);

  // Streaming chat
  const streamChat = useCallback(async (
    messages: LLMMessage[],
    onChunk: (chunk: string) => void,
    chatOptions?: ChatOptions
  ): Promise<LLMResponse | null> => {
    return chat(messages, {
      ...chatOptions,
      stream: true,
      onChunk,
    });
  }, [chat]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isReady,
    isLoading,
    error,
    availableProviders,
    chat,
    chatWithPM,
    streamChat,
    clearError,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export type { LLMMessage, LLMResponse, LLMError, LLMProvider };
