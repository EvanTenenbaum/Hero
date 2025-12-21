/**
 * Budget Service
 * 
 * Provides budget allocation, cost tracking, and usage monitoring.
 * Supports token budgets, API call limits, and compute hour tracking.
 */

import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  budgets,
  costEntries,
  dailyCostAggregates,
  type Budget,
  type InsertBudget,
  type CostEntry,
  type InsertCostEntry,
  type DailyCostAggregate,
  type InsertDailyCostAggregate,
} from "../../drizzle/schema";

// ════════════════════════════════════════════════════════════════════════════
// BUDGET CRUD OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

export async function createBudget(data: InsertBudget): Promise<Budget> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const [result] = await db.insert(budgets).values(data);
  
  const [budget] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, result.insertId));
  
  return budget;
}

export async function getBudget(id: number): Promise<Budget | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
  return budget || null;
}

export async function getBudgetsByProject(projectId: number): Promise<Budget[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(budgets)
    .where(eq(budgets.projectId, projectId))
    .orderBy(desc(budgets.createdAt));
}

export async function getBudgetsBySprint(sprintId: number): Promise<Budget[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(budgets)
    .where(eq(budgets.sprintId, sprintId))
    .orderBy(desc(budgets.createdAt));
}

export async function updateBudget(
  id: number,
  data: Partial<InsertBudget>
): Promise<Budget | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(budgets).set(data).where(eq(budgets.id, id));
  return getBudget(id);
}

export async function deleteBudget(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.delete(budgets).where(eq(budgets.id, id));
  return result[0].affectedRows > 0;
}

// ════════════════════════════════════════════════════════════════════════════
// COST TRACKING
// ════════════════════════════════════════════════════════════════════════════

export async function recordCost(data: InsertCostEntry): Promise<CostEntry> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // Calculate total cost if not provided
  const totalCost = data.totalCost || 
    (data.quantity && data.unitCost 
      ? (parseFloat(data.quantity.toString()) * parseFloat(data.unitCost.toString())).toString()
      : "0");
  
  const [result] = await db.insert(costEntries).values({
    ...data,
    totalCost,
  });
  
  // Update budget usage
  await updateBudgetUsage(data.budgetId, parseFloat(data.quantity.toString()));
  
  // Update daily aggregates
  await updateDailyAggregate(data);
  
  const [entry] = await db
    .select()
    .from(costEntries)
    .where(eq(costEntries.id, result.insertId));
  
  return entry;
}

export async function getCostEntries(
  budgetId: number,
  limit: number = 100
): Promise<CostEntry[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(costEntries)
    .where(eq(costEntries.budgetId, budgetId))
    .orderBy(desc(costEntries.createdAt))
    .limit(limit);
}

export async function getCostEntriesByProject(
  projectId: number,
  startDate?: Date,
  endDate?: Date
): Promise<CostEntry[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const conditions = [eq(costEntries.projectId, projectId)];
  
  if (startDate) {
    conditions.push(gte(costEntries.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(costEntries.createdAt, endDate));
  }
  
  return db
    .select()
    .from(costEntries)
    .where(and(...conditions))
    .orderBy(desc(costEntries.createdAt));
}

// ════════════════════════════════════════════════════════════════════════════
// BUDGET USAGE MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

async function updateBudgetUsage(budgetId: number, quantity: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const budget = await getBudget(budgetId);
  if (!budget) return;
  
  const currentUsed = parseFloat(budget.usedAmount?.toString() || "0");
  const newUsed = currentUsed + quantity;
  const allocated = parseFloat(budget.allocatedAmount.toString());
  const threshold = parseFloat(budget.alertThreshold?.toString() || "80");
  
  // Determine new status
  let status: "active" | "warning" | "exceeded" = "active";
  const usagePercent = (newUsed / allocated) * 100;
  
  if (usagePercent >= 100) {
    status = "exceeded";
  } else if (usagePercent >= threshold) {
    status = "warning";
  }
  
  await db
    .update(budgets)
    .set({
      usedAmount: newUsed.toString(),
      status,
    })
    .where(eq(budgets.id, budgetId));
}

export async function getBudgetUsage(budgetId: number): Promise<{
  budget: Budget;
  usagePercent: number;
  remaining: number;
  projectedRunout: Date | null;
  dailyAverage: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const budget = await getBudget(budgetId);
  if (!budget) throw new Error("Budget not found");
  
  const allocated = parseFloat(budget.allocatedAmount.toString());
  const used = parseFloat(budget.usedAmount?.toString() || "0");
  const remaining = allocated - used;
  const usagePercent = (used / allocated) * 100;
  
  // Calculate daily average from cost entries
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentCosts = await db
    .select({ total: sql<number>`SUM(quantity)` })
    .from(costEntries)
    .where(
      and(
        eq(costEntries.budgetId, budgetId),
        gte(costEntries.createdAt, thirtyDaysAgo)
      )
    );
  
  const totalRecent = recentCosts[0]?.total || 0;
  const dailyAverage = totalRecent / 30;
  
  // Project runout date
  let projectedRunout: Date | null = null;
  if (dailyAverage > 0 && remaining > 0) {
    const daysRemaining = remaining / dailyAverage;
    projectedRunout = new Date();
    projectedRunout.setDate(projectedRunout.getDate() + Math.ceil(daysRemaining));
  }
  
  return {
    budget,
    usagePercent,
    remaining,
    projectedRunout,
    dailyAverage,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DAILY AGGREGATES
// ════════════════════════════════════════════════════════════════════════════

async function updateDailyAggregate(entry: InsertCostEntry): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if aggregate exists for today
  const [existing] = await db
    .select()
    .from(dailyCostAggregates)
    .where(
      and(
        eq(dailyCostAggregates.projectId, entry.projectId),
        gte(dailyCostAggregates.date, today),
        lte(dailyCostAggregates.date, new Date(today.getTime() + 24 * 60 * 60 * 1000))
      )
    );
  
  const quantity = parseFloat(entry.quantity.toString());
  const totalCost = parseFloat(entry.totalCost?.toString() || "0");
  
  if (existing) {
    // Update existing aggregate
    const updates: Partial<InsertDailyCostAggregate> = {
      totalCost: (parseFloat(existing.totalCost?.toString() || "0") + totalCost).toString(),
    };
    
    // Update specific type counter
    switch (entry.type) {
      case "llm_tokens":
        updates.llmTokens = (existing.llmTokens || 0) + Math.round(quantity);
        break;
      case "embedding_tokens":
        updates.embeddingTokens = (existing.embeddingTokens || 0) + Math.round(quantity);
        break;
      case "api_call":
        updates.apiCalls = (existing.apiCalls || 0) + 1;
        break;
      case "compute":
        updates.computeMinutes = (parseFloat(existing.computeMinutes?.toString() || "0") + quantity).toString();
        break;
      case "storage":
        updates.storageMb = (parseFloat(existing.storageMb?.toString() || "0") + quantity).toString();
        break;
    }
    
    await db
      .update(dailyCostAggregates)
      .set(updates)
      .where(eq(dailyCostAggregates.id, existing.id));
  } else {
    // Create new aggregate
    const newAggregate: InsertDailyCostAggregate = {
      projectId: entry.projectId,
      sprintId: entry.sprintId,
      date: today,
      totalCost: totalCost.toString(),
      llmTokens: entry.type === "llm_tokens" ? Math.round(quantity) : 0,
      embeddingTokens: entry.type === "embedding_tokens" ? Math.round(quantity) : 0,
      apiCalls: entry.type === "api_call" ? 1 : 0,
      computeMinutes: entry.type === "compute" ? quantity.toString() : "0",
      storageMb: entry.type === "storage" ? quantity.toString() : "0",
    };
    
    await db.insert(dailyCostAggregates).values(newAggregate);
  }
}

export async function getDailyAggregates(
  projectId: number,
  days: number = 30
): Promise<DailyCostAggregate[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return db
    .select()
    .from(dailyCostAggregates)
    .where(
      and(
        eq(dailyCostAggregates.projectId, projectId),
        gte(dailyCostAggregates.date, startDate)
      )
    )
    .orderBy(dailyCostAggregates.date);
}

// ════════════════════════════════════════════════════════════════════════════
// COST BREAKDOWN & ANALYTICS
// ════════════════════════════════════════════════════════════════════════════

export interface CostBreakdown {
  byType: { type: string; amount: number; percentage: number }[];
  byAgent: { agentId: number; amount: number; percentage: number }[];
  byDay: { date: string; amount: number }[];
  total: number;
}

export async function getCostBreakdown(
  projectId: number,
  startDate?: Date,
  endDate?: Date
): Promise<CostBreakdown> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();
  
  // Get all cost entries in range
  const entries = await db
    .select()
    .from(costEntries)
    .where(
      and(
        eq(costEntries.projectId, projectId),
        gte(costEntries.createdAt, start),
        lte(costEntries.createdAt, end)
      )
    );
  
  // Calculate total
  const total = entries.reduce(
    (sum: number, e: CostEntry) => sum + parseFloat(e.totalCost?.toString() || "0"),
    0
  );
  
  // Group by type
  const byTypeMap = new Map<string, number>();
  entries.forEach((e: CostEntry) => {
    const amount = parseFloat(e.totalCost?.toString() || "0");
    byTypeMap.set(e.type, (byTypeMap.get(e.type) || 0) + amount);
  });
  
  const byType = Array.from(byTypeMap.entries()).map(([type, amount]) => ({
    type,
    amount,
    percentage: total > 0 ? (amount / total) * 100 : 0,
  }));
  
  // Group by agent
  const byAgentMap = new Map<number, number>();
  entries.forEach((e: CostEntry) => {
    if (e.agentId) {
      const amount = parseFloat(e.totalCost?.toString() || "0");
      byAgentMap.set(e.agentId, (byAgentMap.get(e.agentId) || 0) + amount);
    }
  });
  
  const byAgent = Array.from(byAgentMap.entries()).map(([agentId, amount]) => ({
    agentId,
    amount,
    percentage: total > 0 ? (amount / total) * 100 : 0,
  }));
  
  // Group by day
  const byDayMap = new Map<string, number>();
  entries.forEach((e: CostEntry) => {
    const date = e.createdAt.toISOString().split("T")[0];
    const amount = parseFloat(e.totalCost?.toString() || "0");
    byDayMap.set(date, (byDayMap.get(date) || 0) + amount);
  });
  
  const byDay = Array.from(byDayMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return { byType, byAgent, byDay, total };
}

// ════════════════════════════════════════════════════════════════════════════
// BUDGET ALERTS
// ════════════════════════════════════════════════════════════════════════════

export interface BudgetAlert {
  budgetId: number;
  budgetName: string;
  type: "warning" | "exceeded";
  usagePercent: number;
  message: string;
}

export async function checkBudgetAlerts(projectId: number): Promise<BudgetAlert[]> {
  const budgetList = await getBudgetsByProject(projectId);
  const alerts: BudgetAlert[] = [];
  
  for (const budget of budgetList) {
    if (budget.status === "warning" || budget.status === "exceeded") {
      const allocated = parseFloat(budget.allocatedAmount.toString());
      const used = parseFloat(budget.usedAmount?.toString() || "0");
      const usagePercent = (used / allocated) * 100;
      
      alerts.push({
        budgetId: budget.id,
        budgetName: budget.name,
        type: budget.status as "warning" | "exceeded",
        usagePercent,
        message:
          budget.status === "exceeded"
            ? `Budget "${budget.name}" has been exceeded (${usagePercent.toFixed(1)}% used)`
            : `Budget "${budget.name}" is approaching limit (${usagePercent.toFixed(1)}% used)`,
      });
    }
  }
  
  return alerts;
}
