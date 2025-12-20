/**
 * Execution Replay Module
 * Allows replaying and analyzing past agent executions
 * Based on: Project Genesis research on observability
 */

import { getExecutionSteps, getAgentLogs } from "../db";

export interface ReplayStep {
  id: number;
  stepNumber: number;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: string;
  durationMs: number | null;
  timestamp: Date;
  logs: ReplayLog[];
}

export interface ReplayLog {
  id: number;
  event: string;
  level: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface ExecutionReplay {
  executionId: number;
  steps: ReplayStep[];
  summary: ExecutionSummary;
  timeline: TimelineEvent[];
}

export interface ExecutionSummary {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  totalDurationMs: number;
  averageStepDurationMs: number;
  errorCount: number;
  confirmationCount: number;
}

export interface TimelineEvent {
  timestamp: Date;
  type: 'step_start' | 'step_complete' | 'step_failed' | 'confirmation_requested' | 'confirmation_received' | 'error' | 'log';
  stepNumber?: number;
  action?: string;
  message: string;
  level?: string;
}

/**
 * Build a complete replay of an execution
 */
export async function buildExecutionReplay(
  executionId: number,
  userId: number
): Promise<ExecutionReplay | null> {
  // Get all steps for this execution
  const steps = await getExecutionSteps(executionId, userId);
  if (!steps || steps.length === 0) {
    return null;
  }

  // Get all logs for this execution
  const logs = await getAgentLogs(userId, { executionId, limit: 1000 });

  // Build replay steps with associated logs
  const replaySteps: ReplayStep[] = steps.map(step => {
    const stepLogs = logs
      .filter(log => {
        // Match logs to steps by timestamp or step reference in data
        const logData = log.data as Record<string, unknown> | null;
        return logData?.stepNumber === step.stepNumber;
      })
      .map(log => ({
        id: log.id,
        event: log.event,
        level: log.level,
        data: (log.data as Record<string, unknown>) || {},
        timestamp: log.createdAt,
      }));

    return {
      id: step.id,
      stepNumber: step.stepNumber,
      action: step.action,
      input: (step.input as Record<string, unknown>) || {},
      output: (step.output as Record<string, unknown>) || {},
      status: step.status,
      durationMs: step.durationMs,
      timestamp: step.createdAt,
      logs: stepLogs,
    };
  });

  // Map logs to ReplayLog format
  const replayLogs: ReplayLog[] = logs.map(log => ({
    id: log.id,
    event: log.event,
    level: log.level,
    data: (log.data as Record<string, unknown>) || {},
    timestamp: log.createdAt,
  }));

  // Build summary
  const summary = buildSummary(replaySteps, replayLogs);

  // Build timeline
  const timeline = buildTimeline(replaySteps, replayLogs);

  return {
    executionId,
    steps: replaySteps,
    summary,
    timeline,
  };
}

/**
 * Build execution summary statistics
 */
function buildSummary(steps: ReplayStep[], logs: ReplayLog[]): ExecutionSummary {
  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const failedSteps = steps.filter(s => s.status === 'failed').length;
  const skippedSteps = steps.filter(s => s.status === 'skipped').length;
  
  const durations = steps
    .filter(s => s.durationMs !== null)
    .map(s => s.durationMs as number);
  
  const totalDurationMs = durations.reduce((sum, d) => sum + d, 0);
  const averageStepDurationMs = durations.length > 0 
    ? Math.round(totalDurationMs / durations.length) 
    : 0;

  const errorCount = logs.filter(l => l.level === 'error').length;
  const confirmationCount = steps.filter(s => s.status === 'awaiting_confirmation').length;

  return {
    totalSteps: steps.length,
    completedSteps,
    failedSteps,
    skippedSteps,
    totalDurationMs,
    averageStepDurationMs,
    errorCount,
    confirmationCount,
  };
}

/**
 * Build a chronological timeline of events
 */
function buildTimeline(steps: ReplayStep[], logs: ReplayLog[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Add step events
  for (const step of steps) {
    // Step start
    events.push({
      timestamp: step.timestamp,
      type: 'step_start',
      stepNumber: step.stepNumber,
      action: step.action,
      message: `Started: ${step.action}`,
    });

    // Step completion/failure
    if (step.status === 'complete') {
      const endTime = step.durationMs 
        ? new Date(step.timestamp.getTime() + step.durationMs)
        : step.timestamp;
      events.push({
        timestamp: endTime,
        type: 'step_complete',
        stepNumber: step.stepNumber,
        action: step.action,
        message: `Completed: ${step.action} (${step.durationMs || 0}ms)`,
      });
    } else if (step.status === 'failed') {
      events.push({
        timestamp: step.timestamp,
        type: 'step_failed',
        stepNumber: step.stepNumber,
        action: step.action,
        message: `Failed: ${step.action}`,
        level: 'error',
      });
    } else if (step.status === 'awaiting_confirmation') {
      events.push({
        timestamp: step.timestamp,
        type: 'confirmation_requested',
        stepNumber: step.stepNumber,
        action: step.action,
        message: `Awaiting confirmation: ${step.action}`,
        level: 'warn',
      });
    }

    // Add step logs
    for (const log of step.logs) {
      events.push({
        timestamp: log.timestamp,
        type: 'log',
        stepNumber: step.stepNumber,
        message: log.event,
        level: log.level,
      });
    }
  }

  // Sort by timestamp
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return events;
}

/**
 * Get a diff between two executions
 */
export async function compareExecutions(
  executionId1: number,
  executionId2: number,
  userId: number
): Promise<{
  added: ReplayStep[];
  removed: ReplayStep[];
  modified: Array<{ before: ReplayStep; after: ReplayStep }>;
} | null> {
  const replay1 = await buildExecutionReplay(executionId1, userId);
  const replay2 = await buildExecutionReplay(executionId2, userId);

  if (!replay1 || !replay2) {
    return null;
  }

  const steps1Map = new Map(replay1.steps.map(s => [s.action, s]));
  const steps2Map = new Map(replay2.steps.map(s => [s.action, s]));

  const added: ReplayStep[] = [];
  const removed: ReplayStep[] = [];
  const modified: Array<{ before: ReplayStep; after: ReplayStep }> = [];

  // Find added and modified steps
  for (const [action, step2] of Array.from(steps2Map.entries())) {
    const step1 = steps1Map.get(action);
    if (!step1) {
      added.push(step2);
    } else if (JSON.stringify(step1.input) !== JSON.stringify(step2.input)) {
      modified.push({ before: step1, after: step2 });
    }
  }

  // Find removed steps
  for (const [action, step1] of Array.from(steps1Map.entries())) {
    if (!steps2Map.has(action)) {
      removed.push(step1);
    }
  }

  return { added, removed, modified };
}

/**
 * Export execution replay to a shareable format
 */
export function exportReplayToMarkdown(replay: ExecutionReplay): string {
  const lines: string[] = [
    `# Execution Replay #${replay.executionId}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Steps | ${replay.summary.totalSteps} |`,
    `| Completed | ${replay.summary.completedSteps} |`,
    `| Failed | ${replay.summary.failedSteps} |`,
    `| Skipped | ${replay.summary.skippedSteps} |`,
    `| Total Duration | ${replay.summary.totalDurationMs}ms |`,
    `| Avg Step Duration | ${replay.summary.averageStepDurationMs}ms |`,
    `| Errors | ${replay.summary.errorCount} |`,
    `| Confirmations | ${replay.summary.confirmationCount} |`,
    '',
    '## Steps',
    '',
  ];

  for (const step of replay.steps) {
    lines.push(`### Step ${step.stepNumber}: ${step.action}`);
    lines.push('');
    lines.push(`**Status:** ${step.status}`);
    if (step.durationMs) {
      lines.push(`**Duration:** ${step.durationMs}ms`);
    }
    lines.push('');
    
    if (Object.keys(step.input).length > 0) {
      lines.push('**Input:**');
      lines.push('```json');
      lines.push(JSON.stringify(step.input, null, 2));
      lines.push('```');
      lines.push('');
    }

    if (Object.keys(step.output).length > 0) {
      lines.push('**Output:**');
      lines.push('```json');
      lines.push(JSON.stringify(step.output, null, 2));
      lines.push('```');
      lines.push('');
    }

    if (step.logs.length > 0) {
      lines.push('**Logs:**');
      for (const log of step.logs) {
        lines.push(`- [${log.level.toUpperCase()}] ${log.event}`);
      }
      lines.push('');
    }
  }

  lines.push('## Timeline');
  lines.push('');
  lines.push('| Time | Event | Details |');
  lines.push('|------|-------|---------|');
  
  for (const event of replay.timeline) {
    const time = event.timestamp.toISOString().split('T')[1].split('.')[0];
    lines.push(`| ${time} | ${event.type} | ${event.message} |`);
  }

  return lines.join('\n');
}
