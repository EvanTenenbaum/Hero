/**
 * Agent Tools Module
 * 
 * Provides sandbox-aware tool implementations for agent execution.
 * All file and terminal operations are routed through the E2B sandbox.
 * 
 * @module server/agents/tools
 */

import { Sandbox } from '@e2b/code-interpreter';
import { REPO_PATH } from '../../services/sandboxManager';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Extended context for agent tool execution
 * Includes the E2B sandbox for remote operations
 */
export interface AgentToolContext {
  userId: number;
  projectId: number;
  agentId: number;
  executionId: number;
  sandbox: Sandbox | null;
  useCloudSandbox: boolean;
  repoPath: string;
}

/**
 * Result from a tool execution
 */
export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT FACTORY
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create a new agent tool context
 */
export function createToolContext(params: {
  userId: number;
  projectId: number;
  agentId: number;
  executionId: number;
  sandbox?: Sandbox | null;
  useCloudSandbox?: boolean;
}): AgentToolContext {
  return {
    userId: params.userId,
    projectId: params.projectId,
    agentId: params.agentId,
    executionId: params.executionId,
    sandbox: params.sandbox ?? null,
    useCloudSandbox: params.useCloudSandbox ?? false,
    repoPath: params.useCloudSandbox ? REPO_PATH : process.cwd(),
  };
}

// Re-export tool implementations
export * from './fs';
export * from './terminal';
export * from './github';
