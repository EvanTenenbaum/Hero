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

// Cloud Execution Engine (E2B Sandbox Integration)
export {
  type CloudExecutionState,
  type CloudExecutionStep,
  type CloudExecutionContext,
  type CloudExecutionResult,
  type CloudToolName,
  type CloudToolDefinition,
  CloudExecutionEngine,
  createCloudExecutionEngine,
  generateExecutionId as generateCloudExecutionId,
  getCloudToolDefinitions,
  getCloudToolByName,
  getCloudToolsByCategory,
} from './cloudExecutionEngine';

// ============================================
// Phase 1 & 2 Agent Improvements (New)
// ============================================

// Enhanced Prompt System
export {
  PromptBuilder,
  ContextInjector,
  OutputFormatter,
  TaskSpecificPrompts,
  type PromptTemplate as EnhancedPromptTemplate,
  type PromptContext as EnhancedPromptContext,
  type AgentTaskType,
  type LLMModel,
} from './enhancedPromptSystem';

// Self-Reflection Service
export {
  SelfReflectionService,
  selfReflectionService,
  ReflectionAnalyzer,
  PatternMatcher,
  ImprovementSuggester,
  type ExecutionResult as ReflectionExecutionResult,
  type AgentAction,
  type ReflectionAnalysis,
  type ImprovementSuggestion,
  type StoredReflection,
} from './selfReflectionService';

// Execution Pattern Learner
export {
  ExecutionPatternLearner,
  executionPatternLearner,
  ExecutionRecorder,
  PatternExtractor,
  SequenceOptimizer,
  FailureAnalyzer,
  type ExecutionRecord,
  type ExecutionPattern,
  type ToolCall as PatternToolCall,
  type FailureRecord,
} from './executionPatternLearner';

// Adaptive Agent Controller
export {
  AdaptiveAgentController,
  adaptiveAgentController,
  TaskComplexityAnalyzer,
  StrategySelector,
  ConfidenceTracker,
  FallbackManager,
  TaskComplexity,
  AgentStrategy,
  type AgentTask,
  type AgentMetrics,
  type AgentResult,
} from './adaptiveAgentController';

// Enhanced Cloud Chat Agent
export {
  EnhancedCloudChatAgent,
  createEnhancedAgent,
  type EnhancedAgentConfig,
  type ChatContext,
  type ChatAgentResult,
} from './enhancedCloudChatAgent';
