/**
 * Issue Sync Service - Sprint 20
 * 
 * Provides bidirectional synchronization between GitHub issues and Kanban cards.
 * Handles issue CRUD operations and sync state management.
 */

import { getDb } from "../db";
import { githubIssues, kanbanCards, type InsertGitHubIssue } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: {
    id: number;
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  assignees: Array<{
    id: number;
    login: string;
    avatar_url: string;
  }>;
  milestone: {
    id: number;
    title: string;
    number: number;
  } | null;
}

export interface IssueSyncResult {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

export interface IssueCreateInput {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface IssueUpdateInput {
  title?: string;
  body?: string;
  state?: "open" | "closed";
  labels?: string[];
  assignees?: string[];
  milestone?: number | null;
}

// ════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

async function githubFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.github.v3+json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List issues for a repository
 */
export async function listIssues(
  accessToken: string,
  owner: string,
  repo: string,
  options: {
    state?: "open" | "closed" | "all";
    labels?: string;
    sort?: "created" | "updated" | "comments";
    direction?: "asc" | "desc";
    since?: string;
    per_page?: number;
    page?: number;
  } = {}
): Promise<GitHubIssue[]> {
  const params = new URLSearchParams({
    state: options.state || "open",
    sort: options.sort || "updated",
    direction: options.direction || "desc",
    per_page: String(options.per_page || 30),
    page: String(options.page || 1),
  });

  if (options.labels) params.set("labels", options.labels);
  if (options.since) params.set("since", options.since);

  return githubFetch<GitHubIssue[]>(
    `/repos/${owner}/${repo}/issues?${params}`,
    accessToken
  );
}

/**
 * Get a specific issue
 */
export async function getIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  return githubFetch<GitHubIssue>(
    `/repos/${owner}/${repo}/issues/${issueNumber}`,
    accessToken
  );
}

/**
 * Create a new issue
 */
export async function createIssue(
  accessToken: string,
  owner: string,
  repo: string,
  input: IssueCreateInput
): Promise<GitHubIssue> {
  return githubFetch<GitHubIssue>(
    `/repos/${owner}/${repo}/issues`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
}

/**
 * Update an existing issue
 */
export async function updateIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  input: IssueUpdateInput
): Promise<GitHubIssue> {
  return githubFetch<GitHubIssue>(
    `/repos/${owner}/${repo}/issues/${issueNumber}`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
}

/**
 * Add labels to an issue
 */
export async function addLabels(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[]
): Promise<Array<{ id: number; name: string; color: string }>> {
  return githubFetch(
    `/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels }),
    }
  );
}

/**
 * Add a comment to an issue
 */
export async function addComment(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<{ id: number; body: string; created_at: string }> {
  return githubFetch(
    `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SYNC SERVICE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Sync GitHub issues to local database
 */
export async function syncIssuesToDb(
  projectId: number,
  accessToken: string,
  owner: string,
  repo: string,
  options: { state?: "open" | "closed" | "all" } = {}
): Promise<IssueSyncResult> {
  const result: IssueSyncResult = {
    success: true,
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  try {
    const db = await getDb();
    if (!db) {
      result.success = false;
      result.errors.push("Database not available");
      return result;
    }

    // Fetch issues from GitHub
    const issues = await listIssues(accessToken, owner, repo, {
      state: options.state || "all",
      per_page: 100,
    });

    const repoFullName = `${owner}/${repo}`;

    for (const issue of issues) {
      try {
        // Check if issue exists in DB
        const existing = await db
          .select()
          .from(githubIssues)
          .where(
            and(
              eq(githubIssues.projectId, projectId),
              eq(githubIssues.githubIssueNumber, issue.number)
            )
          )
          .limit(1);

        const issueData: InsertGitHubIssue = {
          projectId,
          githubIssueNumber: issue.number,
          githubIssueId: issue.id,
          repoFullName,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          authorGithubId: issue.user.id,
          authorLogin: issue.user.login,
          labels: issue.labels.map(l => ({ name: l.name, color: l.color })),
          assignees: issue.assignees.map(a => ({ login: a.login, id: a.id })),
          githubCreatedAt: new Date(issue.created_at),
          githubUpdatedAt: new Date(issue.updated_at),
          lastSyncedAt: new Date(),
        };

        if (existing.length > 0) {
          // Update existing
          await db
            .update(githubIssues)
            .set(issueData)
            .where(eq(githubIssues.id, existing[0].id));
          result.updated++;
        } else {
          // Create new
          await db.insert(githubIssues).values(issueData);
          result.created++;
        }

        result.synced++;
      } catch (error) {
        result.errors.push(
          `Issue #${issue.number}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : "Unknown error");
  }

  return result;
}

/**
 * Get synced issues from database
 */
export async function getSyncedIssues(
  projectId: number,
  options: {
    state?: "open" | "closed";
    limit?: number;
    offset?: number;
  } = {}
): Promise<Array<typeof githubIssues.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(githubIssues)
    .where(eq(githubIssues.projectId, projectId))
    .orderBy(desc(githubIssues.githubUpdatedAt));

  if (options.state) {
    query = db
      .select()
      .from(githubIssues)
      .where(
        and(
          eq(githubIssues.projectId, projectId),
          eq(githubIssues.state, options.state)
        )
      )
      .orderBy(desc(githubIssues.githubUpdatedAt));
  }

  if (options.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  if (options.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  return query;
}

/**
 * Link a GitHub issue to a Kanban card
 */
export async function linkIssueToCard(
  issueId: number,
  cardId: number
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    // Get issue details
    const issue = await db
      .select()
      .from(githubIssues)
      .where(eq(githubIssues.id, issueId))
      .limit(1);

    if (issue.length === 0) return false;

    // Update card with issue link
    await db
      .update(kanbanCards)
      .set({
        githubIssueId: String(issue[0].githubIssueId),
        githubIssueNumber: issue[0].githubIssueNumber,
      })
      .where(eq(kanbanCards.id, cardId));

    // Update issue with card link
    await db
      .update(githubIssues)
      .set({ linkedCardId: cardId })
      .where(eq(githubIssues.id, issueId));

    return true;
  } catch (error) {
    console.error("Error linking issue to card:", error);
    return false;
  }
}

/**
 * Create a Kanban card from a GitHub issue
 */
export async function createCardFromIssue(
  issueId: number,
  boardId: number,
  columnId: number
): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    // Get issue details
    const issue = await db
      .select()
      .from(githubIssues)
      .where(eq(githubIssues.id, issueId))
      .limit(1);

    if (issue.length === 0) return null;

    const issueData = issue[0];

    // Get max position in column
    const cards = await db
      .select()
      .from(kanbanCards)
      .where(eq(kanbanCards.columnId, columnId))
      .orderBy(desc(kanbanCards.position));

    const maxPosition = cards.length > 0 ? cards[0].position : 0;

    // Create card
    const result = await db.insert(kanbanCards).values({
      boardId,
      columnId,
      title: issueData.title,
      description: issueData.body || undefined,
      position: maxPosition + 1,
      githubIssueId: String(issueData.githubIssueId),
      githubIssueNumber: issueData.githubIssueNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const cardId = Number(result[0].insertId);

    // Link issue to card
    await db
      .update(githubIssues)
      .set({ linkedCardId: cardId })
      .where(eq(githubIssues.id, issueId));

    return cardId;
  } catch (error) {
    console.error("Error creating card from issue:", error);
    return null;
  }
}

/**
 * Create a GitHub issue from a Kanban card
 */
export async function createIssueFromCard(
  cardId: number,
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubIssue | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    // Get card details
    const card = await db
      .select()
      .from(kanbanCards)
      .where(eq(kanbanCards.id, cardId))
      .limit(1);

    if (card.length === 0) return null;

    const cardData = card[0];

    // Create issue on GitHub
    const issue = await createIssue(accessToken, owner, repo, {
      title: cardData.title,
      body: cardData.description || undefined,
    });

    // Update card with issue link
    await db
      .update(kanbanCards)
      .set({
        githubIssueId: String(issue.id),
        githubIssueNumber: issue.number,
      })
      .where(eq(kanbanCards.id, cardId));

    return issue;
  } catch (error) {
    console.error("Error creating issue from card:", error);
    return null;
  }
}

// Export types
export type { GitHubIssue as SyncedGitHubIssue };
