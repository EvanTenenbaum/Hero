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
 */
export async function recordExecution(metrics: ExecutionMetrics): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const dateKey = getDateKey();
    
    // Check if we have a record for this user/date
    const existing = await db
      .select()
      .from(metricsDaily)
      .where(
        and(
          eq(metricsDaily.userId, metrics.userId),
          eq(metricsDaily.date, dateKey)
        )
      );

    if (existing.length > 0) {
      // Update existing record
      const record = existing[0];

      await db
        .update(metricsDaily)
        .set({
          messagesCount: (record.messagesCount || 0) + 1,
          tokensUsed: (record.tokensUsed || 0) + metrics.tokensUsed,
          totalExecutionTimeMs: (record.totalExecutionTimeMs || 0) + metrics.durationMs,
          agentExecutionsCount: (record.agentExecutionsCount || 0) + 1,
          agentTasksCompleted: (record.agentTasksCompleted || 0) + (metrics.success ? 1 : 0),
          agentTasksFailed: (record.agentTasksFailed || 0) + (metrics.success ? 0 : 1),
          linesGenerated: (record.linesGenerated || 0) + (metrics.linesGenerated || 0),
          filesModified: (record.filesModified || 0) + (metrics.filesModified || 0),
          updatedAt: new Date(),
        })
        .where(eq(metricsDaily.id, record.id));
    } else {
      // Insert new record
      await db.insert(metricsDaily).values({
        userId: metrics.userId,
        projectId: metrics.projectId || null,
        date: dateKey,
        messagesCount: 1,
        tokensUsed: metrics.tokensUsed,
        totalExecutionTimeMs: metrics.durationMs,
        agentExecutionsCount: 1,
        agentTasksCompleted: metrics.success ? 1 : 0,
        agentTasksFailed: metrics.success ? 0 : 1,
        linesGenerated: metrics.linesGenerated || 0,
        filesModified: metrics.filesModified || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return true;
  } catch (error) {
    console.error('Error recording execution metrics:', error);
    return false;
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
