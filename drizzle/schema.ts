import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, bigint, mediumtext } from "drizzle-orm/mysql-core";

// ════════════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════════════

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// GITHUB CONNECTIONS
// ════════════════════════════════════════════════════════════════════════════

export const githubConnections = mysqlTable("github_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  githubId: varchar("githubId", { length: 64 }).notNull(),
  githubUsername: varchar("githubUsername", { length: 255 }).notNull(),
  accessToken: text("accessToken").notNull(), // Encrypted
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  scopes: text("scopes"), // Comma-separated scopes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GitHubConnection = typeof githubConnections.$inferSelect;
export type InsertGitHubConnection = typeof githubConnections.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE DRIVE CONNECTIONS
// ════════════════════════════════════════════════════════════════════════════

export const driveConnections = mysqlTable("drive_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  googleId: varchar("googleId", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  scopes: text("scopes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DriveConnection = typeof driveConnections.$inferSelect;
export type InsertDriveConnection = typeof driveConnections.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// PROJECTS
// ════════════════════════════════════════════════════════════════════════════

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["local", "github", "imported"]).default("local").notNull(),
  
  // GitHub integration
  githubRepoId: varchar("githubRepoId", { length: 64 }),
  githubRepoFullName: varchar("githubRepoFullName", { length: 255 }),
  githubDefaultBranch: varchar("githubDefaultBranch", { length: 255 }),
  githubCloneUrl: text("githubCloneUrl"),
  
  // Project settings
  settings: json("settings").$type<{
    language?: string;
    framework?: string;
    buildCommand?: string;
    startCommand?: string;
    governanceEnabled?: boolean;
    budgetLimit?: number;
  }>(),
  
  // Status
  status: mysqlEnum("status", ["active", "archived", "deleted"]).default("active").notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// PROJECT NOTES (Context Engineering - Structured Note-Taking)
// ════════════════════════════════════════════════════════════════════════════

export const projectNotes = mysqlTable("project_notes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  
  // Note categorization
  category: mysqlEnum("category", [
    "architecture",    // System design decisions
    "decisions",       // Key technical decisions
    "todos",           // Pending tasks
    "bugs",            // Known issues
    "context",         // General context for AI
    "requirements",    // Project requirements
    "api"              // API documentation
  ]).default("context").notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  
  // Metadata for context retrieval
  tags: json("tags").$type<string[]>(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectNote = typeof projectNotes.$inferSelect;
export type InsertProjectNote = typeof projectNotes.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// CHAT CONVERSATIONS & MESSAGES
// ════════════════════════════════════════════════════════════════════════════

export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  title: varchar("title", { length: 255 }),
  type: mysqlEnum("type", ["general", "project", "agent"]).default("general").notNull(),
  
  // Context compaction tracking
  compactedAt: timestamp("compactedAt"),
  compactionSummary: text("compactionSummary"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  
  // Metadata
  model: varchar("model", { length: 64 }),
  tokensUsed: int("tokensUsed"),
  costUsd: varchar("costUsd", { length: 20 }), // Store as string for precision
  
  // For tool calls
  toolCalls: json("toolCalls").$type<Array<{
    id: string;
    name: string;
    arguments: string;
    result?: string;
  }>>(),
  
  // Compaction flag
  compacted: boolean("compacted").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// AGENTS
// ════════════════════════════════════════════════════════════════════════════

export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["coder", "reviewer", "planner", "frontend", "backend", "qa", "security", "docs", "refactor", "custom"]).default("custom").notNull(),
  
  // Role definition (from research)
  role: mysqlEnum("role", ["frontend", "backend", "qa", "security", "docs", "refactor", "general"]).default("general"),
  roleScope: json("roleScope").$type<{
    allowedDirectories?: string[];
    allowedTools?: string[];
    allowedOperations?: string[];
  }>(),
  
  // Configuration
  systemPrompt: text("systemPrompt"),
  model: varchar("model", { length: 64 }).default("gemini-2.5-flash"),
  temperature: varchar("temperature", { length: 10 }).default("0.7"),
  maxTokens: int("maxTokens").default(8192),
  
  // Safety settings
  maxSteps: int("maxSteps").default(10),
  uncertaintyThreshold: int("uncertaintyThreshold").default(70), // 0-100
  allowScopeExpansion: boolean("allowScopeExpansion").default(false),
  requireApprovalForChanges: boolean("requireApprovalForChanges").default(true),
  autoCheckpoint: boolean("autoCheckpoint").default(true),
  
  // Trust level (from research RE-02)
  trustLevel: mysqlEnum("trustLevel", ["low", "medium", "high"]).default("low"),
  
  // Budget
  budgetLimitUsd: varchar("budgetLimitUsd", { length: 20 }).default("1.00"),
  budgetLimitTokens: int("budgetLimitTokens").default(100000),
  
  // Rules
  rules: json("rules").$type<Array<{
    id: string;
    type: "allow" | "deny" | "require";
    pattern: string;
    description: string;
  }>>(),
  
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// AGENT EXECUTIONS
// ════════════════════════════════════════════════════════════════════════════

export const agentExecutions = mysqlTable("agent_executions", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  conversationId: int("conversationId"),
  
  // Goal
  goal: text("goal").notNull(),
  assumptions: json("assumptions").$type<string[]>(),
  stoppingConditions: json("stoppingConditions").$type<string[]>(),
  
  // State
  state: mysqlEnum("state", [
    "idle", "planning", "executing", "waiting_approval", 
    "halted", "completed", "failed"
  ]).default("idle").notNull(),
  
  // Progress
  currentStep: int("currentStep").default(0),
  totalSteps: int("totalSteps").default(0),
  steps: json("steps").$type<Array<{
    id: string;
    stepNumber: number;
    description: string;
    action: string;
    status: "pending" | "executing" | "completed" | "failed" | "skipped";
    preChecks?: {
      goalStillValid: boolean;
      scopeUnchanged: boolean;
      uncertaintyLevel: number;
      budgetRemaining: boolean;
      dependenciesMet: boolean;
    };
    result?: {
      success: boolean;
      output?: string;
      error?: string;
      changesApplied?: string[];
      rollbackAvailable?: boolean;
    };
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
  }>>(),
  
  // Halt info
  haltReason: mysqlEnum("haltReason", [
    "max_steps_reached", "uncertainty_threshold", "scope_expansion",
    "budget_exceeded", "user_requested", "violation_detected",
    "goal_invalid", "dependency_failed", "context_changed"
  ]),
  haltMessage: text("haltMessage"),
  
  // Metrics
  totalTokensUsed: int("totalTokensUsed").default(0),
  totalCostUsd: varchar("totalCostUsd", { length: 20 }).default("0.00"),
  totalDurationMs: int("totalDurationMs").default(0),
  
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentExecution = typeof agentExecutions.$inferSelect;
export type InsertAgentExecution = typeof agentExecutions.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// AGENT CHECKPOINTS (Critical Gap CG-03 from QA Analysis)
// ════════════════════════════════════════════════════════════════════════════

export const agentCheckpoints = mysqlTable("agent_checkpoints", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  executionId: int("executionId").notNull(),
  userId: int("userId").notNull(),
  
  // Checkpoint details
  stepNumber: int("stepNumber").notNull(),
  description: varchar("description", { length: 500 }),
  
  // State snapshot
  state: json("state").$type<{
    executionState: string;
    currentStep: number;
    steps: unknown[];
    context: Record<string, unknown>;
    filesModified: string[];
  }>().notNull(),
  
  // Rollback data
  rollbackData: json("rollbackData").$type<{
    fileSnapshots: Array<{
      path: string;
      content: string;
      action: "create" | "modify" | "delete";
    }>;
    dbChanges: unknown[];
  }>(),
  
  // Metadata
  automatic: boolean("automatic").default(true), // Auto vs manual checkpoint
  tokensUsedAtCheckpoint: int("tokensUsedAtCheckpoint").default(0),
  costAtCheckpoint: varchar("costAtCheckpoint", { length: 20 }).default("0.00"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentCheckpoint = typeof agentCheckpoints.$inferSelect;
export type InsertAgentCheckpoint = typeof agentCheckpoints.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// SECRETS
// ════════════════════════════════════════════════════════════════════════════

export const secrets = mysqlTable("secrets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"), // null = global secret
  name: varchar("name", { length: 255 }).notNull(),
  key: varchar("key", { length: 255 }).notNull(), // ENV var name
  encryptedValue: text("encryptedValue").notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["api_key", "oauth_token", "database", "other"]).default("other"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Secret = typeof secrets.$inferSelect;
export type InsertSecret = typeof secrets.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// GOVERNANCE - CHANGE REQUESTS
// ════════════════════════════════════════════════════════════════════════════

export const changeRequests = mysqlTable("change_requests", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  agentExecutionId: int("agentExecutionId"),
  
  // Change details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", [
    "code_change", "config_change", "dependency_change", 
    "schema_change", "deployment", "other"
  ]).default("code_change").notNull(),
  
  // Scope
  scope: json("scope").$type<{
    files: string[];
    directories: string[];
    estimatedImpact: "low" | "medium" | "high";
  }>(),
  
  // 8-step lifecycle
  lifecycleStep: mysqlEnum("lifecycleStep", [
    "declare_intent",      // Step 1
    "scope_definition",    // Step 2
    "risk_assessment",     // Step 3
    "preview_changes",     // Step 4
    "approval_request",    // Step 5
    "apply_changes",       // Step 6
    "verification",        // Step 7
    "completion"           // Step 8
  ]).default("declare_intent").notNull(),
  
  // Status
  status: mysqlEnum("status", [
    "draft", "pending_review", "approved", "rejected", 
    "in_progress", "completed", "rolled_back"
  ]).default("draft").notNull(),
  
  // Risk assessment
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]),
  riskFactors: json("riskFactors").$type<string[]>(),
  
  // Approval
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  
  // Changes
  changesApplied: json("changesApplied").$type<Array<{
    file: string;
    type: "create" | "modify" | "delete";
    diff?: string;
  }>>(),
  
  // Rollback
  rollbackAvailable: boolean("rollbackAvailable").default(false),
  rollbackData: json("rollbackData"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChangeRequest = typeof changeRequests.$inferSelect;
export type InsertChangeRequest = typeof changeRequests.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// GOVERNANCE - VIOLATIONS
// ════════════════════════════════════════════════════════════════════════════

export const violations = mysqlTable("violations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  userId: int("userId").notNull(),
  agentExecutionId: int("agentExecutionId"),
  changeRequestId: int("changeRequestId"),
  
  // Violation details
  type: mysqlEnum("type", [
    "scope_exceeded", "budget_exceeded", "unauthorized_change",
    "rule_violation", "safety_violation", "approval_bypassed"
  ]).notNull(),
  severity: mysqlEnum("severity", ["warning", "error", "critical"]).default("warning").notNull(),
  
  description: text("description").notNull(),
  context: json("context").$type<Record<string, unknown>>(),
  
  // Resolution
  resolved: boolean("resolved").default(false),
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  resolution: text("resolution"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Violation = typeof violations.$inferSelect;
export type InsertViolation = typeof violations.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// BUDGET TRACKING
// ════════════════════════════════════════════════════════════════════════════

export const budgetUsage = mysqlTable("budget_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  agentExecutionId: int("agentExecutionId"),
  
  // Usage
  tokensUsed: int("tokensUsed").notNull(),
  costUsd: varchar("costUsd", { length: 20 }).notNull(),
  model: varchar("model", { length: 64 }),
  operation: varchar("operation", { length: 64 }), // chat, agent, code_gen, etc.
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BudgetUsage = typeof budgetUsage.$inferSelect;
export type InsertBudgetUsage = typeof budgetUsage.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// USER SETTINGS
// ════════════════════════════════════════════════════════════════════════════

export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Budget limits
  monthlyBudgetLimitUsd: varchar("monthlyBudgetLimitUsd", { length: 20 }).default("50.00"),
  dailyBudgetLimitUsd: varchar("dailyBudgetLimitUsd", { length: 20 }).default("10.00"),
  
  // Model routing
  defaultModel: varchar("defaultModel", { length: 64 }).default("gemini-2.5-flash"),
  modelRouting: json("modelRouting").$type<{
    chat?: string;
    codeGeneration?: string;
    codeReview?: string;
    planning?: string;
  }>(),
  
  // Notifications
  notifyOnViolation: boolean("notifyOnViolation").default(true),
  notifyOnBudgetWarning: boolean("notifyOnBudgetWarning").default(true),
  notifyOnAgentCompletion: boolean("notifyOnAgentCompletion").default(true),
  
  // UI preferences
  theme: mysqlEnum("theme", ["light", "dark", "system"]).default("system"),
  sidebarCollapsed: boolean("sidebarCollapsed").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// SPEC-DRIVEN DEVELOPMENT - REQUIREMENTS (From Kiro Research)
// ════════════════════════════════════════════════════════════════════════════

export const requirements = mysqlTable("requirements", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  
  // Requirement details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // User stories (EARS notation)
  userStories: json("userStories").$type<Array<{
    id: string;
    role: string;
    want: string;
    benefit: string;
    acceptanceCriteria: string[];
  }>>(),
  
  // Assumptions and edge cases
  assumptions: json("assumptions").$type<string[]>(),
  edgeCases: json("edgeCases").$type<string[]>(),
  
  // Status
  status: mysqlEnum("status", ["draft", "pending_review", "approved", "rejected", "implemented"]).default("draft").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = typeof requirements.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// SPEC-DRIVEN DEVELOPMENT - TECHNICAL DESIGNS
// ════════════════════════════════════════════════════════════════════════════

export const technicalDesigns = mysqlTable("technical_designs", {
  id: int("id").autoincrement().primaryKey(),
  requirementId: int("requirementId").notNull(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  
  // Design details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Technical specifications
  dataFlow: json("dataFlow").$type<{
    description: string;
    components: Array<{ name: string; type: string; connections: string[] }>;
  }>(),
  
  interfaces: json("interfaces").$type<Array<{
    name: string;
    type: string;
    definition: string;
  }>>(),
  
  schemas: json("schemas").$type<Array<{
    name: string;
    type: "database" | "api" | "config";
    definition: string;
  }>>(),
  
  endpoints: json("endpoints").$type<Array<{
    method: string;
    path: string;
    description: string;
    requestBody?: string;
    responseBody?: string;
  }>>(),
  
  // Status
  status: mysqlEnum("status", ["draft", "pending_review", "approved", "rejected", "implemented"]).default("draft").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TechnicalDesign = typeof technicalDesigns.$inferSelect;
export type InsertTechnicalDesign = typeof technicalDesigns.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// EVENT-DRIVEN HOOKS (From Kiro Research)
// ════════════════════════════════════════════════════════════════════════════

export const hooks = mysqlTable("hooks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  
  // Hook configuration
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Trigger configuration
  triggerType: mysqlEnum("triggerType", [
    "file_save",      // Triggered when file is saved
    "file_create",    // Triggered when file is created
    "pre_commit",     // Triggered before commit
    "post_commit",    // Triggered after commit
    "schedule"        // Triggered on schedule
  ]).notNull(),
  
  // Pattern matching for file triggers
  triggerPattern: varchar("triggerPattern", { length: 500 }), // Glob pattern
  triggerDirectories: json("triggerDirectories").$type<string[]>(),
  
  // Action configuration
  action: text("action").notNull(), // What the hook should do
  systemPrompt: text("systemPrompt"), // Generated system prompt for LLM
  
  // Execution settings
  enabled: boolean("enabled").default(true),
  dryRunMode: boolean("dryRunMode").default(false),
  
  // Metadata
  lastExecutedAt: timestamp("lastExecutedAt"),
  executionCount: int("executionCount").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Hook = typeof hooks.$inferSelect;
export type InsertHook = typeof hooks.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// HOOK EXECUTIONS
// ════════════════════════════════════════════════════════════════════════════

export const hookExecutions = mysqlTable("hook_executions", {
  id: int("id").autoincrement().primaryKey(),
  hookId: int("hookId").notNull(),
  userId: int("userId").notNull(),
  
  // Trigger info
  triggerEvent: varchar("triggerEvent", { length: 255 }).notNull(),
  triggerData: json("triggerData").$type<Record<string, unknown>>(),
  
  // Execution result
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  result: text("result"),
  error: text("error"),
  
  // Metrics
  durationMs: int("durationMs"),
  tokensUsed: int("tokensUsed"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type HookExecution = typeof hookExecutions.$inferSelect;
export type InsertHookExecution = typeof hookExecutions.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// METRICS AGGREGATION (From GitHub Copilot Research MR-04)
// ════════════════════════════════════════════════════════════════════════════

export const metricsDaily = mysqlTable("metrics_daily", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  
  // Usage metrics
  messagesCount: int("messagesCount").default(0),
  tokensUsed: int("tokensUsed").default(0),
  costUsd: varchar("costUsd", { length: 20 }).default("0.00"),
  
  // Agent metrics
  agentExecutionsCount: int("agentExecutionsCount").default(0),
  agentTasksCompleted: int("agentTasksCompleted").default(0),
  agentTasksFailed: int("agentTasksFailed").default(0),
  
  // Code metrics
  linesGenerated: int("linesGenerated").default(0),
  filesModified: int("filesModified").default(0),
  
  // Time metrics
  totalExecutionTimeMs: int("totalExecutionTimeMs").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MetricsDaily = typeof metricsDaily.$inferSelect;
export type InsertMetricsDaily = typeof metricsDaily.$inferInsert;


// ════════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATES (Agent Configuration Framework - Phase 1)
// ════════════════════════════════════════════════════════════════════════════

export const promptTemplates = mysqlTable("prompt_templates", {
  id: int("id").autoincrement().primaryKey(),
  agentType: mysqlEnum("agentType", ["pm", "developer", "qa", "devops", "research"]).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  
  // Prompt sections
  identitySection: text("identitySection").notNull(),
  communicationSection: text("communicationSection").notNull(),
  toolsSection: text("toolsSection").notNull(),
  safetySection: text("safetySection").notNull(),
  
  // Metadata
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// USER AGENT RULES (Agent Configuration Framework - Phase 1)
// ════════════════════════════════════════════════════════════════════════════

export const userAgentRules = mysqlTable("user_agent_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentType: mysqlEnum("agentType", ["pm", "developer", "qa", "devops", "research"]), // NULL = all agents
  
  // Rule configuration
  ruleType: mysqlEnum("ruleType", ["instruction", "allow", "deny", "confirm"]).notNull(),
  ruleContent: text("ruleContent").notNull(),
  
  // Metadata
  isActive: boolean("isActive").default(true),
  priority: int("priority").default(0), // Higher = more important
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserAgentRule = typeof userAgentRules.$inferSelect;
export type InsertUserAgentRule = typeof userAgentRules.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// AGENT LOGS (Observability - Phase 5)
// ════════════════════════════════════════════════════════════════════════════

export const agentLogs = mysqlTable("agent_logs", {
  id: int("id").autoincrement().primaryKey(),
  executionId: int("executionId"),
  sessionId: varchar("sessionId", { length: 64 }),
  userId: int("userId").notNull(),
  agentType: varchar("agentType", { length: 50 }).notNull(),
  
  // Log details
  event: varchar("event", { length: 255 }).notNull(),
  level: mysqlEnum("level", ["debug", "info", "warn", "error"]).default("info").notNull(),
  data: json("data").$type<Record<string, unknown>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentLog = typeof agentLogs.$inferSelect;
export type InsertAgentLog = typeof agentLogs.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// EXECUTION STEPS (Execution Engine - Phase 2)
// ════════════════════════════════════════════════════════════════════════════

export const executionSteps = mysqlTable("execution_steps", {
  id: int("id").autoincrement().primaryKey(),
  executionId: int("executionId").notNull(),
  stepNumber: int("stepNumber").notNull(),
  
  // Step details
  action: varchar("action", { length: 255 }).notNull(),
  input: json("input").$type<Record<string, unknown>>(),
  output: json("output").$type<Record<string, unknown>>(),
  
  // Status
  status: mysqlEnum("status", ["pending", "running", "awaiting_confirmation", "complete", "failed", "skipped"]).default("pending").notNull(),
  requiresConfirmation: boolean("requiresConfirmation").default(false),
  confirmedAt: timestamp("confirmedAt"),
  confirmedBy: int("confirmedBy"),
  
  // Error tracking
  error: text("error"),
  
  // Timing
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  durationMs: int("durationMs"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExecutionStep = typeof executionSteps.$inferSelect;
export type InsertExecutionStep = typeof executionSteps.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// AGENT SESSIONS (Context Management - Phase 4)
// ════════════════════════════════════════════════════════════════════════════

export const agentSessions = mysqlTable("agent_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  agentType: varchar("agentType", { length: 50 }).notNull(),
  
  // Session state
  metadata: json("metadata").$type<Record<string, unknown>>(),
  
  // Timing
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = typeof agentSessions.$inferInsert;


// ════════════════════════════════════════════════════════════════════════════
// KANBAN BOARDS (PM-Centric IDE - Phase 1)
// ════════════════════════════════════════════════════════════════════════════

export const kanbanBoards = mysqlTable("kanban_boards", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Board settings
  settings: json("settings").$type<{
    defaultView?: "board" | "list" | "timeline";
    showLabels?: boolean;
    showAssignees?: boolean;
    showDueDates?: boolean;
    swimlaneBy?: "agent" | "priority" | "epic" | "label" | "none";
    cardSize?: "compact" | "normal" | "detailed";
  }>(),
  
  // Status
  isDefault: boolean("isDefault").default(false),
  archived: boolean("archived").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type InsertKanbanBoard = typeof kanbanBoards.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// KANBAN COLUMNS
// ════════════════════════════════════════════════════════════════════════════

export const kanbanColumns = mysqlTable("kanban_columns", {
  id: int("id").autoincrement().primaryKey(),
  boardId: int("boardId").notNull(),
  
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }), // Hex color
  
  // Column behavior
  columnType: mysqlEnum("columnType", [
    "backlog", "spec_writing", "design", "ready", 
    "in_progress", "review", "done", "blocked", "custom"
  ]).default("custom").notNull(),
  
  // Limits
  wipLimit: int("wipLimit"), // Work-in-progress limit
  
  // Ordering
  position: int("position").notNull().default(0),
  
  // Auto-move rules
  autoMoveRules: json("autoMoveRules").$type<Array<{
    trigger: "spec_approved" | "design_approved" | "pr_merged" | "tests_pass";
    targetColumnId: number;
  }>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type InsertKanbanColumn = typeof kanbanColumns.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// KANBAN CARDS
// ════════════════════════════════════════════════════════════════════════════

export const kanbanCards = mysqlTable("kanban_cards", {
  id: int("id").autoincrement().primaryKey(),
  boardId: int("boardId").notNull(),
  columnId: int("columnId").notNull(),
  
  // Card content
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  
  // Card type
  cardType: mysqlEnum("cardType", [
    "epic", "feature", "task", "bug", "spike", "chore"
  ]).default("task").notNull(),
  
  // Priority
  priority: mysqlEnum("priority", [
    "critical", "high", "medium", "low"
  ]).default("medium").notNull(),
  
  // Spec-driven fields
  specId: int("specId"), // Link to requirements table
  designId: int("designId"), // Link to technicalDesigns table
  acceptanceCriteria: json("acceptanceCriteria").$type<string[]>(),
  
  // Assignment
  assignedAgent: mysqlEnum("assignedAgent", [
    "pm", "developer", "qa", "devops", "research"
  ]),
  assignedUserId: int("assignedUserId"),
  assignedBy: mysqlEnum("assignedBy", ["human", "pm_agent"]).default("human"),
  
  // Parent/child relationships
  parentCardId: int("parentCardId"), // For subtasks
  epicId: int("epicId"), // For grouping under epics
  
  // Estimates
  estimatedTokens: int("estimatedTokens"),
  actualTokens: int("actualTokens"),
  estimatedMinutes: int("estimatedMinutes"),
  actualMinutes: int("actualMinutes"),
  storyPoints: int("storyPoints"),
  
  // Labels and metadata
  labels: json("labels").$type<string[]>(),
  
  // GitHub integration
  githubIssueId: varchar("githubIssueId", { length: 64 }),
  githubIssueNumber: int("githubIssueNumber"),
  githubPrId: varchar("githubPrId", { length: 64 }),
  githubPrNumber: int("githubPrNumber"),
  
  // Dates
  dueDate: timestamp("dueDate"),
  startDate: timestamp("startDate"),
  completedAt: timestamp("completedAt"),
  
  // Ordering within column
  position: int("position").notNull().default(0),
  
  // Status flags
  isBlocked: boolean("isBlocked").default(false),
  blockReason: text("blockReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KanbanCard = typeof kanbanCards.$inferSelect;
export type InsertKanbanCard = typeof kanbanCards.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// CARD DEPENDENCIES
// ════════════════════════════════════════════════════════════════════════════

export const cardDependencies = mysqlTable("card_dependencies", {
  id: int("id").autoincrement().primaryKey(),
  
  // The card that is blocked
  cardId: int("cardId").notNull(),
  
  // The card that is blocking
  blockedByCardId: int("blockedByCardId").notNull(),
  
  // Dependency type
  dependencyType: mysqlEnum("dependencyType", [
    "blocks",        // Must complete before
    "relates_to",    // Related but not blocking
    "duplicates",    // Duplicate of another card
    "parent_of"      // Parent-child relationship
  ]).default("blocks").notNull(),
  
  // Optional description
  description: text("description"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CardDependency = typeof cardDependencies.$inferSelect;
export type InsertCardDependency = typeof cardDependencies.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// CARD HISTORY (Audit Trail)
// ════════════════════════════════════════════════════════════════════════════

export const cardHistory = mysqlTable("card_history", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  
  // Who made the change
  userId: int("userId"),
  agentType: varchar("agentType", { length: 50 }),
  
  // What changed
  eventType: mysqlEnum("eventType", [
    "created", "updated", "moved", "assigned", "unassigned",
    "labeled", "unlabeled", "commented", "spec_linked", "design_linked",
    "blocked", "unblocked", "completed", "reopened", "archived"
  ]).notNull(),
  
  // Change details
  field: varchar("field", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  
  // For moves between columns
  fromColumnId: int("fromColumnId"),
  toColumnId: int("toColumnId"),
  
  // Optional comment
  comment: text("comment"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CardHistory = typeof cardHistory.$inferSelect;
export type InsertCardHistory = typeof cardHistory.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// CARD COMMENTS
// ════════════════════════════════════════════════════════════════════════════

export const cardComments = mysqlTable("card_comments", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  
  // Author
  userId: int("userId"),
  agentType: varchar("agentType", { length: 50 }),
  
  // Content
  content: text("content").notNull(),
  
  // For threaded comments
  parentCommentId: int("parentCommentId"),
  
  // Reactions
  reactions: json("reactions").$type<Record<string, number>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CardComment = typeof cardComments.$inferSelect;
export type InsertCardComment = typeof cardComments.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// BOARD LABELS
// ════════════════════════════════════════════════════════════════════════════

export const boardLabels = mysqlTable("board_labels", {
  id: int("id").autoincrement().primaryKey(),
  boardId: int("boardId").notNull(),
  
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 20 }).notNull(), // Hex color
  description: text("description"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BoardLabel = typeof boardLabels.$inferSelect;
export type InsertBoardLabel = typeof boardLabels.$inferInsert;


// ════════════════════════════════════════════════════════════════════════════
// CONTEXT ENGINE - CODE CHUNKS
// ════════════════════════════════════════════════════════════════════════════

export const contextChunks = mysqlTable("context_chunks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  
  // File information
  filePath: varchar("filePath", { length: 1024 }).notNull(),
  fileHash: varchar("fileHash", { length: 64 }).notNull(), // SHA-256 of file content
  
  // Chunk location
  startLine: int("startLine").notNull(),
  endLine: int("endLine").notNull(),
  startColumn: int("startColumn").default(0),
  endColumn: int("endColumn"),
  
  // Chunk type and metadata
  chunkType: mysqlEnum("chunkType", [
    "function",
    "class",
    "interface",
    "type",
    "component",
    "hook",
    "constant",
    "import",
    "export",
    "comment",
    "block",
    "file_summary"
  ]).notNull(),
  
  // Identifiers
  name: varchar("name", { length: 255 }), // Function/class/component name
  parentName: varchar("parentName", { length: 255 }), // Parent class/component if nested
  
  // Content
  content: text("content").notNull(), // The actual code chunk
  summary: text("summary"), // AI-generated summary of the chunk
  
  // Semantic information
  language: varchar("language", { length: 50 }).default("typescript"),
  imports: json("imports").$type<string[]>(), // Dependencies this chunk imports
  exports: json("exports").$type<string[]>(), // What this chunk exports
  references: json("references").$type<string[]>(), // Other chunks this references
  
  // Embedding for semantic search
  embedding: json("embedding").$type<number[]>(), // Vector embedding
  embeddingModel: varchar("embeddingModel", { length: 64 }),
  
  // Search optimization
  keywords: text("keywords"), // Extracted keywords for trigram search
  tokenCount: int("tokenCount"), // Token count for budget management
  
  // Metadata
  lastIndexedAt: timestamp("lastIndexedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContextChunk = typeof contextChunks.$inferSelect;
export type InsertContextChunk = typeof contextChunks.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT ENGINE - QUERY HISTORY
// ════════════════════════════════════════════════════════════════════════════

export const contextQueries = mysqlTable("context_queries", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  
  // Query information
  query: text("query").notNull(),
  queryType: mysqlEnum("queryType", ["keyword", "semantic", "hybrid"]).default("hybrid").notNull(),
  
  // Query embedding for semantic search
  queryEmbedding: json("queryEmbedding").$type<number[]>(),
  
  // Results
  resultChunkIds: json("resultChunkIds").$type<number[]>(),
  resultCount: int("resultCount").default(0),
  
  // Performance metrics
  searchTimeMs: int("searchTimeMs"),
  tokensUsed: int("tokensUsed"),
  
  // Feedback for ranking improvement
  relevanceFeedback: json("relevanceFeedback").$type<Record<number, number>>(), // chunkId -> rating
  
  // Context
  conversationId: int("conversationId"),
  agentExecutionId: int("agentExecutionId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContextQuery = typeof contextQueries.$inferSelect;
export type InsertContextQuery = typeof contextQueries.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT ENGINE - INDEXING STATUS
// ════════════════════════════════════════════════════════════════════════════

export const contextIndexStatus = mysqlTable("context_index_status", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  
  // Status
  status: mysqlEnum("status", ["idle", "indexing", "completed", "failed"]).default("idle").notNull(),
  
  // Progress
  totalFiles: int("totalFiles").default(0),
  indexedFiles: int("indexedFiles").default(0),
  totalChunks: int("totalChunks").default(0),
  
  // Timing
  lastFullIndexAt: timestamp("lastFullIndexAt"),
  lastIncrementalAt: timestamp("lastIncrementalAt"),
  indexDurationMs: int("indexDurationMs"),
  
  // Error tracking
  lastError: text("lastError"),
  errorCount: int("errorCount").default(0),
  
  // Configuration
  excludePatterns: json("excludePatterns").$type<string[]>(), // Glob patterns to exclude
  includePatterns: json("includePatterns").$type<string[]>(), // Glob patterns to include
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContextIndexStatus = typeof contextIndexStatus.$inferSelect;
export type InsertContextIndexStatus = typeof contextIndexStatus.$inferInsert;


// ════════════════════════════════════════════════════════════════════════════
// SPECS SYSTEM (Sprint 3: Prompt-to-Plan Workflow)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Specs - Feature specifications with EARS format requirements
 * Implements the Prompt-to-Plan workflow: Specify → Design → Tasks → Implement
 */
export const specs = mysqlTable("specs", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  
  // Spec metadata
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  
  // Workflow phase tracking
  phase: mysqlEnum("phase", ["specify", "design", "tasks", "implement", "complete"]).default("specify").notNull(),
  phaseStatus: mysqlEnum("phaseStatus", ["draft", "pending_review", "approved", "rejected"]).default("draft").notNull(),
  
  // Overall status
  status: mysqlEnum("status", ["draft", "review", "approved", "implemented", "archived"]).default("draft").notNull(),
  priority: mysqlEnum("priority", ["critical", "high", "medium", "low"]).default("medium").notNull(),
  
  // Original user prompt
  originalPrompt: text("originalPrompt"),
  
  // SPECIFY PHASE: EARS-format requirements
  overview: text("overview"),
  requirements: json("requirements").$type<{
    id: string;
    type: "ubiquitous" | "event_driven" | "state_driven" | "optional" | "unwanted" | "complex";
    precondition?: string;
    trigger?: string;
    system: string;
    response: string;
    rawText: string;
    rationale?: string;
    acceptanceCriteria?: string[];
  }[]>(),
  
  // Intent clarification history
  clarifications: json("clarifications").$type<{
    question: string;
    answer: string;
    timestamp: number;
  }[]>(),
  
  // DESIGN PHASE: Technical design
  technicalDesign: text("technicalDesign"),
  dataModel: text("dataModel"),
  apiDesign: text("apiDesign"),
  
  // Mermaid diagrams
  diagrams: json("diagrams").$type<{
    type: "er" | "sequence" | "flow" | "class";
    title: string;
    mermaidCode: string;
  }[]>(),
  
  // File change manifest
  fileManifest: json("fileManifest").$type<{
    action: "create" | "modify" | "delete";
    path: string;
    description: string;
    estimatedLines?: number;
  }[]>(),
  
  uiMockups: json("uiMockups").$type<{
    name: string;
    description: string;
    imageUrl?: string;
  }[]>(),
  
  // TASKS PHASE: Task breakdown
  taskBreakdown: json("taskBreakdown").$type<{
    id: string;
    title: string;
    description: string;
    requirementIds: string[];
    dependencies: string[];
    estimatedHours: number;
    assignedAgentType?: string;
    status: "pending" | "in_progress" | "completed";
  }[]>(),
  
  // Dependency graph (adjacency list)
  dependencyGraph: json("dependencyGraph").$type<{
    nodes: { id: string; label: string; type: string }[];
    edges: { from: string; to: string; type: string }[];
  }>(),
  
  // IMPLEMENT PHASE: Execution tracking
  implementationProgress: json("implementationProgress").$type<{
    taskId: string;
    status: "pending" | "executing" | "completed" | "failed";
    startedAt?: number;
    completedAt?: number;
    executionId?: number;
    verificationResult?: {
      passed: boolean;
      issues: string[];
    };
  }[]>(),
  
  // Implementation tracking
  estimatedHours: int("estimatedHours"),
  actualHours: int("actualHours"),
  completionPercentage: int("completionPercentage").default(0),
  
  // Relationships
  parentSpecId: int("parentSpecId"),
  
  // Version control
  currentVersion: int("currentVersion").default(1).notNull(),
  
  // Phase approval history
  approvalHistory: json("approvalHistory").$type<{
    phase: string;
    action: "approved" | "rejected" | "edited";
    feedback?: string;
    userId: number;
    timestamp: number;
  }[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Spec = typeof specs.$inferSelect;
export type InsertSpec = typeof specs.$inferInsert;

/**
 * Spec Versions - Version history for specs
 */
export const specVersions = mysqlTable("spec_versions", {
  id: int("id").primaryKey().autoincrement(),
  specId: int("specId").notNull(),
  version: int("version").notNull(),
  
  // Snapshot of spec content at this version
  title: varchar("title", { length: 500 }).notNull(),
  overview: text("overview"),
  requirements: json("requirements"),
  technicalDesign: text("technicalDesign"),
  dataModel: text("dataModel"),
  apiDesign: text("apiDesign"),
  
  // Change metadata
  changeType: mysqlEnum("changeType", ["created", "updated", "status_change", "approved"]).notNull(),
  changeSummary: text("changeSummary"),
  changedBy: int("changedBy").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpecVersion = typeof specVersions.$inferSelect;
export type InsertSpecVersion = typeof specVersions.$inferInsert;

/**
 * Spec Card Links - Links specs to kanban cards
 */
export const specCardLinks = mysqlTable("spec_card_links", {
  id: int("id").primaryKey().autoincrement(),
  specId: int("specId").notNull(),
  cardId: int("cardId").notNull(),
  linkType: mysqlEnum("linkType", ["implements", "blocks", "related"]).default("implements").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpecCardLink = typeof specCardLinks.$inferSelect;
export type InsertSpecCardLink = typeof specCardLinks.$inferInsert;

/**
 * Spec Comments - Discussion threads on specs
 */
export const specComments = mysqlTable("spec_comments", {
  id: int("id").primaryKey().autoincrement(),
  specId: int("specId").notNull(),
  userId: int("userId").notNull(),
  parentCommentId: int("parentCommentId"),
  content: text("content").notNull(),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpecComment = typeof specComments.$inferSelect;
export type InsertSpecComment = typeof specComments.$inferInsert;


// ════════════════════════════════════════════════════════════════════════════
// CLONED REPOSITORIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tracks repositories that have been cloned to the server workspace.
 * Supports shallow cloning, sparse checkout, and sync status tracking.
 */
export const clonedRepos = mysqlTable("cloned_repos", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  githubRepoId: int("githubRepoId").notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(), // owner/repo
  defaultBranch: varchar("defaultBranch", { length: 255 }).default("main"),
  currentBranch: varchar("currentBranch", { length: 255 }),
  clonePath: varchar("clonePath", { length: 500 }), // Server filesystem path
  cloneStatus: mysqlEnum("cloneStatus", ["pending", "cloning", "ready", "error", "syncing"]).default("pending").notNull(),
  cloneDepth: int("cloneDepth").default(1), // Shallow clone depth
  sparseCheckoutPaths: json("sparseCheckoutPaths").$type<string[]>(), // Paths for sparse checkout
  lastCommitSha: varchar("lastCommitSha", { length: 40 }),
  lastSyncedAt: timestamp("lastSyncedAt"),
  syncError: text("syncError"),
  diskSizeBytes: bigint("diskSizeBytes", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClonedRepo = typeof clonedRepos.$inferSelect;
export type InsertClonedRepo = typeof clonedRepos.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// WEBHOOK EVENTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Logs incoming GitHub webhook events for processing and audit.
 * Uses delivery_id for idempotency and replay attack prevention.
 */
export const webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: varchar("deliveryId", { length: 100 }).notNull().unique(), // X-GitHub-Delivery header
  eventType: varchar("eventType", { length: 50 }).notNull(), // X-GitHub-Event header
  action: varchar("action", { length: 50 }), // action field from payload
  repoFullName: varchar("repoFullName", { length: 255 }),
  senderId: int("senderId"), // GitHub user ID who triggered
  senderLogin: varchar("senderLogin", { length: 255 }),
  payload: json("payload").$type<Record<string, unknown>>(),
  processed: boolean("processed").default(false).notNull(),
  processedAt: timestamp("processedAt"),
  processingError: text("processingError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// MERGE CONFLICTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tracks merge conflicts detected during branch operations.
 * Stores 3-way diff content for resolution UI.
 */
export const mergeConflicts = mysqlTable("merge_conflicts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  clonedRepoId: int("clonedRepoId").notNull(),
  sourceBranch: varchar("sourceBranch", { length: 255 }).notNull(),
  targetBranch: varchar("targetBranch", { length: 255 }).notNull(),
  filePath: varchar("filePath", { length: 500 }).notNull(),
  conflictType: mysqlEnum("conflictType", ["content", "rename", "delete_modify", "binary"]).default("content").notNull(),
  baseContent: mediumtext("baseContent"), // Common ancestor
  oursContent: mediumtext("oursContent"), // Target branch version
  theirsContent: mediumtext("theirsContent"), // Source branch version
  conflictMarkers: mediumtext("conflictMarkers"), // Raw conflict markers
  resolution: mediumtext("resolution"), // Resolved content
  resolutionStrategy: mysqlEnum("resolutionStrategy", ["ours", "theirs", "manual", "ai"]),
  aiSuggestion: mediumtext("aiSuggestion"), // AI-suggested resolution
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MergeConflict = typeof mergeConflicts.$inferSelect;
export type InsertMergeConflict = typeof mergeConflicts.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// PULL REQUESTS (Local Tracking)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tracks pull requests with local metadata and AI review status.
 * Syncs with GitHub but adds Hero IDE-specific features.
 */
export const pullRequests = mysqlTable("pull_requests", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  clonedRepoId: int("clonedRepoId"),
  githubPrNumber: int("githubPrNumber").notNull(),
  githubPrId: bigint("githubPrId", { mode: "number" }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  body: mediumtext("body"),
  state: mysqlEnum("state", ["open", "closed", "merged"]).default("open").notNull(),
  sourceBranch: varchar("sourceBranch", { length: 255 }).notNull(),
  targetBranch: varchar("targetBranch", { length: 255 }).notNull(),
  authorGithubId: int("authorGithubId"),
  authorLogin: varchar("authorLogin", { length: 255 }),
  isDraft: boolean("isDraft").default(false),
  mergeable: boolean("mergeable"),
  mergeableState: varchar("mergeableState", { length: 50 }), // clean, dirty, blocked, etc.
  additions: int("additions").default(0),
  deletions: int("deletions").default(0),
  changedFiles: int("changedFiles").default(0),
  // AI Review
  aiReviewStatus: mysqlEnum("aiReviewStatus", ["pending", "in_progress", "completed", "skipped"]),
  aiReviewSummary: mediumtext("aiReviewSummary"),
  aiReviewScore: int("aiReviewScore"), // 0-100 quality score
  aiReviewedAt: timestamp("aiReviewedAt"),
  // Linked card
  linkedCardId: int("linkedCardId"),
  // Timestamps
  githubCreatedAt: timestamp("githubCreatedAt"),
  githubUpdatedAt: timestamp("githubUpdatedAt"),
  githubMergedAt: timestamp("githubMergedAt"),
  githubClosedAt: timestamp("githubClosedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PullRequest = typeof pullRequests.$inferSelect;
export type InsertPullRequest = typeof pullRequests.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// GITHUB ISSUES (Local Tracking)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tracks GitHub issues with bidirectional sync to Kanban cards.
 */
export const githubIssues = mysqlTable("github_issues", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  githubIssueNumber: int("githubIssueNumber").notNull(),
  githubIssueId: bigint("githubIssueId", { mode: "number" }).notNull(),
  repoFullName: varchar("repoFullName", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  body: mediumtext("body"),
  state: mysqlEnum("state", ["open", "closed"]).default("open").notNull(),
  authorGithubId: int("authorGithubId"),
  authorLogin: varchar("authorLogin", { length: 255 }),
  labels: json("labels").$type<Array<{ name: string; color: string }>>(),
  assignees: json("assignees").$type<Array<{ login: string; id: number }>>(),
  milestone: varchar("milestone", { length: 255 }),
  // Linked card for bidirectional sync
  linkedCardId: int("linkedCardId"),
  syncDirection: mysqlEnum("syncDirection", ["github_to_card", "card_to_github", "bidirectional"]).default("bidirectional"),
  lastSyncedAt: timestamp("lastSyncedAt"),
  // Timestamps
  githubCreatedAt: timestamp("githubCreatedAt"),
  githubUpdatedAt: timestamp("githubUpdatedAt"),
  githubClosedAt: timestamp("githubClosedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GitHubIssue = typeof githubIssues.$inferSelect;
export type InsertGitHubIssue = typeof githubIssues.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// PR REVIEW COMMENTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Stores PR review comments including AI-generated suggestions.
 */
export const prReviewComments = mysqlTable("pr_review_comments", {
  id: int("id").autoincrement().primaryKey(),
  pullRequestId: int("pullRequestId").notNull(),
  githubCommentId: bigint("githubCommentId", { mode: "number" }),
  filePath: varchar("filePath", { length: 500 }),
  lineNumber: int("lineNumber"),
  side: mysqlEnum("side", ["LEFT", "RIGHT"]).default("RIGHT"),
  body: mediumtext("body").notNull(),
  authorType: mysqlEnum("authorType", ["human", "ai"]).default("human").notNull(),
  authorGithubId: int("authorGithubId"),
  authorLogin: varchar("authorLogin", { length: 255 }),
  suggestionType: mysqlEnum("suggestionType", ["bug", "security", "performance", "style", "documentation", "other"]),
  severity: mysqlEnum("severity", ["critical", "warning", "info"]),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PrReviewComment = typeof prReviewComments.$inferSelect;
export type InsertPrReviewComment = typeof prReviewComments.$inferInsert;
