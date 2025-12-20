/**
 * Agent System - Main Export
 * 
 * This module exports all agent-related functionality for Hero IDE.
 */

// Prompt Templates
export {
  type AgentType,
  type PromptTemplate,
  type PromptContext,
  getTemplate,
  getAllTemplates,
  assemblePrompt,
  estimateTokens,
  validatePromptSize,
} from './promptTemplates';

// Safety Checker
export {
  type SafetyRule,
  type SafetyCheckResult,
  type ActionContext,
  checkSafety,
  checkMultipleActions,
  getDefaultRules,
  getRulesByCategory,
  createRule,
  validatePattern,
  formatCheckResult,
} from './safetyChecker';

// Execution Engine
export {
  type ExecutionState,
  type ExecutionStep,
  type ExecutionContext,
  type ExecutionResult,
  ExecutionEngine,
  createExecutionEngine,
  generateExecutionId,
} from './executionEngine';

// Tool Registry
export {
  type ToolParameter,
  type ToolDefinition,
  type ToolExecutionRequest,
  type ToolExecutionResult,
  toolRegistry,
  getToolRegistry,
  registerToolExecutor,
} from './toolRegistry';

// Context Builder
export {
  type ContextSource,
  type ContextBudget,
  type BuiltContext,
  ContextBuilder,
  createContextBuilder,
  buildQuickContext,
} from './contextBuilder';

// Session Manager
export {
  type SessionData,
  type SessionConfig,
  sessionManager,
  getSessionManager,
  createSessionManager,
} from './sessionManager';

// Logger
export {
  type LogLevel,
  type LogEntry,
  type LoggerConfig,
  agentLogger,
  getAgentLogger,
  createAgentLogger,
  formatLogEntry,
} from './logger';

// File Selector
export {
  type FileInfo,
  type FileSelectorConfig,
  calculateRelevance,
  shouldExclude,
  selectFiles,
  groupFilesByDirectory,
  generateFilesSummary,
  selectFilesForTask,
} from './fileSelector';

// Execution Replay
export {
  type ReplayStep,
  type ReplayLog,
  type ExecutionReplay,
  type ExecutionSummary,
  type TimelineEvent,
  buildExecutionReplay,
  compareExecutions,
  exportReplayToMarkdown,
} from './executionReplay';
