/**
 * Kanban Authorization Helpers
 * 
 * Provides authorization checks for kanban operations to prevent BOLA/IDOR vulnerabilities.
 */

import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { projects, kanbanBoards, kanbanColumns, kanbanCards } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Verify that a user has access to a project
 */
export async function verifyProjectAccess(userId: number, projectId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.userId, userId)
    ))
    .limit(1);
    
  return result.length > 0;
}

/**
 * Verify that a user has access to a board (via project ownership)
 */
export async function verifyBoardAccess(userId: number, boardId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select({ projectId: kanbanBoards.projectId })
    .from(kanbanBoards)
    .where(eq(kanbanBoards.id, boardId))
    .limit(1);
    
  if (result.length === 0) return false;
  
  // Check if user owns the project
  return verifyProjectAccess(userId, result[0].projectId);
}

/**
 * Verify that a user has access to a column (via board -> project ownership)
 */
export async function verifyColumnAccess(userId: number, columnId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select({ boardId: kanbanColumns.boardId })
    .from(kanbanColumns)
    .where(eq(kanbanColumns.id, columnId))
    .limit(1);
    
  if (result.length === 0) return false;
  
  // Check if user has access to the board
  return verifyBoardAccess(userId, result[0].boardId);
}

/**
 * Verify that a user has access to a card (via column -> board -> project ownership)
 */
export async function verifyCardAccess(userId: number, cardId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select({ columnId: kanbanCards.columnId })
    .from(kanbanCards)
    .where(eq(kanbanCards.id, cardId))
    .limit(1);
    
  if (result.length === 0) return false;
  
  // Check if user has access to the column
  return verifyColumnAccess(userId, result[0].columnId);
}

/**
 * Throw FORBIDDEN error if access check fails
 */
export function requireAccess(hasAccess: boolean, resourceType: string): void {
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have access to this ${resourceType}`,
    });
  }
}

/**
 * Throw NOT_FOUND error if resource doesn't exist
 */
export function requireExists<T>(resource: T | null | undefined, resourceType: string): asserts resource is T {
  if (!resource) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `${resourceType} not found`,
    });
  }
}
