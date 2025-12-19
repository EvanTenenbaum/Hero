/**
 * Hero IDE - LLM API Client
 * 
 * Provides unified interface for calling Gemini and Claude APIs
 * with streaming support and smart routing.
 */

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type LLMProvider = "gemini" | "anthropic";

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMRequestOptions {
  provider: LLMProvider;
  model: string;
  messages: LLMMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface LLMError {
  code: string;
  message: string;
  provider: LLMProvider;
  retryable: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// GEMINI API CLIENT
// ════════════════════════════════════════════════════════════════════════════

async function callGeminiAPI(
  apiKey: string,
  options: LLMRequestOptions
): Promise<LLMResponse> {
  const model = options.model || "gemini-2.5-flash";
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  
  // Convert messages to Gemini format
  const contents = options.messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Add system instruction if provided
  const systemInstruction = options.systemPrompt || 
    options.messages.find(m => m.role === "system")?.content;

  const requestBody: any = {
    contents,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 8192,
      temperature: options.temperature ?? 0.7,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (options.stream && options.onChunk) {
    // Streaming request
    const response = await fetch(
      `${baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw {
        code: `GEMINI_${response.status}`,
        message: error.error?.message || `Gemini API error: ${response.status}`,
        provider: "gemini" as LLMProvider,
        retryable: response.status >= 500 || response.status === 429,
      };
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Parse streaming JSON responses
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim().startsWith("{")) {
            try {
              const json = JSON.parse(line.trim().replace(/^,/, ""));
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                fullContent += text;
                options.onChunk(text);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    }

    return {
      content: fullContent,
      model,
      provider: "gemini",
    };
  } else {
    // Non-streaming request
    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw {
        code: `GEMINI_${response.status}`,
        message: error.error?.message || `Gemini API error: ${response.status}`,
        provider: "gemini" as LLMProvider,
        retryable: response.status >= 500 || response.status === 429,
      };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      content,
      model,
      provider: "gemini",
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0,
      } : undefined,
      finishReason: data.candidates?.[0]?.finishReason,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ANTHROPIC/CLAUDE API CLIENT
// ════════════════════════════════════════════════════════════════════════════

async function callAnthropicAPI(
  apiKey: string,
  options: LLMRequestOptions
): Promise<LLMResponse> {
  const model = options.model || "claude-3-5-sonnet-20241022";
  const baseUrl = "https://api.anthropic.com/v1";

  // Convert messages to Anthropic format
  const messages = options.messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Get system prompt
  const systemPrompt = options.systemPrompt || 
    options.messages.find(m => m.role === "system")?.content;

  const requestBody: any = {
    model,
    max_tokens: options.maxTokens || 8192,
    messages,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  if (options.temperature !== undefined) {
    requestBody.temperature = options.temperature;
  }

  if (options.stream && options.onChunk) {
    // Streaming request
    requestBody.stream = true;

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw {
        code: `ANTHROPIC_${response.status}`,
        message: error.error?.message || `Anthropic API error: ${response.status}`,
        provider: "anthropic" as LLMProvider,
        retryable: response.status >= 500 || response.status === 429,
      };
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            
            try {
              const json = JSON.parse(data);
              if (json.type === "content_block_delta" && json.delta?.text) {
                fullContent += json.delta.text;
                options.onChunk(json.delta.text);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    }

    return {
      content: fullContent,
      model,
      provider: "anthropic",
    };
  } else {
    // Non-streaming request
    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw {
        code: `ANTHROPIC_${response.status}`,
        message: error.error?.message || `Anthropic API error: ${response.status}`,
        provider: "anthropic" as LLMProvider,
        retryable: response.status >= 500 || response.status === 429,
      };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    return {
      content,
      model,
      provider: "anthropic",
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
      } : undefined,
      finishReason: data.stop_reason,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// UNIFIED LLM CLIENT
// ════════════════════════════════════════════════════════════════════════════

export interface LLMClientConfig {
  geminiApiKey?: string;
  anthropicApiKey?: string;
  defaultProvider?: LLMProvider;
  defaultModel?: string;
}

export class LLMClient {
  private config: LLMClientConfig;

  constructor(config: LLMClientConfig) {
    this.config = config;
  }

  async chat(options: Omit<LLMRequestOptions, "provider"> & { provider?: LLMProvider }): Promise<LLMResponse> {
    const provider = options.provider || this.config.defaultProvider || "gemini";
    
    // Get the appropriate API key
    const apiKey = provider === "gemini" 
      ? this.config.geminiApiKey 
      : this.config.anthropicApiKey;

    if (!apiKey) {
      throw {
        code: "NO_API_KEY",
        message: `No API key configured for ${provider}`,
        provider,
        retryable: false,
      } as LLMError;
    }

    // Determine model
    const model = options.model || this.getDefaultModel(provider);

    const fullOptions: LLMRequestOptions = {
      ...options,
      provider,
      model,
    };

    try {
      if (provider === "gemini") {
        return await callGeminiAPI(apiKey, fullOptions);
      } else {
        return await callAnthropicAPI(apiKey, fullOptions);
      }
    } catch (error) {
      // If error is already formatted, rethrow
      if ((error as LLMError).code) {
        throw error;
      }
      
      // Wrap unknown errors
      throw {
        code: "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        provider,
        retryable: false,
      } as LLMError;
    }
  }

  async chatWithFallback(
    options: Omit<LLMRequestOptions, "provider">,
    fallbackProvider?: LLMProvider
  ): Promise<LLMResponse> {
    const primaryProvider = this.config.defaultProvider || "gemini";
    const secondary = fallbackProvider || (primaryProvider === "gemini" ? "anthropic" : "gemini");

    try {
      return await this.chat({ ...options, provider: primaryProvider });
    } catch (error) {
      const llmError = error as LLMError;
      
      // Only fallback on retryable errors or API key issues
      if (llmError.retryable || llmError.code === "NO_API_KEY") {
        console.warn(`Primary provider ${primaryProvider} failed, falling back to ${secondary}`);
        return await this.chat({ ...options, provider: secondary });
      }
      
      throw error;
    }
  }

  private getDefaultModel(provider: LLMProvider): string {
    if (provider === "gemini") {
      return "gemini-2.5-flash";
    } else {
      return "claude-3-5-sonnet-20241022";
    }
  }

  // Helper to check if a provider is configured
  hasProvider(provider: LLMProvider): boolean {
    if (provider === "gemini") {
      return !!this.config.geminiApiKey;
    } else {
      return !!this.config.anthropicApiKey;
    }
  }

  // Get available providers
  getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.config.geminiApiKey) providers.push("gemini");
    if (this.config.anthropicApiKey) providers.push("anthropic");
    return providers;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HERO PM SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════════════════

export const HERO_PM_SYSTEM_PROMPT = `You are Hero, an AI Project Manager for the Hero IDE - an intelligent development environment.

Your capabilities:
1. **Project Planning**: Help users plan features, create roadmaps, and organize tasks
2. **Code Assistance**: Provide code suggestions, reviews, and explanations
3. **IDE Configuration**: Configure settings, integrations, and preferences via natural language
4. **Task Management**: Create, prioritize, and organize tasks with smart sprint suggestions
5. **Agent Coordination**: Spawn and manage AI agents for parallel task execution

When users ask you to configure the IDE, you can:
- Set up API connections (e.g., "connect to OpenAI API")
- Manage MCP servers (e.g., "add Vercel MCP server")
- Configure agent rules (e.g., "set coding agent to use Claude")
- Adjust budget limits (e.g., "set token limit to 100000")
- Manage secrets (e.g., "add my GitHub token")

For roadmap and task management:
- Create tasks with priorities and dependencies
- Suggest smart sprint groupings based on task relationships
- Identify blockers and parallel execution opportunities
- Reorder tasks based on efficiency and dependencies

Always be:
- Concise but helpful
- Proactive in suggesting improvements
- Clear about what actions you're taking
- Transparent about limitations

When you need to execute a configuration command, format it as:
[COMMAND: category.action(parameters)]

For example:
[COMMAND: settings.setLimit({type: "tokens", value: 100000})]
[COMMAND: roadmap.createTask({title: "Implement auth", priority: "high"})]`;

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export { callGeminiAPI, callAnthropicAPI };
