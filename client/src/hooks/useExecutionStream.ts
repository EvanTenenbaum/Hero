/**
 * React hook for subscribing to real-time agent execution updates via SSE
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface AgentStep {
  id: string;
  type: "thinking" | "action" | "result" | "error" | "checkpoint";
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionState {
  agentId: number;
  executionId: number;
  status: "running" | "paused" | "completed" | "failed" | "awaiting_approval";
  currentStep: number;
  maxSteps: number;
  tokensUsed: number;
  costIncurred: number;
  budgetLimit: number;
  steps: AgentStep[];
  goal?: string;
  uncertaintyLevel?: number;
}

interface UseExecutionStreamOptions {
  onStep?: (step: AgentStep) => void;
  onStateChange?: (state: ExecutionState) => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useExecutionStream(
  executionId: number | null,
  options: UseExecutionStreamOptions = {}
) {
  const {
    onStep,
    onStateChange,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [state, setState] = useState<ExecutionState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!executionId) return;
    
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const url = `/api/executions/${executionId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    eventSource.onerror = (e) => {
      setIsConnected(false);
      const err = new Error("Connection to execution stream lost");
      setError(err);
      onError?.(err);
      
      // Auto-reconnect
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };
    
    // Handle state updates
    eventSource.addEventListener("state", (e) => {
      try {
        const newState = JSON.parse(e.data) as ExecutionState;
        setState(newState);
        setSteps(newState.steps || []);
        onStateChange?.(newState);
      } catch (err) {
        console.error("Failed to parse state event:", err);
      }
    });
    
    // Handle step updates
    eventSource.addEventListener("step", (e) => {
      try {
        const step = JSON.parse(e.data) as AgentStep;
        setSteps(prev => [...prev, step]);
        onStep?.(step);
      } catch (err) {
        console.error("Failed to parse step event:", err);
      }
    });
    
    // Handle heartbeat (just to keep connection alive)
    eventSource.addEventListener("heartbeat", () => {
      // Connection is alive
    });
  }, [executionId, autoReconnect, reconnectInterval, onStep, onStateChange, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect when executionId changes
  useEffect(() => {
    if (executionId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [executionId, connect, disconnect]);

  // Clear steps when executionId changes
  useEffect(() => {
    setSteps([]);
    setState(null);
    setError(null);
  }, [executionId]);

  return {
    isConnected,
    steps,
    state,
    error,
    connect,
    disconnect,
  };
}

/**
 * Hook for polling execution status (fallback for environments without SSE)
 */
export function useExecutionPolling(
  executionId: number | null,
  interval: number = 2000
) {
  const [state, setState] = useState<ExecutionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!executionId) return;

    const fetchState = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/executions/${executionId}/state`);
        if (!response.ok) {
          throw new Error("Failed to fetch execution state");
        }
        const data = await response.json();
        setState(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchState();

    // Set up polling
    const pollInterval = setInterval(fetchState, interval);

    return () => {
      clearInterval(pollInterval);
    };
  }, [executionId, interval]);

  return {
    state,
    isLoading,
    error,
  };
}
