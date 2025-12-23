/**
 * Kanban tRPC Router
 * Phase 1 Task P1-007
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as kanbanDb from "./db";
import * as db from "../db";
import { generateSprintPlan, adjustSprintPlan, SprintPlan } from "../sprint/orchestrator";
import { cloudChatAgentService } from "../cloudChatAgent";
import { 
  verifyProjectAccess, 
  verifyBoardAccess, 
  verifyColumnAccess, 
  verifyCardAccess,
  requireAccess,
  requireExists 
} from "./auth";

export const kanbanRouter = router({
  // ══════════════════════════════════════════════════════════════════════════
  // BOARDS
  // ══════════════════════════════════════════════════════════════════════════
  
  createBoard: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return kanbanDb.createBoard({
        ...input,
        userId: ctx.user.id,
      });
    }),
  
  getBoard: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyBoardAccess(ctx.user.id, input.id);
      requireAccess(hasAccess, "board");
      return kanbanDb.getBoardWithData(input.id);
    }),
  
  getBoardsByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyProjectAccess(ctx.user.id, input.projectId);
      requireAccess(hasAccess, "project");
      return kanbanDb.getBoardsByProject(input.projectId);
    }),
  
  getBoards: protectedProcedure
    .query(async ({ ctx }) => {
      return kanbanDb.getBoardsByUser(ctx.user.id);
    }),
  
  updateBoard: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      settings: z.object({
        defaultView: z.enum(["board", "list", "timeline"]).optional(),
        showLabels: z.boolean().optional(),
        showAssignees: z.boolean().optional(),
        showDueDates: z.boolean().optional(),
        swimlaneBy: z.enum(["agent", "priority", "epic", "label", "none"]).optional(),
        cardSize: z.enum(["compact", "normal", "detailed"]).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyBoardAccess(ctx.user.id, input.id);
      requireAccess(hasAccess, "board");
      const { id, ...data } = input;
      return kanbanDb.updateBoard(id, data);
    }),
  
  deleteBoard: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyBoardAccess(ctx.user.id, input.id);
      requireAccess(hasAccess, "board");
      await kanbanDb.deleteBoard(input.id);
      return { success: true };
    }),
  
  createDefaultBoard: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return kanbanDb.createDefaultBoard(input.projectId, ctx.user.id);
    }),
  
  // ══════════════════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════════════════
  
  createColumn: protectedProcedure
    .input(z.object({
      boardId: z.number(),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      color: z.string().optional(),
      columnType: z.enum([
        "backlog", "spec_writing", "design", "ready",
        "in_progress", "review", "done", "blocked", "custom"
      ]).optional(),
      wipLimit: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyBoardAccess(ctx.user.id, input.boardId);
      requireAccess(hasAccess, "board");
      return kanbanDb.createColumn(input);
    }),
  
  updateColumn: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      wipLimit: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyColumnAccess(ctx.user.id, input.id);
      requireAccess(hasAccess, "column");
      const { id, ...data } = input;
      return kanbanDb.updateColumn(id, data);
    }),
  
  deleteColumn: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyColumnAccess(ctx.user.id, input.id);
      requireAccess(hasAccess, "column");
      await kanbanDb.deleteColumn(input.id);
      return { success: true };
    }),
  
  reorderColumns: protectedProcedure
    .input(z.object({
      boardId: z.number(),
      columnIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyBoardAccess(ctx.user.id, input.boardId);
      requireAccess(hasAccess, "board");
      await kanbanDb.reorderColumns(input.boardId, input.columnIds);
      return { success: true };
    }),
  
  // ══════════════════════════════════════════════════════════════════════════
  // CARDS
  // ══════════════════════════════════════════════════════════════════════════
  
  createCard: protectedProcedure
    .input(z.object({
      boardId: z.number(),
      columnId: z.number(),
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      cardType: z.enum(["epic", "feature", "task", "bug", "spike", "chore"]).optional(),
      priority: z.enum(["critical", "high", "medium", "low"]).optional(),
      assignedAgent: z.enum(["pm", "developer", "qa", "devops", "research"]).optional(),
      labels: z.array(z.string()).optional(),
      dueDate: z.date().optional(),
      estimatedMinutes: z.number().optional(),
      storyPoints: z.number().optional(),
      acceptanceCriteria: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return kanbanDb.createCard(input, ctx.user.id);
    }),
  
  getCard: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyCardAccess(ctx.user.id, input.id);
      requireAccess(hasAccess, "card");
      
      const card = await kanbanDb.getCardById(input.id);
      if (!card) return null;
      
      const [dependencies, blockers, comments, history] = await Promise.all([
        kanbanDb.getDependencies(input.id),
        kanbanDb.getBlockers(input.id),
        kanbanDb.getComments(input.id),
        kanbanDb.getCardHistory(input.id, 20),
      ]);
      
      return { ...card, dependencies, blockers, comments, history };
    }),
  
  updateCard: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(500).optional(),
      description: z.string().optional(),
      cardType: z.enum(["epic", "feature", "task", "bug", "spike", "chore"]).optional(),
      priority: z.enum(["critical", "high", "medium", "low"]).optional(),
      assignedAgent: z.enum(["pm", "developer", "qa", "devops", "research"]).nullable().optional(),
      assignedUserId: z.number().nullable().optional(),
      labels: z.array(z.string()).optional(),
      dueDate: z.date().nullable().optional(),
      startDate: z.date().nullable().optional(),
      estimatedMinutes: z.number().nullable().optional(),
      actualMinutes: z.number().nullable().optional(),
      storyPoints: z.number().nullable().optional(),
      acceptanceCriteria: z.array(z.string()).optional(),
      isBlocked: z.boolean().optional(),
      blockReason: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyCardAccess(ctx.user.id, input.id);
      requireAccess(hasAccess, "card");
      const { id, ...data } = input;
      return kanbanDb.updateCard(id, data, ctx.user.id);
    }),
  
  moveCard: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      targetColumnId: z.number(),
      targetPosition: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyCardAccess(ctx.user.id, input.cardId);
      requireAccess(hasAccess, "card");
      return kanbanDb.moveCard(
        input.cardId,
        input.targetColumnId,
        input.targetPosition,
        ctx.user.id
      );
    }),
  
  deleteCard: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyCardAccess(ctx.user.id, input.id);
      requireAccess(hasAccess, "card");
      await kanbanDb.deleteCard(input.id);
      return { success: true };
    }),
  
  // ══════════════════════════════════════════════════════════════════════════
  // DEPENDENCIES
  // ══════════════════════════════════════════════════════════════════════════
  
  addDependency: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      blockedByCardId: z.number(),
      dependencyType: z.enum(["blocks", "relates_to", "duplicates", "parent_of"]).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyCardAccess(ctx.user.id, input.cardId);
      requireAccess(hasAccess, "card");
      return kanbanDb.addDependency(input);
    }),
  
  removeDependency: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await kanbanDb.removeDependency(input.id);
      return { success: true };
    }),
  
  // ══════════════════════════════════════════════════════════════════════════
  // COMMENTS
  // ══════════════════════════════════════════════════════════════════════════
  
  addComment: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      content: z.string().min(1),
      parentCommentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyCardAccess(ctx.user.id, input.cardId);
      requireAccess(hasAccess, "card");
      return kanbanDb.addComment({
        ...input,
        userId: ctx.user.id,
      });
    }),
  
  deleteComment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await kanbanDb.deleteComment(input.id);
      return { success: true };
    }),
  
  // ══════════════════════════════════════════════════════════════════════════
  // LABELS
  // ══════════════════════════════════════════════════════════════════════════
  
  createLabel: protectedProcedure
    .input(z.object({
      boardId: z.number(),
      name: z.string().min(1).max(50),
      color: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return kanbanDb.createLabel(input);
    }),
  
  deleteLabel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await kanbanDb.deleteLabel(input.id);
      return { success: true };
    }),
  
  // ══════════════════════════════════════════════════════════════════════════
  // HISTORY
  // ══════════════════════════════════════════════════════════════════════════
  
  getCardHistory: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      limit: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Authorization check
      const hasAccess = await verifyCardAccess(ctx.user.id, input.cardId);
      requireAccess(hasAccess, "card");
      return kanbanDb.getCardHistory(input.cardId, input.limit);
    }),
  
  // ══════════════════════════════════════════════════════════════════════════
  // SPEC LINKING (Phase 2)
  // ══════════════════════════════════════════════════════════════════════════
  
  linkCardToSpec: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      specId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return kanbanDb.linkCardToSpec(input.cardId, input.specId, ctx.user.id);
    }),
  
  unlinkCardFromSpec: protectedProcedure
    .input(z.object({
      cardId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return kanbanDb.unlinkCardFromSpec(input.cardId, ctx.user.id);
    }),
  
  getCardsLinkedToSpec: protectedProcedure
    .input(z.object({
      specId: z.number(),
    }))
    .query(async ({ input }) => {
      return kanbanDb.getCardsLinkedToSpec(input.specId);
    }),
  
  // ══════════════════════════════════════════════════════════════════════════
  // BOARD TEMPLATES (Phase 2)
  // ══════════════════════════════════════════════════════════════════════════
  
  createBoardFromTemplate: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      templateType: z.enum(["sprint", "feature_development", "bug_triage", "kanban_basic"]),
      name: z.string().min(1).max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return kanbanDb.createBoardFromTemplate(
        input.projectId,
        input.templateType,
        ctx.user.id,
        input.name
      );
    }),
  
  // ══════════════════════════════════════════════════════════════════════════
  // DEPENDENCY GRAPH (Phase 2)
  // ══════════════════════════════════════════════════════════════════════════
  
  getDependencyGraph: protectedProcedure
    .input(z.object({ boardId: z.number() }))
    .query(async ({ input }) => {
      return kanbanDb.getDependencyGraph(input.boardId);
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // SPRINT ORCHESTRATOR
  // ══════════════════════════════════════════════════════════════════════════
  
  generateSprintPlan: protectedProcedure
    .input(z.object({
      boardId: z.number(),
      sprintName: z.string().min(1).max(255),
      sprintGoal: z.string().min(1),
      durationDays: z.number().min(1).max(90).optional().default(14),
    }))
    .mutation(async ({ input }) => {
      return generateSprintPlan(
        input.boardId,
        input.sprintName,
        input.sprintGoal,
        input.durationDays
      );
    }),

  adjustSprintPlan: protectedProcedure
    .input(z.object({
      currentPlan: z.any(), // SprintPlan type
      adjustment: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      return adjustSprintPlan(input.currentPlan as SprintPlan, input.adjustment);
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // CLOUD EXECUTION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Execute a kanban card task in the cloud sandbox
   */
  executeCard: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      projectId: z.number(),
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

      // Get the card details
      const card = await kanbanDb.getCardById(input.cardId);
      if (!card) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" });
      }

      // Build the execution prompt from card details
      const executionPrompt = `Execute the following task:

Title: ${card.title}
Description: ${card.description || 'No description provided'}
Type: ${card.cardType || 'task'}
Priority: ${card.priority || 'medium'}

Please implement this task in the codebase. Use the available tools to:
1. Read relevant files to understand the context
2. Make necessary code changes
3. Run tests if applicable
4. Commit the changes with a descriptive message`;

      // Determine agent type from card
      const agentType = card.assignedAgent === 'qa' ? 'qa' 
        : card.assignedAgent === 'devops' ? 'devops'
        : card.assignedAgent === 'pm' ? 'pm'
        : 'developer';

      // Execute in cloud sandbox
      const result = await cloudChatAgentService.executeWithTools(
        executionPrompt,
        agentType as 'pm' | 'developer' | 'qa' | 'devops' | 'research',
        input.projectId,
        ctx.user.id,
        []
      );

      // Update card status if execution was successful
      if (result.success) {
        // Find the "in_progress" or "done" column
        const board = await kanbanDb.getBoardById(card.boardId);
        if (board) {
          const columns = await kanbanDb.getColumnsByBoard(board.id);
          const doneColumn = columns.find(c => c.columnType === 'done');
          if (doneColumn) {
            await kanbanDb.moveCard(card.id, doneColumn.id, 0, ctx.user.id);
          }
        }
      }

      return {
        success: result.success,
        response: result.response,
        error: result.error,
        toolCalls: result.toolCalls,
        executionId: result.executionId,
      };
    }),

  /**
   * Execute all cards in a sprint workstream
   */
  executeWorkstream: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      workstream: z.object({
        name: z.string(),
        agent: z.string(),
        tasks: z.array(z.object({
          cardId: z.number(),
          title: z.string(),
        })),
      }),
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

      const results: Array<{ cardId: number; success: boolean; error?: string }> = [];

      // Execute tasks sequentially (respecting dependencies)
      for (const task of input.workstream.tasks) {
        try {
          const card = await kanbanDb.getCardById(task.cardId);
          if (!card) {
            results.push({ cardId: task.cardId, success: false, error: 'Card not found' });
            continue;
          }

          const executionPrompt = `Execute task: ${card.title}\n\n${card.description || ''}`;
          const agentType = input.workstream.agent === 'QA' ? 'qa' 
            : input.workstream.agent === 'DevOps' ? 'devops'
            : input.workstream.agent === 'PM' ? 'pm'
            : 'developer';

          const result = await cloudChatAgentService.executeWithTools(
            executionPrompt,
            agentType as 'pm' | 'developer' | 'qa' | 'devops' | 'research',
            input.projectId,
            ctx.user.id,
            []
          );

          results.push({ cardId: task.cardId, success: result.success, error: result.error });
        } catch (error) {
          results.push({ 
            cardId: task.cardId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      return {
        workstreamName: input.workstream.name,
        results,
        completedCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length,
      };
    }),

  /**
   * Get execution status for a card
   */
  getCardExecutionStatus: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const engine = cloudChatAgentService.getExecutionEngine(ctx.user.id, input.projectId);
      if (!engine) {
        return { active: false };
      }

      return {
        active: true,
        state: engine.getState(),
        history: engine.getHistory(),
      };
    }),
});
