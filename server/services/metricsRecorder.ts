/**
 * Metrics Recorder Service - Sprint 1 Agent Gamma
 * 
 * Records and aggregates agent execution metrics.
 * Handles daily aggregation and metric retrieval.
 */

import { getDb } from '../db';
import { metricsDaily } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface ExecutionMetrics {
  userId: number;
  projectId?: number;
  agentType: string;
  tokensUsed: number;
  durationMs: number;
  success: boolean;
  linesGenerated?: number;
  filesModified?: number;
}

export interface DailyMetrics {
  date: string;
  messagesCount: number;
  tokensUsed: number;
  totalExecutionTimeMs: number;
  agentExecutionsCount: number;
  agentTasksCompleted: number;
  agentTasksFailed: number;
  linesGenerated: number;
  filesModified: number;
}

/**
 * Get the current date in YYYY-MM-DD format (UTC)
 */
function getDateKey(date?: Date): string {
  const d = date || new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Record an agent execution metric
 * Uses INSERT ON DUPLICATE KEY UPDATE to prevent race conditions
 */
export async function recordExecution(metrics: ExecutionMetrics): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const dateKey = getDateKey();
    const now = new Date();
    
    // Use INSERT ON DUPLICATE KEY UPDATE to atomically handle concurrent requests
    // This prevents race conditions where two requests check for existing record simultaneously
    await db.execute(sql`
      INSERT INTO metrics_daily (
        userId, projectId, date, messagesCount, tokensUsed, 
        totalExecutionTimeMs, agentExecutionsCount, agentTasksCompleted, 
        agentTasksFailed, linesGenerated, filesModified, createdAt, updatedAt
      ) VALUES (
        ${metrics.userId}, ${metrics.projectId || null}, ${dateKey}, 1, ${metrics.tokensUsed},
        ${metrics.durationMs}, 1, ${metrics.success ? 1 : 0},
        ${metrics.success ? 0 : 1}, ${metrics.linesGenerated || 0}, ${metrics.filesModified || 0},
        ${now}, ${now}
      )
      ON DUPLICATE KEY UPDATE
        messagesCount = messagesCount + 1,
        tokensUsed = tokensUsed + ${metrics.tokensUsed},
        totalExecutionTimeMs = totalExecutionTimeMs + ${metrics.durationMs},
        agentExecutionsCount = agentExecutionsCount + 1,
        agentTasksCompleted = agentTasksCompleted + ${metrics.success ? 1 : 0},
        agentTasksFailed = agentTasksFailed + ${metrics.success ? 0 : 1},
        linesGenerated = linesGenerated + ${metrics.linesGenerated || 0},
        filesModified = filesModified + ${metrics.filesModified || 0},
        updatedAt = ${now}
    `);

    return true;
  } catch (error) {
    // Re-throw with context for better debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to record execution metrics: ${errorMessage}`);
  }
}

/**
 * Get daily metrics for a user
 */
export async function getDailyMetrics(userId: number, date?: Date): Promise<DailyMetrics | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const dateKey = getDateKey(date);
    
    const result = await db
      .select()
      .from(metricsDaily)
      .where(
        and(
          eq(metricsDaily.userId, userId),
          eq(metricsDaily.date, dateKey)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return {
        date: dateKey,
        messagesCount: 0,
        tokensUsed: 0,
        totalExecutionTimeMs: 0,
        agentExecutionsCount: 0,
        agentTasksCompleted: 0,
        agentTasksFailed: 0,
        linesGenerated: 0,
        filesModified: 0,
      };
    }

    const record = result[0];

    return {
      date: dateKey,
      messagesCount: record.messagesCount || 0,
      tokensUsed: record.tokensUsed || 0,
      totalExecutionTimeMs: record.totalExecutionTimeMs || 0,
      agentExecutionsCount: record.agentExecutionsCount || 0,
      agentTasksCompleted: record.agentTasksCompleted || 0,
      agentTasksFailed: record.agentTasksFailed || 0,
      linesGenerated: record.linesGenerated || 0,
      filesModified: record.filesModified || 0,
    };
  } catch (error) {
    console.error('Error getting daily metrics:', error);
    return null;
  }
}

/**
 * Get metrics for a date range
 */
export async function getMetricsRange(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<DailyMetrics[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const startKey = getDateKey(startDate);
    const endKey = getDateKey(endDate);
    
    const results = await db
      .select()
      .from(metricsDaily)
      .where(
        and(
          eq(metricsDaily.userId, userId),
          sql`${metricsDaily.date} >= ${startKey}`,
          sql`${metricsDaily.date} <= ${endKey}`
        )
      )
      .orderBy(metricsDaily.date);

    return results.map(record => ({
      date: record.date,
      messagesCount: record.messagesCount || 0,
      tokensUsed: record.tokensUsed || 0,
      totalExecutionTimeMs: record.totalExecutionTimeMs || 0,
      agentExecutionsCount: record.agentExecutionsCount || 0,
      agentTasksCompleted: record.agentTasksCompleted || 0,
      agentTasksFailed: record.agentTasksFailed || 0,
      linesGenerated: record.linesGenerated || 0,
      filesModified: record.filesModified || 0,
    }));
  } catch (error) {
    console.error('Error getting metrics range:', error);
    return [];
  }
}

/**
 * Get aggregate metrics for a user (all time)
 */
export async function getAggregateMetrics(userId: number): Promise<{
  messagesCount: number;
  tokensUsed: number;
  avgExecutionTimeMs: number;
  successRate: number;
  daysActive: number;
  linesGenerated: number;
  filesModified: number;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return { 
        messagesCount: 0, 
        tokensUsed: 0, 
        avgExecutionTimeMs: 0, 
        successRate: 0, 
        daysActive: 0,
        linesGenerated: 0,
        filesModified: 0,
      };
    }

    const results = await db
      .select()
      .from(metricsDaily)
      .where(eq(metricsDaily.userId, userId));

    if (results.length === 0) {
      return { 
        messagesCount: 0, 
        tokensUsed: 0, 
        avgExecutionTimeMs: 0, 
        successRate: 0, 
        daysActive: 0,
        linesGenerated: 0,
        filesModified: 0,
      };
    }

    const totals = results.reduce(
      (acc, record) => ({
        messages: acc.messages + (record.messagesCount || 0),
        tokens: acc.tokens + (record.tokensUsed || 0),
        duration: acc.duration + (record.totalExecutionTimeMs || 0),
        completed: acc.completed + (record.agentTasksCompleted || 0),
        failed: acc.failed + (record.agentTasksFailed || 0),
        lines: acc.lines + (record.linesGenerated || 0),
        files: acc.files + (record.filesModified || 0),
      }),
      { messages: 0, tokens: 0, duration: 0, completed: 0, failed: 0, lines: 0, files: 0 }
    );

    const totalTasks = totals.completed + totals.failed;

    return {
      messagesCount: totals.messages,
      tokensUsed: totals.tokens,
      avgExecutionTimeMs: totals.messages > 0 ? Math.round(totals.duration / totals.messages) : 0,
      successRate: totalTasks > 0 ? Math.round((totals.completed / totalTasks) * 100) : 0,
      daysActive: results.length,
      linesGenerated: totals.lines,
      filesModified: totals.files,
    };
  } catch (error) {
    console.error('Error getting aggregate metrics:', error);
    return { 
      messagesCount: 0, 
      tokensUsed: 0, 
      avgExecutionTimeMs: 0, 
      successRate: 0, 
      daysActive: 0,
      linesGenerated: 0,
      filesModified: 0,
    };
  }
}
