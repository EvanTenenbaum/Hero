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
});
