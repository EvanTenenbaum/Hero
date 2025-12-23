/**
 * Chat Agent Router - Sprint 1 Agent Alpha + Cloud Sandbox Integration
 * 
 * tRPC router for chat agent operations.
 * Handles message execution, agent status, and cancellation.
 * Now integrated with CloudChatAgentService for cloud sandbox execution.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { chatAgentService, ChatContext } from '../chatAgent';
import { CloudChatAgentService, cloudChatAgentService } from '../cloudChatAgent';
import { PromptContext } from '../agents/promptTemplates';
import { AgentType } from '../agents/promptTemplates';
import * as db from '../db';

// ════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const agentTypeSchema = z.enum(['pm', 'developer', 'qa', 'devops', 'research']);

const chatContextSchema = z.object({
  projectId: z.number().optional(),
  projectName: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.date().optional(),
  })).optional(),
  openFiles: z.array(z.string()).optional(),
  userRules: z.array(z.string()).optional(),
}).optional();

const executeMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  agentType: agentTypeSchema,
  context: chatContextSchema,
  skipSafetyCheck: z.boolean().optional().default(false),
  // New: Cloud execution options
  useCloudSandbox: z.boolean().optional().default(false),
  projectId: z.number().optional(),
});

const cloudExecuteSchema = z.object({
  message: z.string().min(1).max(10000),
  agentType: agentTypeSchema,
  projectId: z.number(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const chatAgentRouter = router({
  /**
   * Execute a message through the specified agent type
   * Supports both local and cloud sandbox execution
   */
  executeWithAgent: protectedProcedure
    .input(executeMessageSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if cloud sandbox should be used
      if (input.useCloudSandbox && input.projectId) {
        // Use cloud execution
        const result = await cloudChatAgentService.executeWithTools(
          input.message,
          input.agentType as AgentType,
          input.projectId,
          ctx.user.id,
          input.context?.conversationHistory?.map(m => ({
            role: m.role,
            content: m.content,
          }))
        );

        return {
          success: result.success,
          agentType: input.agentType,
          safetyCheck: {
            allowed: true,
            requiresConfirmation: false,
            reason: undefined,
            riskLevel: 'low' as const,
          },
          response: result.response,
          error: result.error,
          durationMs: result.durationMs,
          // Cloud-specific fields
          toolCalls: result.toolCalls,
          executionId: result.executionId,
          isCloudExecution: true,
        };
      }

      // Use original local execution
      const result = await chatAgentService.executeMessage({
        message: input.message,
        agentType: input.agentType as AgentType,
        context: input.context as ChatContext | undefined,
        userId: ctx.user.id,
        skipSafetyCheck: input.skipSafetyCheck,
      });

      return {
        success: result.success,
        agentType: result.agentType,
        safetyCheck: {
          allowed: result.safetyCheck.allowed,
          requiresConfirmation: result.safetyCheck.requiresConfirmation,
          reason: result.safetyCheck.reason,
          riskLevel: result.safetyCheck.riskLevel,
        },
        response: result.response,
        error: result.error,
        durationMs: result.durationMs,
        isCloudExecution: false,
      };
    }),

  /**
   * Execute a message with cloud sandbox (dedicated endpoint)
   */
  executeInCloud: protectedProcedure
    .input(cloudExecuteSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await cloudChatAgentService.executeWithTools(
        input.message,
        input.agentType as AgentType,
        input.projectId,
        ctx.user.id,
        input.conversationHistory
      );

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
   * Confirm a pending tool execution
   */
  confirmToolExecution: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      toolName: z.string(),
      approved: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const engine = cloudChatAgentService.getExecutionEngine(ctx.user.id, input.projectId);
      if (!engine) {
        return { success: false, error: 'No active execution engine found' };
      }

      if (input.approved) {
        engine.resume();
      } else {
        engine.cancel();
      }

      return { success: true };
    }),

  /**
   * Get execution engine status for a project
   */
  getExecutionStatus: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
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
   * Cancel an active execution
   */
  cancelExecution: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const engine = cloudChatAgentService.getExecutionEngine(ctx.user.id, input.projectId);
      if (!engine) {
        return { success: false, error: 'No active execution engine found' };
      }

      engine.cancel();
      return { success: true };
    }),

  /**
   * Get available agent types with descriptions
   */
  getAgentTypes: protectedProcedure
    .query(() => {
      return chatAgentService.getAvailableAgentTypes();
    }),

  /**
   * Get the prompt that would be used for a specific agent type
   * Useful for debugging and transparency
   */
  previewPrompt: protectedProcedure
    .input(z.object({
      agentType: agentTypeSchema,
      projectName: z.string().optional(),
      techStack: z.array(z.string()).optional(),
    }))
    .query(({ input }) => {
      const promptContext: PromptContext = input.projectName ? {
        project: {
          name: input.projectName,
          description: '',
          techStack: input.techStack || [],
          conventions: '',
        }
      } : {};
      const prompt = chatAgentService.getPromptForAgent(
        input.agentType as AgentType,
        promptContext
      );
      return { prompt };
    }),

  /**
   * Validate if an agent type is valid
   */
  validateAgentType: protectedProcedure
    .input(z.object({ type: z.string() }))
    .query(({ input }) => {
      return {
        valid: chatAgentService.isValidAgentType(input.type),
        type: input.type,
      };
    }),

  /**
   * Check if a project has cloud sandbox enabled
   */
  isCloudEnabled: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        return { enabled: false, error: 'Project not found' };
      }
      return { 
        enabled: project.useCloudSandbox || false,
        repoOwner: project.repoOwner,
        repoName: project.repoName,
      };
    }),
});

export type ChatAgentRouter = typeof chatAgentRouter;
