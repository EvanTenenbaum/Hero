/**
 * Audit Logger Service
 * 
 * Provides comprehensive audit logging for the HERO IDE agent system.
 * Tracks all agent actions, tool calls, and security events.
 */

import {
  mysqlTable,
  serial,
  int,
  varchar,
  timestamp,
  json,
  text,
  index,
} from 'drizzle-orm/mysql-core';
import { InferSelectModel, InferInsertModel, sql, and, eq } from 'drizzle-orm';
import { getDb } from '../db';

// --- Drizzle ORM Schema ---

/**
 * Defines the Drizzle ORM schema for the audit logs table.
 */
export const auditLogs = mysqlTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull(),
  projectId: int('project_id'),
  executionId: varchar('execution_id', { length: 64 }),
  action: varchar('action', { length: 50 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  severity: varchar('severity', { length: 10 }).notNull(),
  details: json('details').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  metadata: json('metadata'),
}, (table) => ({
  userIdx: index('audit_user_idx').on(table.userId),
  categoryIdx: index('audit_category_idx').on(table.category),
  timestampIdx: index('audit_timestamp_idx').on(table.timestamp),
}));

/**
 * Type definition for selecting an audit log record.
 */
export type AuditLog = InferSelectModel<typeof auditLogs>;

/**
 * Type definition for inserting an audit log record.
 */
export type NewAuditLog = InferInsertModel<typeof auditLogs>;

// --- Type Definitions ---

/**
 * Defines the possible categories for an audit log entry.
 */
export type AuditCategory = 'security' | 'execution' | 'tool' | 'agent' | 'system';

/**
 * Defines the possible severity levels for an audit log entry.
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Defines the structure for the details of a safety check log.
 */
export interface SafetyCheckResult {
  passed: boolean;
  reason: string;
  details?: unknown;
}

/**
 * Defines the parameters required for a generic audit log entry.
 */
export interface AuditLogParams {
  userId: number;
  projectId?: number | null;
  executionId?: string | null;
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  details: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Defines the parameters for filtering audit logs.
 */
export interface AuditLogFilters {
  userId?: number;
  projectId?: number;
  executionId?: string;
  action?: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// --- Audit Logger Service Class ---

/**
 * Service class for managing and logging audit events within the HERO IDE system.
 */
export class AuditLogger {
  /**
   * Logs a generic action to the audit logs table.
   *
   * @param params - The parameters defining the audit log entry.
   */
  public async logAction(params: AuditLogParams): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        console.error('[AuditLogger] Database not available');
        return;
      }

      const newLog: NewAuditLog = {
        userId: params.userId,
        projectId: params.projectId ?? null,
        executionId: params.executionId ?? null,
        action: params.action,
        category: params.category,
        severity: params.severity,
        details: params.details,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ?? null,
      };

      await db.insert(auditLogs).values(newLog);
    } catch (error) {
      console.error('[AuditLogger] Failed to insert audit log entry:', error);
    }
  }

  /**
   * Logs a tool call action.
   */
  public async logToolCall(
    userId: number,
    projectId: number | null,
    toolName: string,
    args: unknown,
    result: unknown,
    executionId?: string | null,
  ): Promise<void> {
    await this.logAction({
      userId,
      projectId,
      executionId,
      action: 'tool_call',
      category: 'tool',
      severity: 'info',
      details: {
        toolName,
        arguments: args,
        result,
      },
    });
  }

  /**
   * Logs a safety check.
   */
  public async logSafetyCheck(
    userId: number,
    action: string,
    result: SafetyCheckResult,
    projectId?: number | null,
    executionId?: string | null,
  ): Promise<void> {
    const severity: AuditSeverity = result.passed ? 'info' : 'warning';

    await this.logAction({
      userId,
      projectId,
      executionId,
      action: `safety_check:${action}`,
      category: 'security',
      severity,
      details: {
        checkAction: action,
        passed: result.passed,
        reason: result.reason,
        details: result.details,
      },
    });
  }

  /**
   * Logs an agent execution.
   */
  public async logAgentExecution(
    userId: number,
    projectId: number,
    agentType: string,
    input: string,
    output: string,
    executionId: string,
  ): Promise<void> {
    await this.logAction({
      userId,
      projectId,
      executionId,
      action: 'agent_execution',
      category: 'agent',
      severity: 'info',
      details: {
        agentType,
        input: input.substring(0, 500) + (input.length > 500 ? '...' : ''),
        output: output.substring(0, 500) + (output.length > 500 ? '...' : ''),
        inputLength: input.length,
        outputLength: output.length,
      },
    });
  }

  /**
   * Queries the audit logs based on specified filters.
   */
  public async queryLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    try {
      const db = await getDb();
      if (!db) {
        console.error('[AuditLogger] Database not available');
        return [];
      }

      // Build query with filters
      let query = db.select().from(auditLogs);
      
      const conditions = [];
      
      if (filters.userId !== undefined) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }
      if (filters.projectId !== undefined) {
        conditions.push(eq(auditLogs.projectId, filters.projectId));
      }
      if (filters.executionId) {
        conditions.push(eq(auditLogs.executionId, filters.executionId));
      }
      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }
      if (filters.category) {
        conditions.push(eq(auditLogs.category, filters.category));
      }
      if (filters.severity) {
        conditions.push(eq(auditLogs.severity, filters.severity));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const logs = await query
        .orderBy(sql`${auditLogs.timestamp} DESC`)
        .limit(filters.limit ?? 100)
        .offset(filters.offset ?? 0);

      return logs;
    } catch (error) {
      console.error('[AuditLogger] Error querying audit logs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
