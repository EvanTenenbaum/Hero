/**
 * Structured Logger - Sprint 29
 * 
 * Provides structured logging with pino for better debugging and monitoring.
 * Replaces console.log statements with proper log levels.
 */

import pino from 'pino';

// Determine log level from environment
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create the base logger
export const logger = pino({
  level,
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

// Create child loggers for different domains
export const serverLogger = logger.child({ module: 'server' });
export const authLogger = logger.child({ module: 'auth' });
export const dbLogger = logger.child({ module: 'database' });
export const llmLogger = logger.child({ module: 'llm' });
export const githubLogger = logger.child({ module: 'github' });
export const agentLogger = logger.child({ module: 'agent' });
export const metricsLogger = logger.child({ module: 'metrics' });

// Helper for request logging
export function requestLogger(req: { method: string; url: string; headers?: Record<string, string> }) {
  return serverLogger.child({
    method: req.method,
    url: req.url,
    userAgent: req.headers?.['user-agent'],
  });
}

// Helper for operation timing
export function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  log: pino.Logger = logger
): Promise<T> {
  const start = Date.now();
  return fn().then(
    (result) => {
      log.debug({ operation, durationMs: Date.now() - start }, 'Operation completed');
      return result;
    },
    (error) => {
      log.error({ operation, durationMs: Date.now() - start, error: error.message }, 'Operation failed');
      throw error;
    }
  );
}

// Export default logger for convenience
export default logger;
