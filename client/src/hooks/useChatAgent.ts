/**
 * useChatAgent Hook - Sprint 1 Agent Alpha
 * 
 * React hook for interacting with the chat agent system.
 * Provides message execution, agent type selection, and state management.
 */

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

export type AgentType = 'pm' | 'developer' | 'qa' | 'devops' | 'research';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatContext {
  projectId?: number;
  projectName?: string;
  techStack?: string[];
  conversationHistory?: ChatMessage[];
  openFiles?: string[];
  userRules?: string[];
}

export interface ExecutionResult {
  success: boolean;
  agentType: AgentType;
  safetyCheck: {
    allowed: boolean;
    requiresConfirmation: boolean;
    reason?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  response?: string;
  error?: string;
  durationMs?: number;
}

export interface UseChatAgentOptions {
  defaultAgentType?: AgentType;
  onSuccess?: (result: ExecutionResult) => void;
  onError?: (error: Error) => void;
  onConfirmationRequired?: (result: ExecutionResult) => void;
}

export function useChatAgent(options: UseChatAgentOptions = {}) {
  const {
    defaultAgentType = 'developer',
    onSuccess,
    onError,
    onConfirmationRequired,
  } = options;

  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>(defaultAgentType);

  // Get available agent types
  const agentTypesQuery = trpc.chatAgent.getAgentTypes.useQuery();

  // Execute message mutation
  const executeMutation = trpc.chatAgent.executeWithAgent.useMutation({
    onSuccess: (data: {
      success: boolean;
      agentType: string;
      safetyCheck: {
        allowed: boolean;
        requiresConfirmation: boolean;
        reason?: string | null;
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
      };
      response?: string | null;
      error?: string | null;
      durationMs?: number | null;
    }) => {
      const result: ExecutionResult = {
        success: data.success,
        agentType: data.agentType as AgentType,
        safetyCheck: {
          allowed: data.safetyCheck.allowed,
          requiresConfirmation: data.safetyCheck.requiresConfirmation,
          reason: data.safetyCheck.reason ?? undefined,
          riskLevel: data.safetyCheck.riskLevel,
        },
        response: data.response ?? undefined,
        error: data.error ?? undefined,
        durationMs: data.durationMs ?? undefined,
      };
      setLastResult(result);

      if (result.safetyCheck.requiresConfirmation) {
        onConfirmationRequired?.(result);
      } else if (result.success) {
        onSuccess?.(result);
      }
    },
    onError: (error) => {
      onError?.(error as unknown as Error);
    },
  });

  // Preview prompt query (lazy)
  const previewPromptQuery = trpc.chatAgent.previewPrompt.useQuery(
    { agentType: selectedAgentType },
    { enabled: false }
  );

  /**
   * Execute a message through the selected agent
   */
  const executeMessage = useCallback(
    async (
      message: string,
      agentType?: AgentType,
      context?: ChatContext,
      skipSafetyCheck = false
    ) => {
      const type = agentType || selectedAgentType;
      
      return executeMutation.mutateAsync({
        message,
        agentType: type,
        context: context ? {
          projectId: context.projectId,
          projectName: context.projectName,
          techStack: context.techStack,
          conversationHistory: context.conversationHistory?.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          })),
          openFiles: context.openFiles,
          userRules: context.userRules,
        } : undefined,
        skipSafetyCheck,
      });
    },
    [selectedAgentType, executeMutation]
  );

  /**
   * Execute with confirmation bypass (for when user confirms a risky action)
   */
  const executeWithConfirmation = useCallback(
    async (message: string, agentType?: AgentType, context?: ChatContext) => {
      return executeMessage(message, agentType, context, true);
    },
    [executeMessage]
  );

  /**
   * Get the prompt preview for the current agent type
   */
  const getPromptPreview = useCallback(async () => {
    return previewPromptQuery.refetch();
  }, [previewPromptQuery]);

  /**
   * Clear the last result
   */
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    // State
    isLoading: executeMutation.isPending,
    error: executeMutation.error,
    lastResult,
    selectedAgentType,
    
    // Agent types
    agentTypes: agentTypesQuery.data || [],
    isLoadingAgentTypes: agentTypesQuery.isLoading,
    
    // Actions
    executeMessage,
    executeWithConfirmation,
    setSelectedAgentType,
    getPromptPreview,
    clearResult,
    
    // Prompt preview
    promptPreview: previewPromptQuery.data?.prompt,
    isLoadingPromptPreview: previewPromptQuery.isLoading,
  };
}

export default useChatAgent;
