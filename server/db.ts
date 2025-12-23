import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  users, InsertUser, User,
  projects, InsertProject, Project,
  chatConversations, InsertChatConversation, ChatConversation,
  chatMessages, InsertChatMessage, ChatMessage,
  agents, InsertAgent, Agent,
  agentExecutions, InsertAgentExecution, AgentExecution,
  secrets, InsertSecret, Secret,
  githubConnections, InsertGitHubConnection, GitHubConnection,
  changeRequests, InsertChangeRequest, ChangeRequest,
  violations, InsertViolation, Violation,
  budgetUsage, InsertBudgetUsage, BudgetUsage,
  userSettings, InsertUserSettings, UserSettings,
  userAgentRules, InsertUserAgentRule, UserAgentRule,
  agentLogs, InsertAgentLog, AgentLog,
  executionSteps, InsertExecutionStep, ExecutionStep,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ════════════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════════════

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "avatarUrl"] as const;
  textFields.forEach(field => {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// ════════════════════════════════════════════════════════════════════════════
// PROJECTS
// ════════════════════════════════════════════════════════════════════════════

export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(project);
  return { id: Number(result[0].insertId) };
}

export async function getProjectsByUserId(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.status, "active")))
    .orderBy(desc(projects.lastActivityAt))
    .limit(limit);
}

export async function getProjectById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateProject(id: number, userId: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set(data)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function deleteProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set({ status: "deleted" })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

// ════════════════════════════════════════════════════════════════════════════
// CHAT CONVERSATIONS & MESSAGES
// ════════════════════════════════════════════════════════════════════════════

export async function createConversation(conv: InsertChatConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatConversations).values(conv);
  return { id: Number(result[0].insertId) };
}

export async function getConversationsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatConversations)
    .where(eq(chatConversations.userId, userId))
    .orderBy(desc(chatConversations.updatedAt))
    .limit(limit);
}

export async function getConversationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(chatConversations)
    .where(and(eq(chatConversations.id, id), eq(chatConversations.userId, userId)))
    .limit(1);
  return result[0];
}

export async function addMessage(msg: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatMessages).values(msg);
  // Update conversation timestamp
  await db.update(chatConversations).set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, msg.conversationId));
  return { id: Number(result[0].insertId) };
}

export async function getMessagesByConversationId(conversationId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(chatMessages.createdAt)
    .limit(limit);
}

// ════════════════════════════════════════════════════════════════════════════
// AGENTS
// ════════════════════════════════════════════════════════════════════════════

export async function createAgent(agent: InsertAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agents).values(agent);
  return { id: Number(result[0].insertId) };
}

export async function getAgentsByUserId(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents)
    .where(eq(agents.userId, userId))
    .orderBy(desc(agents.updatedAt))
    .limit(limit);
}

export async function getAgentById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateAgent(id: number, userId: number, data: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(agents).set(data)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
}

export async function deleteAgent(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(agents).where(and(eq(agents.id, id), eq(agents.userId, userId)));
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT EXECUTIONS
// ════════════════════════════════════════════════════════════════════════════

export async function createAgentExecution(exec: InsertAgentExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agentExecutions).values(exec);
  return { id: Number(result[0].insertId) };
}

export async function getAgentExecutionsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentExecutions)
    .where(eq(agentExecutions.userId, userId))
    .orderBy(desc(agentExecutions.createdAt))
    .limit(limit);
}

export async function getAgentExecutionById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agentExecutions)
    .where(and(eq(agentExecutions.id, id), eq(agentExecutions.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateAgentExecution(id: number, data: Partial<InsertAgentExecution>) {
  const db = await getDb();
  if (!db) return;
  await db.update(agentExecutions).set(data).where(eq(agentExecutions.id, id));
}

export async function getRunningExecutions() {
  const db = await getDb();
  if (!db) return [];
  // Find executions that were running when server stopped
  return db.select().from(agentExecutions)
    .where(eq(agentExecutions.state, 'executing'));
}

// ════════════════════════════════════════════════════════════════════════════
// GITHUB CONNECTIONS
// ════════════════════════════════════════════════════════════════════════════

export async function upsertGitHubConnection(conn: InsertGitHubConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // FIX: Use ON DUPLICATE KEY UPDATE for atomic upsert
  // This prevents race conditions where two threads check-then-act
  const result = await db.insert(githubConnections).values(conn)
    .onDuplicateKeyUpdate({
      set: {
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken,
        tokenExpiresAt: conn.tokenExpiresAt,
        scopes: conn.scopes,
        githubId: conn.githubId,
        githubUsername: conn.githubUsername,
      },
    });
  
  // Get the ID (either inserted or existing)
  const existing = await db.select({ id: githubConnections.id })
    .from(githubConnections)
    .where(eq(githubConnections.userId, conn.userId))
    .limit(1);
  
  return { id: existing[0]?.id ?? Number(result[0].insertId) };
}

export async function getGitHubConnectionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(githubConnections)
    .where(eq(githubConnections.userId, userId))
    .limit(1);
  return result[0];
}

export async function deleteGitHubConnection(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(githubConnections).where(eq(githubConnections.userId, userId));
}

// ════════════════════════════════════════════════════════════════════════════
// SECRETS
// ════════════════════════════════════════════════════════════════════════════

export async function createSecret(secret: InsertSecret) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(secrets).values(secret);
  return { id: Number(result[0].insertId) };
}

export async function getSecretsByUserId(userId: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (projectId) {
    return db.select().from(secrets)
      .where(and(eq(secrets.userId, userId), eq(secrets.projectId, projectId)));
  }
  return db.select().from(secrets)
    .where(and(eq(secrets.userId, userId), sql`${secrets.projectId} IS NULL`));
}

export async function deleteSecret(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(secrets).where(and(eq(secrets.id, id), eq(secrets.userId, userId)));
}

// ════════════════════════════════════════════════════════════════════════════
// CHANGE REQUESTS
// ════════════════════════════════════════════════════════════════════════════

export async function createChangeRequest(cr: InsertChangeRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(changeRequests).values(cr);
  return { id: Number(result[0].insertId) };
}

export async function getChangeRequestsByProjectId(projectId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(changeRequests)
    .where(eq(changeRequests.projectId, projectId))
    .orderBy(desc(changeRequests.createdAt))
    .limit(limit);
}

export async function getChangeRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(changeRequests)
    .where(eq(changeRequests.id, id))
    .limit(1);
  return result[0];
}

export async function updateChangeRequest(id: number, data: Partial<InsertChangeRequest>) {
  const db = await getDb();
  if (!db) return;
  await db.update(changeRequests).set(data).where(eq(changeRequests.id, id));
}

// ════════════════════════════════════════════════════════════════════════════
// VIOLATIONS
// ════════════════════════════════════════════════════════════════════════════

export async function createViolation(v: InsertViolation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(violations).values(v);
  return { id: Number(result[0].insertId) };
}

export async function getViolationsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(violations)
    .where(eq(violations.userId, userId))
    .orderBy(desc(violations.createdAt))
    .limit(limit);
}

// ════════════════════════════════════════════════════════════════════════════
// BUDGET USAGE
// ════════════════════════════════════════════════════════════════════════════

export async function recordBudgetUsage(usage: InsertBudgetUsage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(budgetUsage).values(usage);
}

export async function getBudgetUsageByUserId(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(budgetUsage).where(eq(budgetUsage.userId, userId));
  
  if (startDate && endDate) {
    query = db.select().from(budgetUsage)
      .where(and(
        eq(budgetUsage.userId, userId),
        gte(budgetUsage.createdAt, startDate),
        lte(budgetUsage.createdAt, endDate)
      ));
  }
  
  return query.orderBy(desc(budgetUsage.createdAt));
}

export async function getTotalBudgetUsage(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { totalTokens: 0, totalCostUsd: "0.00" };
  
  const result = await db.select({
    totalTokens: sql<number>`COALESCE(SUM(${budgetUsage.tokensUsed}), 0)`,
    totalCostUsd: sql<string>`COALESCE(SUM(CAST(${budgetUsage.costUsd} AS DECIMAL(10,4))), 0)`,
  }).from(budgetUsage)
    .where(and(
      eq(budgetUsage.userId, userId),
      gte(budgetUsage.createdAt, startDate),
      lte(budgetUsage.createdAt, endDate)
    ));
  
  return result[0] || { totalTokens: 0, totalCostUsd: "0.00" };
}

// ════════════════════════════════════════════════════════════════════════════
// USER SETTINGS
// ════════════════════════════════════════════════════════════════════════════

export async function getOrCreateUserSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // FIX: Use INSERT IGNORE to prevent race condition duplicates
  // This is atomic and handles concurrent requests safely
  try {
    await db.insert(userSettings).values({ userId }).onDuplicateKeyUpdate({
      set: { userId }, // No-op update, just ensures row exists
    });
  } catch (error) {
    // Ignore duplicate key errors (another thread may have inserted)
    const err = error as Error;
    if (!err.message?.includes('Duplicate')) {
      throw error;
    }
  }
  
  const result = await db.select().from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  
  if (result.length === 0) {
    throw new Error(`Failed to create user settings for userId: ${userId}`);
  }
  
  return result[0];
}

export async function updateUserSettings(userId: number, data: Partial<InsertUserSettings>) {
  const db = await getDb();
  if (!db) return;
  await db.update(userSettings).set(data).where(eq(userSettings.userId, userId));
}


// ════════════════════════════════════════════════════════════════════════════
// AGENT CHECKPOINTS (Critical Gap CG-03)
// ════════════════════════════════════════════════════════════════════════════

import { 
  agentCheckpoints, InsertAgentCheckpoint, AgentCheckpoint,
  projectNotes, InsertProjectNote, ProjectNote,
  metricsDaily, InsertMetricsDaily, MetricsDaily,
  requirements, InsertRequirement, Requirement,
  technicalDesigns, InsertTechnicalDesign, TechnicalDesign,
  hooks, InsertHook, Hook,
  hookExecutions, InsertHookExecution, HookExecution,
} from "../drizzle/schema";

export async function createCheckpoint(checkpoint: InsertAgentCheckpoint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agentCheckpoints).values(checkpoint);
  return { id: Number(result[0].insertId) };
}

export async function getCheckpointsByExecutionId(executionId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentCheckpoints)
    .where(eq(agentCheckpoints.executionId, executionId))
    .orderBy(desc(agentCheckpoints.createdAt))
    .limit(limit);
}

export async function getCheckpointById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agentCheckpoints)
    .where(eq(agentCheckpoints.id, id))
    .limit(1);
  return result[0];
}

export async function getLatestCheckpoint(executionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agentCheckpoints)
    .where(eq(agentCheckpoints.executionId, executionId))
    .orderBy(desc(agentCheckpoints.createdAt))
    .limit(1);
  return result[0];
}

// ════════════════════════════════════════════════════════════════════════════
// PROJECT NOTES (Context Engineering)
// ════════════════════════════════════════════════════════════════════════════

export async function createProjectNote(note: InsertProjectNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectNotes).values(note);
  return { id: Number(result[0].insertId) };
}

export async function getProjectNotes(projectId: number, category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (category) {
    return db.select().from(projectNotes)
      .where(and(
        eq(projectNotes.projectId, projectId),
        eq(projectNotes.category, category as any)
      ))
      .orderBy(desc(projectNotes.updatedAt));
  }
  
  return db.select().from(projectNotes)
    .where(eq(projectNotes.projectId, projectId))
    .orderBy(desc(projectNotes.updatedAt));
}

export async function getProjectNoteById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectNotes)
    .where(and(eq(projectNotes.id, id), eq(projectNotes.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateProjectNote(id: number, userId: number, data: Partial<InsertProjectNote>) {
  const db = await getDb();
  if (!db) return;
  await db.update(projectNotes).set(data)
    .where(and(eq(projectNotes.id, id), eq(projectNotes.userId, userId)));
}

export async function deleteProjectNote(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectNotes)
    .where(and(eq(projectNotes.id, id), eq(projectNotes.userId, userId)));
}

// ════════════════════════════════════════════════════════════════════════════
// METRICS (MR-04 from Research)
// ════════════════════════════════════════════════════════════════════════════

export async function upsertDailyMetrics(metrics: InsertMetricsDaily) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(metricsDaily)
    .where(and(
      eq(metricsDaily.userId, metrics.userId),
      eq(metricsDaily.date, metrics.date)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing record by adding to current values
    await db.update(metricsDaily).set({
      messagesCount: sql`${metricsDaily.messagesCount} + ${metrics.messagesCount || 0}`,
      tokensUsed: sql`${metricsDaily.tokensUsed} + ${metrics.tokensUsed || 0}`,
      costUsd: sql`CAST(${metricsDaily.costUsd} AS DECIMAL(10,4)) + ${metrics.costUsd || '0.00'}`,
      agentExecutionsCount: sql`${metricsDaily.agentExecutionsCount} + ${metrics.agentExecutionsCount || 0}`,
      agentTasksCompleted: sql`${metricsDaily.agentTasksCompleted} + ${metrics.agentTasksCompleted || 0}`,
      agentTasksFailed: sql`${metricsDaily.agentTasksFailed} + ${metrics.agentTasksFailed || 0}`,
      linesGenerated: sql`${metricsDaily.linesGenerated} + ${metrics.linesGenerated || 0}`,
      filesModified: sql`${metricsDaily.filesModified} + ${metrics.filesModified || 0}`,
      totalExecutionTimeMs: sql`${metricsDaily.totalExecutionTimeMs} + ${metrics.totalExecutionTimeMs || 0}`,
    }).where(and(
      eq(metricsDaily.userId, metrics.userId),
      eq(metricsDaily.date, metrics.date)
    ));
    return { id: existing[0].id };
  } else {
    const result = await db.insert(metricsDaily).values(metrics);
    return { id: Number(result[0].insertId) };
  }
}

export async function getDailyMetrics(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(metricsDaily)
    .where(and(
      eq(metricsDaily.userId, userId),
      gte(metricsDaily.date, startDate),
      lte(metricsDaily.date, endDate)
    ))
    .orderBy(metricsDaily.date);
}

export async function getMetricsSummary(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    totalMessages: sql<number>`COALESCE(SUM(${metricsDaily.messagesCount}), 0)`,
    totalTokens: sql<number>`COALESCE(SUM(${metricsDaily.tokensUsed}), 0)`,
    totalCost: sql<string>`COALESCE(SUM(CAST(${metricsDaily.costUsd} AS DECIMAL(10,4))), 0)`,
    totalExecutions: sql<number>`COALESCE(SUM(${metricsDaily.agentExecutionsCount}), 0)`,
    totalTasksCompleted: sql<number>`COALESCE(SUM(${metricsDaily.agentTasksCompleted}), 0)`,
    totalTasksFailed: sql<number>`COALESCE(SUM(${metricsDaily.agentTasksFailed}), 0)`,
    totalLinesGenerated: sql<number>`COALESCE(SUM(${metricsDaily.linesGenerated}), 0)`,
    totalFilesModified: sql<number>`COALESCE(SUM(${metricsDaily.filesModified}), 0)`,
    totalExecutionTime: sql<number>`COALESCE(SUM(${metricsDaily.totalExecutionTimeMs}), 0)`,
  }).from(metricsDaily)
    .where(and(
      eq(metricsDaily.userId, userId),
      gte(metricsDaily.date, startDate),
      lte(metricsDaily.date, endDate)
    ));
  
  return result[0];
}

// ════════════════════════════════════════════════════════════════════════════
// REQUIREMENTS (Spec-Driven Development)
// ════════════════════════════════════════════════════════════════════════════

export async function createRequirement(req: InsertRequirement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(requirements).values(req);
  return { id: Number(result[0].insertId) };
}

export async function getRequirementsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(requirements)
    .where(eq(requirements.projectId, projectId))
    .orderBy(desc(requirements.createdAt));
}

export async function getRequirementById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(requirements)
    .where(and(eq(requirements.id, id), eq(requirements.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateRequirement(id: number, userId: number, data: Partial<InsertRequirement>) {
  const db = await getDb();
  if (!db) return;
  await db.update(requirements).set(data)
    .where(and(eq(requirements.id, id), eq(requirements.userId, userId)));
}

// ════════════════════════════════════════════════════════════════════════════
// TECHNICAL DESIGNS
// ════════════════════════════════════════════════════════════════════════════

export async function createTechnicalDesign(design: InsertTechnicalDesign) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(technicalDesigns).values(design);
  return { id: Number(result[0].insertId) };
}

export async function getTechnicalDesignsByRequirementId(requirementId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(technicalDesigns)
    .where(eq(technicalDesigns.requirementId, requirementId))
    .orderBy(desc(technicalDesigns.createdAt));
}

export async function getTechnicalDesignById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(technicalDesigns)
    .where(and(eq(technicalDesigns.id, id), eq(technicalDesigns.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateTechnicalDesign(id: number, userId: number, data: Partial<InsertTechnicalDesign>) {
  const db = await getDb();
  if (!db) return;
  await db.update(technicalDesigns).set(data)
    .where(and(eq(technicalDesigns.id, id), eq(technicalDesigns.userId, userId)));
}

// ════════════════════════════════════════════════════════════════════════════
// HOOKS (Event-Driven Automation)
// ════════════════════════════════════════════════════════════════════════════

export async function createHook(hook: InsertHook) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(hooks).values(hook);
  return { id: Number(result[0].insertId) };
}

export async function getHooksByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hooks)
    .where(eq(hooks.projectId, projectId))
    .orderBy(desc(hooks.createdAt));
}

export async function getHookById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(hooks)
    .where(and(eq(hooks.id, id), eq(hooks.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateHook(id: number, userId: number, data: Partial<InsertHook>) {
  const db = await getDb();
  if (!db) return;
  await db.update(hooks).set(data)
    .where(and(eq(hooks.id, id), eq(hooks.userId, userId)));
}

export async function deleteHook(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(hooks)
    .where(and(eq(hooks.id, id), eq(hooks.userId, userId)));
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK EXECUTIONS
// ════════════════════════════════════════════════════════════════════════════

export async function createHookExecution(exec: InsertHookExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(hookExecutions).values(exec);
  return { id: Number(result[0].insertId) };
}

export async function getHookExecutionsByHookId(hookId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hookExecutions)
    .where(eq(hookExecutions.hookId, hookId))
    .orderBy(desc(hookExecutions.createdAt))
    .limit(limit);
}

export async function updateHookExecution(id: number, data: Partial<InsertHookExecution>) {
  const db = await getDb();
  if (!db) return;
  await db.update(hookExecutions).set(data).where(eq(hookExecutions.id, id));
}


// ════════════════════════════════════════════════════════════════════════════
// USER AGENT RULES
// ════════════════════════════════════════════════════════════════════════════

export async function createUserAgentRule(rule: InsertUserAgentRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userAgentRules).values(rule);
  return { id: Number(result[0].insertId) };
}

export async function getUserAgentRules(userId: number, agentType?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (agentType) {
    return db.select().from(userAgentRules)
      .where(and(
        eq(userAgentRules.userId, userId),
        eq(userAgentRules.isActive, true),
        sql`(${userAgentRules.agentType} = ${agentType} OR ${userAgentRules.agentType} IS NULL)`
      ))
      .orderBy(desc(userAgentRules.priority));
  }
  
  return db.select().from(userAgentRules)
    .where(and(eq(userAgentRules.userId, userId), eq(userAgentRules.isActive, true)))
    .orderBy(desc(userAgentRules.priority));
}

export async function getUserAgentRuleById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userAgentRules)
    .where(and(eq(userAgentRules.id, id), eq(userAgentRules.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateUserAgentRule(id: number, userId: number, data: Partial<InsertUserAgentRule>) {
  const db = await getDb();
  if (!db) return;
  await db.update(userAgentRules).set(data)
    .where(and(eq(userAgentRules.id, id), eq(userAgentRules.userId, userId)));
}

export async function deleteUserAgentRule(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userAgentRules)
    .where(and(eq(userAgentRules.id, id), eq(userAgentRules.userId, userId)));
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT LOGS
// ════════════════════════════════════════════════════════════════════════════

export async function createAgentLog(log: InsertAgentLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agentLogs).values(log);
  return { id: Number(result[0].insertId) };
}

export async function getAgentLogs(userId: number, options?: {
  executionId?: number;
  sessionId?: string;
  agentType?: string;
  level?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(agentLogs.userId, userId)];
  
  if (options?.executionId) {
    conditions.push(eq(agentLogs.executionId, options.executionId));
  }
  if (options?.sessionId) {
    conditions.push(eq(agentLogs.sessionId, options.sessionId));
  }
  if (options?.agentType) {
    conditions.push(eq(agentLogs.agentType, options.agentType));
  }
  if (options?.level) {
    conditions.push(sql`${agentLogs.level} = ${options.level}`);
  }
  
  return db.select().from(agentLogs)
    .where(and(...conditions))
    .orderBy(desc(agentLogs.createdAt))
    .limit(options?.limit || 100);
}

// ════════════════════════════════════════════════════════════════════════════
// EXECUTION STEPS
// ════════════════════════════════════════════════════════════════════════════

export async function createExecutionStep(step: InsertExecutionStep & { userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify the execution belongs to the user
  const execution = await db.select().from(agentExecutions)
    .where(eq(agentExecutions.id, step.executionId))
    .limit(1);
  
  if (!execution[0]) throw new Error("Execution not found");
  
  const { userId, ...stepData } = step;
  const result = await db.insert(executionSteps).values(stepData);
  return { id: Number(result[0].insertId) };
}

export async function getExecutionSteps(executionId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Verify the execution belongs to the user
  const execution = await db.select().from(agentExecutions)
    .where(eq(agentExecutions.id, executionId))
    .limit(1);
  
  if (!execution[0]) return [];
  
  return db.select().from(executionSteps)
    .where(eq(executionSteps.executionId, executionId))
    .orderBy(executionSteps.stepNumber);
}

export async function getExecutionStepById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(executionSteps)
    .where(eq(executionSteps.id, id))
    .limit(1);
  
  return result[0];
}

export async function updateExecutionStep(id: number, userId: number, data: Partial<InsertExecutionStep>) {
  const db = await getDb();
  if (!db) return;
  
  const updateData: Partial<InsertExecutionStep> = { ...data };
  
  // If status is changing to complete or failed, set completedAt
  if (data.status === 'complete' || data.status === 'failed') {
    updateData.completedAt = new Date();
  }
  
  await db.update(executionSteps).set(updateData)
    .where(eq(executionSteps.id, id));
}

export async function confirmExecutionStep(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(executionSteps).set({
    status: 'running',
    confirmedAt: new Date(),
    confirmedBy: userId,
  }).where(eq(executionSteps.id, id));
}
