/**
 * Sprint Service
 * 
 * Provides CRUD operations for sprints, velocity tracking, and burndown calculations.
 * Based on Agile/Scrum best practices for sprint management.
 */

import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  sprints,
  sprintMetrics,
  velocityHistory,
  kanbanCards,
  type Sprint,
  type InsertSprint,
  type SprintMetric,
  type InsertSprintMetric,
  type VelocityHistory,
  type InsertVelocityHistory,
  type KanbanCard,
} from "../../drizzle/schema";

// ════════════════════════════════════════════════════════════════════════════
// SPRINT CRUD OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

export async function createSprint(data: InsertSprint): Promise<Sprint> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // Get the next sprint number for this project
  const existingSprints = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(sprints)
    .where(eq(sprints.projectId, data.projectId));
  
  const sprintNumber = (existingSprints[0]?.count || 0) + 1;
  const name = data.name || `Sprint ${sprintNumber}`;
  
  const [result] = await db.insert(sprints).values({
    ...data,
    name,
  });
  
  const [sprint] = await db
    .select()
    .from(sprints)
    .where(eq(sprints.id, result.insertId));
  
  return sprint;
}

export async function getSprint(id: number): Promise<Sprint | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
  return sprint || null;
}

export async function getSprintsByProject(projectId: number): Promise<Sprint[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(sprints)
    .where(eq(sprints.projectId, projectId))
    .orderBy(desc(sprints.createdAt));
}

export async function getActiveSprint(projectId: number): Promise<Sprint | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [sprint] = await db
    .select()
    .from(sprints)
    .where(and(eq(sprints.projectId, projectId), eq(sprints.status, "active")));
  return sprint || null;
}

export async function updateSprint(
  id: number,
  data: Partial<InsertSprint>
): Promise<Sprint | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(sprints).set(data).where(eq(sprints.id, id));
  return getSprint(id);
}

export async function deleteSprint(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.delete(sprints).where(eq(sprints.id, id));
  return result[0].affectedRows > 0;
}

export async function startSprint(id: number): Promise<Sprint | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const sprint = await getSprint(id);
  if (!sprint) return null;
  
  // End any currently active sprint for this project
  await db
    .update(sprints)
    .set({ status: "completed", endDate: new Date() })
    .where(and(eq(sprints.projectId, sprint.projectId), eq(sprints.status, "active")));
  
  // Start this sprint
  await db
    .update(sprints)
    .set({ status: "active", startDate: new Date() })
    .where(eq(sprints.id, id));
  
  return getSprint(id);
}

export async function completeSprint(id: number, retrospective?: string): Promise<Sprint | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const sprint = await getSprint(id);
  if (!sprint) return null;
  
  // Calculate final velocity
  const velocity = await calculateSprintVelocity(id);
  
  await db
    .update(sprints)
    .set({
      status: "completed",
      endDate: new Date(),
      velocity: velocity.toString(),
      retrospective,
    })
    .where(eq(sprints.id, id));
  
  // Record velocity history
  await recordVelocityHistory(sprint.projectId, id);
  
  return getSprint(id);
}

// ════════════════════════════════════════════════════════════════════════════
// CARD-TO-SPRINT ASSIGNMENT
// ════════════════════════════════════════════════════════════════════════════

export async function assignCardToSprint(
  cardId: number,
  sprintId: number | null
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .update(kanbanCards)
    .set({ sprintId })
    .where(eq(kanbanCards.id, cardId));
  return true;
}

export async function getSprintCards(sprintId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(kanbanCards)
    .where(eq(kanbanCards.sprintId, sprintId));
}

export async function getSprintStats(sprintId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const cards = await getSprintCards(sprintId);
  
  const totalPoints = cards.reduce((sum: number, card: KanbanCard) => sum + (card.storyPoints || 0), 0);
  // Card status is determined by the column it's in, not a direct property
  // For now, we'll check if the card is in a 'done' column by checking columnId
  // In a real implementation, we'd join with kanban_columns to check columnType
  const completedCards = cards.filter((card: KanbanCard) => card.completedAt !== null);
  const completedPoints = completedCards.reduce(
    (sum: number, card: KanbanCard) => sum + (card.storyPoints || 0),
    0
  );
  const inProgressCards = cards.filter((card: KanbanCard) => card.startDate !== null && card.completedAt === null);
  const blockedCards = cards.filter((card: KanbanCard) => card.isBlocked);
  
  return {
    totalCards: cards.length,
    completedCards: completedCards.length,
    inProgressCards: inProgressCards.length,
    blockedCards: blockedCards.length,
    totalPoints,
    completedPoints,
    remainingPoints: totalPoints - completedPoints,
    completionPercentage: totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// VELOCITY TRACKING
// ════════════════════════════════════════════════════════════════════════════

export async function calculateSprintVelocity(sprintId: number): Promise<number> {
  const stats = await getSprintStats(sprintId);
  return stats.completedPoints;
}

export async function getProjectVelocity(projectId: number): Promise<{
  current: number;
  average3: number;
  average5: number;
  trend: "up" | "down" | "stable";
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const history = await db
    .select()
    .from(velocityHistory)
    .where(eq(velocityHistory.projectId, projectId))
    .orderBy(desc(velocityHistory.sprintNumber))
    .limit(5);
  
  if (history.length === 0) {
    return { current: 0, average3: 0, average5: 0, trend: "stable" };
  }
  
  const current = history[0]?.pointsCompleted || 0;
  const last3 = history.slice(0, 3);
  const last5 = history.slice(0, 5);
  
  const average3 =
    last3.reduce((sum: number, h: VelocityHistory) => sum + (h.pointsCompleted || 0), 0) / last3.length;
  const average5 =
    last5.reduce((sum: number, h: VelocityHistory) => sum + (h.pointsCompleted || 0), 0) / last5.length;
  
  // Determine trend
  let trend: "up" | "down" | "stable" = "stable";
  if (history.length >= 2) {
    const prev = history[1]?.pointsCompleted || 0;
    if (current > prev * 1.1) trend = "up";
    else if (current < prev * 0.9) trend = "down";
  }
  
  return { current, average3, average5, trend };
}

export async function recordVelocityHistory(
  projectId: number,
  sprintId: number
): Promise<VelocityHistory> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const sprint = await getSprint(sprintId);
  if (!sprint) throw new Error("Sprint not found");
  
  const stats = await getSprintStats(sprintId);
  
  // Get sprint number
  const existingHistory = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(velocityHistory)
    .where(eq(velocityHistory.projectId, projectId));
  const sprintNumber = (existingHistory[0]?.count || 0) + 1;
  
  // Calculate duration
  const startDate = sprint.startDate || sprint.createdAt;
  const endDate = sprint.endDate || new Date();
  const durationDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate rolling averages
  const recentHistory = await db
    .select()
    .from(velocityHistory)
    .where(eq(velocityHistory.projectId, projectId))
    .orderBy(desc(velocityHistory.sprintNumber))
    .limit(4); // Get last 4 to calculate 5-sprint average with current
  
  const allPoints = [
    stats.completedPoints,
    ...recentHistory.map((h: VelocityHistory) => h.pointsCompleted || 0),
  ];
  
  const rollingAverage3 =
    allPoints.slice(0, 3).reduce((a, b) => a + b, 0) /
    Math.min(3, allPoints.length);
  const rollingAverage5 =
    allPoints.slice(0, 5).reduce((a, b) => a + b, 0) /
    Math.min(5, allPoints.length);
  
  const velocityPerDay = durationDays > 0 ? stats.completedPoints / durationDays : 0;
  
  const [result] = await db.insert(velocityHistory).values({
    projectId,
    sprintId,
    sprintNumber,
    pointsCommitted: stats.totalPoints,
    pointsCompleted: stats.completedPoints,
    pointsCarriedOver: stats.remainingPoints,
    durationDays,
    velocityPerDay: velocityPerDay.toFixed(2),
    rollingAverage3: rollingAverage3.toFixed(2),
    rollingAverage5: rollingAverage5.toFixed(2),
  });
  
  const [history] = await db
    .select()
    .from(velocityHistory)
    .where(eq(velocityHistory.id, result.insertId));
  
  return history;
}

export async function getVelocityHistory(
  projectId: number,
  limit: number = 10
): Promise<VelocityHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(velocityHistory)
    .where(eq(velocityHistory.projectId, projectId))
    .orderBy(desc(velocityHistory.sprintNumber))
    .limit(limit);
}

// ════════════════════════════════════════════════════════════════════════════
// BURNDOWN CALCULATIONS
// ════════════════════════════════════════════════════════════════════════════

export interface BurndownDataPoint {
  date: string;
  idealRemaining: number;
  actualRemaining: number;
  completed: number;
  added: number;
}

export async function calculateBurndown(sprintId: number): Promise<BurndownDataPoint[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const sprint = await getSprint(sprintId);
  if (!sprint) return [];
  
  const metrics = await db
    .select()
    .from(sprintMetrics)
    .where(eq(sprintMetrics.sprintId, sprintId))
    .orderBy(sprintMetrics.date);
  
  const startDate = sprint.startDate || sprint.createdAt;
  const endDate = sprint.endDate || new Date();
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const totalPoints = sprint.plannedPoints || 0;
  const dailyBurnRate = totalDays > 0 ? totalPoints / totalDays : 0;
  
  const burndownData: BurndownDataPoint[] = [];
  
  // Generate data points for each day
  for (let day = 0; day <= totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    const dateStr = currentDate.toISOString().split("T")[0];
    
    // Find metric for this day
    const metric = metrics.find(
      (m: SprintMetric) => m.date.toISOString().split("T")[0] === dateStr
    );
    
    const idealRemaining = Math.max(0, totalPoints - dailyBurnRate * day);
    const actualRemaining = metric?.remainingPoints ?? idealRemaining;
    const completed = metric?.completedPoints ?? 0;
    const added = metric?.addedPoints ?? 0;
    
    burndownData.push({
      date: dateStr,
      idealRemaining: Math.round(idealRemaining * 10) / 10,
      actualRemaining,
      completed,
      added,
    });
  }
  
  return burndownData;
}

export async function recordDailyMetrics(sprintId: number): Promise<SprintMetric> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const stats = await getSprintStats(sprintId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if we already have metrics for today
  const [existing] = await db
    .select()
    .from(sprintMetrics)
    .where(
      and(
        eq(sprintMetrics.sprintId, sprintId),
        gte(sprintMetrics.date, today),
        lte(sprintMetrics.date, new Date(today.getTime() + 24 * 60 * 60 * 1000))
      )
    );
  
  if (existing) {
    // Update existing
    await db
      .update(sprintMetrics)
      .set({
        totalPoints: stats.totalPoints,
        completedPoints: stats.completedPoints,
        remainingPoints: stats.remainingPoints,
        tasksTotal: stats.totalCards,
        tasksCompleted: stats.completedCards,
        tasksInProgress: stats.inProgressCards,
        blockedTasks: stats.blockedCards,
      })
      .where(eq(sprintMetrics.id, existing.id));
    
    const [updated] = await db
      .select()
      .from(sprintMetrics)
      .where(eq(sprintMetrics.id, existing.id));
    return updated;
  }
  
  // Create new
  const [result] = await db.insert(sprintMetrics).values({
    sprintId,
    date: today,
    totalPoints: stats.totalPoints,
    completedPoints: stats.completedPoints,
    remainingPoints: stats.remainingPoints,
    tasksTotal: stats.totalCards,
    tasksCompleted: stats.completedCards,
    tasksInProgress: stats.inProgressCards,
    blockedTasks: stats.blockedCards,
  });
  
  const [metric] = await db
    .select()
    .from(sprintMetrics)
    .where(eq(sprintMetrics.id, result.insertId));
  
  return metric;
}

// ════════════════════════════════════════════════════════════════════════════
// SPRINT FORECASTING
// ════════════════════════════════════════════════════════════════════════════

export interface SprintForecast {
  estimatedCompletionDate: Date | null;
  confidenceLevel: "high" | "medium" | "low";
  projectedVelocity: number;
  riskFactors: string[];
  recommendation: string;
}

export async function forecastSprint(sprintId: number): Promise<SprintForecast> {
  const sprint = await getSprint(sprintId);
  if (!sprint) {
    return {
      estimatedCompletionDate: null,
      confidenceLevel: "low",
      projectedVelocity: 0,
      riskFactors: ["Sprint not found"],
      recommendation: "Unable to forecast",
    };
  }
  
  const stats = await getSprintStats(sprintId);
  const velocity = await getProjectVelocity(sprint.projectId);
  
  const riskFactors: string[] = [];
  let confidenceLevel: "high" | "medium" | "low" = "high";
  
  // Check for blocked tasks
  if (stats.blockedCards > 0) {
    riskFactors.push(`${stats.blockedCards} blocked task(s)`);
    confidenceLevel = "medium";
  }
  
  // Check for scope creep
  if (stats.totalPoints > (sprint.plannedPoints || 0) * 1.2) {
    riskFactors.push("Significant scope increase detected");
    confidenceLevel = "low";
  }
  
  // Calculate estimated completion
  const dailyVelocity = velocity.average3 / 10; // Assuming 10-day sprints
  const daysRemaining =
    dailyVelocity > 0 ? stats.remainingPoints / dailyVelocity : Infinity;
  
  let estimatedCompletionDate: Date | null = null;
  if (isFinite(daysRemaining)) {
    estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(
      estimatedCompletionDate.getDate() + Math.ceil(daysRemaining)
    );
  }
  
  // Check if behind schedule
  if (sprint.endDate && estimatedCompletionDate) {
    if (estimatedCompletionDate > sprint.endDate) {
      riskFactors.push("Behind schedule");
      confidenceLevel = "low";
    }
  }
  
  // Generate recommendation
  let recommendation = "Sprint is on track";
  if (confidenceLevel === "low") {
    recommendation =
      "Consider reducing scope or extending sprint duration";
  } else if (confidenceLevel === "medium") {
    recommendation = "Monitor closely and address blockers";
  }
  
  return {
    estimatedCompletionDate,
    confidenceLevel,
    projectedVelocity: velocity.average3,
    riskFactors,
    recommendation,
  };
}
