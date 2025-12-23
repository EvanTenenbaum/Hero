/**
 * Git Sync Router
 * 
 * Handles synchronization of sandbox changes to GitHub.
 * Provides auto-save functionality and dirty state management.
 * 
 * @module server/routers/gitSync
 */

import { z } from 'zod';
import { sandboxManager, REPO_PATH } from '../services/sandboxManager';
import { escapeShellArg } from '../utils/shell';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface SyncResult {
  success: boolean;
  commitSha?: string;
  message?: string;
  error?: string;
  filesChanged?: number;
}

interface GitStatus {
  hasChanges: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const syncChangesInput = z.object({
  projectId: z.number(),
  message: z.string().optional(),
  branch: z.string().optional(),
});

export const getStatusInput = z.object({
  projectId: z.number(),
});

export const discardChangesInput = z.object({
  projectId: z.number(),
  files: z.array(z.string()).optional(), // If not provided, discard all
});

// ════════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Validate branch name to prevent injection
 */
function validateBranchName(branch: string): void {
  // Git branch names cannot contain: space, ~, ^, :, ?, *, [, \, or start with -
  if (!branch || /[\s~^:?*\[\]\\]/.test(branch) || branch.startsWith('-') || branch.includes('..')) {
    throw new Error('Invalid branch name');
  }
  if (branch.length > 255) {
    throw new Error('Branch name too long');
  }
}

/**
 * Validate file path to prevent path traversal
 */
function validateFilePath(filePath: string): void {
  if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\0')) {
    throw new Error('Invalid file path');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GIT SYNC SERVICE
// ════════════════════════════════════════════════════════════════════════════

class GitSyncService {
  /**
   * Sync all changes to GitHub
   * Performs: git add . && git commit && git push
   */
  async syncChanges(
    projectId: number,
    options?: { message?: string; branch?: string }
  ): Promise<SyncResult> {
    try {
      const sandbox = await sandboxManager.getOrStartSandbox(projectId.toString());
      const escapedRepoPath = escapeShellArg(REPO_PATH);
      
      // Check if there are any changes
      const status = await this.getStatus(projectId);
      if (!status.hasChanges) {
        return {
          success: true,
          message: 'No changes to sync',
          filesChanged: 0,
        };
      }

      // Stage all changes
      const addResult = await sandbox.commands.run(
        `cd ${escapedRepoPath} && git add .`,
        { timeoutMs: 30000 }
      );
      
      if (addResult.exitCode !== 0) {
        throw new Error(`Failed to stage changes: ${addResult.stderr}`);
      }

      // Create commit with properly escaped message
      const timestamp = new Date().toISOString();
      const commitMessage = options?.message || `Auto-save: ${timestamp}`;
      const escapedMessage = escapeShellArg(commitMessage);
      
      const commitResult = await sandbox.commands.run(
        `cd ${escapedRepoPath} && git commit -m ${escapedMessage}`,
        { timeoutMs: 30000 }
      );
      
      if (commitResult.exitCode !== 0) {
        // Check if it's just "nothing to commit"
        if (commitResult.stdout.includes('nothing to commit')) {
          return {
            success: true,
            message: 'No changes to commit',
            filesChanged: 0,
          };
        }
        throw new Error(`Failed to commit: ${commitResult.stderr}`);
      }

      // Get commit SHA
      const shaResult = await sandbox.commands.run(
        `cd ${escapedRepoPath} && git rev-parse HEAD`,
        { timeoutMs: 10000 }
      );
      const commitSha = shaResult.stdout.trim();

      // Push to remote with validated branch
      let pushCmd = `cd ${escapedRepoPath} && git push origin HEAD`;
      if (options?.branch) {
        validateBranchName(options.branch);
        pushCmd = `cd ${escapedRepoPath} && git push origin HEAD:${escapeShellArg(options.branch)}`;
      }
      
      const pushResult = await sandbox.commands.run(pushCmd, { timeoutMs: 60000 });
      
      if (pushResult.exitCode !== 0) {
        throw new Error(`Failed to push: ${pushResult.stderr}`);
      }

      // Count files changed
      const filesChanged = status.staged.length + status.unstaged.length + status.untracked.length;

      return {
        success: true,
        commitSha,
        message: `Synced ${filesChanged} file(s)`,
        filesChanged,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the current git status
   */
  async getStatus(projectId: number): Promise<GitStatus> {
    const sandbox = await sandboxManager.getOrStartSandbox(projectId.toString());
    const escapedRepoPath = escapeShellArg(REPO_PATH);
    
    const result = await sandbox.commands.run(
      `cd ${escapedRepoPath} && git status --porcelain`,
      { timeoutMs: 30000 }
    );

    const lines = result.stdout.split('\n').filter(l => l.trim());
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const status = line.slice(0, 2);
      const file = line.slice(3);

      if (status.startsWith('?')) {
        untracked.push(file);
      } else if (status[0] !== ' ') {
        staged.push(file);
      } else if (status[1] !== ' ') {
        unstaged.push(file);
      }
    }

    return {
      hasChanges: lines.length > 0,
      staged,
      unstaged,
      untracked,
    };
  }

  /**
   * Discard changes in the sandbox
   */
  async discardChanges(
    projectId: number,
    files?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sandbox = await sandboxManager.getOrStartSandbox(projectId.toString());
      const escapedRepoPath = escapeShellArg(REPO_PATH);

      if (files && files.length > 0) {
        // Discard specific files with validation
        for (const file of files) {
          validateFilePath(file);
          const escapedFile = escapeShellArg(file);
          await sandbox.commands.run(
            `cd ${escapedRepoPath} && git checkout -- ${escapedFile}`,
            { timeoutMs: 10000 }
          );
        }
      } else {
        // Discard all changes
        await sandbox.commands.run(
          `cd ${escapedRepoPath} && git checkout -- . && git clean -fd`,
          { timeoutMs: 30000 }
        );
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new branch from current state
   */
  async createBranch(
    projectId: number,
    branchName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // SECURITY: Validate branch name
      validateBranchName(branchName);
      
      const sandbox = await sandboxManager.getOrStartSandbox(projectId.toString());
      const escapedRepoPath = escapeShellArg(REPO_PATH);
      const escapedBranch = escapeShellArg(branchName);

      const result = await sandbox.commands.run(
        `cd ${escapedRepoPath} && git checkout -b ${escapedBranch}`,
        { timeoutMs: 30000 }
      );

      if (result.exitCode !== 0) {
        throw new Error(result.stderr);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the current branch name
   */
  async getCurrentBranch(projectId: number): Promise<string> {
    const sandbox = await sandboxManager.getOrStartSandbox(projectId.toString());
    const escapedRepoPath = escapeShellArg(REPO_PATH);

    const result = await sandbox.commands.run(
      `cd ${escapedRepoPath} && git branch --show-current`,
      { timeoutMs: 10000 }
    );

    return result.stdout.trim();
  }

  /**
   * Pull latest changes from remote
   */
  async pullChanges(
    projectId: number,
    branch?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sandbox = await sandboxManager.getOrStartSandbox(projectId.toString());
      const escapedRepoPath = escapeShellArg(REPO_PATH);

      let pullCmd = `cd ${escapedRepoPath} && git pull`;
      if (branch) {
        validateBranchName(branch);
        pullCmd = `cd ${escapedRepoPath} && git pull origin ${escapeShellArg(branch)}`;
      }
      
      const result = await sandbox.commands.run(pullCmd, { timeoutMs: 60000 });

      if (result.exitCode !== 0) {
        throw new Error(result.stderr);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export const gitSyncService = new GitSyncService();

// Export types
export type { SyncResult, GitStatus };
