/**
 * Sprint Router
 * 
 * tRPC endpoints for sprint management, velocity tracking, and cost management.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as sprintService from "./sprintService";
import * as budgetService from "./budgetService";

export const sprintRouter = router({
  // ════════════════════════════════════════════════════════════════════════════
  // SPRINT CRUD
  // ════════════════════════════════════════════════════════════════════════════
  
  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string().default("Sprint"),
      goal: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      plannedPoints: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return sprintService.createSprint(input);
    }),
  
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return sprintService.getSprint(input.id);
    }),
  
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return sprintService.getSprintsByProject(input.projectId);
    }),
  
  getActive: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return sprintService.getActiveSprint(input.projectId);
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      goal: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      plannedPoints: z.number().optional(),
      retrospective: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return sprintService.updateSprint(id, data);
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return sprintService.deleteSprint(input.id);
    }),
  
  start: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return sprintService.startSprint(input.id);
    }),
  
  complete: protectedProcedure
    .input(z.object({
      id: z.number(),
      retrospective: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return sprintService.completeSprint(input.id, input.retrospective);
    }),
  
  // ════════════════════════════════════════════════════════════════════════════
  // CARD ASSIGNMENT
  // ════════════════════════════════════════════════════════════════════════════
  
  assignCard: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      sprintId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      return sprintService.assignCardToSprint(input.cardId, input.sprintId);
    }),
  
  getCards: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ input }) => {
      return sprintService.getSprintCards(input.sprintId);
    }),
  
  getStats: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ input }) => {
      return sprintService.getSprintStats(input.sprintId);
    }),
  
  // ════════════════════════════════════════════════════════════════════════════
  // VELOCITY TRACKING
  // ════════════════════════════════════════════════════════════════════════════
  
  getVelocity: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return sprintService.getProjectVelocity(input.projectId);
    }),
  
  getVelocityHistory: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      return sprintService.getVelocityHistory(input.projectId, input.limit);
    }),
  
  // ════════════════════════════════════════════════════════════════════════════
  // BURNDOWN
  // ════════════════════════════════════════════════════════════════════════════
  
  getBurndown: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ input }) => {
      return sprintService.calculateBurndown(input.sprintId);
    }),
  
  recordDailyMetrics: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .mutation(async ({ input }) => {
      return sprintService.recordDailyMetrics(input.sprintId);
    }),
  
  // ════════════════════════════════════════════════════════════════════════════
  // FORECASTING
  // ════════════════════════════════════════════════════════════════════════════
  
  getForecast: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ input }) => {
      return sprintService.forecastSprint(input.sprintId);
    }),
  
  // ════════════════════════════════════════════════════════════════════════════
  // BUDGET MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════
  
  createBudget: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sprintId: z.number().optional(),
      name: z.string(),
      type: z.enum(["tokens", "api_calls", "compute_hours", "storage", "custom"]),
      allocatedAmount: z.string(),
      unit: z.string().optional(),
      costPerUnit: z.string().optional(),
      alertThreshold: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      return budgetService.createBudget(input);
    }),
  
  getBudget: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return budgetService.getBudget(input.id);
    }),
  
  listBudgets: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return budgetService.getBudgetsByProject(input.projectId);
    }),
  
  listSprintBudgets: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ input }) => {
      return budgetService.getBudgetsBySprint(input.sprintId);
    }),
  
  updateBudget: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      allocatedAmount: z.string().optional(),
      alertThreshold: z.string().optional(),
      status: z.enum(["active", "warning", "exceeded", "closed"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return budgetService.updateBudget(id, data);
    }),
  
  deleteBudget: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return budgetService.deleteBudget(input.id);
    }),
  
  // ════════════════════════════════════════════════════════════════════════════
  // COST TRACKING
  // ════════════════════════════════════════════════════════════════════════════
  
  recordCost: protectedProcedure
    .input(z.object({
      budgetId: z.number(),
      projectId: z.number(),
      sprintId: z.number().optional(),
      cardId: z.number().optional(),
      agentId: z.number().optional(),
      executionId: z.number().optional(),
      type: z.enum(["llm_tokens", "embedding_tokens", "api_call", "compute", "storage", "other"]),
      description: z.string().optional(),
      quantity: z.string(),
      unitCost: z.string().optional(),
      totalCost: z.string().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      return budgetService.recordCost(input);
    }),
  
  getCostEntries: protectedProcedure
    .input(z.object({
      budgetId: z.number(),
      limit: z.number().optional().default(100),
    }))
    .query(async ({ input }) => {
      return budgetService.getCostEntries(input.budgetId, input.limit);
    }),
  
  getBudgetUsage: protectedProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input }) => {
      return budgetService.getBudgetUsage(input.budgetId);
    }),
  
  getCostBreakdown: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      return budgetService.getCostBreakdown(input.projectId, input.startDate, input.endDate);
    }),
  
  getDailyAggregates: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      days: z.number().optional().default(30),
    }))
    .query(async ({ input }) => {
      return budgetService.getDailyAggregates(input.projectId, input.days);
    }),
  
  checkBudgetAlerts: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return budgetService.checkBudgetAlerts(input.projectId);
    }),
});

export type SprintRouter = typeof sprintRouter;
