/**
 * Execution Streaming Router - Sprint 30
 * 
 * Provides real-time streaming updates for agent execution via SSE.
 */

import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import {
  startExecution,
  pauseExecution,
  resumeExecution,
  stopExecution,
  getExecutionState,
  subscribeToExecution,
  approveExecution,
  rejectExecution,
  AgentStep,
} from "../agentExecution";

export const executionStreamRouter = router({
  /**
   * Start a new agent execution with streaming updates
   */
  start: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        goal: z.string().min(1),
        context: z.string().optional(),
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await db.getAgentById(input.agentId, ctx.user.id);
      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      const state = await startExecution(
        input.agentId,
        ctx.user.id,
        input.goal,
        input.context
      );

      return {
        executionId: state.executionId,
        status: state.status,
        message: "Execution started",
      };
    }),

  /**
   * Subscribe to execution updates via SSE
   */
  subscribe: protectedProcedure
    .input(z.object({ executionId: z.number() }))
    .subscription(({ ctx, input }) => {
      return observable<AgentStep>((emit) => {
        // Verify ownership
        db.getAgentExecutionById(input.executionId, ctx.user.id).then((exec) => {
          if (!exec) {
            emit.error(new TRPCError({ code: "NOT_FOUND" }));
            return;
          }

          // Subscribe to updates
          const unsubscribe = subscribeToExecution(input.executionId, (step) => {
            emit.next(step);
          });

          // Return cleanup function
          return unsubscribe;
        });

        // Return a no-op cleanup if the promise hasn't resolved yet
        return () => {};
      });
    }),

  /**
   * Get current execution state
   */
  getState: protectedProcedure
    .input(z.object({ executionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const exec = await db.getAgentExecutionById(input.executionId, ctx.user.id);
      if (!exec) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Try to get live state from memory
      const liveState = getExecutionState(input.executionId);
      if (liveState) {
        return {
          executionId: liveState.executionId,
          status: liveState.status,
          currentStep: liveState.currentStep,
          maxSteps: liveState.maxSteps,
          tokensUsed: liveState.tokensUsed,
          costIncurred: liveState.costIncurred,
          budgetLimit: liveState.budgetLimit,
          steps: liveState.steps,
          goal: liveState.goal,
        };
      }

      // Fall back to database state
      return {
        executionId: exec.id,
        status: exec.state,
        currentStep: exec.currentStep || 0,
        maxSteps: 10,
        tokensUsed: exec.totalTokensUsed || 0,
        costIncurred: parseFloat(exec.totalCostUsd || "0"),
        budgetLimit: 1.0,
        steps: exec.steps || [],
        goal: exec.goal,
      };
    }),

  /**
   * Pause execution
   */
  pause: protectedProcedure
    .input(z.object({ executionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const exec = await db.getAgentExecutionById(input.executionId, ctx.user.id);
      if (!exec) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await pauseExecution(input.executionId, ctx.user.id);
      return { success: true, message: "Execution paused" };
    }),

  /**
   * Resume execution
   */
  resume: protectedProcedure
    .input(z.object({ executionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const exec = await db.getAgentExecutionById(input.executionId, ctx.user.id);
      if (!exec) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await resumeExecution(input.executionId, ctx.user.id);
      return { success: true, message: "Execution resumed" };
    }),

  /**
   * Stop execution
   */
  stop: protectedProcedure
    .input(z.object({ executionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const exec = await db.getAgentExecutionById(input.executionId, ctx.user.id);
      if (!exec) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await stopExecution(input.executionId, ctx.user.id);
      return { success: true, message: "Execution stopped" };
    }),

  /**
   * Approve pending execution (when awaiting approval)
   */
  approve: protectedProcedure
    .input(z.object({ executionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const exec = await db.getAgentExecutionById(input.executionId, ctx.user.id);
      if (!exec) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await approveExecution(input.executionId, ctx.user.id);
      return { success: true, message: "Execution approved and resumed" };
    }),

  /**
   * Reject pending execution
   */
  reject: protectedProcedure
    .input(
      z.object({
        executionId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const exec = await db.getAgentExecutionById(input.executionId, ctx.user.id);
      if (!exec) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await rejectExecution(input.executionId, ctx.user.id, input.reason);
      return { success: true, message: "Execution rejected" };
    }),

  /**
   * Get execution history for an agent
   */
  history: protectedProcedure
    .input(
      z.object({
        agentId: z.number().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return db.getAgentExecutionsByUserId(ctx.user.id);
    }),
});
