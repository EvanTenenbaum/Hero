/**
 * AI-Powered Pull Request Review Service
 * 
 * Provides automated code review with:
 * - Code quality analysis
 * - Security vulnerability detection
 * - Performance suggestions
 * - Style and best practice recommendations
 */

import { getDb } from "../db";
import { pullRequests, prReviewComments, type InsertPrReviewComment } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { getFileContent, listCommits } from "./api";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface ReviewResult {
  summary: string;
  score: number; // 0-100
  comments: ReviewComment[];
  suggestions: string[];
}

export interface ReviewComment {
  filePath: string;
  lineNumber?: number;
  body: string;
  suggestionType: "bug" | "security" | "performance" | "style" | "documentation" | "other";
  severity: "critical" | "warning" | "info";
}

export interface FileChange {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
  content?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// REVIEW GENERATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generates an AI-powered code review for a pull request
 */
export async function generatePRReview(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number,
  changedFiles: FileChange[]
): Promise<ReviewResult> {
  // Build context from changed files
  const fileContexts = changedFiles
    .filter(f => f.patch || f.content)
    .slice(0, 10) // Limit to 10 files to stay within token limits
    .map(f => `
### ${f.filename} (${f.status})
+${f.additions} -${f.deletions}

\`\`\`diff
${f.patch || f.content || "(content not available)"}
\`\`\`
`).join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert code reviewer. Analyze the pull request changes and provide:
1. A concise summary of what the PR does
2. A quality score from 0-100
3. Specific comments on issues found (bugs, security, performance, style)
4. General suggestions for improvement

Be constructive and specific. Reference file names and line numbers when possible.

Respond with JSON matching this schema:
{
  "summary": "Brief description of the PR",
  "score": 85,
  "comments": [
    {
      "filePath": "src/file.ts",
      "lineNumber": 42,
      "body": "Consider using...",
      "suggestionType": "performance",
      "severity": "warning"
    }
  ],
  "suggestions": ["General suggestion 1", "General suggestion 2"]
}`,
        },
        {
          role: "user",
          content: `Review this pull request #${prNumber} in ${owner}/${repo}:

${fileContexts}

Provide a thorough code review.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pr_review",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              score: { type: "number" },
              comments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    filePath: { type: "string" },
                    lineNumber: { type: "number" },
                    body: { type: "string" },
                    suggestionType: { 
                      type: "string",
                      enum: ["bug", "security", "performance", "style", "documentation", "other"]
                    },
                    severity: {
                      type: "string",
                      enum: ["critical", "warning", "info"]
                    },
                  },
                  required: ["filePath", "body", "suggestionType", "severity"],
                  additionalProperties: false,
                },
              },
              suggestions: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["summary", "score", "comments", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No response from LLM");
    }

    return JSON.parse(content) as ReviewResult;
  } catch (error) {
    console.error("PR review generation failed:", error);
    return {
      summary: "Review generation failed",
      score: 0,
      comments: [],
      suggestions: [],
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Saves review comments to the database
 */
export async function saveReviewComments(
  pullRequestId: number,
  comments: ReviewComment[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const comment of comments) {
    const data: InsertPrReviewComment = {
      pullRequestId,
      filePath: comment.filePath,
      lineNumber: comment.lineNumber,
      body: comment.body,
      authorType: "ai",
      suggestionType: comment.suggestionType,
      severity: comment.severity,
    };

    await db.insert(prReviewComments).values(data);
  }
}

/**
 * Updates the PR with AI review results
 */
export async function updatePRWithReview(
  prId: number,
  review: ReviewResult
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(pullRequests)
    .set({
      aiReviewStatus: "completed",
      aiReviewSummary: review.summary,
      aiReviewScore: review.score,
      aiReviewedAt: new Date(),
    })
    .where(eq(pullRequests.id, prId));
}

/**
 * Gets review comments for a PR
 */
export async function getReviewComments(pullRequestId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(prReviewComments)
    .where(eq(prReviewComments.pullRequestId, pullRequestId));
}

/**
 * Marks a comment as resolved
 */
export async function resolveComment(commentId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(prReviewComments)
    .set({
      resolved: true,
      resolvedAt: new Date(),
    })
    .where(eq(prReviewComments.id, commentId));
}

// ════════════════════════════════════════════════════════════════════════════
// HIGH-LEVEL OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Performs a full AI review of a pull request
 */
export async function reviewPullRequest(
  prId: number,
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number,
  changedFiles: FileChange[]
): Promise<ReviewResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Mark as in progress
  await db
    .update(pullRequests)
    .set({ aiReviewStatus: "in_progress" })
    .where(eq(pullRequests.id, prId));

  try {
    // Generate review
    const review = await generatePRReview(
      accessToken,
      owner,
      repo,
      prNumber,
      changedFiles
    );

    // Save comments
    if (review.comments.length > 0) {
      await saveReviewComments(prId, review.comments);
    }

    // Update PR with results
    await updatePRWithReview(prId, review);

    return review;
  } catch (error) {
    // Mark as failed
    await db
      .update(pullRequests)
      .set({ aiReviewStatus: "skipped" })
      .where(eq(pullRequests.id, prId));

    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECURITY ANALYSIS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Performs focused security analysis on changed files
 */
export async function analyzeSecurityIssues(
  changedFiles: FileChange[]
): Promise<ReviewComment[]> {
  const securityPatterns = [
    { pattern: /eval\s*\(/, issue: "Use of eval() is dangerous", severity: "critical" as const },
    { pattern: /innerHTML\s*=/, issue: "innerHTML can lead to XSS", severity: "warning" as const },
    { pattern: /password.*=.*['"]/, issue: "Hardcoded password detected", severity: "critical" as const },
    { pattern: /api[_-]?key.*=.*['"]/, issue: "Hardcoded API key detected", severity: "critical" as const },
    { pattern: /exec\s*\(/, issue: "Shell command execution risk", severity: "critical" as const },
    { pattern: /dangerouslySetInnerHTML/, issue: "XSS risk with dangerouslySetInnerHTML", severity: "warning" as const },
  ];

  const comments: ReviewComment[] = [];

  for (const file of changedFiles) {
    const content = file.patch || file.content || "";
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const { pattern, issue, severity } of securityPatterns) {
        if (pattern.test(line)) {
          comments.push({
            filePath: file.filename,
            lineNumber: i + 1,
            body: `Security: ${issue}`,
            suggestionType: "security",
            severity,
          });
        }
      }
    }
  }

  return comments;
}
