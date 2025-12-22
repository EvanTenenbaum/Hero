/**
 * Chat Streaming Router - Sprint 28
 * 
 * SSE-based streaming endpoint for real-time chat responses.
 * Uses invokeLLMStream for token-by-token delivery.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { invokeLLMStream } from '../_core/llm';
import { chatAgentService, ChatContext } from '../chatAgent';
import { AgentType } from '../agents/promptTemplates';
import * as db from '../db';
import { recordExecution } from '../services/metricsRecorder';
import { observable } from '@trpc/server/observable';

// ════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const streamMessageSchema = z.object({
  conversationId: z.number(),
  content: z.string().min(1),
  agentType: z.enum(['pm', 'developer', 'qa', 'devops', 'research']).default('developer'),
  projectId: z.number().optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// STREAMING ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const chatStreamRouter = router({
  /**
   * Stream a chat message response using SSE
   * Returns chunks as they arrive from the LLM
   */
  streamMessage: protectedProcedure
    .input(streamMessageSchema)
    .subscription(async function* ({ ctx, input }) {
      const startTime = Date.now();
      
      // Verify conversation ownership
      const conv = await db.getConversationById(input.conversationId, ctx.user.id);
      if (!conv) {
        yield { type: 'error' as const, error: 'Conversation not found' };
        return;
      }
      
      // Get project context if available
      let projectContext: { name: string; techStack: string[] } | undefined;
      if (input.projectId || conv.projectId) {
        const project = await db.getProjectById(input.projectId || conv.projectId!, ctx.user.id);
        if (project) {
          const settings = project.settings as { language?: string; framework?: string } | null;
          projectContext = {
            name: project.name,
            techStack: [settings?.language, settings?.framework].filter(Boolean) as string[],
          };
        }
      }
      
      // Get user's custom rules
      const userRules = await db.getUserAgentRules(ctx.user.id, input.agentType);
      
      // Get conversation history
      const messages = await db.getMessagesByConversationId(input.conversationId);
      
      // Build chat context
      const chatContext: ChatContext = {
        projectId: input.projectId || conv.projectId || undefined,
        projectName: projectContext?.name,
        techStack: projectContext?.techStack,
        conversationHistory: messages.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        userRules: userRules.map(r => r.ruleContent),
      };
      
      // Execute safety check through agent service
      const agentResult = await chatAgentService.executeMessage({
        message: input.content,
        agentType: input.agentType as AgentType,
        context: chatContext,
        userId: ctx.user.id,
      });
      
      // Handle blocked messages
      if (!agentResult.success) {
        await db.addMessage({
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        });
        
        const blockedContent = `⚠️ **Safety Check Failed**\n\n${agentResult.error || 'Your message was blocked by safety rules.'}\n\nPlease rephrase your request.`;
        await db.addMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: blockedContent,
        });
        
        yield { type: 'blocked' as const, reason: agentResult.safetyCheck.reason };
        return;
      }
      
      // Handle confirmation required
      if (agentResult.safetyCheck.requiresConfirmation) {
        await db.addMessage({
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        });
        
        yield { type: 'confirmation_required' as const, reason: agentResult.safetyCheck.reason };
        return;
      }
      
      // Save user message
      await db.addMessage({
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
      });
      
      // Build LLM messages
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
      llmMessages.push({ role: "system", content: agentResult.prompt });
      
      const recentMessages = messages.slice(-20);
      for (const msg of recentMessages) {
        if (msg.role === "user" || msg.role === "assistant") {
          llmMessages.push({ role: msg.role, content: msg.content });
        }
      }
      llmMessages.push({ role: "user", content: input.content });
      
      // Signal streaming start
      yield { type: 'start' as const };
      
      // Stream LLM response
      let fullContent = '';
      let totalTokens = 0;
      
      try {
        for await (const chunk of invokeLLMStream({ messages: llmMessages })) {
          if (chunk.type === 'chunk' && chunk.content) {
            fullContent += chunk.content;
            yield { type: 'chunk' as const, content: chunk.content };
          } else if (chunk.type === 'done') {
            totalTokens = chunk.usage?.total_tokens || 0;
          } else if (chunk.type === 'error') {
            yield { type: 'error' as const, error: chunk.error };
            return;
          }
        }
      } catch (error) {
        yield { type: 'error' as const, error: error instanceof Error ? error.message : 'Stream error' };
        return;
      }
      
      const durationMs = Date.now() - startTime;
      
      // Save assistant message
      const assistantMsg = await db.addMessage({
        conversationId: input.conversationId,
        role: "assistant",
        content: fullContent || "I apologize, but I couldn't generate a response.",
        model: "gemini-2.5-flash",
        tokensUsed: totalTokens,
      });
      
      // Record budget usage
      if (totalTokens > 0) {
        await db.recordBudgetUsage({
          userId: ctx.user.id,
          tokensUsed: totalTokens,
          costUsd: (totalTokens * 0.000001).toFixed(6),
          model: "gemini-2.5-flash",
          operation: "chat",
        });
      }
      
      // Record execution metrics
      await recordExecution({
        userId: ctx.user.id,
        projectId: input.projectId || conv.projectId || undefined,
        agentType: input.agentType,
        tokensUsed: totalTokens,
        durationMs: durationMs,
        success: true,
      });
      
      // Signal completion
      yield {
        type: 'done' as const,
        messageId: assistantMsg.id,
        tokensUsed: totalTokens,
        durationMs: durationMs,
      };
    }),
});
