/**
 * Cost Tracker Service - Sprint 3 Agent Alpha
 * 
 * Tracks token usage and estimated costs for agent executions.
 * Provides budget monitoring and alerts.
 */

import { getDb } from '../db';
import { metricsDaily, userSettings } from '../../drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// Cost per 1K tokens (approximate, based on common LLM pricing)
const COST_PER_1K_INPUT_TOKENS = 0.0015;
const COST_PER_1K_OUTPUT_TOKENS = 0.002;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface UsageSummary {
  today: {
    tokens: number;
    cost: number;
    executions: number;
  };
  thisWeek: {
    tokens: number;
    cost: number;
    executions: number;
  };
  thisMonth: {
    tokens: number;
    cost: number;
    executions: number;
  };
  allTime: {
    tokens: number;
    cost: number;
    executions: number;
  };
}

export interface BudgetStatus {
  dailyLimit: number | null;
  monthlyLimit: number | null;
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number | null;
  monthlyRemaining: number | null;
  isOverDailyLimit: boolean;
  isOverMonthlyLimit: boolean;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'exceeded';
}

/**
 * Validate token usage values
 */
function validateTokenUsage(usage: TokenUsage): { valid: boolean; error?: string } {
  if (usage.inputTokens < 0) {
    return { valid: false, error: 'Input tokens cannot be negative' };
  }
  if (usage.outputTokens < 0) {
    return { valid: false, error: 'Output tokens cannot be negative' };
  }
  if (usage.totalTokens < 0) {
    return { valid: false, error: 'Total tokens cannot be negative' };
  }
  if (usage.inputTokens + usage.outputTokens !== usage.totalTokens) {
    // Auto-correct totalTokens if it doesn't match
    usage.totalTokens = usage.inputTokens + usage.outputTokens;
  }
  return { valid: true };
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(usage: TokenUsage): CostEstimate {
  // Validate and sanitize input
  const validation = validateTokenUsage(usage);
  if (!validation.valid) {
    console.warn('Invalid token usage:', validation.error);
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      currency: 'USD',
    };
  }
  
  const inputCost = (usage.inputTokens / 1000) * COST_PER_1K_INPUT_TOKENS;
  const outputCost = (usage.outputTokens / 1000) * COST_PER_1K_OUTPUT_TOKENS;
  
  return {
    inputCost: Math.round(inputCost * 10000) / 10000,
    outputCost: Math.round(outputCost * 10000) / 10000,
    totalCost: Math.round((inputCost + outputCost) * 10000) / 10000,
    currency: 'USD',
  };
}

/**
 * Record token usage for an execution
 */
export async function recordTokenUsage(
  userId: number,
  projectId: number | null,
  usage: TokenUsage
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const cost = calculateCost(usage);
    const dateKey = new Date().toISOString().split('T')[0];

    // Check for existing record
    const existing = await db
      .select()
      .from(metricsDaily)
      .where(
        and(
          eq(metricsDaily.userId, userId),
          eq(metricsDaily.date, dateKey)
        )
      );

    if (existing.length > 0) {
      const record = existing[0];
      const currentCost = parseFloat(record.costUsd || '0');
      
      await db
        .update(metricsDaily)
        .set({
          tokensUsed: (record.tokensUsed || 0) + usage.totalTokens,
          costUsd: (currentCost + cost.totalCost).toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(metricsDaily.id, record.id));
    } else {
      await db.insert(metricsDaily).values({
        userId,
        projectId,
        date: dateKey,
        tokensUsed: usage.totalTokens,
        costUsd: cost.totalCost.toFixed(4),
        messagesCount: 0,
        agentExecutionsCount: 0,
        agentTasksCompleted: 0,
        agentTasksFailed: 0,
        linesGenerated: 0,
        filesModified: 0,
        totalExecutionTimeMs: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return true;
  } catch (error) {
    console.error('Error recording token usage:', error);
    return false;
  }
}

/**
 * Get usage summary for a user
 */
export async function getUsageSummary(userId: number): Promise<UsageSummary> {
  const defaultSummary: UsageSummary = {
    today: { tokens: 0, cost: 0, executions: 0 },
    thisWeek: { tokens: 0, cost: 0, executions: 0 },
    thisMonth: { tokens: 0, cost: 0, executions: 0 },
    allTime: { tokens: 0, cost: 0, executions: 0 },
  };

  try {
    const db = await getDb();
    if (!db) return defaultSummary;

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];

    const results = await db
      .select()
      .from(metricsDaily)
      .where(eq(metricsDaily.userId, userId));

    const summary = { ...defaultSummary };

    for (const record of results) {
      const tokens = record.tokensUsed || 0;
      const cost = parseFloat(record.costUsd || '0');
      const executions = record.agentExecutionsCount || 0;

      // All time
      summary.allTime.tokens += tokens;
      summary.allTime.cost += cost;
      summary.allTime.executions += executions;

      // This month
      if (record.date >= monthStart) {
        summary.thisMonth.tokens += tokens;
        summary.thisMonth.cost += cost;
        summary.thisMonth.executions += executions;
      }

      // This week
      if (record.date >= weekAgo) {
        summary.thisWeek.tokens += tokens;
        summary.thisWeek.cost += cost;
        summary.thisWeek.executions += executions;
      }

      // Today
      if (record.date === today) {
        summary.today.tokens += tokens;
        summary.today.cost += cost;
        summary.today.executions += executions;
      }
    }

    // Round costs
    summary.today.cost = Math.round(summary.today.cost * 100) / 100;
    summary.thisWeek.cost = Math.round(summary.thisWeek.cost * 100) / 100;
    summary.thisMonth.cost = Math.round(summary.thisMonth.cost * 100) / 100;
    summary.allTime.cost = Math.round(summary.allTime.cost * 100) / 100;

    return summary;
  } catch (error) {
    console.error('Error getting usage summary:', error);
    return defaultSummary;
  }
}

/**
 * Get budget status for a user
 */
export async function getBudgetStatus(userId: number): Promise<BudgetStatus> {
  const defaultStatus: BudgetStatus = {
    dailyLimit: null,
    monthlyLimit: null,
    dailyUsed: 0,
    monthlyUsed: 0,
    dailyRemaining: null,
    monthlyRemaining: null,
    isOverDailyLimit: false,
    isOverMonthlyLimit: false,
    warningLevel: 'none',
  };

  try {
    const db = await getDb();
    if (!db) return defaultStatus;

    // Get budget limits from userSettings table
    const settingsRecord = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const summary = await getUsageSummary(userId);

    const status = { ...defaultStatus };
    status.dailyUsed = summary.today.cost;
    status.monthlyUsed = summary.thisMonth.cost;

    if (settingsRecord.length > 0) {
      const settings = settingsRecord[0];
      status.dailyLimit = settings.dailyBudgetLimitUsd ? parseFloat(settings.dailyBudgetLimitUsd) : null;
      status.monthlyLimit = settings.monthlyBudgetLimitUsd ? parseFloat(settings.monthlyBudgetLimitUsd) : null;

      if (status.dailyLimit !== null) {
        status.dailyRemaining = Math.max(0, status.dailyLimit - status.dailyUsed);
        status.isOverDailyLimit = status.dailyUsed >= status.dailyLimit;
      }

      if (status.monthlyLimit !== null) {
        status.monthlyRemaining = Math.max(0, status.monthlyLimit - status.monthlyUsed);
        status.isOverMonthlyLimit = status.monthlyUsed >= status.monthlyLimit;
      }
    }

    // Calculate warning level
    if (status.isOverDailyLimit || status.isOverMonthlyLimit) {
      status.warningLevel = 'exceeded';
    } else if (status.dailyLimit !== null || status.monthlyLimit !== null) {
      const dailyPercent = status.dailyLimit ? (status.dailyUsed / status.dailyLimit) * 100 : 0;
      const monthlyPercent = status.monthlyLimit ? (status.monthlyUsed / status.monthlyLimit) * 100 : 0;
      const maxPercent = Math.max(dailyPercent, monthlyPercent);

      if (maxPercent >= 90) status.warningLevel = 'high';
      else if (maxPercent >= 75) status.warningLevel = 'medium';
      else if (maxPercent >= 50) status.warningLevel = 'low';
    }

    return status;
  } catch (error) {
    console.error('Error getting budget status:', error);
    return defaultStatus;
  }
}

/**
 * Check if user can execute based on budget
 */
export async function canExecute(userId: number): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const status = await getBudgetStatus(userId);

  if (status.isOverDailyLimit) {
    return {
      allowed: false,
      reason: `Daily budget limit ($${status.dailyLimit?.toFixed(2)}) exceeded. Used: $${status.dailyUsed.toFixed(2)}`,
    };
  }

  if (status.isOverMonthlyLimit) {
    return {
      allowed: false,
      reason: `Monthly budget limit ($${status.monthlyLimit?.toFixed(2)}) exceeded. Used: $${status.monthlyUsed.toFixed(2)}`,
    };
  }

  return { allowed: true };
}

/**
 * Get daily usage history for charts
 */
export async function getDailyUsageHistory(
  userId: number,
  days: number = 30
): Promise<Array<{
  date: string;
  tokens: number;
  cost: number;
  executions: number;
}>> {
  try {
    const db = await getDb();
    if (!db) return [];

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const results = await db
      .select()
      .from(metricsDaily)
      .where(
        and(
          eq(metricsDaily.userId, userId),
          sql`${metricsDaily.date} >= ${startDate}`
        )
      )
      .orderBy(metricsDaily.date);

    return results.map(record => ({
      date: record.date,
      tokens: record.tokensUsed || 0,
      cost: parseFloat(record.costUsd || '0'),
      executions: record.agentExecutionsCount || 0,
    }));
  } catch (error) {
    console.error('Error getting daily usage history:', error);
    return [];
  }
}
