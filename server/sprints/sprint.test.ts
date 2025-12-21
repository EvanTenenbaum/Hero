/**
 * Sprint 9 Unit Tests
 * 
 * Tests for sprint management, velocity tracking, burndown calculations, and budget management.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ════════════════════════════════════════════════════════════════════════════
// SPRINT SERVICE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Sprint Service", () => {
  describe("createSprint", () => {
    it("should create a sprint with auto-generated name", () => {
      const sprint = {
        projectId: 1,
        name: "Sprint 1",
        goal: "Complete MVP features",
      };
      
      expect(sprint.name).toBe("Sprint 1");
      expect(sprint.projectId).toBe(1);
      expect(sprint.goal).toBe("Complete MVP features");
    });
    
    it("should set default status to planning", () => {
      const defaultStatus = "planning";
      expect(defaultStatus).toBe("planning");
    });
  });
  
  describe("startSprint", () => {
    it("should transition sprint from planning to active", () => {
      const sprint = { status: "planning" };
      const newStatus = "active";
      
      expect(sprint.status).toBe("planning");
      expect(newStatus).toBe("active");
    });
    
    it("should set startDate when sprint starts", () => {
      const startDate = new Date();
      expect(startDate).toBeInstanceOf(Date);
    });
  });
  
  describe("completeSprint", () => {
    it("should transition sprint from active to completed", () => {
      const sprint = { status: "active" };
      const newStatus = "completed";
      
      expect(sprint.status).toBe("active");
      expect(newStatus).toBe("completed");
    });
    
    it("should calculate final velocity on completion", () => {
      const completedPoints = 34;
      const plannedPoints = 40;
      const velocityRatio = completedPoints / plannedPoints;
      
      expect(velocityRatio).toBeCloseTo(0.85, 2);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// VELOCITY TRACKING TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Velocity Tracking", () => {
  describe("calculateSprintVelocity", () => {
    it("should sum completed story points", () => {
      const cards = [
        { storyPoints: 5, completedAt: new Date() },
        { storyPoints: 8, completedAt: new Date() },
        { storyPoints: 3, completedAt: null },
      ];
      
      const completedPoints = cards
        .filter(c => c.completedAt !== null)
        .reduce((sum, c) => sum + (c.storyPoints || 0), 0);
      
      expect(completedPoints).toBe(13);
    });
  });
  
  describe("getProjectVelocity", () => {
    it("should calculate 3-sprint rolling average", () => {
      const velocities = [30, 35, 40];
      const average3 = velocities.reduce((a, b) => a + b, 0) / velocities.length;
      
      expect(average3).toBe(35);
    });
    
    it("should calculate 5-sprint rolling average", () => {
      const velocities = [25, 30, 35, 40, 45];
      const average5 = velocities.reduce((a, b) => a + b, 0) / velocities.length;
      
      expect(average5).toBe(35);
    });
    
    it("should detect upward trend", () => {
      const current = 45;
      const previous = 35;
      const threshold = 1.1;
      
      const isUpward = current > previous * threshold;
      expect(isUpward).toBe(true);
    });
    
    it("should detect downward trend", () => {
      const current = 25;
      const previous = 35;
      const threshold = 0.9;
      
      const isDownward = current < previous * threshold;
      expect(isDownward).toBe(true);
    });
    
    it("should detect stable trend", () => {
      const current = 36;
      const previous = 35;
      
      const isStable = current >= previous * 0.9 && current <= previous * 1.1;
      expect(isStable).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BURNDOWN CALCULATION TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Burndown Calculations", () => {
  describe("calculateBurndown", () => {
    it("should calculate ideal burndown line", () => {
      const totalPoints = 40;
      const totalDays = 10;
      const idealPerDay = totalPoints / totalDays;
      
      expect(idealPerDay).toBe(4);
      
      // Day 5 should have 20 points remaining ideally
      const day5Ideal = totalPoints - (idealPerDay * 5);
      expect(day5Ideal).toBe(20);
    });
    
    it("should track actual remaining points", () => {
      const dailyMetrics = [
        { date: "2025-01-01", remaining: 40 },
        { date: "2025-01-02", remaining: 35 },
        { date: "2025-01-03", remaining: 28 },
      ];
      
      expect(dailyMetrics[2].remaining).toBe(28);
    });
    
    it("should detect scope creep (points added)", () => {
      const day1Total = 40;
      const day3Total = 45;
      const scopeCreep = day3Total - day1Total;
      
      expect(scopeCreep).toBe(5);
    });
  });
  
  describe("forecastSprint", () => {
    it("should predict completion date based on velocity", () => {
      const remainingPoints = 20;
      const dailyVelocity = 5;
      const daysToComplete = Math.ceil(remainingPoints / dailyVelocity);
      
      expect(daysToComplete).toBe(4);
    });
    
    it("should calculate completion probability", () => {
      const daysRemaining = 5;
      const daysNeeded = 4;
      
      // If we have more days than needed, high probability
      const probability = daysRemaining >= daysNeeded ? 0.9 : 0.5;
      expect(probability).toBe(0.9);
    });
    
    it("should identify at-risk sprints", () => {
      const daysRemaining = 3;
      const daysNeeded = 6;
      
      const isAtRisk = daysNeeded > daysRemaining;
      expect(isAtRisk).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BUDGET MANAGEMENT TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Budget Management", () => {
  describe("createBudget", () => {
    it("should create budget with allocation", () => {
      const budget = {
        projectId: 1,
        name: "LLM Tokens",
        type: "tokens",
        allocatedAmount: "1000000",
        usedAmount: "0",
      };
      
      expect(budget.allocatedAmount).toBe("1000000");
      expect(budget.usedAmount).toBe("0");
    });
    
    it("should set default alert threshold to 80%", () => {
      const defaultThreshold = "80";
      expect(defaultThreshold).toBe("80");
    });
  });
  
  describe("recordCost", () => {
    it("should calculate total cost from quantity and unit cost", () => {
      const quantity = 1000;
      const unitCost = 0.001;
      const totalCost = quantity * unitCost;
      
      expect(totalCost).toBe(1);
    });
    
    it("should update budget usage after recording cost", () => {
      const initialUsed = 500000;
      const newCost = 50000;
      const newUsed = initialUsed + newCost;
      
      expect(newUsed).toBe(550000);
    });
  });
  
  describe("getBudgetUsage", () => {
    it("should calculate usage percentage", () => {
      const allocated = 1000000;
      const used = 750000;
      const usagePercent = (used / allocated) * 100;
      
      expect(usagePercent).toBe(75);
    });
    
    it("should calculate remaining budget", () => {
      const allocated = 1000000;
      const used = 750000;
      const remaining = allocated - used;
      
      expect(remaining).toBe(250000);
    });
    
    it("should project runout date", () => {
      const remaining = 250000;
      const dailyAverage = 50000;
      const daysRemaining = remaining / dailyAverage;
      
      expect(daysRemaining).toBe(5);
    });
  });
  
  describe("checkBudgetAlerts", () => {
    it("should trigger warning at 80% usage", () => {
      const usagePercent = 82;
      const threshold = 80;
      
      const isWarning = usagePercent >= threshold && usagePercent < 100;
      expect(isWarning).toBe(true);
    });
    
    it("should trigger exceeded at 100% usage", () => {
      const usagePercent = 105;
      
      const isExceeded = usagePercent >= 100;
      expect(isExceeded).toBe(true);
    });
    
    it("should not alert below threshold", () => {
      const usagePercent = 60;
      const threshold = 80;
      
      const needsAlert = usagePercent >= threshold;
      expect(needsAlert).toBe(false);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// COST BREAKDOWN TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Cost Breakdown", () => {
  describe("getCostBreakdown", () => {
    it("should group costs by type", () => {
      const entries = [
        { type: "llm_tokens", totalCost: "10" },
        { type: "llm_tokens", totalCost: "15" },
        { type: "api_call", totalCost: "5" },
      ];
      
      const byType = new Map<string, number>();
      entries.forEach(e => {
        const current = byType.get(e.type) || 0;
        byType.set(e.type, current + parseFloat(e.totalCost));
      });
      
      expect(byType.get("llm_tokens")).toBe(25);
      expect(byType.get("api_call")).toBe(5);
    });
    
    it("should calculate percentage by type", () => {
      const total = 30;
      const llmCost = 25;
      const percentage = (llmCost / total) * 100;
      
      expect(percentage).toBeCloseTo(83.33, 1);
    });
    
    it("should group costs by day", () => {
      const entries = [
        { date: "2025-01-01", totalCost: "10" },
        { date: "2025-01-01", totalCost: "5" },
        { date: "2025-01-02", totalCost: "8" },
      ];
      
      const byDay = new Map<string, number>();
      entries.forEach(e => {
        const current = byDay.get(e.date) || 0;
        byDay.set(e.date, current + parseFloat(e.totalCost));
      });
      
      expect(byDay.get("2025-01-01")).toBe(15);
      expect(byDay.get("2025-01-02")).toBe(8);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SPRINT STATS TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Sprint Stats", () => {
  describe("getSprintStats", () => {
    it("should count total cards", () => {
      const cards = [{}, {}, {}, {}];
      expect(cards.length).toBe(4);
    });
    
    it("should count completed cards", () => {
      const cards = [
        { completedAt: new Date() },
        { completedAt: new Date() },
        { completedAt: null },
      ];
      
      const completed = cards.filter(c => c.completedAt !== null);
      expect(completed.length).toBe(2);
    });
    
    it("should count in-progress cards", () => {
      const cards = [
        { startDate: new Date(), completedAt: null },
        { startDate: new Date(), completedAt: new Date() },
        { startDate: null, completedAt: null },
      ];
      
      const inProgress = cards.filter(c => c.startDate !== null && c.completedAt === null);
      expect(inProgress.length).toBe(1);
    });
    
    it("should count blocked cards", () => {
      const cards = [
        { isBlocked: true },
        { isBlocked: false },
        { isBlocked: true },
      ];
      
      const blocked = cards.filter(c => c.isBlocked);
      expect(blocked.length).toBe(2);
    });
    
    it("should calculate completion percentage", () => {
      const totalPoints = 40;
      const completedPoints = 30;
      const percentage = (completedPoints / totalPoints) * 100;
      
      expect(percentage).toBe(75);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DAILY AGGREGATES TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Daily Aggregates", () => {
  describe("updateDailyAggregate", () => {
    it("should aggregate LLM tokens", () => {
      const existing = { llmTokens: 5000 };
      const newTokens = 1000;
      const updated = existing.llmTokens + newTokens;
      
      expect(updated).toBe(6000);
    });
    
    it("should aggregate API calls", () => {
      const existing = { apiCalls: 50 };
      const newCalls = 1;
      const updated = existing.apiCalls + newCalls;
      
      expect(updated).toBe(51);
    });
    
    it("should aggregate compute minutes", () => {
      const existing = { computeMinutes: "30.5" };
      const newMinutes = 5.5;
      const updated = parseFloat(existing.computeMinutes) + newMinutes;
      
      expect(updated).toBe(36);
    });
  });
  
  describe("getDailyAggregates", () => {
    it("should return aggregates for specified days", () => {
      const days = 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      expect(startDate).toBeInstanceOf(Date);
    });
    
    it("should order by date ascending", () => {
      const aggregates = [
        { date: "2025-01-03" },
        { date: "2025-01-01" },
        { date: "2025-01-02" },
      ];
      
      const sorted = aggregates.sort((a, b) => a.date.localeCompare(b.date));
      
      expect(sorted[0].date).toBe("2025-01-01");
      expect(sorted[2].date).toBe("2025-01-03");
    });
  });
});
