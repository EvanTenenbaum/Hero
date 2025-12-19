/**
 * Hero IDE - PM Chat Hook
 * 
 * Enhanced chat hook that integrates with the PM command system
 * for IDE configuration via natural language, with real LLM API calls.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  parseCommand,
  executeCommand,
  getCommandSuggestions,
  getCommandHelp,
  CommandExecutor,
  CommandResult,
  ParsedCommand,
} from "@/lib/pm-commands";
import { LLMClient, LLMMessage, HERO_PM_SYSTEM_PROMPT, LLMProvider } from "@/lib/llm-client";
import { useSecrets } from "./use-secrets";

const PM_CHAT_HISTORY_KEY = "hero_pm_chat_history";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface PMMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  
  // Command-specific fields
  command?: ParsedCommand;
  commandResult?: CommandResult;
  
  // Context
  projectId?: string;
  model?: string;
  provider?: LLMProvider;
  
  // UI hints
  isConfigAction?: boolean;
  requiresConfirmation?: boolean;
  pendingConfirmation?: {
    command: ParsedCommand;
    prompt: string;
  };
  
  // Streaming state
  isStreaming?: boolean;
}

export interface PMChatState {
  messages: PMMessage[];
  isLoading: boolean;
  currentSuggestions: string[];
  pendingCommand: ParsedCommand | null;
  lastCommandResult: CommandResult | null;
}

// ════════════════════════════════════════════════════════════════════════════
// MOCK COMMAND EXECUTOR (matches CommandExecutor interface)
// ════════════════════════════════════════════════════════════════════════════

function createMockExecutor(): CommandExecutor {
  return {
    // Integration commands
    addIntegration: async (provider: string, config?: any) => ({
      success: true,
      message: `Added ${provider} integration. Please configure the API key in Settings > Secrets.`,
      suggestedFollowUp: [`Set the ${provider} API key`, `Enable ${provider} integration`],
    }),
    removeIntegration: async (provider: string) => ({
      success: true,
      message: `Removed ${provider} integration.`,
    }),
    configureIntegration: async (provider: string, config: any) => ({
      success: true,
      message: `Configured ${provider} with the provided settings.`,
      requiresConfirmation: true,
      confirmationPrompt: `Are you sure you want to update the ${provider} configuration?`,
    }),
    enableIntegration: async (provider: string) => ({
      success: true,
      message: `Enabled ${provider} integration.`,
    }),
    disableIntegration: async (provider: string) => ({
      success: true,
      message: `Disabled ${provider} integration.`,
    }),

    // MCP commands
    addMCPServer: async (name: string, config?: any) => ({
      success: true,
      message: `Added MCP server "${name}". Configure connection details in Settings > MCP Servers.`,
      suggestedFollowUp: [`Configure ${name} server`, `Test ${name} connection`],
    }),
    connectMCPServer: async (name: string) => ({
      success: true,
      message: `Connected to MCP server "${name}".`,
    }),
    disconnectMCPServer: async (name: string) => ({
      success: true,
      message: `Disconnected from MCP server "${name}".`,
    }),
    listMCPServers: async () => ({
      success: true,
      message: `**MCP Servers:**\n\n• Vercel (connected)\n• DigitalOcean Accounts (connected)\n• DigitalOcean Apps (connected)\n• DigitalOcean Databases (connected)\n• GitHub (connected)`,
    }),

    // Agent commands
    createAgentType: async (name: string, config?: any) => ({
      success: true,
      message: `Created agent type "${name}".`,
    }),
    configureAgent: async (name: string, config: any) => ({
      success: true,
      message: `Updated ${name} agent configuration.`,
    }),

    // Governance commands
    setAutonomyMode: async (mode: string) => ({
      success: true,
      message: `**Autonomy Mode Changed**\n\nSwitched to **${mode.toUpperCase()}** mode.\n\n${
        mode === "directed" ? "• No scope expansion\n• No action chaining\n• Approval required per action" :
        mode === "collaborative" ? "• Scope expansion with approval\n• Proposals pause for review\n• Auto-checkpoint enabled" :
        "• Full autonomy enabled\n• Auto-checkpoint on\n• Halt on uncertainty"
      }`,
      requiresConfirmation: mode === "agentic",
      confirmationPrompt: mode === "agentic" 
        ? "⚠️ Agentic mode allows autonomous execution. Are you sure?"
        : undefined,
    }),
    setBudgetLimit: async (type: string, limit: number) => ({
      success: true,
      message: `Set ${type} limit to ${limit}.`,
    }),
    haltSystem: async () => ({
      success: true,
      message: `🛑 **System Halted**\n\nAll operations paused. Review the current state before resuming.`,
    }),
    resumeSystem: async () => ({
      success: true,
      message: `▶️ System resumed. Operations can continue.`,
    }),

    // Secrets commands
    addSecret: async (name: string, value?: string) => ({
      success: true,
      message: `Added secret "${name}". ${value ? "Value has been stored securely." : "Please enter the value in Settings > Secrets."}`,
    }),
    removeSecret: async (name: string) => ({
      success: true,
      message: `Removed secret "${name}".`,
      requiresConfirmation: true,
      confirmationPrompt: `Are you sure you want to remove the secret "${name}"?`,
    }),
    listSecrets: async () => ({
      success: true,
      message: `**Secrets Vault:**\n\n• Gemini API Key (LLM)\n• Anthropic Claude API Key (LLM)\n• DigitalOcean API Key (Infrastructure)\n• GitHub Personal Access Token (GitHub)`,
    }),

    // GitHub commands
    connectGitHub: async () => ({
      success: true,
      message: `Opening GitHub authentication...\n\nAfter connecting, you'll be able to:\n• Clone repositories\n• Create pull requests\n• Manage branches`,
      data: { action: "oauth", provider: "github" },
    }),
    disconnectGitHub: async () => ({
      success: true,
      message: `Disconnected from GitHub.`,
    }),
    cloneRepository: async (url: string) => ({
      success: true,
      message: `Cloning repository from ${url}...`,
      data: { action: "clone", url },
    }),
    createPullRequest: async (title: string) => ({
      success: true,
      message: `Creating pull request: "${title}"\n\nSelect the base and head branches to continue.`,
      requiresConfirmation: true,
      confirmationPrompt: "Confirm PR details before creating?",
    }),

    // Project commands
    createProject: async (name: string) => ({
      success: true,
      message: `Created project "${name}". Opening workspace...`,
      data: { projectId: `proj_${Date.now()}`, name },
      suggestedFollowUp: ["Add a task for initial setup", "Clone a repository"],
    }),
    openProject: async (name: string) => ({
      success: true,
      message: `Switched to project "${name}".`,
      data: { projectName: name },
    }),
    configureProject: async (setting: string, value: any) => ({
      success: true,
      message: `Set project ${setting} to "${value}".`,
    }),

    // Roadmap commands
    addTask: async (title: string) => ({
      success: true,
      message: `Created task: "${title}"\n\nDefault priority: Medium | Status: Backlog`,
      data: { taskId: `task_${Date.now()}`, title },
      suggestedFollowUp: [`Set priority of "${title}" to high`, `Assign task "${title}" to agent`],
    }),
    updateTask: async (title: string, updates: any) => ({
      success: true,
      message: `Updated task "${title}": ${JSON.stringify(updates)}`,
    }),
    assignTask: async (title: string, assignee: string) => ({
      success: true,
      message: `Assigned "${title}" to ${assignee}.`,
    }),
    createSprint: async () => ({
      success: true,
      message: `**Sprint Planning**\n\nI'll analyze your backlog and suggest an optimal sprint.\n\nBased on priorities and dependencies, here's my recommendation:\n\n**Sprint 1** (1 week)\n- High priority tasks: 3\n- Can run in parallel: 2\n- Estimated effort: 24 hours\n\nWould you like me to create this sprint?`,
      requiresConfirmation: true,
      confirmationPrompt: "Create the suggested sprint?",
    }),
    smartOrderTasks: async () => ({
      success: true,
      message: `**Smart Task Ordering**\n\nI've analyzed dependencies, blockers, and parallelization opportunities.\n\n**Optimized Order:**\n1. Database schema (no deps, enables 3 tasks)\n2. API endpoints (depends on #1)\n3. Authentication (parallel with #2)\n4. Frontend components (depends on #2, #3)\n\nTasks #2 and #3 can run in parallel for faster completion.`,
      suggestedFollowUp: ["Create a sprint with this order", "Assign parallel tasks to agents"],
    }),
    moveTask: async (title: string, position: string | number) => ({
      success: true,
      message: `Moved "${title}" to position ${position}.`,
    }),

    // Settings commands
    setSetting: async (key: string, value: any) => ({
      success: true,
      message: `Set ${key} to "${value}".`,
    }),
    enableFeature: async (feature: string) => ({
      success: true,
      message: `Enabled "${feature}".`,
    }),
    disableFeature: async (feature: string) => ({
      success: true,
      message: `Disabled "${feature}".`,
    }),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════════════════════════

export function usePMChat(projectId?: string) {
  const [messages, setMessages] = useState<PMMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [pendingCommand, setPendingCommand] = useState<ParsedCommand | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("gemini");
  
  const { secrets, loading: secretsLoading } = useSecrets();
  const llmClientRef = useRef<LLMClient | null>(null);
  const executor = createMockExecutor();

  // Initialize LLM client when secrets are loaded
  useEffect(() => {
    if (secretsLoading) return;

    const geminiSecret = secrets.find(
      s => s.name.toLowerCase().includes("gemini") && s.category === "llm"
    );
    const anthropicSecret = secrets.find(
      s => (s.name.toLowerCase().includes("anthropic") || s.name.toLowerCase().includes("claude")) 
           && s.category === "llm"
    );

    llmClientRef.current = new LLMClient({
      geminiApiKey: geminiSecret?.value,
      anthropicApiKey: anthropicSecret?.value,
      defaultProvider: "gemini",
    });
  }, [secrets, secretsLoading]);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const key = projectId ? `${PM_CHAT_HISTORY_KEY}_${projectId}` : PM_CHAT_HISTORY_KEY;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          setMessages(parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })));
        } else {
          // Add welcome message
          setMessages([{
            id: "welcome",
            role: "assistant",
            content: `👋 **Welcome to Hero IDE!**\n\nI'm your AI PM, powered by real LLM APIs. I can help you:\n\n• **Configure the IDE** - "Add OpenAI API", "Set budget limit to 1000"\n• **Manage your roadmap** - "Create a task for authentication", "Smart order tasks"\n• **Control governance** - "Switch to collaborative mode", "Halt the system"\n• **Set up integrations** - "Connect to GitHub", "Add MCP server"\n• **Answer questions** - Ask me anything about your project\n\nJust tell me what you need in natural language. Say "help" for more commands.`,
            timestamp: new Date(),
          }]);
        }
      } catch (error) {
        console.error("Failed to load PM chat history:", error);
      }
    };
    loadHistory();
  }, [projectId]);

  // Save chat history
  const saveHistory = useCallback(async (newMessages: PMMessage[]) => {
    try {
      const key = projectId ? `${PM_CHAT_HISTORY_KEY}_${projectId}` : PM_CHAT_HISTORY_KEY;
      // Only save last 100 messages to avoid storage issues
      const toSave = newMessages.slice(-100);
      await AsyncStorage.setItem(key, JSON.stringify(toSave));
    } catch (error) {
      console.error("Failed to save PM chat history:", error);
    }
  }, [projectId]);

  // Update suggestions as user types
  const updateSuggestions = useCallback((input: string) => {
    if (input.length > 2) {
      setCurrentSuggestions(getCommandSuggestions(input));
    } else {
      setCurrentSuggestions([]);
    }
  }, []);

  // Convert PMMessages to LLMMessages for API call
  const convertToLLMMessages = (pmMessages: PMMessage[]): LLMMessage[] => {
    return pmMessages
      .filter(m => m.role !== "system" && !m.isStreaming)
      .slice(-20) // Keep last 20 messages for context
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
  };

  // Call real LLM API
  const callLLM = useCallback(async (
    userMessage: string,
    history: PMMessage[],
    onChunk?: (chunk: string) => void
  ): Promise<string> => {
    if (!llmClientRef.current) {
      return "I'm not connected to any LLM provider yet. Please add your API keys in Settings > API Connections to enable AI responses.";
    }

    const availableProviders = llmClientRef.current.getAvailableProviders();
    if (availableProviders.length === 0) {
      return "No LLM providers configured. Please add your Gemini or Anthropic API key in Settings > API Connections.";
    }

    const llmMessages = convertToLLMMessages(history);
    llmMessages.push({ role: "user", content: userMessage });

    try {
      const response = await llmClientRef.current.chat({
        messages: llmMessages,
        provider: selectedProvider,
        model: selectedModel,
        systemPrompt: HERO_PM_SYSTEM_PROMPT,
        stream: !!onChunk,
        onChunk,
        maxTokens: 4096,
        temperature: 0.7,
      });

      return response.content;
    } catch (error: any) {
      console.error("LLM API error:", error);
      
      // Try fallback provider
      if (error.retryable && availableProviders.length > 1) {
        const fallbackProvider = availableProviders.find(p => p !== selectedProvider);
        if (fallbackProvider) {
          try {
            const response = await llmClientRef.current.chat({
              messages: llmMessages,
              provider: fallbackProvider,
              model: "",
              systemPrompt: HERO_PM_SYSTEM_PROMPT,
              stream: !!onChunk,
              onChunk,
            });
            return response.content;
          } catch (fallbackError) {
            console.error("Fallback LLM error:", fallbackError);
          }
        }
      }

      return `I encountered an error: ${error.message || "Unknown error"}. Please check your API keys in Settings.`;
    }
  }, [selectedProvider, selectedModel]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    const userMessage: PMMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
      projectId,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentSuggestions([]);

    try {
      // Check for help command
      if (content.toLowerCase().startsWith("help")) {
        const category = content.toLowerCase().replace("help", "").trim();
        const helpText = getCommandHelp(category as any || undefined);
        
        const helpMessage: PMMessage = {
          id: `msg_${Date.now()}_help`,
          role: "assistant",
          content: helpText,
          timestamp: new Date(),
        };
        
        const newMessages = [...messages, userMessage, helpMessage];
        setMessages(newMessages);
        await saveHistory(newMessages);
        setIsLoading(false);
        return;
      }

      // Try to parse as command
      const command = parseCommand(content);
      
      if (command && command.confidence >= 0.6) {
        // Execute the command
        const result = await executeCommand(command, executor);
        
        const responseMessage: PMMessage = {
          id: `msg_${Date.now()}_response`,
          role: "assistant",
          content: result.message,
          timestamp: new Date(),
          command,
          commandResult: result,
          isConfigAction: true,
          requiresConfirmation: result.requiresConfirmation,
          pendingConfirmation: result.requiresConfirmation ? {
            command,
            prompt: result.confirmationPrompt || "Confirm this action?",
          } : undefined,
        };

        if (result.requiresConfirmation) {
          setPendingCommand(command);
        }

        const newMessages = [...messages, userMessage, responseMessage];
        setMessages(newMessages);
        await saveHistory(newMessages);
      } else if (command && command.confidence >= 0.4) {
        // Low confidence - ask for clarification
        const clarifyMessage: PMMessage = {
          id: `msg_${Date.now()}_clarify`,
          role: "assistant",
          content: `I think you want to ${command.action} something related to ${command.category}, but I'm not sure. Could you be more specific?\n\nFor example:\n${getCommandSuggestions(content).map((s) => `• "${s}"`).join("\n")}`,
          timestamp: new Date(),
        };

        const newMessages = [...messages, userMessage, clarifyMessage];
        setMessages(newMessages);
        await saveHistory(newMessages);
      } else {
        // Not a command - call real LLM API with streaming
        const streamingMessageId = `msg_${Date.now()}_streaming`;
        let streamedContent = "";

        // Add streaming placeholder
        const streamingMessage: PMMessage = {
          id: streamingMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isStreaming: true,
          model: selectedModel,
          provider: selectedProvider,
        };

        setMessages((prev) => [...prev, streamingMessage]);

        // Call LLM with streaming
        const response = await callLLM(
          content,
          [...messages, userMessage],
          (chunk) => {
            streamedContent += chunk;
            setMessages((prev) => 
              prev.map(m => 
                m.id === streamingMessageId 
                  ? { ...m, content: streamedContent }
                  : m
              )
            );
          }
        );

        // Finalize the message
        const finalMessage: PMMessage = {
          id: streamingMessageId,
          role: "assistant",
          content: response || streamedContent,
          timestamp: new Date(),
          isStreaming: false,
          model: selectedModel,
          provider: selectedProvider,
        };

        setMessages((prev) => 
          prev.map(m => m.id === streamingMessageId ? finalMessage : m)
        );

        const newMessages = messages.filter(m => m.id !== streamingMessageId);
        newMessages.push(userMessage);
        newMessages.push(finalMessage);
        await saveHistory(newMessages);
      }
    } catch (error) {
      const errorMessage: PMMessage = {
        id: `msg_${Date.now()}_error`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };

      const newMessages = [...messages, userMessage, errorMessage];
      setMessages(newMessages);
      await saveHistory(newMessages);
    } finally {
      setIsLoading(false);
    }
  }, [messages, projectId, executor, saveHistory, callLLM, selectedModel, selectedProvider]);

  // Confirm pending command
  const confirmCommand = useCallback(async () => {
    if (!pendingCommand) return;

    setIsLoading(true);
    try {
      const result = await executeCommand(pendingCommand, executor);
      
      const confirmMessage: PMMessage = {
        id: `msg_${Date.now()}_confirm`,
        role: "assistant",
        content: `✅ Confirmed. ${result.message}`,
        timestamp: new Date(),
        commandResult: result,
      };

      const newMessages = [...messages, confirmMessage];
      setMessages(newMessages);
      await saveHistory(newMessages);
    } finally {
      setPendingCommand(null);
      setIsLoading(false);
    }
  }, [pendingCommand, messages, executor, saveHistory]);

  // Cancel pending command
  const cancelCommand = useCallback(async () => {
    if (!pendingCommand) return;

    const cancelMessage: PMMessage = {
      id: `msg_${Date.now()}_cancel`,
      role: "assistant",
      content: "Cancelled. Let me know if you need anything else.",
      timestamp: new Date(),
    };

    const newMessages = [...messages, cancelMessage];
    setMessages(newMessages);
    await saveHistory(newMessages);
    setPendingCommand(null);
  }, [pendingCommand, messages, saveHistory]);

  // Clear history
  const clearHistory = useCallback(async () => {
    setMessages([]);
    const key = projectId ? `${PM_CHAT_HISTORY_KEY}_${projectId}` : PM_CHAT_HISTORY_KEY;
    await AsyncStorage.removeItem(key);
  }, [projectId]);

  // Change model
  const changeModel = useCallback((model: string, provider: LLMProvider) => {
    setSelectedModel(model);
    setSelectedProvider(provider);
  }, []);

  // Get available providers
  const getAvailableProviders = useCallback((): LLMProvider[] => {
    return llmClientRef.current?.getAvailableProviders() || [];
  }, []);

  return {
    messages,
    isLoading,
    currentSuggestions,
    pendingCommand,
    selectedModel,
    selectedProvider,
    sendMessage,
    updateSuggestions,
    confirmCommand,
    cancelCommand,
    clearHistory,
    changeModel,
    getAvailableProviders,
  };
}
