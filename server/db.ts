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

export async function getProjectsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.status, "active")))
    .orderBy(desc(projects.lastActivityAt));
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

export async function getAgentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents)
    .where(eq(agents.userId, userId))
    .orderBy(desc(agents.updatedAt));
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

// ════════════════════════════════════════════════════════════════════════════
// GITHUB CONNECTIONS
// ════════════════════════════════════════════════════════════════════════════

export async function upsertGitHubConnection(conn: InsertGitHubConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(githubConnections)
    .where(eq(githubConnections.userId, conn.userId))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(githubConnections).set(conn)
      .where(eq(githubConnections.userId, conn.userId));
    return { id: existing[0].id };
  } else {
    const result = await db.insert(githubConnections).values(conn);
    return { id: Number(result[0].insertId) };
  }
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
  
  const existing = await db.select().from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  
  if (existing.length > 0) return existing[0];
  
  await db.insert(userSettings).values({ userId });
  const result = await db.select().from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return result[0];
}

export async function updateUserSettings(userId: number, data: Partial<InsertUserSettings>) {
  const db = await getDb();
  if (!db) return;
  await db.update(userSettings).set(data).where(eq(userSettings.userId, userId));
}
