/**
 * GitHub Webhook Handler Service
 * 
 * Handles incoming GitHub webhook events with:
 * - Signature verification for security
 * - Idempotency via delivery_id tracking
 * - Event processing and routing
 */

import * as crypto from "crypto";
import { getDb } from "../db";
import { webhookEvents, pullRequests, githubIssues, type InsertWebhookEvent } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

export const WEBHOOK_CONFIG = {
  // Secret for verifying webhook signatures (should be set via env)
  secret: process.env.GITHUB_WEBHOOK_SECRET || "",
  // Maximum age for replay attack prevention (5 minutes)
  maxAgeSeconds: 300,
};

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface WebhookPayload {
  action?: string;
  repository?: {
    id: number;
    full_name: string;
  };
  sender?: {
    id: number;
    login: string;
  };
  [key: string]: unknown;
}

export interface WebhookHeaders {
  "x-github-event": string;
  "x-github-delivery": string;
  "x-hub-signature-256"?: string;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  eventId?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Verifies the webhook signature using HMAC-SHA256
 */
export function verifySignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY CHECK
// ════════════════════════════════════════════════════════════════════════════

/**
 * Checks if a webhook event has already been processed
 */
export async function isEventProcessed(deliveryId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [existing] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.deliveryId, deliveryId));

  return !!existing;
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT STORAGE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Stores a webhook event in the database
 */
export async function storeEvent(
  headers: WebhookHeaders,
  payload: WebhookPayload
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const data: InsertWebhookEvent = {
    deliveryId: headers["x-github-delivery"],
    eventType: headers["x-github-event"],
    action: payload.action,
    repoFullName: payload.repository?.full_name,
    senderId: payload.sender?.id,
    senderLogin: payload.sender?.login,
    payload: payload as Record<string, unknown>,
    processed: false,
  };

  const [result] = await db.insert(webhookEvents).values(data);
  return result.insertId;
}

/**
 * Marks an event as processed
 */
export async function markEventProcessed(
  eventId: number,
  error?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(webhookEvents)
    .set({
      processed: true,
      processedAt: new Date(),
      processingError: error,
    })
    .where(eq(webhookEvents.id, eventId));
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Handles push events
 */
async function handlePushEvent(payload: WebhookPayload): Promise<void> {
  // Update cloned repo's lastCommitSha if we have it tracked
  // This would trigger a sync in a real implementation
  console.debug(`Push event received for ${payload.repository?.full_name}`);
}

/**
 * Handles pull request events
 */
async function handlePullRequestEvent(payload: WebhookPayload): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const pr = payload.pull_request as {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    draft: boolean;
    mergeable: boolean;
    mergeable_state: string;
    additions: number;
    deletions: number;
    changed_files: number;
    head: { ref: string };
    base: { ref: string };
    user: { id: number; login: string };
    created_at: string;
    updated_at: string;
    merged_at: string | null;
    closed_at: string | null;
  };

  if (!pr) return;

  // Check if we're tracking this PR
  const [existing] = await db
    .select()
    .from(pullRequests)
    .where(eq(pullRequests.githubPrId, pr.id));

  if (existing) {
    // Update existing PR
    await db
      .update(pullRequests)
      .set({
        title: pr.title,
        body: pr.body,
        state: pr.state as "open" | "closed" | "merged",
        isDraft: pr.draft,
        mergeable: pr.mergeable,
        mergeableState: pr.mergeable_state,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        githubUpdatedAt: new Date(pr.updated_at),
        githubMergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        githubClosedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      })
      .where(eq(pullRequests.id, existing.id));
  }
}

/**
 * Handles issue events
 */
async function handleIssueEvent(payload: WebhookPayload): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const issue = payload.issue as {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    user: { id: number; login: string };
    labels: Array<{ name: string; color: string }>;
    assignees: Array<{ login: string; id: number }>;
    milestone: { title: string } | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
  };

  if (!issue) return;

  // Check if we're tracking this issue
  const [existing] = await db
    .select()
    .from(githubIssues)
    .where(eq(githubIssues.githubIssueId, issue.id));

  if (existing) {
    // Update existing issue
    await db
      .update(githubIssues)
      .set({
        title: issue.title,
        body: issue.body,
        state: issue.state as "open" | "closed",
        labels: issue.labels,
        assignees: issue.assignees,
        milestone: issue.milestone?.title,
        githubUpdatedAt: new Date(issue.updated_at),
        githubClosedAt: issue.closed_at ? new Date(issue.closed_at) : null,
        lastSyncedAt: new Date(),
      })
      .where(eq(githubIssues.id, existing.id));
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PROCESSOR
// ════════════════════════════════════════════════════════════════════════════

/**
 * Processes an incoming webhook event
 */
export async function processWebhook(
  headers: WebhookHeaders,
  payload: WebhookPayload,
  rawBody: string
): Promise<ProcessResult> {
  // 1. Verify signature if secret is configured
  if (WEBHOOK_CONFIG.secret) {
    const isValid = verifySignature(
      rawBody,
      headers["x-hub-signature-256"],
      WEBHOOK_CONFIG.secret
    );
    if (!isValid) {
      return { success: false, message: "Invalid signature" };
    }
  }

  // 2. Check for duplicate delivery (idempotency)
  const deliveryId = headers["x-github-delivery"];
  if (await isEventProcessed(deliveryId)) {
    return { success: true, message: "Event already processed" };
  }

  // 3. Store the event
  let eventId: number;
  try {
    eventId = await storeEvent(headers, payload);
  } catch (error) {
    return {
      success: false,
      message: `Failed to store event: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // 4. Process based on event type
  try {
    const eventType = headers["x-github-event"];

    switch (eventType) {
      case "push":
        await handlePushEvent(payload);
        break;
      case "pull_request":
        await handlePullRequestEvent(payload);
        break;
      case "issues":
        await handleIssueEvent(payload);
        break;
      case "ping":
        // Ping events are just for verification
        break;
      default:
        console.debug(`Unhandled event type: ${eventType}`);
    }

    await markEventProcessed(eventId);
    return { success: true, message: "Event processed", eventId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await markEventProcessed(eventId, errorMessage);
    return { success: false, message: errorMessage, eventId };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Gets recent webhook events for debugging
 */
export async function getRecentEvents(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(webhookEvents)
    .orderBy(webhookEvents.createdAt)
    .limit(limit);
}

/**
 * Retries failed events
 */
export async function retryFailedEvents(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const failed = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.processed, false));

  let retried = 0;
  for (const event of failed) {
    try {
      const eventType = event.eventType;
      const payload = event.payload as WebhookPayload;

      switch (eventType) {
        case "push":
          await handlePushEvent(payload);
          break;
        case "pull_request":
          await handlePullRequestEvent(payload);
          break;
        case "issues":
          await handleIssueEvent(payload);
          break;
      }

      await markEventProcessed(event.id);
      retried++;
    } catch (error) {
      await markEventProcessed(
        event.id,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  return retried;
}
