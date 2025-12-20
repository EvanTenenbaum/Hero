/**
 * Chat Agent Router - Sprint 1 Agent Alpha
 * 
 * tRPC router for chat agent operations.
 * Handles message execution, agent status, and cancellation.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { chatAgentService, ChatContext } from '../chatAgent';
import { PromptContext } from '../agents/promptTemplates';
import { AgentType } from '../agents/promptTemplates';

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
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const chatAgentRouter = router({
  /**
   * Execute a message through the specified agent type
   */
  executeWithAgent: protectedProcedure
    .input(executeMessageSchema)
    .mutation(async ({ ctx, input }) => {
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
      };
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
});

export type ChatAgentRouter = typeof chatAgentRouter;
