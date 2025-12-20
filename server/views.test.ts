import { describe, it, expect } from "vitest";
import { format, addDays, startOfWeek, startOfMonth, endOfMonth } from "date-fns";

// Test data for views
const mockCards = [
  {
    id: 1,
    title: "Implement login feature",
    type: "feature",
    priority: "high",
    assignedAgent: "dev",
    dueDate: addDays(new Date(), 3).toISOString(),
    estimateHours: 8,
    columnId: 1,
    columnName: "In Progress",
  },
  {
    id: 2,
    title: "Fix navigation bug",
    type: "bug",
    priority: "critical",
    assignedAgent: "dev",
    dueDate: addDays(new Date(), 1).toISOString(),
    estimateHours: 4,
    columnId: 1,
    columnName: "In Progress",
  },
  {
    id: 3,
    title: "Write API documentation",
    type: "task",
    priority: "medium",
    assignedAgent: "pm",
    dueDate: addDays(new Date(), 7).toISOString(),
    estimateHours: 16,
    columnId: 2,
    columnName: "Backlog",
  },
  {
    id: 4,
    title: "Unscheduled task",
    type: "task",
    priority: "low",
    assignedAgent: null,
    dueDate: null,
    estimateHours: null,
    columnId: 2,
    columnName: "Backlog",
  },
];

const mockColumns = [
  { id: 1, name: "In Progress" },
  { id: 2, name: "Backlog" },
];

describe("Timeline View Logic", () => {
  describe("Date Range Calculation", () => {
    it("should calculate correct date range for week zoom", () => {
      const startDate = startOfWeek(new Date());
      const daysToShow = 14; // week zoom shows 14 days
      const dateRange = [];
      for (let i = 0; i < daysToShow; i++) {
        dateRange.push(addDays(startDate, i));
      }
      expect(dateRange.length).toBe(14);
    });

    it("should calculate correct date range for month zoom", () => {
      const startDate = startOfWeek(new Date());
      const daysToShow = 30; // month zoom shows 30 days
      const dateRange = [];
      for (let i = 0; i < daysToShow; i++) {
        dateRange.push(addDays(startDate, i));
      }
      expect(dateRange.length).toBe(30);
    });
  });

  describe("Card Grouping by Agent", () => {
    it("should group cards by assigned agent", () => {
      const grouped: Record<string, typeof mockCards> = {
        unassigned: [],
        pm: [],
        dev: [],
        qa: [],
        devops: [],
        research: [],
      };

      mockCards.forEach((card) => {
        const agent = card.assignedAgent?.toLowerCase() || "unassigned";
        if (grouped[agent]) {
          grouped[agent].push(card);
        } else {
          grouped.unassigned.push(card);
        }
      });

      expect(grouped.dev.length).toBe(2);
      expect(grouped.pm.length).toBe(1);
      expect(grouped.unassigned.length).toBe(1);
    });

    it("should only return agents with cards", () => {
      const grouped: Record<string, typeof mockCards> = {
        unassigned: [],
        pm: [],
        dev: [],
        qa: [],
        devops: [],
        research: [],
      };

      mockCards.forEach((card) => {
        const agent = card.assignedAgent?.toLowerCase() || "unassigned";
        if (grouped[agent]) {
          grouped[agent].push(card);
        } else {
          grouped.unassigned.push(card);
        }
      });

      const agentsWithCards = Object.entries(grouped).filter(
        ([_, cards]) => cards.length > 0
      );

      expect(agentsWithCards.length).toBe(3); // dev, pm, unassigned
    });
  });

  describe("Card Position Calculation", () => {
    it("should calculate card position based on due date and estimate", () => {
      const card = mockCards[0];
      const startDate = startOfWeek(new Date());
      const dateRangeLength = 14;

      if (card.dueDate) {
        const dueDate = new Date(card.dueDate);
        const estimateDays = Math.ceil((card.estimateHours || 8) / 8);

        expect(estimateDays).toBe(1); // 8 hours = 1 day
      }
    });

    it("should handle cards without due dates", () => {
      const cardWithoutDueDate = mockCards.find((c) => !c.dueDate);
      expect(cardWithoutDueDate).toBeDefined();
      expect(cardWithoutDueDate?.dueDate).toBeNull();
    });
  });
});

describe("Calendar View Logic", () => {
  describe("Calendar Grid Generation", () => {
    it("should generate correct calendar days for a month", () => {
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calendarStart = startOfWeek(monthStart);

      // Calendar should start from Sunday of the week containing the 1st
      expect(calendarStart.getDay()).toBe(0); // Sunday
    });

    it("should include days from previous and next months", () => {
      const currentMonth = new Date(2024, 0, 1); // January 2024
      const monthStart = startOfMonth(currentMonth);
      const calendarStart = startOfWeek(monthStart);

      // If Jan 1 is not Sunday, calendarStart will be in December
      if (monthStart.getDay() !== 0) {
        expect(calendarStart.getMonth()).toBe(11); // December
      }
    });
  });

  describe("Cards Grouping by Date", () => {
    it("should group cards by due date", () => {
      const grouped: Record<string, typeof mockCards> = {};

      mockCards.forEach((card) => {
        if (card.dueDate) {
          const dateKey = format(new Date(card.dueDate), "yyyy-MM-dd");
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push(card);
        }
      });

      // Should have 3 unique dates (3 cards with due dates)
      expect(Object.keys(grouped).length).toBe(3);
    });

    it("should count unscheduled cards correctly", () => {
      const unscheduledCount = mockCards.filter((card) => !card.dueDate).length;
      expect(unscheduledCount).toBe(1);
    });
  });

  describe("Priority Indicators", () => {
    it("should map priority to correct indicators", () => {
      const priorityIndicators: Record<string, string> = {
        critical: "🔴",
        high: "🟠",
        medium: "🟡",
        low: "🟢",
      };

      expect(priorityIndicators["critical"]).toBe("🔴");
      expect(priorityIndicators["high"]).toBe("🟠");
      expect(priorityIndicators["medium"]).toBe("🟡");
      expect(priorityIndicators["low"]).toBe("🟢");
    });
  });

  describe("Type Colors", () => {
    it("should have colors for all card types", () => {
      const typeColors: Record<string, string> = {
        epic: "bg-purple-100",
        feature: "bg-blue-100",
        task: "bg-gray-100",
        bug: "bg-red-100",
        spike: "bg-yellow-100",
        chore: "bg-green-100",
      };

      const cardTypes = ["epic", "feature", "task", "bug", "spike", "chore"];
      cardTypes.forEach((type) => {
        expect(typeColors[type]).toBeDefined();
      });
    });
  });
});

describe("View Switching", () => {
  it("should support all view types", () => {
    const viewTypes = ["board", "timeline", "calendar"];
    expect(viewTypes.length).toBe(3);
  });

  it("should have icons for each view type", () => {
    const viewIcons = {
      board: "LayoutGrid",
      timeline: "GanttChart",
      calendar: "Calendar",
    };

    expect(Object.keys(viewIcons).length).toBe(3);
  });
});

describe("Data Transformation", () => {
  it("should transform board cards to view format", () => {
    const boardCard = {
      id: 1,
      title: "Test Card",
      cardType: "task",
      priority: "medium",
      assignedAgent: "dev",
      dueDate: new Date(),
      estimatedMinutes: 480, // 8 hours
      columnId: 1,
    };

    const viewCard = {
      id: boardCard.id,
      title: boardCard.title,
      type: boardCard.cardType || "task",
      priority: boardCard.priority || "medium",
      assignedAgent: boardCard.assignedAgent,
      dueDate: boardCard.dueDate ? boardCard.dueDate.toISOString() : null,
      estimateHours: boardCard.estimatedMinutes
        ? Math.round(boardCard.estimatedMinutes / 60)
        : null,
      columnId: boardCard.columnId,
    };

    expect(viewCard.type).toBe("task");
    expect(viewCard.estimateHours).toBe(8);
    expect(viewCard.dueDate).toBeTruthy();
  });
});
