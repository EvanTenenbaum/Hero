/**
 * GitHub tRPC Router
 * Sprint 4: GitHub Integration
 * 
 * Provides tRPC procedures for GitHub operations.
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getGitHubAuthUrl,
  exchangeCodeForToken,
  getGitHubUser,
  storeGitHubConnection,
  getGitHubConnection,
  revokeGitHubConnection,
  hasGitHubConnection,
} from "./oauth";
import {
  listRepositories,
  getRepository,
  listBranches,
  getContents,
  getFileContent,
  listCommits,
  getCommit,
  searchRepositories,
  createOrUpdateFile,
  deleteFile,
  listPullRequests,
  getPullRequest,
  createPullRequest,
  createBranch,
} from "./api";
import {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  syncIssuesToDb,
  getSyncedIssues,
  linkIssueToCard,
  createCardFromIssue,
  createIssueFromCard,
} from "./issueSyncService";
import {
  getPRFiles,
  getPRDiff,
  listPRComments,
  listPRReviewComments,
  createPRComment,
  createPRReviewComment,
  listPRReviews,
  createPRReview,
  checkMergeability,
  mergePR,
  requestReviewers,
  listPRCommits,
} from "./prManagementService";
import {
  cloneAndTrack,
  syncTrackedRepo,
  getClonedRepoByProject,
  getClonedRepoById,
  listBranches as listLocalBranches,
  getCurrentBranch,
} from "./gitService";

export const githubRouter = router({
  // ============================================================================
  // OAuth Procedures
  // ============================================================================

  /**
   * Get GitHub OAuth authorization URL
   */
  getAuthUrl: protectedProcedure
    .query(({ ctx }) => {
      // Use user ID as state for CSRF protection
      const state = Buffer.from(JSON.stringify({
        userId: ctx.user.id,
        timestamp: Date.now(),
      })).toString("base64");
      
      return { url: getGitHubAuthUrl(state) };
    }),

  /**
   * Handle OAuth callback - exchange code for token
   */
  handleCallback: protectedProcedure
    .input(z.object({
      code: z.string(),
      state: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify state
      try {
        const stateData = JSON.parse(Buffer.from(input.state, "base64").toString());
        if (stateData.userId !== ctx.user.id) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid state" });
        }
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid state format" });
      }

      // Exchange code for token
      const tokenResponse = await exchangeCodeForToken(input.code);
      
      // Get GitHub user info
      const githubUser = await getGitHubUser(tokenResponse.access_token);
      
      // Store connection
      const expiresAt = tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : undefined;
      
      await storeGitHubConnection(
        ctx.user.id,
        githubUser,
        tokenResponse.access_token,
        tokenResponse.scope,
        tokenResponse.refresh_token,
        expiresAt
      );

      return {
        success: true,
        username: githubUser.login,
      };
    }),

  /**
   * Check if user has GitHub connection
   */
  isConnected: protectedProcedure
    .query(async ({ ctx }) => {
      return { connected: await hasGitHubConnection(ctx.user.id) };
    }),

  /**
   * Get current GitHub connection info
   */
  getConnection: protectedProcedure
    .query(async ({ ctx }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        return { connected: false, username: null };
      }
      return {
        connected: true,
        username: connection.githubUsername,
      };
    }),

  /**
   * Disconnect GitHub
   */
  disconnect: protectedProcedure
    .mutation(async ({ ctx }) => {
      await revokeGitHubConnection(ctx.user.id);
      return { success: true };
    }),

  // ============================================================================
  // Repository Procedures
  // ============================================================================

  /**
   * List user's repositories
   */
  listRepos: protectedProcedure
    .input(z.object({
      type: z.enum(["all", "owner", "public", "private", "member"]).optional(),
      sort: z.enum(["created", "updated", "pushed", "full_name"]).optional(),
      page: z.number().min(1).optional(),
      perPage: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return listRepositories(connection.accessToken, {
        type: input?.type,
        sort: input?.sort,
        page: input?.page,
        per_page: input?.perPage,
      });
    }),

  /**
   * Get a specific repository
   */
  getRepo: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return getRepository(connection.accessToken, input.owner, input.repo);
    }),

  /**
   * Search repositories
   */
  searchRepos: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      sort: z.enum(["stars", "forks", "help-wanted-issues", "updated"]).optional(),
      page: z.number().min(1).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return searchRepositories(connection.accessToken, input.query, {
        sort: input.sort,
        page: input.page,
      });
    }),

  // ============================================================================
  // Branch Procedures
  // ============================================================================

  /**
   * List repository branches
   */
  listBranches: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      page: z.number().min(1).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return listBranches(connection.accessToken, input.owner, input.repo, {
        page: input.page,
      });
    }),

  // ============================================================================
  // File/Content Procedures
  // ============================================================================

  /**
   * Get repository contents (file tree)
   */
  getContents: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string().optional(),
      ref: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return getContents(
        connection.accessToken,
        input.owner,
        input.repo,
        input.path || "",
        input.ref
      );
    }),

  /**
   * Get file content
   */
  getFileContent: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      ref: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return getFileContent(
        connection.accessToken,
        input.owner,
        input.repo,
        input.path,
        input.ref
      );
    }),

  // ============================================================================
  // Commit Procedures
  // ============================================================================

  /**
   * List commits
   */
  listCommits: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      sha: z.string().optional(),
      path: z.string().optional(),
      page: z.number().min(1).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return listCommits(connection.accessToken, input.owner, input.repo, {
        sha: input.sha,
        path: input.path,
        page: input.page,
      });
    }),

  /**
   * Get a specific commit
   */
  getCommit: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      sha: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return getCommit(connection.accessToken, input.owner, input.repo, input.sha);
    }),

  // ============================================================================
  // File Mutation Procedures
  // ============================================================================

  /**
   * Create or update a file
   */
  updateFile: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      content: z.string(),
      message: z.string(),
      sha: z.string().optional(),
      branch: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      const result = await createOrUpdateFile(
        connection.accessToken,
        input.owner,
        input.repo,
        input.path,
        input.content,
        input.message,
        input.sha,
        input.branch
      );

      return {
        sha: result.content.sha,
        commitSha: result.commit.sha,
        commitUrl: result.commit.html_url,
      };
    }),

  /**
   * Delete a file
   */
  deleteFile: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      message: z.string(),
      sha: z.string(),
      branch: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      const result = await deleteFile(
        connection.accessToken,
        input.owner,
        input.repo,
        input.path,
        input.message,
        input.sha,
        input.branch
      );

      return {
        commitSha: result.commit.sha,
        commitUrl: result.commit.html_url,
      };
    }),

  // ============================================================================
  // Pull Request Procedures
  // ============================================================================

  /**
   * List pull requests
   */
  listPullRequests: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(["open", "closed", "all"]).optional(),
      page: z.number().min(1).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return listPullRequests(connection.accessToken, input.owner, input.repo, {
        state: input.state,
        page: input.page,
      });
    }),

  /**
   * Get a specific pull request
   */
  getPullRequest: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return getPullRequest(connection.accessToken, input.owner, input.repo, input.pullNumber);
    }),

  /**
   * Create a pull request
   */
  createPullRequest: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      head: z.string(),
      base: z.string(),
      body: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return createPullRequest(
        connection.accessToken,
        input.owner,
        input.repo,
        input.title,
        input.head,
        input.base,
        input.body
      );
    }),

  // ============================================================================
  // Branch Mutation Procedures
  // ============================================================================

  /**
   * Create a new branch
   */
  createBranch: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      branchName: z.string(),
      sourceSha: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return createBranch(
        connection.accessToken,
        input.owner,
        input.repo,
        input.branchName,
        input.sourceSha
      );
    }),

  // ============================================================================
  // Issue Procedures (Sprint 20)
  // ============================================================================

  /**
   * List issues for a repository
   */
  listIssues: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(["open", "closed", "all"]).optional(),
      labels: z.string().optional(),
      page: z.number().min(1).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return listIssues(connection.accessToken, input.owner, input.repo, {
        state: input.state,
        labels: input.labels,
        page: input.page,
      });
    }),

  /**
   * Get a specific issue
   */
  getIssue: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      issueNumber: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return getIssue(connection.accessToken, input.owner, input.repo, input.issueNumber);
    }),

  /**
   * Create a new issue
   */
  createIssue: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string().optional(),
      labels: z.array(z.string()).optional(),
      assignees: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return createIssue(connection.accessToken, input.owner, input.repo, {
        title: input.title,
        body: input.body,
        labels: input.labels,
        assignees: input.assignees,
      });
    }),

  /**
   * Update an issue
   */
  updateIssue: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      issueNumber: z.number(),
      title: z.string().optional(),
      body: z.string().optional(),
      state: z.enum(["open", "closed"]).optional(),
      labels: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return updateIssue(connection.accessToken, input.owner, input.repo, input.issueNumber, {
        title: input.title,
        body: input.body,
        state: input.state,
        labels: input.labels,
      });
    }),

  /**
   * Sync issues from GitHub to local database
   */
  syncIssues: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      owner: z.string(),
      repo: z.string(),
      state: z.enum(["open", "closed", "all"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return syncIssuesToDb(input.projectId, connection.accessToken, input.owner, input.repo, {
        state: input.state,
      });
    }),

  /**
   * Get synced issues from local database
   */
  getSyncedIssues: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      state: z.enum(["open", "closed"]).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getSyncedIssues(input.projectId, {
        state: input.state,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Link a GitHub issue to a Kanban card
   */
  linkIssueToCard: protectedProcedure
    .input(z.object({
      issueId: z.number(),
      cardId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const success = await linkIssueToCard(input.issueId, input.cardId);
      if (!success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to link issue to card" });
      }
      return { success: true };
    }),

  /**
   * Create a Kanban card from a GitHub issue
   */
  createCardFromIssue: protectedProcedure
    .input(z.object({
      issueId: z.number(),
      boardId: z.number(),
      columnId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const cardId = await createCardFromIssue(input.issueId, input.boardId, input.columnId);
      if (!cardId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create card from issue" });
      }
      return { cardId };
    }),

  /**
   * Create a GitHub issue from a Kanban card
   */
  createIssueFromCard: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      owner: z.string(),
      repo: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      const issue = await createIssueFromCard(input.cardId, connection.accessToken, input.owner, input.repo);
      if (!issue) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create issue from card" });
      }
      return issue;
    }),

  // ============================================================================
  // Enhanced PR Procedures (Sprint 20)
  // ============================================================================

  /**
   * Get files changed in a PR
   */
  getPRFiles: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return getPRFiles(connection.accessToken, input.owner, input.repo, input.pullNumber);
    }),

  /**
   * Get the full diff for a PR
   */
  getPRDiff: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      const diff = await getPRDiff(connection.accessToken, input.owner, input.repo, input.pullNumber);
      return { diff };
    }),

  /**
   * List comments on a PR
   */
  listPRComments: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
      page: z.number().min(1).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return listPRComments(connection.accessToken, input.owner, input.repo, input.pullNumber, {
        page: input.page,
      });
    }),

  /**
   * List review comments on a PR (inline code comments)
   */
  listPRReviewComments: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
      page: z.number().min(1).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return listPRReviewComments(connection.accessToken, input.owner, input.repo, input.pullNumber, {
        page: input.page,
      });
    }),

  /**
   * Create a comment on a PR
   */
  createPRComment: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
      body: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return createPRComment(connection.accessToken, input.owner, input.repo, input.pullNumber, input.body);
    }),

  /**
   * Create an inline review comment on a PR
   */
  createPRReviewComment: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
      body: z.string(),
      commitId: z.string(),
      path: z.string(),
      line: z.number(),
      side: z.enum(["LEFT", "RIGHT"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return createPRReviewComment(
        connection.accessToken,
        input.owner,
        input.repo,
        input.pullNumber,
        input.body,
        input.commitId,
        input.path,
        input.line,
        input.side
      );
    }),

  /**
   * List reviews on a PR
   */
  listPRReviews: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return listPRReviews(connection.accessToken, input.owner, input.repo, input.pullNumber);
    }),

  /**
   * Create a review on a PR
   */
  createPRReview: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
      event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
      body: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return createPRReview(
        connection.accessToken,
        input.owner,
        input.repo,
        input.pullNumber,
        input.event,
        input.body
      );
    }),

  /**
   * Check if a PR is mergeable
   */
  checkMergeability: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return checkMergeability(connection.accessToken, input.owner, input.repo, input.pullNumber);
    }),

  /**
   * Merge a PR
   */
  mergePR: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
      commitTitle: z.string().optional(),
      commitMessage: z.string().optional(),
      mergeMethod: z.enum(["merge", "squash", "rebase"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return mergePR(connection.accessToken, input.owner, input.repo, input.pullNumber, {
        commit_title: input.commitTitle,
        commit_message: input.commitMessage,
        merge_method: input.mergeMethod,
      });
    }),

  /**
   * Request reviewers for a PR
   */
  requestReviewers: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
      reviewers: z.array(z.string()).optional(),
      teamReviewers: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return requestReviewers(
        connection.accessToken,
        input.owner,
        input.repo,
        input.pullNumber,
        input.reviewers,
        input.teamReviewers
      );
    }),

  /**
   * List commits on a PR
   */
  listPRCommits: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      return listPRCommits(connection.accessToken, input.owner, input.repo, input.pullNumber);
    }),

  // ============================================================================
  // Clone Service Procedures (Sprint 20)
  // ============================================================================

  /**
   * Clone a repository
   */
  cloneRepo: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      owner: z.string(),
      repo: z.string(),
      githubRepoId: z.number(),
      branch: z.string().optional(),
      depth: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await getGitHubConnection(ctx.user.id);
      if (!connection) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      }

      const result = await cloneAndTrack(
        input.projectId,
        ctx.user.id,
        `${input.owner}/${input.repo}`,
        input.githubRepoId,
        {
          branch: input.branch,
          depth: input.depth,
          accessToken: connection.accessToken,
        }
      );

      if (!result.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "Clone failed" });
      }

      return result.clonedRepo;
    }),

  /**
   * Sync a cloned repository
   */
  syncRepo: protectedProcedure
    .input(z.object({
      clonedRepoId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await syncTrackedRepo(input.clonedRepoId);
      if (!result.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "Sync failed" });
      }
      return result;
    }),

  /**
   * Get clone status for a project
   */
  getCloneStatus: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const clonedRepo = await getClonedRepoByProject(input.projectId);
      if (!clonedRepo) {
        return { cloned: false };
      }
      return {
        cloned: true,
        status: clonedRepo.cloneStatus,
        currentBranch: clonedRepo.currentBranch,
        lastSyncedAt: clonedRepo.lastSyncedAt,
        lastCommitSha: clonedRepo.lastCommitSha,
        error: clonedRepo.syncError,
      };
    }),
});
