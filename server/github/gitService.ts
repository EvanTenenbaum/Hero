/**
 * Git Service - Repository Cloning and Workspace Management
 * 
 * Provides server-side git operations including:
 * - Shallow cloning with progress tracking
 * - Sparse checkout for monorepos
 * - Branch management
 * - Sync and pull operations
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { getDb } from "../db";
import { clonedRepos, type InsertClonedRepo, type ClonedRepo } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const execAsync = promisify(exec);

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

export const GIT_CONFIG = {
  workspacePath: "/tmp/hero-workspaces", // Base path for cloned repos
  defaultDepth: 1, // Shallow clone depth
  maxRepoSize: 500 * 1024 * 1024, // 500MB max
  cloneTimeout: 300000, // 5 minutes
};

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface CloneOptions {
  depth?: number;
  branch?: string;
  sparseCheckoutPaths?: string[];
  accessToken?: string;
}

export interface CloneProgress {
  phase: "counting" | "compressing" | "receiving" | "resolving" | "done";
  percent: number;
  message: string;
}

export interface CloneResult {
  success: boolean;
  clonePath?: string;
  error?: string;
  commitSha?: string;
  diskSize?: number;
}

export interface SyncResult {
  success: boolean;
  updated: boolean;
  newCommitSha?: string;
  changedFiles?: string[];
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// WORKSPACE MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Ensures the workspace directory exists
 */
async function ensureWorkspaceDir(): Promise<void> {
  await fs.mkdir(GIT_CONFIG.workspacePath, { recursive: true });
}

/**
 * Generates a unique clone path for a repository
 */
function getClonePath(userId: number, repoFullName: string): string {
  const sanitizedName = repoFullName.replace("/", "_");
  return path.join(GIT_CONFIG.workspacePath, `${userId}`, sanitizedName);
}

/**
 * Gets the disk size of a directory in bytes
 */
async function getDiskSize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`du -sb "${dirPath}" | cut -f1`);
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Gets the current commit SHA
 */
async function getCurrentCommitSha(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`git -C "${repoPath}" rev-parse HEAD`);
    return stdout.trim();
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CLONE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Clones a GitHub repository with shallow clone and optional sparse checkout
 */
export async function cloneRepository(
  repoFullName: string,
  options: CloneOptions = {},
  onProgress?: (progress: CloneProgress) => void
): Promise<CloneResult> {
  const {
    depth = GIT_CONFIG.defaultDepth,
    branch,
    sparseCheckoutPaths,
    accessToken,
  } = options;

  await ensureWorkspaceDir();

  // Build clone URL with auth token if provided
  let cloneUrl = `https://github.com/${repoFullName}.git`;
  if (accessToken) {
    cloneUrl = `https://x-access-token:${accessToken}@github.com/${repoFullName}.git`;
  }

  // Create temporary clone path
  const tempPath = path.join(GIT_CONFIG.workspacePath, `temp_${Date.now()}`);

  try {
    // Build git clone command
    const args = ["clone", "--progress"];
    
    if (depth > 0) {
      args.push("--depth", String(depth));
    }
    
    if (branch) {
      args.push("--branch", branch);
    }
    
    if (sparseCheckoutPaths && sparseCheckoutPaths.length > 0) {
      args.push("--sparse", "--filter=blob:none");
    }
    
    args.push(cloneUrl, tempPath);

    // Execute clone with progress tracking
    await new Promise<void>((resolve, reject) => {
      const gitProcess = spawn("git", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";

      gitProcess.stderr.on("data", (data: Buffer) => {
        const line = data.toString();
        stderr += line;

        // Parse progress from git output
        if (onProgress) {
          const progress = parseGitProgress(line);
          if (progress) {
            onProgress(progress);
          }
        }
      });

      gitProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Git clone failed: ${stderr}`));
        }
      });

      gitProcess.on("error", reject);

      // Timeout
      setTimeout(() => {
        gitProcess.kill();
        reject(new Error("Clone timeout exceeded"));
      }, GIT_CONFIG.cloneTimeout);
    });

    // Set up sparse checkout if needed
    if (sparseCheckoutPaths && sparseCheckoutPaths.length > 0) {
      await execAsync(`git -C "${tempPath}" sparse-checkout set ${sparseCheckoutPaths.join(" ")}`);
    }

    // Get commit SHA and disk size
    const commitSha = await getCurrentCommitSha(tempPath);
    const diskSize = await getDiskSize(tempPath);

    onProgress?.({ phase: "done", percent: 100, message: "Clone complete" });

    return {
      success: true,
      clonePath: tempPath,
      commitSha: commitSha || undefined,
      diskSize,
    };
  } catch (error) {
    // Cleanup on failure
    try {
      await fs.rm(tempPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parses git clone progress output
 */
function parseGitProgress(line: string): CloneProgress | null {
  // Counting objects
  if (line.includes("Counting objects")) {
    const match = line.match(/(\d+)%/);
    return {
      phase: "counting",
      percent: match ? parseInt(match[1], 10) : 0,
      message: "Counting objects...",
    };
  }

  // Compressing objects
  if (line.includes("Compressing objects")) {
    const match = line.match(/(\d+)%/);
    return {
      phase: "compressing",
      percent: match ? parseInt(match[1], 10) : 0,
      message: "Compressing objects...",
    };
  }

  // Receiving objects
  if (line.includes("Receiving objects")) {
    const match = line.match(/(\d+)%/);
    return {
      phase: "receiving",
      percent: match ? parseInt(match[1], 10) : 0,
      message: "Receiving objects...",
    };
  }

  // Resolving deltas
  if (line.includes("Resolving deltas")) {
    const match = line.match(/(\d+)%/);
    return {
      phase: "resolving",
      percent: match ? parseInt(match[1], 10) : 0,
      message: "Resolving deltas...",
    };
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// SYNC OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Syncs a cloned repository with remote
 */
export async function syncRepository(repoPath: string): Promise<SyncResult> {
  try {
    // Get current commit before pull
    const beforeSha = await getCurrentCommitSha(repoPath);

    // Fetch and pull
    await execAsync(`git -C "${repoPath}" fetch origin`);
    const { stdout: pullOutput } = await execAsync(`git -C "${repoPath}" pull --ff-only`);

    // Get new commit
    const afterSha = await getCurrentCommitSha(repoPath);

    // Check if updated
    const updated = beforeSha !== afterSha;

    // Get changed files if updated
    let changedFiles: string[] = [];
    if (updated && beforeSha && afterSha) {
      const { stdout } = await execAsync(
        `git -C "${repoPath}" diff --name-only ${beforeSha} ${afterSha}`
      );
      changedFiles = stdout.trim().split("\n").filter(Boolean);
    }

    return {
      success: true,
      updated,
      newCommitSha: afterSha || undefined,
      changedFiles,
    };
  } catch (error) {
    return {
      success: false,
      updated: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Checks out a specific branch
 */
export async function checkoutBranch(repoPath: string, branch: string): Promise<boolean> {
  try {
    await execAsync(`git -C "${repoPath}" checkout ${branch}`);
    return true;
  } catch {
    // Try fetching and checking out
    try {
      await execAsync(`git -C "${repoPath}" fetch origin ${branch}`);
      await execAsync(`git -C "${repoPath}" checkout -b ${branch} origin/${branch}`);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Gets the list of branches
 */
export async function listBranches(repoPath: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`git -C "${repoPath}" branch -a`);
    return stdout
      .split("\n")
      .map((b) => b.trim().replace("* ", "").replace("remotes/origin/", ""))
      .filter((b) => b && !b.includes("HEAD"));
  } catch {
    return [];
  }
}

/**
 * Gets the current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`git -C "${repoPath}" branch --show-current`);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Creates a cloned repo record in the database
 */
export async function createClonedRepoRecord(
  data: InsertClonedRepo
): Promise<ClonedRepo> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(clonedRepos).values(data);
  const [record] = await db
    .select()
    .from(clonedRepos)
    .where(eq(clonedRepos.id, result.insertId));
  return record;
}

/**
 * Updates a cloned repo record
 */
export async function updateClonedRepoRecord(
  id: number,
  data: Partial<InsertClonedRepo>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clonedRepos).set(data).where(eq(clonedRepos.id, id));
}

/**
 * Gets a cloned repo by project ID
 */
export async function getClonedRepoByProject(
  projectId: number
): Promise<ClonedRepo | null> {
  const db = await getDb();
  if (!db) return null;
  const [record] = await db
    .select()
    .from(clonedRepos)
    .where(eq(clonedRepos.projectId, projectId));
  return record || null;
}

/**
 * Gets a cloned repo by ID
 */
export async function getClonedRepoById(id: number): Promise<ClonedRepo | null> {
  const db = await getDb();
  if (!db) return null;
  const [record] = await db
    .select()
    .from(clonedRepos)
    .where(eq(clonedRepos.id, id));
  return record || null;
}

/**
 * Deletes a cloned repo and its files
 */
export async function deleteClonedRepo(id: number): Promise<void> {
  const repo = await getClonedRepoById(id);
  if (repo?.clonePath) {
    try {
      await fs.rm(repo.clonePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clonedRepos).where(eq(clonedRepos.id, id));
}

// ════════════════════════════════════════════════════════════════════════════
// HIGH-LEVEL OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Clones a repository and creates a database record
 */
export async function cloneAndTrack(
  projectId: number,
  userId: number,
  repoFullName: string,
  githubRepoId: number,
  options: CloneOptions = {},
  onProgress?: (progress: CloneProgress) => void
): Promise<{ success: boolean; clonedRepo?: ClonedRepo; error?: string }> {
  // Create pending record
  const record = await createClonedRepoRecord({
    projectId,
    userId,
    githubRepoId,
    fullName: repoFullName,
    cloneStatus: "cloning",
    cloneDepth: options.depth || GIT_CONFIG.defaultDepth,
    sparseCheckoutPaths: options.sparseCheckoutPaths,
  });

  try {
    // Clone repository
    const result = await cloneRepository(repoFullName, options, onProgress);

    if (!result.success) {
      await updateClonedRepoRecord(record.id, {
        cloneStatus: "error",
        syncError: result.error,
      });
      return { success: false, error: result.error };
    }

    // Move to final path
    const finalPath = getClonePath(userId, repoFullName);
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    
    // Remove existing if any
    try {
      await fs.rm(finalPath, { recursive: true, force: true });
    } catch {
      // Ignore
    }
    
    await fs.rename(result.clonePath!, finalPath);

    // Get current branch
    const currentBranch = await getCurrentBranch(finalPath);

    // Update record
    await updateClonedRepoRecord(record.id, {
      clonePath: finalPath,
      cloneStatus: "ready",
      currentBranch,
      lastCommitSha: result.commitSha,
      lastSyncedAt: new Date(),
      diskSizeBytes: result.diskSize,
    });

    const updatedRecord = await getClonedRepoById(record.id);
    return { success: true, clonedRepo: updatedRecord! };
  } catch (error) {
    await updateClonedRepoRecord(record.id, {
      cloneStatus: "error",
      syncError: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Syncs a tracked repository
 */
export async function syncTrackedRepo(
  clonedRepoId: number
): Promise<SyncResult> {
  const repo = await getClonedRepoById(clonedRepoId);
  if (!repo || !repo.clonePath) {
    return { success: false, updated: false, error: "Repository not found" };
  }

  await updateClonedRepoRecord(clonedRepoId, { cloneStatus: "syncing" });

  const result = await syncRepository(repo.clonePath);

  if (result.success) {
    await updateClonedRepoRecord(clonedRepoId, {
      cloneStatus: "ready",
      lastCommitSha: result.newCommitSha,
      lastSyncedAt: new Date(),
      syncError: null,
    });
  } else {
    await updateClonedRepoRecord(clonedRepoId, {
      cloneStatus: "error",
      syncError: result.error,
    });
  }

  return result;
}
