/**
 * GitHub Agent Tools
 * 
 * Provides GitHub operations for agents including PR creation,
 * branch management, and repository interactions.
 * 
 * @module server/agents/tools/github
 */

import { AgentToolContext, ToolResult } from './index';
import { createPullRequest, createBranch, listBranches } from '../../github/api';
import { getDb } from '../../db';
import { githubConnections, projects } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const GIT_TIMEOUT_MS = 60000;

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface PRSubmitResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// PR OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Submit a Pull Request
 * Creates a new branch, commits changes, pushes, and opens a PR
 */
export async function submitPR(
  ctx: AgentToolContext,
  options: {
    title: string;
    body: string;
    branchName: string;
    baseBranch?: string;
  }
): Promise<ToolResult> {
  try {
    if (!ctx.useCloudSandbox || !ctx.sandbox) {
      return {
        success: false,
        error: 'PR submission requires cloud sandbox mode',
      };
    }

    // Get project info
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, ctx.projectId))
      .limit(1);

    if (!project || !project.repoOwner || !project.repoName) {
      return { success: false, error: 'Project not linked to a GitHub repository' };
    }

    // Get GitHub access token
    const accessToken = await getGitHubToken(ctx.userId);
    if (!accessToken) {
      return { success: false, error: 'No GitHub connection found' };
    }

    const baseBranch = options.baseBranch || project.defaultBranch || 'main';

    // Step 1: Create and checkout new branch in sandbox
    const checkoutResult = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git checkout -b "${escapeShellArg(options.branchName)}"`,
      { timeoutMs: GIT_TIMEOUT_MS }
    );

    if (checkoutResult.exitCode !== 0) {
      // Branch might already exist, try to checkout
      const existingResult = await ctx.sandbox.commands.run(
        `cd ${ctx.repoPath} && git checkout "${escapeShellArg(options.branchName)}"`,
        { timeoutMs: GIT_TIMEOUT_MS }
      );
      if (existingResult.exitCode !== 0) {
        return { success: false, error: `Failed to create/checkout branch: ${checkoutResult.stderr}` };
      }
    }

    // Step 2: Stage and commit all changes
    const addResult = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git add .`,
      { timeoutMs: GIT_TIMEOUT_MS }
    );

    if (addResult.exitCode !== 0) {
      return { success: false, error: `Failed to stage changes: ${addResult.stderr}` };
    }

    const commitResult = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git commit -m "${escapeShellArg(options.title)}"`,
      { timeoutMs: GIT_TIMEOUT_MS }
    );

    // Check if there were changes to commit
    if (commitResult.exitCode !== 0 && !commitResult.stdout.includes('nothing to commit')) {
      return { success: false, error: `Failed to commit: ${commitResult.stderr}` };
    }

    // Step 3: Push branch to remote
    const pushResult = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git push -u origin "${escapeShellArg(options.branchName)}"`,
      { timeoutMs: GIT_TIMEOUT_MS * 2 }
    );

    if (pushResult.exitCode !== 0) {
      return { success: false, error: `Failed to push branch: ${pushResult.stderr}` };
    }

    // Step 4: Create PR via GitHub API
    const pr = await createPullRequest(
      accessToken,
      project.repoOwner,
      project.repoName,
      options.title,
      options.branchName,
      baseBranch,
      options.body
    );

    return {
      success: true,
      output: {
        prUrl: pr.html_url,
        prNumber: pr.number,
        branchName: options.branchName,
        baseBranch,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to submit PR: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Create a new branch
 */
export async function createGitBranch(
  ctx: AgentToolContext,
  branchName: string,
  fromBranch?: string
): Promise<ToolResult> {
  try {
    if (!ctx.useCloudSandbox || !ctx.sandbox) {
      return {
        success: false,
        error: 'Branch creation requires cloud sandbox mode',
      };
    }

    // If fromBranch specified, checkout that first
    if (fromBranch) {
      await ctx.sandbox.commands.run(
        `cd ${ctx.repoPath} && git checkout "${escapeShellArg(fromBranch)}"`,
        { timeoutMs: GIT_TIMEOUT_MS }
      );
    }

    const result = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git checkout -b "${escapeShellArg(branchName)}"`,
      { timeoutMs: GIT_TIMEOUT_MS }
    );

    if (result.exitCode !== 0) {
      return { success: false, error: result.stderr };
    }

    return {
      success: true,
      output: { branchName, fromBranch: fromBranch || 'current' },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Switch to a different branch
 */
export async function checkoutBranch(
  ctx: AgentToolContext,
  branchName: string
): Promise<ToolResult> {
  try {
    if (!ctx.useCloudSandbox || !ctx.sandbox) {
      return {
        success: false,
        error: 'Branch checkout requires cloud sandbox mode',
      };
    }

    const result = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git checkout "${escapeShellArg(branchName)}"`,
      { timeoutMs: GIT_TIMEOUT_MS }
    );

    if (result.exitCode !== 0) {
      return { success: false, error: result.stderr };
    }

    return {
      success: true,
      output: { branchName },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to checkout branch: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get current git status
 */
export async function getGitStatus(ctx: AgentToolContext): Promise<ToolResult> {
  try {
    if (!ctx.useCloudSandbox || !ctx.sandbox) {
      return {
        success: false,
        error: 'Git status requires cloud sandbox mode',
      };
    }

    // Get current branch
    const branchResult = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git branch --show-current`,
      { timeoutMs: GIT_TIMEOUT_MS }
    );

    // Get status
    const statusResult = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git status --porcelain`,
      { timeoutMs: GIT_TIMEOUT_MS }
    );

    // Parse status
    const lines = statusResult.stdout.split('\n').filter(l => l.trim());
    const changes = lines.map(line => ({
      status: line.slice(0, 2).trim(),
      file: line.slice(3),
    }));

    return {
      success: true,
      output: {
        branch: branchResult.stdout.trim(),
        hasChanges: changes.length > 0,
        changes,
        changeCount: changes.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get git status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get git diff
 */
export async function getGitDiff(
  ctx: AgentToolContext,
  options?: { staged?: boolean; file?: string }
): Promise<ToolResult> {
  try {
    if (!ctx.useCloudSandbox || !ctx.sandbox) {
      return {
        success: false,
        error: 'Git diff requires cloud sandbox mode',
      };
    }

    let cmd = `cd ${ctx.repoPath} && git diff`;
    if (options?.staged) {
      cmd += ' --staged';
    }
    if (options?.file) {
      cmd += ` -- "${escapeShellArg(options.file)}"`;
    }

    const result = await ctx.sandbox.commands.run(cmd, { timeoutMs: GIT_TIMEOUT_MS });

    return {
      success: true,
      output: {
        diff: result.stdout,
        hasChanges: result.stdout.trim().length > 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get git diff: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Commit changes
 */
export async function commitChanges(
  ctx: AgentToolContext,
  message: string,
  options?: { files?: string[] }
): Promise<ToolResult> {
  try {
    if (!ctx.useCloudSandbox || !ctx.sandbox) {
      return {
        success: false,
        error: 'Git commit requires cloud sandbox mode',
      };
    }

    // Stage files
    if (options?.files && options.files.length > 0) {
      for (const file of options.files) {
        await ctx.sandbox.commands.run(
          `cd ${ctx.repoPath} && git add "${escapeShellArg(file)}"`,
          { timeoutMs: GIT_TIMEOUT_MS }
        );
      }
    } else {
      await ctx.sandbox.commands.run(
        `cd ${ctx.repoPath} && git add .`,
        { timeoutMs: GIT_TIMEOUT_MS }
      );
    }

    // Commit
    const result = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git commit -m "${escapeShellArg(message)}"`,
      { timeoutMs: GIT_TIMEOUT_MS }
    );

    if (result.exitCode !== 0) {
      if (result.stdout.includes('nothing to commit')) {
        return {
          success: true,
          output: { message: 'Nothing to commit', committed: false },
        };
      }
      return { success: false, error: result.stderr };
    }

    // Get commit SHA
    const shaResult = await ctx.sandbox.commands.run(
      `cd ${ctx.repoPath} && git rev-parse HEAD`,
      { timeoutMs: GIT_TIMEOUT_MS }
    );

    return {
      success: true,
      output: {
        commitSha: shaResult.stdout.trim(),
        message,
        committed: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to commit: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get GitHub access token for a user
 */
async function getGitHubToken(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const [connection] = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.userId, userId))
    .limit(1);

  return connection?.accessToken || null;
}

/**
 * Escape a string for use in shell commands
 */
function escapeShellArg(arg: string): string {
  return arg.replace(/'/g, "'\\''").replace(/"/g, '\\"');
}

// Export types
export type { PRSubmitResult };
