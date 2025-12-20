/**
 * Agent Logger Module
 * 
 * Structured logging for agent operations.
 * Supports multiple log levels and structured data.
 */

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  event: string;
  agentType: string;
  userId: number;
  sessionId?: string;
  executionId?: number;
  data?: Record<string, unknown>;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  maxEntries: number;
  persistLogs: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: 'info',
  maxEntries: 1000,
  persistLogs: true,
};

// ════════════════════════════════════════════════════════════════════════════
// LOGGER CLASS
// ════════════════════════════════════════════════════════════════════════════

class AgentLogger {
  private entries: LogEntry[] = [];
  private config: LoggerConfig;
  private persistCallback?: (entry: LogEntry) => Promise<void>;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Set the persistence callback for saving logs to database
   */
  setPersistCallback(callback: (entry: LogEntry) => Promise<void>): void {
    this.persistCallback = callback;
  }
  
  /**
   * Log an entry
   */
  private async log(
    level: LogLevel,
    event: string,
    agentType: string,
    userId: number,
    options?: {
      sessionId?: string;
      executionId?: number;
      data?: Record<string, unknown>;
    }
  ): Promise<void> {
    // Check if level meets minimum threshold
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      event,
      agentType,
      userId,
      sessionId: options?.sessionId,
      executionId: options?.executionId,
      data: options?.data,
    };
    
    // Add to in-memory buffer
    this.entries.push(entry);
    
    // Trim if exceeds max entries
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }
    
    // Persist if enabled
    if (this.config.persistLogs && this.persistCallback) {
      try {
        await this.persistCallback(entry);
      } catch (error) {
        console.error('Failed to persist log entry:', error);
      }
    }
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}] [${agentType}]`;
      console.log(`${prefix} ${event}`, entry.data || '');
    }
  }
  
  /**
   * Log debug message
   */
  debug(
    event: string,
    agentType: string,
    userId: number,
    options?: { sessionId?: string; executionId?: number; data?: Record<string, unknown> }
  ): Promise<void> {
    return this.log('debug', event, agentType, userId, options);
  }
  
  /**
   * Log info message
   */
  info(
    event: string,
    agentType: string,
    userId: number,
    options?: { sessionId?: string; executionId?: number; data?: Record<string, unknown> }
  ): Promise<void> {
    return this.log('info', event, agentType, userId, options);
  }
  
  /**
   * Log warning message
   */
  warn(
    event: string,
    agentType: string,
    userId: number,
    options?: { sessionId?: string; executionId?: number; data?: Record<string, unknown> }
  ): Promise<void> {
    return this.log('warn', event, agentType, userId, options);
  }
  
  /**
   * Log error message
   */
  error(
    event: string,
    agentType: string,
    userId: number,
    options?: { sessionId?: string; executionId?: number; data?: Record<string, unknown> }
  ): Promise<void> {
    return this.log('error', event, agentType, userId, options);
  }
  
  /**
   * Log agent action
   */
  logAction(
    action: string,
    agentType: string,
    userId: number,
    options: {
      sessionId?: string;
      executionId?: number;
      input?: Record<string, unknown>;
      output?: unknown;
      success: boolean;
      durationMs?: number;
    }
  ): Promise<void> {
    return this.log(
      options.success ? 'info' : 'error',
      `action:${action}`,
      agentType,
      userId,
      {
        sessionId: options.sessionId,
        executionId: options.executionId,
        data: {
          input: options.input,
          output: options.output,
          success: options.success,
          durationMs: options.durationMs,
        },
      }
    );
  }
  
  /**
   * Log safety check
   */
  logSafetyCheck(
    action: string,
    agentType: string,
    userId: number,
    result: {
      allowed: boolean;
      requiresConfirmation: boolean;
      reason?: string;
    },
    sessionId?: string
  ): Promise<void> {
    const level = result.allowed ? 'info' : 'warn';
    return this.log(level, 'safety_check', agentType, userId, {
      sessionId,
      data: { action, ...result },
    });
  }
  
  /**
   * Log execution state change
   */
  logStateChange(
    fromState: string,
    toState: string,
    agentType: string,
    userId: number,
    executionId: number,
    reason?: string
  ): Promise<void> {
    return this.log('info', 'state_change', agentType, userId, {
      executionId,
      data: { fromState, toState, reason },
    });
  }
  
  /**
   * Get recent log entries
   */
  getRecentEntries(count: number = 100): LogEntry[] {
    return this.entries.slice(-count);
  }
  
  /**
   * Get entries by user
   */
  getEntriesByUser(userId: number, count: number = 100): LogEntry[] {
    return this.entries
      .filter(e => e.userId === userId)
      .slice(-count);
  }
  
  /**
   * Get entries by session
   */
  getEntriesBySession(sessionId: string): LogEntry[] {
    return this.entries.filter(e => e.sessionId === sessionId);
  }
  
  /**
   * Get entries by execution
   */
  getEntriesByExecution(executionId: number): LogEntry[] {
    return this.entries.filter(e => e.executionId === executionId);
  }
  
  /**
   * Get error entries
   */
  getErrors(count: number = 50): LogEntry[] {
    return this.entries
      .filter(e => e.level === 'error')
      .slice(-count);
  }
  
  /**
   * Clear in-memory entries
   */
  clear(): void {
    this.entries = [];
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    byLevel: Record<LogLevel, number>;
    byAgent: Record<string, number>;
  } {
    const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    const byAgent: Record<string, number> = {};
    
    for (const entry of this.entries) {
      byLevel[entry.level]++;
      byAgent[entry.agentType] = (byAgent[entry.agentType] || 0) + 1;
    }
    
    return {
      totalEntries: this.entries.length,
      byLevel,
      byAgent,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export const agentLogger = new AgentLogger();

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get the global logger instance
 */
export function getAgentLogger(): AgentLogger {
  return agentLogger;
}

/**
 * Create a logger with custom config
 */
export function createAgentLogger(config?: Partial<LoggerConfig>): AgentLogger {
  return new AgentLogger(config);
}

/**
 * Format a log entry for display
 */
export function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp.toISOString();
  const level = entry.level.toUpperCase().padEnd(5);
  const agent = entry.agentType.padEnd(10);
  
  let message = `[${timestamp}] [${level}] [${agent}] ${entry.event}`;
  
  if (entry.sessionId) {
    message += ` (session: ${entry.sessionId.slice(0, 8)}...)`;
  }
  
  if (entry.data) {
    message += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
  }
  
  return message;
}
