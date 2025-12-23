/**
 * useCloudSandbox Hook
 * 
 * React hook for managing cloud sandbox operations.
 * Provides methods for starting/stopping sandboxes and monitoring status.
 * 
 * @module client/src/hooks/useCloudSandbox
 */

import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface SandboxStatus {
  isRunning: boolean;
  sandboxId?: string;
  createdAt?: Date;
  lastAccessedAt?: Date;
  isHealthy?: boolean;
}

export interface UseCloudSandboxOptions {
  projectId: number;
  autoStart?: boolean;
  onStatusChange?: (status: SandboxStatus) => void;
  onError?: (error: unknown) => void;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════════════════════════

export function useCloudSandbox(options: UseCloudSandboxOptions) {
  const { projectId, autoStart = false, onStatusChange, onError } = options;
  const utils = trpc.useUtils();

  // State
  const [status, setStatus] = useState<SandboxStatus>({
    isRunning: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Queries - use 'status' endpoint
  const statusQuery = trpc.cloudSandbox.status.useQuery(
    { projectId },
    {
      enabled: !!projectId,
      refetchInterval: status.isRunning ? 10000 : false, // Poll every 10s when running
    }
  );

  // Update status when query data changes
  useEffect(() => {
    if (statusQuery.data) {
      const newStatus: SandboxStatus = {
        isRunning: statusQuery.data.isRunning,
        createdAt: statusQuery.data.createdAt,
        lastAccessedAt: statusQuery.data.lastAccessedAt,
        isHealthy: statusQuery.data.isHealthy,
      };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    }
  }, [statusQuery.data, onStatusChange]);

  // Handle query errors
  useEffect(() => {
    if (statusQuery.error) {
      onError?.(statusQuery.error);
    }
  }, [statusQuery.error, onError]);

  // Mutations
  const startMutation = trpc.cloudSandbox.start.useMutation({
    onSuccess: (data) => {
      setStatus({
        isRunning: true,
        sandboxId: data.sandboxId,
        createdAt: new Date(),
        isHealthy: true,
      });
      utils.cloudSandbox.status.invalidate({ projectId });
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const stopMutation = trpc.cloudSandbox.stop.useMutation({
    onSuccess: () => {
      setStatus({
        isRunning: false,
      });
      utils.cloudSandbox.status.invalidate({ projectId });
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const executeMutation = trpc.cloudSandbox.execute.useMutation({
    onError: (error) => {
      onError?.(error);
    },
  });

  // Actions
  const startSandbox = useCallback(async () => {
    setIsLoading(true);
    try {
      await startMutation.mutateAsync({ projectId });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, startMutation]);

  const stopSandbox = useCallback(async () => {
    setIsLoading(true);
    try {
      await stopMutation.mutateAsync({ projectId });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, stopMutation]);

  const executeCommand = useCallback(async (
    command: string,
    commandOptions?: { workingDir?: string; timeoutMs?: number }
  ) => {
    return executeMutation.mutateAsync({
      projectId,
      command,
      workingDir: commandOptions?.workingDir,
      timeoutMs: commandOptions?.timeoutMs,
    });
  }, [projectId, executeMutation]);

  const refreshStatus = useCallback(() => {
    statusQuery.refetch();
  }, [statusQuery]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !status.isRunning && !isLoading && !startMutation.isPending) {
      startSandbox();
    }
  }, [autoStart, status.isRunning, isLoading, startMutation.isPending, startSandbox]);

  return {
    // Status
    status,
    isLoading: isLoading || statusQuery.isLoading,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    error: statusQuery.error || startMutation.error || stopMutation.error,

    // Actions
    startSandbox,
    stopSandbox,
    executeCommand,
    refreshStatus,

    // Mutation states
    isExecuting: executeMutation.isPending,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CLOUD EXECUTION HOOK
// ════════════════════════════════════════════════════════════════════════════

export interface UseCloudExecutionOptions {
  projectId: number;
  onToolCall?: (toolCall: { toolName: string; status: string; output?: unknown }) => void;
  onComplete?: (result: { success: boolean; response?: string }) => void;
  onError?: (error: unknown) => void;
}

export function useCloudExecution(options: UseCloudExecutionOptions) {
  const { projectId, onToolCall, onComplete, onError } = options;

  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    response?: string;
    toolCalls?: Array<{ toolName: string; status: string; output?: unknown }>;
  } | null>(null);

  const executeMutation = trpc.chatAgent.executeInCloud.useMutation({
    onSuccess: (data) => {
      setLastResult({
        success: data.success,
        response: data.response ?? undefined,
        toolCalls: data.toolCalls,
      });

      // Notify about tool calls
      if (data.toolCalls) {
        for (const tc of data.toolCalls) {
          onToolCall?.(tc);
        }
      }

      onComplete?.({
        success: data.success,
        response: data.response ?? undefined,
      });
    },
    onError: (error) => {
      onError?.(error);
    },
    onSettled: () => {
      setIsExecuting(false);
    },
  });

  const statusQuery = trpc.chatAgent.getExecutionStatus.useQuery(
    { projectId },
    {
      enabled: isExecuting,
      refetchInterval: isExecuting ? 1000 : false,
    }
  );

  const cancelMutation = trpc.chatAgent.cancelExecution.useMutation();

  const execute = useCallback(async (
    message: string,
    agentType: 'pm' | 'developer' | 'qa' | 'devops' | 'research' = 'developer',
    conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  ) => {
    setIsExecuting(true);
    await executeMutation.mutateAsync({
      message,
      agentType,
      projectId,
      conversationHistory,
    });
  }, [projectId, executeMutation]);

  const cancel = useCallback(async () => {
    await cancelMutation.mutateAsync({ projectId });
    setIsExecuting(false);
  }, [projectId, cancelMutation]);

  return {
    // State
    isExecuting,
    lastResult,
    executionStatus: statusQuery.data,

    // Actions
    execute,
    cancel,

    // Mutation states
    isPending: executeMutation.isPending,
    isCancelling: cancelMutation.isPending,
    error: executeMutation.error,
  };
}

export default useCloudSandbox;
