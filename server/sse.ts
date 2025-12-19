/**
 * Server-Sent Events (SSE) handler for real-time agent execution updates
 */

import { Request, Response } from "express";
import { subscribeToExecution, getExecutionState, AgentStep } from "./agentExecution";

/**
 * SSE endpoint handler for agent execution updates
 * Usage: GET /api/executions/:executionId/stream
 */
export function handleExecutionStream(req: Request, res: Response): void {
  const executionId = parseInt(req.params.executionId, 10);
  
  if (isNaN(executionId)) {
    res.status(400).json({ error: "Invalid execution ID" });
    return;
  }
  
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  
  // Send initial state if available
  const currentState = getExecutionState(executionId);
  if (currentState) {
    sendEvent(res, "state", currentState);
  }
  
  // Subscribe to updates
  const unsubscribe = subscribeToExecution(executionId, (step: AgentStep) => {
    sendEvent(res, "step", step);
  });
  
  // Handle client disconnect
  req.on("close", () => {
    unsubscribe();
    res.end();
  });
  
  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    sendEvent(res, "heartbeat", { timestamp: new Date().toISOString() });
  }, 30000);
  
  req.on("close", () => {
    clearInterval(heartbeatInterval);
  });
}

/**
 * Send an SSE event
 */
function sendEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Create a simple event emitter for execution updates
 * This can be used by the routers to emit events
 */
export class ExecutionEventEmitter {
  private listeners: Map<number, Set<(event: AgentStep) => void>> = new Map();
  
  subscribe(executionId: number, callback: (event: AgentStep) => void): () => void {
    if (!this.listeners.has(executionId)) {
      this.listeners.set(executionId, new Set());
    }
    this.listeners.get(executionId)!.add(callback);
    
    return () => {
      const listeners = this.listeners.get(executionId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(executionId);
        }
      }
    };
  }
  
  emit(executionId: number, step: AgentStep): void {
    const listeners = this.listeners.get(executionId);
    if (listeners) {
      listeners.forEach(callback => callback(step));
    }
  }
}

export const executionEmitter = new ExecutionEventEmitter();
