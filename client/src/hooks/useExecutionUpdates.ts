/**
 * useExecutionUpdates Hook - Sprint 2 Agent Beta
 * 
 * Hook for receiving real-time execution updates via polling.
 * Provides live step-by-step progress for agent executions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';

export type ExecutionStatus = 'idle' | 'planning' | 'executing' | 'waiting_approval' | 'halted' | 'completed' | 'failed';
export type StepStatus = 'pending' | 'running' | 'awaiting_confirmation' | 'complete' | 'failed' | 'skipped';

export interface ExecutionStep {
  id: number;
  stepNumber: number;
  action: string;
  status: StepStatus;
  input?: string;
  output?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface ExecutionState {
  executionId: number;
  status: ExecutionStatus;
  currentStep: number;
  totalSteps: number;
  steps: ExecutionStep[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface UseExecutionUpdatesOptions {
  executionId?: number;
  pollingInterval?: number;
  enabled?: boolean;
  onStepComplete?: (step: ExecutionStep) => void;
  onExecutionComplete?: (state: ExecutionState) => void;
  onError?: (error: Error) => void;
}

export function useExecutionUpdates(options: UseExecutionUpdatesOptions = {}) {
  const {
    executionId,
    pollingInterval = 1000,
    enabled = true,
    onStepComplete,
    onExecutionComplete,
    onError,
  } = options;

  const [state, setState] = useState<ExecutionState | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const previousStepsRef = useRef<Map<number, StepStatus>>(new Map());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Query for execution steps
  const stepsQuery = trpc.executionSteps.list.useQuery(
    { executionId: executionId! },
    {
      enabled: enabled && !!executionId,
      refetchInterval: isPolling ? pollingInterval : false,
    }
  );

  // Query for execution status
  const executionQuery = trpc.agents.getExecution.useQuery(
    { id: executionId! },
    {
      enabled: enabled && !!executionId,
      refetchInterval: isPolling ? pollingInterval : false,
    }
  );

  // Process updates when data changes
  useEffect(() => {
    if (!executionId || !executionQuery.data) return;

    const execution = executionQuery.data;
    const steps = stepsQuery.data || [];

    // Build execution state
    const newState: ExecutionState = {
      executionId,
      status: execution.state as ExecutionStatus,
      currentStep: steps.filter(s => s.status === 'complete').length,
      totalSteps: steps.length,
      steps: steps.map(s => ({
        id: s.id,
        stepNumber: s.stepNumber,
        action: s.action,
        status: s.status as StepStatus,
        input: s.input ? JSON.stringify(s.input) : undefined,
        output: s.output ? JSON.stringify(s.output) : undefined,
        error: s.error || undefined,
        startedAt: s.startedAt ? new Date(s.startedAt) : undefined,
        completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
        durationMs: s.durationMs || undefined,
      })),
      startedAt: execution.startedAt ? new Date(execution.startedAt) : undefined,
      completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined,
      error: undefined,
    };

    // Check for newly completed steps
    for (const step of newState.steps) {
      const previousStatus = previousStepsRef.current.get(step.id);
      if (previousStatus !== 'complete' && step.status === 'complete') {
        onStepComplete?.(step);
      }
      previousStepsRef.current.set(step.id, step.status);
    }

    // Check for execution completion
    if (newState.status === 'completed' || newState.status === 'failed') {
      setIsPolling(false);
      onExecutionComplete?.(newState);
    }

    setState(newState);
  }, [executionId, executionQuery.data, stepsQuery.data, onStepComplete, onExecutionComplete]);

  // Handle errors
  useEffect(() => {
    if (executionQuery.error) {
      onError?.(executionQuery.error as unknown as Error);
    }
    if (stepsQuery.error) {
      onError?.(stepsQuery.error as unknown as Error);
    }
  }, [executionQuery.error, stepsQuery.error, onError]);

  /**
   * Start polling for updates
   */
  const startPolling = useCallback(() => {
    setIsPolling(true);
    previousStepsRef.current.clear();
  }, []);

  /**
   * Stop polling for updates
   */
  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  /**
   * Manually refresh the execution state
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      executionQuery.refetch(),
      stepsQuery.refetch(),
    ]);
  }, [executionQuery, stepsQuery]);

  /**
   * Reset the state
   */
  const reset = useCallback(() => {
    setState(null);
    previousStepsRef.current.clear();
    setIsPolling(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return {
    // State
    state,
    isPolling,
    isLoading: executionQuery.isLoading || stepsQuery.isLoading,
    error: executionQuery.error || stepsQuery.error,
    
    // Actions
    startPolling,
    stopPolling,
    refresh,
    reset,
    
    // Derived state
    isComplete: state?.status === 'completed' || state?.status === 'failed',
    progress: state ? (state.currentStep / Math.max(state.totalSteps, 1)) * 100 : 0,
  };
}

export default useExecutionUpdates;
