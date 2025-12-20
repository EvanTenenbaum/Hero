/**
 * Kanban Database Helpers
 * Phase 1 Task P1-006
 */

import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  kanbanBoards, kanbanColumns, kanbanCards, cardDependencies,
  cardHistory, cardComments, boardLabels,
  type InsertKanbanBoard, type InsertKanbanColumn, type InsertKanbanCard,
  type InsertCardDependency, type InsertCardHistory, type InsertCardComment,
  type InsertBoardLabel
} from "../../drizzle/schema";

// ════════════════════════════════════════════════════════════════════════════
// BOARDS
// ════════════════════════════════════════════════════════════════════════════

export async function createBoard(data: InsertKanbanBoard) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(kanbanBoards).values(data);
  return { id: result.insertId, ...data };
}

export async function getBoardById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [board] = await db.select().from(kanbanBoards).where(eq(kanbanBoards.id, id));
  return board;
}

export async function getBoardsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kanbanBoards)
    .where(and(
      eq(kanbanBoards.projectId, projectId),
      eq(kanbanBoards.archived, false)
    ))
    .orderBy(desc(kanbanBoards.isDefault), asc(kanbanBoards.name));
}

export async function updateBoard(id: number, data: Partial<InsertKanbanBoard>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kanbanBoards).set(data).where(eq(kanbanBoards.id, id));
  return getBoardById(id);
}

export async function deleteBoard(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kanbanBoards).set({ archived: true }).where(eq(kanbanBoards.id, id));
}

// ════════════════════════════════════════════════════════════════════════════
// COLUMNS
// ════════════════════════════════════════════════════════════════════════════

export async function createColumn(data: InsertKanbanColumn) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get max position for this board
  const [maxPos] = await db.select({ max: sql<number>`MAX(position)` })
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, data.boardId));
  
  const position = (maxPos?.max ?? -1) + 1;
  const [result] = await db.insert(kanbanColumns).values({ ...data, position });
  return { id: result.insertId, ...data, position };
}

export async function getColumnsByBoard(boardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, boardId))
    .orderBy(asc(kanbanColumns.position));
}

export async function updateColumn(id: number, data: Partial<InsertKanbanColumn>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kanbanColumns).set(data).where(eq(kanbanColumns.id, id));
  const [column] = await db.select().from(kanbanColumns).where(eq(kanbanColumns.id, id));
  return column;
}

export async function deleteColumn(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // First move all cards to null column (or delete them)
  await db.delete(kanbanCards).where(eq(kanbanCards.columnId, id));
  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));
}

export async function reorderColumns(boardId: number, columnIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < columnIds.length; i++) {
    await db.update(kanbanColumns)
      .set({ position: i })
      .where(and(
        eq(kanbanColumns.id, columnIds[i]),
        eq(kanbanColumns.boardId, boardId)
      ));
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CARDS
// ════════════════════════════════════════════════════════════════════════════

export async function createCard(data: InsertKanbanCard, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get max position for this column
  const [maxPos] = await db.select({ max: sql<number>`MAX(position)` })
    .from(kanbanCards)
    .where(eq(kanbanCards.columnId, data.columnId));
  
  const position = (maxPos?.max ?? -1) + 1;
  const [result] = await db.insert(kanbanCards).values({ ...data, position });
  const cardId = result.insertId;
  
  // Record history
  await recordCardHistory({
    cardId,
    userId,
    eventType: "created",
  });
  
  return { id: cardId, ...data, position };
}

export async function getCardById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [card] = await db.select().from(kanbanCards).where(eq(kanbanCards.id, id));
  return card;
}

export async function getCardsByColumn(columnId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kanbanCards)
    .where(eq(kanbanCards.columnId, columnId))
    .orderBy(asc(kanbanCards.position));
}

export async function getCardsByBoard(boardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kanbanCards)
    .where(eq(kanbanCards.boardId, boardId))
    .orderBy(asc(kanbanCards.columnId), asc(kanbanCards.position));
}

export async function updateCard(
  id: number, 
  data: Partial<InsertKanbanCard>,
  userId?: number,
  agentType?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const oldCard = await getCardById(id);
  
  await db.update(kanbanCards).set(data).where(eq(kanbanCards.id, id));
  
  // Record history for significant changes
  if (oldCard) {
    const changes = Object.keys(data) as Array<keyof typeof data>;
    for (const field of changes) {
      if (data[field] !== oldCard[field as keyof typeof oldCard]) {
        await recordCardHistory({
          cardId: id,
          userId,
          agentType,
          eventType: "updated",
          field,
          oldValue: String(oldCard[field as keyof typeof oldCard] ?? ""),
          newValue: String(data[field] ?? ""),
        });
      }
    }
  }
  
  return getCardById(id);
}

export async function moveCard(
  cardId: number,
  targetColumnId: number,
  targetPosition: number,
  userId?: number,
  agentType?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const card = await getCardById(cardId);
  if (!card) throw new Error("Card not found");
  
  const fromColumnId = card.columnId;
  
  // Update positions in source column
  await db.execute(sql`
    UPDATE kanban_cards 
    SET position = position - 1 
    WHERE columnId = ${fromColumnId} AND position > ${card.position}
  `);
  
  // Update positions in target column
  await db.execute(sql`
    UPDATE kanban_cards 
    SET position = position + 1 
    WHERE columnId = ${targetColumnId} AND position >= ${targetPosition}
  `);
  
  // Move the card
  await db.update(kanbanCards)
    .set({ columnId: targetColumnId, position: targetPosition })
    .where(eq(kanbanCards.id, cardId));
  
  // Record history
  await recordCardHistory({
    cardId,
    userId,
    agentType,
    eventType: "moved",
    fromColumnId,
    toColumnId: targetColumnId,
  });
  
  return getCardById(cardId);
}

export async function deleteCard(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete dependencies
  await db.delete(cardDependencies).where(eq(cardDependencies.cardId, id));
  await db.delete(cardDependencies).where(eq(cardDependencies.blockedByCardId, id));
  // Delete comments
  await db.delete(cardComments).where(eq(cardComments.cardId, id));
  // Delete history
  await db.delete(cardHistory).where(eq(cardHistory.cardId, id));
  // Delete card
  await db.delete(kanbanCards).where(eq(kanbanCards.id, id));
}

// ════════════════════════════════════════════════════════════════════════════
// DEPENDENCIES
// ════════════════════════════════════════════════════════════════════════════

export async function addDependency(data: InsertCardDependency) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(cardDependencies).values(data);
  return { id: result.insertId, ...data };
}

export async function getDependencies(cardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cardDependencies)
    .where(eq(cardDependencies.cardId, cardId));
}

export async function getBlockers(cardId: number) {
  const db = await getDb();
  if (!db) return [];
  const deps = await db.select().from(cardDependencies)
    .where(and(
      eq(cardDependencies.cardId, cardId),
      eq(cardDependencies.dependencyType, "blocks")
    ));
  
  if (deps.length === 0) return [];
  
  const blockerIds = deps.map(d => d.blockedByCardId);
  return db.select().from(kanbanCards)
    .where(inArray(kanbanCards.id, blockerIds));
}

export async function removeDependency(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cardDependencies).where(eq(cardDependencies.id, id));
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORY
// ════════════════════════════════════════════════════════════════════════════

export async function recordCardHistory(data: InsertCardHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(cardHistory).values(data);
  return { id: result.insertId, ...data };
}

export async function getCardHistory(cardId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cardHistory)
    .where(eq(cardHistory.cardId, cardId))
    .orderBy(desc(cardHistory.createdAt))
    .limit(limit);
}

// ════════════════════════════════════════════════════════════════════════════
// COMMENTS
// ════════════════════════════════════════════════════════════════════════════

export async function addComment(data: InsertCardComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(cardComments).values(data);
  
  // Record in history
  await recordCardHistory({
    cardId: data.cardId,
    userId: data.userId,
    agentType: data.agentType,
    eventType: "commented",
    comment: data.content.substring(0, 100),
  });
  
  return { id: result.insertId, ...data };
}

export async function getComments(cardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cardComments)
    .where(eq(cardComments.cardId, cardId))
    .orderBy(asc(cardComments.createdAt));
}

export async function deleteComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cardComments).where(eq(cardComments.id, id));
}

// ════════════════════════════════════════════════════════════════════════════
// LABELS
// ════════════════════════════════════════════════════════════════════════════

export async function createLabel(data: InsertBoardLabel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(boardLabels).values(data);
  return { id: result.insertId, ...data };
}

export async function getLabelsByBoard(boardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(boardLabels)
    .where(eq(boardLabels.boardId, boardId))
    .orderBy(asc(boardLabels.name));
}

export async function deleteLabel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(boardLabels).where(eq(boardLabels.id, id));
}

// ════════════════════════════════════════════════════════════════════════════
// BOARD WITH FULL DATA
// ════════════════════════════════════════════════════════════════════════════

export async function getBoardWithData(boardId: number) {
  const board = await getBoardById(boardId);
  if (!board) return null;
  
  const columns = await getColumnsByBoard(boardId);
  const cards = await getCardsByBoard(boardId);
  const labels = await getLabelsByBoard(boardId);
  
  // Get all dependencies for cards in this board
  const db = await getDb();
  const cardIds = cards.map(c => c.id);
  const dependencies = cardIds.length > 0 && db
    ? await db.select().from(cardDependencies)
        .where(inArray(cardDependencies.cardId, cardIds))
    : [];
  
  // Organize cards by column
  const columnMap = new Map<number, typeof cards>();
  for (const col of columns) {
    columnMap.set(col.id, []);
  }
  for (const card of cards) {
    const colCards = columnMap.get(card.columnId) || [];
    colCards.push(card);
    columnMap.set(card.columnId, colCards);
  }
  
  return {
    ...board,
    columns: columns.map(col => ({
      ...col,
      cards: columnMap.get(col.id) || [],
    })),
    labels,
    dependencies,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT BOARD SETUP
// ════════════════════════════════════════════════════════════════════════════

export async function createDefaultBoard(projectId: number, userId: number) {
  // Create board
  const board = await createBoard({
    projectId,
    userId,
    name: "Project Board",
    description: "Default project kanban board",
    isDefault: true,
    settings: {
      defaultView: "board",
      showLabels: true,
      showAssignees: true,
      showDueDates: true,
      swimlaneBy: "none",
      cardSize: "normal",
    },
  });
  
  // Create default columns
  const defaultColumns = [
    { name: "Backlog", columnType: "backlog" as const, color: "#6B7280" },
    { name: "Spec Writing", columnType: "spec_writing" as const, color: "#8B5CF6" },
    { name: "Design", columnType: "design" as const, color: "#EC4899" },
    { name: "Ready", columnType: "ready" as const, color: "#3B82F6" },
    { name: "In Progress", columnType: "in_progress" as const, color: "#F59E0B", wipLimit: 3 },
    { name: "Review", columnType: "review" as const, color: "#10B981" },
    { name: "Done", columnType: "done" as const, color: "#059669" },
  ];
  
  for (const col of defaultColumns) {
    await createColumn({
      boardId: board.id!,
      name: col.name,
      columnType: col.columnType,
      color: col.color,
      wipLimit: col.wipLimit,
    });
  }
  
  // Create default labels
  const defaultLabels = [
    { name: "bug", color: "#EF4444" },
    { name: "feature", color: "#3B82F6" },
    { name: "enhancement", color: "#8B5CF6" },
    { name: "documentation", color: "#6B7280" },
    { name: "high-priority", color: "#F59E0B" },
    { name: "blocked", color: "#DC2626" },
  ];
  
  for (const label of defaultLabels) {
    await createLabel({
      boardId: board.id!,
      name: label.name,
      color: label.color,
    });
  }
  
  return getBoardWithData(board.id!);
}
