/**
 * Cloud Execution Streaming Router
 * 
 * Provides real-time streaming updates for cloud sandbox execution via SSE.
 * Integrates with CloudExecutionEngine for E2B sandbox operations.
 */

import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { cloudChatAgentService } from "../cloudChatAgent";
import { CloudExecutionEngine, CloudExecutionState, CloudExecutionStep } from "../agents/cloudExecutionEngine";
import { SandboxManager } from "../services/sandboxManager";

// Event types for SSE streaming
interface CloudExecutionEvent {
  type: 'state_change' | 'step_start' | 'step_complete' | 'tool_output' | 'confirmation_required' | 'error' | 'done';
  timestamp: Date;
  data: {
    state?: CloudExecutionState;
    step?: CloudExecutionStep;
    tool?: string;
    output?: string;
    error?: string;
    confirmationRequired?: {
      tool: string;
      args: Record<string, unknown>;
      reason: string;
    };
  };
}

// In-memory event emitters for active executions
const executionEmitters = new Map<string, Set<(event: CloudExecutionEvent) => void>>();

// Helper to get emitter key
function getEmitterKey(userId: number, projectId: number): string {
  return `${userId}:${projectId}`;
}

// Helper to emit event to all subscribers
export function emitCloudExecutionEvent(userId: number, projectId: number, event: CloudExecutionEvent): void {
  const key = getEmitterKey(userId, projectId);
  const emitters = executionEmitters.get(key);
  if (emitters) {
    emitters.forEach(emit => emit(event));
  }
}

export const cloudExecutionStreamRouter = router({
  /**
   * Start cloud execution with streaming updates
   */
  start: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      message: z.string().min(1),
      agentType: z.enum(['pm', 'developer', 'qa', 'devops', 'research']),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project access
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      if (!project.useCloudSandbox) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Cloud sandbox not enabled for this project" 
        });
      }

      // Start execution with event callbacks
      const result = await cloudChatAgentService.executeWithTools(
        input.message,
        input.agentType,
        input.projectId,
        ctx.user.id,
        input.conversationHistory,
        {
          onStateChange: (state) => {
            emitCloudExecutionEvent(ctx.user.id, input.projectId, {
              type: 'state_change',
              timestamp: new Date(),
              data: { state },
            });
          },
          onStepComplete: (step) => {
            emitCloudExecutionEvent(ctx.user.id, input.projectId, {
              type: 'step_complete',
              timestamp: new Date(),
              data: { step },
            });
          },
          onConfirmationRequired: (tool, args, reason) => {
            emitCloudExecutionEvent(ctx.user.id, input.projectId, {
              type: 'confirmation_required',
              timestamp: new Date(),
              data: { 
                confirmationRequired: { tool, args, reason } 
              },
            });
          },
        }
      );

      // Emit completion event
      emitCloudExecutionEvent(ctx.user.id, input.projectId, {
        type: 'done',
        timestamp: new Date(),
        data: {},
      });

      return {
        success: result.success,
        response: result.response,
        error: result.error,
        toolCalls: result.toolCalls,
        executionId: result.executionId,
        durationMs: result.durationMs,
      };
    }),

  /**
   * Subscribe to cloud execution updates via SSE
   */
  subscribe: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .subscription(async ({ ctx, input }) => {
      // SECURITY: Verify project ownership before allowing subscription
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or access denied" });
      }

      return observable<CloudExecutionEvent>((emit) => {
        const key = getEmitterKey(ctx.user.id, input.projectId);
        
        // Create emitter set if it doesn't exist
        if (!executionEmitters.has(key)) {
          executionEmitters.set(key, new Set());
        }

        // Add this subscriber
        const emitter = (event: CloudExecutionEvent) => {
          emit.next(event);
        };
        executionEmitters.get(key)!.add(emitter);

        // Cleanup on unsubscribe
        return () => {
          const emitters = executionEmitters.get(key);
          if (emitters) {
            emitters.delete(emitter);
            if (emitters.size === 0) {
              executionEmitters.delete(key);
            }
          }
        };
      });
    }),

  /**
   * Get current cloud execution state
   */
  getState: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      // SECURITY: Verify project ownership
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or access denied" });
      }

      const engine = cloudChatAgentService.getExecutionEngine(ctx.user.id, input.projectId);
      if (!engine) {
        return { active: false };
      }

      return {
        active: true,
        state: engine.getState(),
        history: engine.getHistory(),
        pendingConfirmation: engine.getPendingConfirmation(),
      };
    }),

  /**
   * Confirm or reject a pending tool execution
   */
  confirm: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      approved: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // SECURITY: Verify project ownership
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or access denied" });
      }

      const engine = cloudChatAgentService.getExecutionEngine(ctx.user.id, input.projectId);
      if (!engine) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "No active execution found" 
        });
      }

      if (input.approved) {
        engine.resume();
      } else {
        engine.cancel();
      }

      return { success: true };
    }),

  /**
   * Cancel active cloud execution
   */
  cancel: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // SECURITY: Verify project ownership
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or access denied" });
      }

      const engine = cloudChatAgentService.getExecutionEngine(ctx.user.id, input.projectId);
      if (!engine) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "No active execution found" 
        });
      }

      engine.cancel();
      return { success: true, message: "Execution cancelled" };
    }),

  /**
   * Get sandbox status for a project
   */
  sandboxStatus: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const sandboxManager = SandboxManager.getInstance();
      const sandbox = await sandboxManager.getOrCreateSandbox(input.projectId);

      return {
        active: !!sandbox,
        sandboxId: sandbox?.sandboxId,
        projectId: input.projectId,
        cloudEnabled: project.useCloudSandbox || false,
      };
    }),
});

export type CloudExecutionStreamRouter = typeof cloudExecutionStreamRouter;
