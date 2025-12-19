import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, bigint } from "drizzle-orm/mysql-core";

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
// CHAT CONVERSATIONS & MESSAGES
// ════════════════════════════════════════════════════════════════════════════

export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  title: varchar("title", { length: 255 }),
  type: mysqlEnum("type", ["general", "project", "agent"]).default("general").notNull(),
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
  type: mysqlEnum("type", ["coder", "reviewer", "planner", "custom"]).default("custom").notNull(),
  
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
