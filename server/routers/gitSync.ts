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
      const sandbox = await sandboxManager.getOrStartSandbox(String(projectId));
      
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
        `cd ${REPO_PATH} && git add .`,
        { timeoutMs: 30000 }
      );
      
      if (addResult.exitCode !== 0) {
        throw new Error(`Failed to stage changes: ${addResult.stderr}`);
      }

      // Create commit
      const timestamp = new Date().toISOString();
      const commitMessage = options?.message || `Auto-save: ${timestamp}`;
      
      const commitResult = await sandbox.commands.run(
        `cd ${REPO_PATH} && git commit -m "${escapeShellArg(commitMessage)}"`,
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
        `cd ${REPO_PATH} && git rev-parse HEAD`,
        { timeoutMs: 10000 }
      );
      const commitSha = shaResult.stdout.trim();

      // Push to remote
      const branch = options?.branch || 'HEAD';
      const pushResult = await sandbox.commands.run(
        `cd ${REPO_PATH} && git push origin ${branch}`,
        { timeoutMs: 60000 }
      );
      
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
    const sandbox = await sandboxManager.getOrStartSandbox(String(projectId));
    
    const result = await sandbox.commands.run(
      `cd ${REPO_PATH} && git status --porcelain`,
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
      const sandbox = await sandboxManager.getOrStartSandbox(String(projectId));

      if (files && files.length > 0) {
        // Discard specific files
        for (const file of files) {
          await sandbox.commands.run(
            `cd ${REPO_PATH} && git checkout -- "${escapeShellArg(file)}"`,
            { timeoutMs: 10000 }
          );
        }
      } else {
        // Discard all changes
        await sandbox.commands.run(
          `cd ${REPO_PATH} && git checkout -- . && git clean -fd`,
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
      const sandbox = await sandboxManager.getOrStartSandbox(String(projectId));

      const result = await sandbox.commands.run(
        `cd ${REPO_PATH} && git checkout -b "${escapeShellArg(branchName)}"`,
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
    const sandbox = await sandboxManager.getOrStartSandbox(String(projectId));

    const result = await sandbox.commands.run(
      `cd ${REPO_PATH} && git branch --show-current`,
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
      const sandbox = await sandboxManager.getOrStartSandbox(String(projectId));

      const branchArg = branch ? `origin ${branch}` : '';
      const result = await sandbox.commands.run(
        `cd ${REPO_PATH} && git pull ${branchArg}`,
        { timeoutMs: 60000 }
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
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Escape a string for use in shell commands
 */
function escapeShellArg(arg: string): string {
  return arg.replace(/'/g, "'\\''").replace(/"/g, '\\"');
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export const gitSyncService = new GitSyncService();

// Export types
export type { SyncResult, GitStatus };
