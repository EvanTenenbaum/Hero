/**
 * Kanban System Tests
 * Phase 1 - Kanban Foundation
 *
 * NOTE: These tests require database integration.
 * Skipped until proper test database is configured.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const skipDbTests = !process.env.TEST_DATABASE_URL;
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-kanban",
    email: "kanban@example.com",
    name: "Kanban Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe.skipIf(skipDbTests)("Kanban System", () => {
  const caller = appRouter.createCaller(createAuthContext().ctx);

  describe("Board CRUD Operations", () => {
    it("should create a board with valid input", async () => {
      // First create a project to attach the board to
      const project = await caller.projects.create({
        name: "Kanban Test Project",
        description: "Project for kanban testing",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Sprint 1 Board",
        description: "First sprint kanban board",
      });

      expect(board).toBeDefined();
      expect(board.id).toBeDefined();
      expect(board.name).toBe("Sprint 1 Board");
      expect(board.description).toBe("First sprint kanban board");
      expect(board.projectId).toBe(project.id);
    });

    it("should reject board creation with empty name", async () => {
      const project = await caller.projects.create({
        name: "Empty Name Test Project",
        description: "Testing empty board name",
      });

      await expect(
        caller.kanban.createBoard({
          projectId: project.id,
          name: "",
          description: "Should fail",
        })
      ).rejects.toThrow();
    });

    it("should get board by ID with columns and cards", async () => {
      const project = await caller.projects.create({
        name: "Get Board Test",
        description: "Testing board retrieval",
      });

      const createdBoard = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Test Board",
      });

      const board = await caller.kanban.getBoard({ id: createdBoard.id });

      expect(board).toBeDefined();
      expect(board?.id).toBe(createdBoard.id);
      expect(board?.columns).toBeDefined();
      expect(Array.isArray(board?.columns)).toBe(true);
    });

    it("should list boards by project", async () => {
      const project = await caller.projects.create({
        name: "List Boards Test",
        description: "Testing board listing",
      });

      await caller.kanban.createBoard({
        projectId: project.id,
        name: "Board 1",
      });

      await caller.kanban.createBoard({
        projectId: project.id,
        name: "Board 2",
      });

      const boards = await caller.kanban.getBoardsByProject({
        projectId: project.id,
      });

      expect(boards.length).toBeGreaterThanOrEqual(2);
      expect(boards.some((b) => b.name === "Board 1")).toBe(true);
      expect(boards.some((b) => b.name === "Board 2")).toBe(true);
    });

    it("should update board settings", async () => {
      const project = await caller.projects.create({
        name: "Update Board Test",
        description: "Testing board update",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Original Name",
      });

      const updated = await caller.kanban.updateBoard({
        id: board.id,
        name: "Updated Name",
        settings: {
          showLabels: true,
          showAssignees: false,
          cardSize: "compact",
        },
      });

      expect(updated.name).toBe("Updated Name");
    });

    it("should delete a board", async () => {
      const project = await caller.projects.create({
        name: "Delete Board Test",
        description: "Testing board deletion",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "To Be Deleted",
      });

      const result = await caller.kanban.deleteBoard({ id: board.id });
      expect(result.success).toBe(true);

      // Verify board is archived (soft delete)
      const deletedBoard = await caller.kanban.getBoard({ id: board.id });
      // Board uses soft delete (archived flag) rather than hard delete
      expect(deletedBoard?.archived).toBe(true);
    });
  });

  describe("Column Operations", () => {
    it("should create a column with valid input", async () => {
      const project = await caller.projects.create({
        name: "Column Test Project",
        description: "Testing columns",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Column Test Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "To Do",
        columnType: "backlog",
        color: "#3498db",
      });

      expect(column).toBeDefined();
      expect(column.id).toBeDefined();
      expect(column.name).toBe("To Do");
      expect(column.columnType).toBe("backlog");
    });

    it("should create multiple columns with correct positions", async () => {
      const project = await caller.projects.create({
        name: "Multi Column Test",
        description: "Testing multiple columns",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Multi Column Board",
      });

      await caller.kanban.createColumn({
        boardId: board.id,
        name: "To Do",
        columnType: "backlog",
      });

      await caller.kanban.createColumn({
        boardId: board.id,
        name: "In Progress",
        columnType: "in_progress",
      });

      await caller.kanban.createColumn({
        boardId: board.id,
        name: "Done",
        columnType: "done",
      });

      const boardWithColumns = await caller.kanban.getBoard({ id: board.id });
      expect(boardWithColumns?.columns.length).toBe(3);
    });

    it("should update column properties", async () => {
      const project = await caller.projects.create({
        name: "Update Column Test",
        description: "Testing column update",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Update Column Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "Original Column",
      });

      const updated = await caller.kanban.updateColumn({
        id: column.id,
        name: "Updated Column",
        wipLimit: 5,
      });

      expect(updated.name).toBe("Updated Column");
      expect(updated.wipLimit).toBe(5);
    });

    it("should delete a column", async () => {
      const project = await caller.projects.create({
        name: "Delete Column Test",
        description: "Testing column deletion",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Delete Column Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "To Be Deleted",
      });

      const result = await caller.kanban.deleteColumn({ id: column.id });
      expect(result.success).toBe(true);
    });
  });

  describe("Card Operations", () => {
    it("should create a card with all properties", async () => {
      const project = await caller.projects.create({
        name: "Card Test Project",
        description: "Testing cards",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Card Test Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "To Do",
      });

      const card = await caller.kanban.createCard({
        boardId: board.id,
        columnId: column.id,
        title: "Implement Feature X",
        description: "Build the feature with acceptance criteria",
        cardType: "feature",
        priority: "high",
        assignedAgent: "developer",
        storyPoints: 5,
      });

      expect(card).toBeDefined();
      expect(card.id).toBeDefined();
      expect(card.title).toBe("Implement Feature X");
      expect(card.cardType).toBe("feature");
      expect(card.priority).toBe("high");
      expect(card.assignedAgent).toBe("developer");
      expect(card.storyPoints).toBe(5);
    });

    it("should create cards with different types", async () => {
      const project = await caller.projects.create({
        name: "Card Types Test",
        description: "Testing card types",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Card Types Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "Backlog",
      });

      const cardTypes = ["epic", "feature", "task", "bug", "spike", "chore"] as const;

      for (const cardType of cardTypes) {
        const card = await caller.kanban.createCard({
          boardId: board.id,
          columnId: column.id,
          title: `${cardType} card`,
          cardType,
        });
        expect(card.cardType).toBe(cardType);
      }
    });

    it("should update card properties", async () => {
      const project = await caller.projects.create({
        name: "Update Card Test",
        description: "Testing card update",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Update Card Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "To Do",
      });

      const card = await caller.kanban.createCard({
        boardId: board.id,
        columnId: column.id,
        title: "Original Title",
        priority: "low",
      });

      const updated = await caller.kanban.updateCard({
        id: card.id,
        title: "Updated Title",
        priority: "critical",
        isBlocked: true,
        blockReason: "Waiting for API access",
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.priority).toBe("critical");
      expect(updated.isBlocked).toBe(true);
      expect(updated.blockReason).toBe("Waiting for API access");
    });

    it("should move card between columns", async () => {
      const project = await caller.projects.create({
        name: "Move Card Test",
        description: "Testing card movement",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Move Card Board",
      });

      const todoColumn = await caller.kanban.createColumn({
        boardId: board.id,
        name: "To Do",
      });

      const inProgressColumn = await caller.kanban.createColumn({
        boardId: board.id,
        name: "In Progress",
      });

      const card = await caller.kanban.createCard({
        boardId: board.id,
        columnId: todoColumn.id,
        title: "Moving Card",
      });

      const movedCard = await caller.kanban.moveCard({
        cardId: card.id,
        targetColumnId: inProgressColumn.id,
        targetPosition: 0,
      });

      expect(movedCard.columnId).toBe(inProgressColumn.id);
    });

    it("should delete a card", async () => {
      const project = await caller.projects.create({
        name: "Delete Card Test",
        description: "Testing card deletion",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Delete Card Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "To Do",
      });

      const card = await caller.kanban.createCard({
        boardId: board.id,
        columnId: column.id,
        title: "To Be Deleted",
      });

      const result = await caller.kanban.deleteCard({ id: card.id });
      expect(result.success).toBe(true);
    });
  });

  describe("Agent Assignment", () => {
    it("should assign different agents to cards", async () => {
      const project = await caller.projects.create({
        name: "Agent Assignment Test",
        description: "Testing agent assignments",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Agent Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "Tasks",
      });

      const agents = ["pm", "developer", "qa", "devops", "research"] as const;

      for (const agent of agents) {
        const card = await caller.kanban.createCard({
          boardId: board.id,
          columnId: column.id,
          title: `${agent} task`,
          assignedAgent: agent,
        });
        expect(card.assignedAgent).toBe(agent);
      }
    });

    it("should update card agent assignment", async () => {
      const project = await caller.projects.create({
        name: "Update Agent Test",
        description: "Testing agent update",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Update Agent Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "Tasks",
      });

      const card = await caller.kanban.createCard({
        boardId: board.id,
        columnId: column.id,
        title: "Reassignable Task",
        assignedAgent: "pm",
      });

      const updated = await caller.kanban.updateCard({
        id: card.id,
        assignedAgent: "developer",
      });

      expect(updated.assignedAgent).toBe("developer");
    });
  });

  describe("Priority Levels", () => {
    it("should create cards with different priorities", async () => {
      const project = await caller.projects.create({
        name: "Priority Test",
        description: "Testing priorities",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Priority Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "Tasks",
      });

      const priorities = ["critical", "high", "medium", "low"] as const;

      for (const priority of priorities) {
        const card = await caller.kanban.createCard({
          boardId: board.id,
          columnId: column.id,
          title: `${priority} priority task`,
          priority,
        });
        expect(card.priority).toBe(priority);
      }
    });
  });

  describe("Default Board Creation", () => {
    it("should create a default board with standard columns", async () => {
      const project = await caller.projects.create({
        name: "Default Board Test",
        description: "Testing default board creation",
      });

      const board = await caller.kanban.createDefaultBoard({
        projectId: project.id,
      });

      expect(board).toBeDefined();
      // Default board name is "Project Board" not "Main Board"
      expect(board.name).toBe("Project Board");

      const fullBoard = await caller.kanban.getBoard({ id: board.id });
      expect(fullBoard?.columns.length).toBeGreaterThan(0);
    });
  });

  describe("Input Validation", () => {
    it("should reject card with empty title", async () => {
      const project = await caller.projects.create({
        name: "Validation Test",
        description: "Testing validation",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Validation Board",
      });

      const column = await caller.kanban.createColumn({
        boardId: board.id,
        name: "Tasks",
      });

      await expect(
        caller.kanban.createCard({
          boardId: board.id,
          columnId: column.id,
          title: "",
        })
      ).rejects.toThrow();
    });

    it("should reject column with empty name", async () => {
      const project = await caller.projects.create({
        name: "Column Validation Test",
        description: "Testing column validation",
      });

      const board = await caller.kanban.createBoard({
        projectId: project.id,
        name: "Column Validation Board",
      });

      await expect(
        caller.kanban.createColumn({
          boardId: board.id,
          name: "",
        })
      ).rejects.toThrow();
    });
  });
});
