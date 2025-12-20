/**
 * Rollback Service - Sprint 3 Agent Beta
 * 
 * Manages agent execution rollback to previous checkpoints.
 * Handles state restoration and cleanup.
 */

import { getDb } from '../db';
import { agentCheckpoints, agentExecutions, executionSteps } from '../../drizzle/schema';
import { eq, and, desc, lt, gt } from 'drizzle-orm';

export interface CheckpointInfo {
  id: number;
  executionId: number;
  stepNumber: number;
  description: string | null;
  state: {
    executionState: string;
    currentStep: number;
    steps: unknown[];
    context: Record<string, unknown>;
    filesModified: string[];
  };
  createdAt: Date;
}

export interface RollbackResult {
  success: boolean;
  message: string;
  restoredCheckpoint?: CheckpointInfo;
  stepsReverted?: number;
  error?: string;
}

/**
 * Get all checkpoints for an execution
 */
export async function getCheckpoints(executionId: number): Promise<CheckpointInfo[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const checkpoints = await db
      .select()
      .from(agentCheckpoints)
      .where(eq(agentCheckpoints.executionId, executionId))
      .orderBy(desc(agentCheckpoints.stepNumber));

    return checkpoints.map(cp => ({
      id: cp.id,
      executionId: cp.executionId,
      stepNumber: cp.stepNumber,
      description: cp.description,
      state: cp.state,
      createdAt: cp.createdAt,
    }));
  } catch (error) {
    console.error('Error getting checkpoints:', error);
    return [];
  }
}

/**
 * Get the latest checkpoint for an execution
 */
export async function getLatestCheckpoint(executionId: number): Promise<CheckpointInfo | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const checkpoints = await db
      .select()
      .from(agentCheckpoints)
      .where(eq(agentCheckpoints.executionId, executionId))
      .orderBy(desc(agentCheckpoints.stepNumber))
      .limit(1);

    if (checkpoints.length === 0) return null;

    const cp = checkpoints[0];
    return {
      id: cp.id,
      executionId: cp.executionId,
      stepNumber: cp.stepNumber,
      description: cp.description,
      state: cp.state,
      createdAt: cp.createdAt,
    };
  } catch (error) {
    console.error('Error getting latest checkpoint:', error);
    return null;
  }
}

/**
 * Create a new checkpoint for an execution
 */
export async function createCheckpoint(
  agentId: number,
  executionId: number,
  userId: number,
  stepNumber: number,
  description?: string,
  customState?: Partial<CheckpointInfo['state']>
): Promise<CheckpointInfo | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    // Get current execution state
    const execution = await db
      .select()
      .from(agentExecutions)
      .where(eq(agentExecutions.id, executionId))
      .limit(1);

    if (execution.length === 0) {
      throw new Error('Execution not found');
    }

    const exec = execution[0];
    const checkpointState = {
      executionState: exec.state,
      currentStep: exec.currentStep || 0,
      steps: exec.steps || [],
      context: customState?.context || {},
      filesModified: customState?.filesModified || [],
    };

    const result = await db.insert(agentCheckpoints).values({
      agentId,
      executionId,
      userId,
      stepNumber,
      description: description || null,
      state: checkpointState,
      rollbackData: null,
      automatic: true,
      createdAt: new Date(),
    });

    const insertId = Number(result[0].insertId);

    return {
      id: insertId,
      executionId,
      stepNumber,
      description: description || null,
      state: checkpointState,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error creating checkpoint:', error);
    return null;
  }
}

/**
 * Rollback an execution to a specific checkpoint
 */
export async function rollbackToCheckpoint(
  executionId: number,
  checkpointId: number
): Promise<RollbackResult> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, message: 'Database not available' };
    }

    // Get the target checkpoint
    const checkpoints = await db
      .select()
      .from(agentCheckpoints)
      .where(
        and(
          eq(agentCheckpoints.id, checkpointId),
          eq(agentCheckpoints.executionId, executionId)
        )
      )
      .limit(1);

    if (checkpoints.length === 0) {
      return { success: false, message: 'Checkpoint not found' };
    }

    const checkpoint = checkpoints[0];
    const state = checkpoint.state;

    // Count steps that will be reverted
    const allSteps = await db
      .select()
      .from(executionSteps)
      .where(eq(executionSteps.executionId, executionId));

    const stepsReverted = allSteps.filter(s => s.stepNumber > checkpoint.stepNumber).length;

    // Restore execution state from checkpoint
    await db
      .update(agentExecutions)
      .set({
        state: state.executionState as "idle" | "planning" | "executing" | "waiting_approval" | "halted" | "completed" | "failed",
        currentStep: state.currentStep,
        steps: state.steps as Array<{
          id: string;
          stepNumber: number;
          description: string;
          action: string;
          status: "pending" | "executing" | "completed" | "failed" | "skipped";
        }>,
        updatedAt: new Date(),
      })
      .where(eq(agentExecutions.id, executionId));

    // Mark steps after checkpoint as skipped
    await db
      .update(executionSteps)
      .set({
        status: 'skipped',
      })
      .where(
        and(
          eq(executionSteps.executionId, executionId),
          gt(executionSteps.stepNumber, checkpoint.stepNumber)
        )
      );

    // Delete checkpoints after this one
    await db
      .delete(agentCheckpoints)
      .where(
        and(
          eq(agentCheckpoints.executionId, executionId),
          gt(agentCheckpoints.stepNumber, checkpoint.stepNumber)
        )
      );

    return {
      success: true,
      message: `Rolled back to step ${checkpoint.stepNumber}`,
      restoredCheckpoint: {
        id: checkpoint.id,
        executionId: checkpoint.executionId,
        stepNumber: checkpoint.stepNumber,
        description: checkpoint.description,
        state: checkpoint.state,
        createdAt: checkpoint.createdAt,
      },
      stepsReverted,
    };
  } catch (error) {
    console.error('Error rolling back to checkpoint:', error);
    return {
      success: false,
      message: 'Rollback failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Rollback to the previous checkpoint
 */
export async function rollbackToPrevious(executionId: number): Promise<RollbackResult> {
  try {
    const checkpoints = await getCheckpoints(executionId);
    
    if (checkpoints.length < 2) {
      return {
        success: false,
        message: 'No previous checkpoint available',
      };
    }

    // Get the second-to-last checkpoint (previous)
    const previousCheckpoint = checkpoints[1];
    return rollbackToCheckpoint(executionId, previousCheckpoint.id);
  } catch (error) {
    console.error('Error rolling back to previous:', error);
    return {
      success: false,
      message: 'Rollback failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a checkpoint
 */
export async function deleteCheckpoint(checkpointId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db
      .delete(agentCheckpoints)
      .where(eq(agentCheckpoints.id, checkpointId));

    return true;
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    return false;
  }
}

/**
 * Get rollback preview (what would change)
 */
export async function getRollbackPreview(
  executionId: number,
  checkpointId: number
): Promise<{
  stepsToRevert: number;
  checkpointsToRemove: number;
  targetState: CheckpointInfo['state'];
} | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    // Get target checkpoint
    const checkpoints = await db
      .select()
      .from(agentCheckpoints)
      .where(
        and(
          eq(agentCheckpoints.id, checkpointId),
          eq(agentCheckpoints.executionId, executionId)
        )
      )
      .limit(1);

    if (checkpoints.length === 0) return null;

    const targetCheckpoint = checkpoints[0];

    // Count steps after checkpoint
    const allSteps = await db
      .select()
      .from(executionSteps)
      .where(eq(executionSteps.executionId, executionId));

    const stepsToRevert = allSteps.filter(s => s.stepNumber > targetCheckpoint.stepNumber).length;

    // Count checkpoints after this one
    const checkpointsAfter = await db
      .select()
      .from(agentCheckpoints)
      .where(
        and(
          eq(agentCheckpoints.executionId, executionId),
          gt(agentCheckpoints.stepNumber, targetCheckpoint.stepNumber)
        )
      );

    return {
      stepsToRevert,
      checkpointsToRemove: checkpointsAfter.length,
      targetState: targetCheckpoint.state,
    };
  } catch (error) {
    console.error('Error getting rollback preview:', error);
    return null;
  }
}
