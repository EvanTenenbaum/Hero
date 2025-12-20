/**
 * Kanban tRPC Router
 * Phase 1 Task P1-007
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as kanbanDb from "./db";

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
    .query(async ({ input }) => {
      return kanbanDb.getBoardWithData(input.id);
    }),
  
  getBoardsByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return kanbanDb.getBoardsByProject(input.projectId);
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
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return kanbanDb.updateBoard(id, data);
    }),
  
  deleteBoard: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return kanbanDb.updateColumn(id, data);
    }),
  
  deleteColumn: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await kanbanDb.deleteColumn(input.id);
      return { success: true };
    }),
  
  reorderColumns: protectedProcedure
    .input(z.object({
      boardId: z.number(),
      columnIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
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
    .query(async ({ input }) => {
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
      return kanbanDb.moveCard(
        input.cardId,
        input.targetColumnId,
        input.targetPosition,
        ctx.user.id
      );
    }),
  
  deleteCard: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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
    .query(async ({ input }) => {
      return kanbanDb.getCardHistory(input.cardId, input.limit);
    }),
});
