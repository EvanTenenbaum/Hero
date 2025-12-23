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

export async function getBoardsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kanbanBoards)
    .where(and(
      eq(kanbanBoards.userId, userId),
      eq(kanbanBoards.archived, false)
    ))
    .orderBy(desc(kanbanBoards.updatedAt));
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
  
  if (columnIds.length === 0) return;
  
  // Validate all columnIds are valid numbers to prevent SQL injection
  // Even though TypeScript types them as number[], runtime validation is important
  const validatedIds = columnIds.filter(id => Number.isInteger(id) && id > 0);
  if (validatedIds.length !== columnIds.length) {
    throw new Error("Invalid column IDs provided");
  }
  
  // Use batch UPDATE with CASE statement to avoid N+1 queries
  // This updates all columns in a single query instead of one per column
  // Safe because we validated all IDs are integers above
  const caseStatements = validatedIds.map((id, i) => `WHEN ${id} THEN ${i}`).join(' ');
  await db.execute(sql`
    UPDATE kanban_columns 
    SET position = CASE id ${sql.raw(caseStatements)} END
    WHERE boardId = ${boardId} AND id IN (${sql.raw(validatedIds.join(','))});
  `);
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
  
  // Use transaction to prevent race conditions when multiple cards are moved simultaneously
  await db.transaction(async (tx) => {
    // Update positions in source column
    await tx.execute(sql`
      UPDATE kanban_cards 
      SET position = position - 1 
      WHERE columnId = ${fromColumnId} AND position > ${card.position}
    `);
    
    // Update positions in target column
    await tx.execute(sql`
      UPDATE kanban_cards 
      SET position = position + 1 
      WHERE columnId = ${targetColumnId} AND position >= ${targetPosition}
    `);
    
    // Move the card
    await tx.update(kanbanCards)
      .set({ columnId: targetColumnId, position: targetPosition })
      .where(eq(kanbanCards.id, cardId));
  });
  
  // Record history (outside transaction - non-critical)
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
  
  // FIX: Use transaction for atomic deletion to prevent orphaned data
  await db.transaction(async (tx) => {
    // Delete dependencies (both directions)
    await tx.delete(cardDependencies).where(eq(cardDependencies.cardId, id));
    await tx.delete(cardDependencies).where(eq(cardDependencies.blockedByCardId, id));
    // Delete comments
    await tx.delete(cardComments).where(eq(cardComments.cardId, id));
    // Delete history
    await tx.delete(cardHistory).where(eq(cardHistory.cardId, id));
    // Delete card (last, after all related data is removed)
    await tx.delete(kanbanCards).where(eq(kanbanCards.id, id));
  });
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Use transaction to ensure all-or-nothing board creation
  let boardId: number;
  
  await db.transaction(async (tx) => {
    // Create board
    const [boardResult] = await tx.insert(kanbanBoards).values({
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
    boardId = boardResult.insertId;
    
    // Create default columns
    const defaultColumns = [
      { name: "Backlog", columnType: "backlog" as const, color: "#6B7280", position: 0 },
      { name: "Spec Writing", columnType: "spec_writing" as const, color: "#8B5CF6", position: 1 },
      { name: "Design", columnType: "design" as const, color: "#EC4899", position: 2 },
      { name: "Ready", columnType: "ready" as const, color: "#3B82F6", position: 3 },
      { name: "In Progress", columnType: "in_progress" as const, color: "#F59E0B", wipLimit: 3, position: 4 },
      { name: "Review", columnType: "review" as const, color: "#10B981", position: 5 },
      { name: "Done", columnType: "done" as const, color: "#059669", position: 6 },
    ];
    
    for (const col of defaultColumns) {
      await tx.insert(kanbanColumns).values({
        boardId,
        name: col.name,
        columnType: col.columnType,
        color: col.color,
        wipLimit: col.wipLimit,
        position: col.position,
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
      await tx.insert(boardLabels).values({
        boardId,
        name: label.name,
        color: label.color,
      });
    }
  });
  
  return getBoardWithData(boardId!);
}


// ════════════════════════════════════════════════════════════════════════════
// SPEC LINKING (Phase 2)
// ════════════════════════════════════════════════════════════════════════════

export async function linkCardToSpec(cardId: number, specId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(kanbanCards)
    .set({ specId })
    .where(eq(kanbanCards.id, cardId));
  
  // Record in history
  await recordCardHistory({
    cardId,
    userId,
    eventType: "spec_linked",
    newValue: JSON.stringify({ specId }),
  });
  
  return getCardById(cardId);
}

export async function unlinkCardFromSpec(cardId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const card = await getCardById(cardId);
  const previousSpecId = card?.specId;
  
  await db.update(kanbanCards)
    .set({ specId: null })
    .where(eq(kanbanCards.id, cardId));
  
  // Record in history
  await recordCardHistory({
    cardId,
    userId,
    eventType: "spec_linked",
    comment: previousSpecId ? `Unlinked from spec ${previousSpecId}` : "Unlinked from spec",
  });
  
  return getCardById(cardId);
}

export async function getCardsLinkedToSpec(specId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(kanbanCards)
    .where(eq(kanbanCards.specId, specId))
    .orderBy(asc(kanbanCards.position));
}

// ════════════════════════════════════════════════════════════════════════════
// BOARD TEMPLATES (Phase 2)
// ════════════════════════════════════════════════════════════════════════════

interface BoardTemplate {
  name: string;
  description: string;
  columns: Array<{
    name: string;
    columnType: "backlog" | "spec_writing" | "design" | "ready" | "in_progress" | "review" | "done" | "blocked" | "custom";
    color: string;
    wipLimit?: number;
  }>;
  labels: Array<{ name: string; color: string }>;
}

const BOARD_TEMPLATES: Record<string, BoardTemplate> = {
  sprint: {
    name: "Sprint Board",
    description: "Agile sprint board for 2-week iterations",
    columns: [
      { name: "Sprint Backlog", columnType: "backlog", color: "#6B7280" },
      { name: "To Do", columnType: "ready", color: "#3B82F6" },
      { name: "In Progress", columnType: "in_progress", color: "#F59E0B", wipLimit: 3 },
      { name: "Code Review", columnType: "review", color: "#8B5CF6" },
      { name: "QA", columnType: "review", color: "#EC4899" },
      { name: "Done", columnType: "done", color: "#10B981" },
    ],
    labels: [
      { name: "story", color: "#3B82F6" },
      { name: "bug", color: "#EF4444" },
      { name: "tech-debt", color: "#6B7280" },
      { name: "spike", color: "#F59E0B" },
      { name: "blocked", color: "#DC2626" },
    ],
  },
  feature_development: {
    name: "Feature Development",
    description: "Spec-driven feature development workflow",
    columns: [
      { name: "Ideas", columnType: "backlog", color: "#6B7280" },
      { name: "Spec Writing", columnType: "spec_writing", color: "#8B5CF6" },
      { name: "Design Review", columnType: "design", color: "#EC4899" },
      { name: "Approved", columnType: "ready", color: "#3B82F6" },
      { name: "Development", columnType: "in_progress", color: "#F59E0B", wipLimit: 2 },
      { name: "Testing", columnType: "review", color: "#10B981" },
      { name: "Released", columnType: "done", color: "#059669" },
    ],
    labels: [
      { name: "feature", color: "#3B82F6" },
      { name: "enhancement", color: "#8B5CF6" },
      { name: "mvp", color: "#F59E0B" },
      { name: "nice-to-have", color: "#6B7280" },
      { name: "customer-request", color: "#EC4899" },
    ],
  },
  bug_triage: {
    name: "Bug Triage",
    description: "Bug tracking and triage workflow",
    columns: [
      { name: "Reported", columnType: "backlog", color: "#EF4444" },
      { name: "Triaging", columnType: "spec_writing", color: "#F59E0B" },
      { name: "Confirmed", columnType: "ready", color: "#3B82F6" },
      { name: "Fixing", columnType: "in_progress", color: "#8B5CF6", wipLimit: 3 },
      { name: "Verifying", columnType: "review", color: "#10B981" },
      { name: "Closed", columnType: "done", color: "#059669" },
      { name: "Won't Fix", columnType: "done", color: "#6B7280" },
    ],
    labels: [
      { name: "critical", color: "#DC2626" },
      { name: "high", color: "#EF4444" },
      { name: "medium", color: "#F59E0B" },
      { name: "low", color: "#6B7280" },
      { name: "regression", color: "#8B5CF6" },
      { name: "security", color: "#DC2626" },
    ],
  },
  kanban_basic: {
    name: "Basic Kanban",
    description: "Simple Kanban board for general use",
    columns: [
      { name: "To Do", columnType: "backlog", color: "#6B7280" },
      { name: "In Progress", columnType: "in_progress", color: "#3B82F6", wipLimit: 5 },
      { name: "Done", columnType: "done", color: "#10B981" },
    ],
    labels: [
      { name: "urgent", color: "#EF4444" },
      { name: "important", color: "#F59E0B" },
      { name: "normal", color: "#3B82F6" },
    ],
  },
};

export async function createBoardFromTemplate(
  projectId: number,
  templateType: keyof typeof BOARD_TEMPLATES,
  userId: number,
  customName?: string
) {
  const template = BOARD_TEMPLATES[templateType];
  if (!template) throw new Error(`Unknown template type: ${templateType}`);
  
  // Create board
  const board = await createBoard({
    projectId,
    userId,
    name: customName || template.name,
    description: template.description,
    isDefault: false,
    settings: {
      defaultView: "board",
      showLabels: true,
      showAssignees: true,
      showDueDates: true,
      swimlaneBy: "none",
      cardSize: "normal",
    },
  });
  
  // Create columns from template
  for (const col of template.columns) {
    await createColumn({
      boardId: board.id!,
      name: col.name,
      columnType: col.columnType,
      color: col.color,
      wipLimit: col.wipLimit,
    });
  }
  
  // Create labels from template
  for (const label of template.labels) {
    await createLabel({
      boardId: board.id!,
      name: label.name,
      color: label.color,
    });
  }
  
  return getBoardWithData(board.id!);
}

// ════════════════════════════════════════════════════════════════════════════
// DEPENDENCY GRAPH (Phase 2)
// ════════════════════════════════════════════════════════════════════════════

export interface DependencyNode {
  id: number;
  title: string;
  columnId: number;
  columnName: string;
  status: string;
  isBlocked: boolean;
  cardType: string;
  priority: string;
}

export interface DependencyEdge {
  id: number;
  sourceId: number;
  targetId: number;
  dependencyType: string;
  description?: string | null;
}

export interface DependencyGraphData {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  blockedCards: number[];
  criticalPath: number[];
}

export async function getDependencyGraph(boardId: number): Promise<DependencyGraphData> {
  const db = await getDb();
  if (!db) return { nodes: [], edges: [], blockedCards: [], criticalPath: [] };
  
  // Get all cards and columns for this board
  const columns = await getColumnsByBoard(boardId);
  const cards = await getCardsByBoard(boardId);
  const cardIds = cards.map(c => c.id);
  
  // Get all dependencies
  const dependencies = cardIds.length > 0
    ? await db.select().from(cardDependencies)
        .where(inArray(cardDependencies.cardId, cardIds))
    : [];
  
  // Build column name map
  const columnNameMap = new Map<number, string>();
  for (const col of columns) {
    columnNameMap.set(col.id, col.name);
  }
  
  // Build nodes
  const nodes: DependencyNode[] = cards.map(card => ({
    id: card.id,
    title: card.title,
    columnId: card.columnId,
    columnName: columnNameMap.get(card.columnId) || "Unknown",
    status: card.isBlocked ? "blocked" : "active",
    isBlocked: card.isBlocked || false,
    cardType: card.cardType,
    priority: card.priority,
  }));
  
  // Build edges
  const edges: DependencyEdge[] = dependencies.map(dep => ({
    id: dep.id,
    sourceId: dep.blockedByCardId,
    targetId: dep.cardId,
    dependencyType: dep.dependencyType,
    description: dep.description,
  }));
  
  // Find blocked cards (cards that have unresolved dependencies)
  const blockedCards: number[] = [];
  const doneColumnIds = columns
    .filter(c => c.columnType === "done")
    .map(c => c.id);
  
  for (const dep of dependencies) {
    if (dep.dependencyType === "blocks") {
      const blockerCard = cards.find(c => c.id === dep.blockedByCardId);
      if (blockerCard && !doneColumnIds.includes(blockerCard.columnId)) {
        blockedCards.push(dep.cardId);
      }
    }
  }
  
  // Simple critical path calculation (cards with most dependents)
  const dependentCount = new Map<number, number>();
  for (const dep of dependencies) {
    const count = dependentCount.get(dep.blockedByCardId) || 0;
    dependentCount.set(dep.blockedByCardId, count + 1);
  }
  
  const criticalPath = Array.from(dependentCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cardId]) => cardId);
  
  return { nodes, edges, blockedCards, criticalPath };
}
