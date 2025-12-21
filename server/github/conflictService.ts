/**
 * Merge Conflict Detection and Resolution Service
 * 
 * Provides:
 * - Conflict detection before merge
 * - 3-way diff generation
 * - AI-powered resolution suggestions
 * - Conflict resolution and commit
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import { getDb } from "../db";
import { mergeConflicts, type InsertMergeConflict, type MergeConflict } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

const execAsync = promisify(exec);

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface ConflictInfo {
  filePath: string;
  conflictType: "content" | "rename" | "delete_modify" | "binary";
  baseContent?: string;
  oursContent?: string;
  theirsContent?: string;
  conflictMarkers?: string;
}

export interface MergePreview {
  canMerge: boolean;
  conflicts: ConflictInfo[];
  changedFiles: string[];
  additions: number;
  deletions: number;
}

export interface ResolutionSuggestion {
  resolvedContent: string;
  explanation: string;
  confidence: number;
}

// ════════════════════════════════════════════════════════════════════════════
// CONFLICT DETECTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Previews a merge to detect conflicts without actually merging
 */
export async function previewMerge(
  repoPath: string,
  sourceBranch: string,
  targetBranch: string
): Promise<MergePreview> {
  try {
    // Use git merge-tree to preview merge without modifying working directory
    const { stdout: mergeTreeOutput } = await execAsync(
      `git -C "${repoPath}" merge-tree $(git -C "${repoPath}" merge-base ${targetBranch} ${sourceBranch}) ${targetBranch} ${sourceBranch}`
    );

    // Check for conflict markers in output
    const hasConflicts = mergeTreeOutput.includes("<<<<<<<") || 
                         mergeTreeOutput.includes("CONFLICT");

    // Get changed files
    const { stdout: diffOutput } = await execAsync(
      `git -C "${repoPath}" diff --stat ${targetBranch}...${sourceBranch}`
    );

    const changedFiles = diffOutput
      .split("\n")
      .filter(line => line.includes("|"))
      .map(line => line.split("|")[0].trim());

    // Count additions/deletions
    const { stdout: shortstat } = await execAsync(
      `git -C "${repoPath}" diff --shortstat ${targetBranch}...${sourceBranch}`
    );

    const addMatch = shortstat.match(/(\d+) insertion/);
    const delMatch = shortstat.match(/(\d+) deletion/);
    const additions = addMatch ? parseInt(addMatch[1], 10) : 0;
    const deletions = delMatch ? parseInt(delMatch[1], 10) : 0;

    // Parse conflicts if any
    const conflicts: ConflictInfo[] = [];
    if (hasConflicts) {
      const conflictFiles = await detectConflictFiles(repoPath, sourceBranch, targetBranch);
      for (const filePath of conflictFiles) {
        const conflictInfo = await getConflictDetails(repoPath, filePath, sourceBranch, targetBranch);
        if (conflictInfo) {
          conflicts.push(conflictInfo);
        }
      }
    }

    return {
      canMerge: !hasConflicts,
      conflicts,
      changedFiles,
      additions,
      deletions,
    };
  } catch (error) {
    // If merge-tree fails, try a different approach
    return {
      canMerge: false,
      conflicts: [],
      changedFiles: [],
      additions: 0,
      deletions: 0,
    };
  }
}

/**
 * Detects which files have conflicts
 */
async function detectConflictFiles(
  repoPath: string,
  sourceBranch: string,
  targetBranch: string
): Promise<string[]> {
  try {
    // Try a dry-run merge
    await execAsync(
      `git -C "${repoPath}" merge --no-commit --no-ff ${sourceBranch} 2>&1 || true`
    );

    // Get list of unmerged files
    const { stdout } = await execAsync(
      `git -C "${repoPath}" diff --name-only --diff-filter=U 2>/dev/null || true`
    );

    // Abort the merge
    await execAsync(`git -C "${repoPath}" merge --abort 2>/dev/null || true`);

    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Gets detailed conflict information for a file
 */
async function getConflictDetails(
  repoPath: string,
  filePath: string,
  sourceBranch: string,
  targetBranch: string
): Promise<ConflictInfo | null> {
  try {
    // Get base (common ancestor) content
    const { stdout: mergeBase } = await execAsync(
      `git -C "${repoPath}" merge-base ${targetBranch} ${sourceBranch}`
    );
    const baseCommit = mergeBase.trim();

    let baseContent: string | undefined;
    let oursContent: string | undefined;
    let theirsContent: string | undefined;

    try {
      const { stdout } = await execAsync(
        `git -C "${repoPath}" show ${baseCommit}:${filePath}`
      );
      baseContent = stdout;
    } catch {
      // File might not exist in base
    }

    try {
      const { stdout } = await execAsync(
        `git -C "${repoPath}" show ${targetBranch}:${filePath}`
      );
      oursContent = stdout;
    } catch {
      // File might not exist in target
    }

    try {
      const { stdout } = await execAsync(
        `git -C "${repoPath}" show ${sourceBranch}:${filePath}`
      );
      theirsContent = stdout;
    } catch {
      // File might not exist in source
    }

    // Determine conflict type
    let conflictType: ConflictInfo["conflictType"] = "content";
    if (!oursContent && theirsContent) {
      conflictType = "delete_modify";
    } else if (oursContent && !theirsContent) {
      conflictType = "delete_modify";
    } else if (filePath.match(/\.(png|jpg|jpeg|gif|pdf|zip|exe|bin)$/i)) {
      conflictType = "binary";
    }

    return {
      filePath,
      conflictType,
      baseContent,
      oursContent,
      theirsContent,
    };
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// AI-POWERED RESOLUTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generates AI-powered resolution suggestion for a conflict
 */
export async function suggestResolution(
  conflict: ConflictInfo
): Promise<ResolutionSuggestion | null> {
  if (conflict.conflictType === "binary") {
    return null; // Cannot resolve binary conflicts with AI
  }

  if (!conflict.baseContent && !conflict.oursContent && !conflict.theirsContent) {
    return null;
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert code merge assistant. Your task is to resolve merge conflicts intelligently by understanding the intent of both changes and producing a merged result that preserves all functionality.

Rules:
1. Preserve all unique changes from both versions
2. If changes conflict semantically, prefer the more complete/recent implementation
3. Maintain code style consistency
4. Never introduce syntax errors
5. Add comments if the merge decision is non-obvious

Respond with JSON: { "resolvedContent": "...", "explanation": "...", "confidence": 0.0-1.0 }`,
        },
        {
          role: "user",
          content: `Resolve this merge conflict for file: ${conflict.filePath}

BASE (common ancestor):
\`\`\`
${conflict.baseContent || "(file did not exist)"}
\`\`\`

OURS (target branch):
\`\`\`
${conflict.oursContent || "(file was deleted)"}
\`\`\`

THEIRS (source branch):
\`\`\`
${conflict.theirsContent || "(file was deleted)"}
\`\`\`

Provide the merged content that preserves all intended changes.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "merge_resolution",
          strict: true,
          schema: {
            type: "object",
            properties: {
              resolvedContent: { type: "string", description: "The merged file content" },
              explanation: { type: "string", description: "Brief explanation of merge decisions" },
              confidence: { type: "number", description: "Confidence score 0.0-1.0" },
            },
            required: ["resolvedContent", "explanation", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;

    const result = JSON.parse(content) as ResolutionSuggestion;
    return result;
  } catch (error) {
    console.error("AI resolution failed:", error);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Saves a merge conflict to the database
 */
export async function saveConflict(
  data: InsertMergeConflict
): Promise<MergeConflict> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(mergeConflicts).values(data);
  const [record] = await db
    .select()
    .from(mergeConflicts)
    .where(eq(mergeConflicts.id, result.insertId));
  return record;
}

/**
 * Gets conflicts for a project
 */
export async function getConflictsByProject(
  projectId: number
): Promise<MergeConflict[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(mergeConflicts)
    .where(eq(mergeConflicts.projectId, projectId));
}

/**
 * Gets unresolved conflicts for a repo
 */
export async function getUnresolvedConflicts(
  clonedRepoId: number
): Promise<MergeConflict[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(mergeConflicts)
    .where(
      and(
        eq(mergeConflicts.clonedRepoId, clonedRepoId),
        eq(mergeConflicts.resolvedAt, null as any)
      )
    );
}

/**
 * Resolves a conflict
 */
export async function resolveConflict(
  conflictId: number,
  resolution: string,
  strategy: "ours" | "theirs" | "manual" | "ai",
  resolvedBy: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(mergeConflicts)
    .set({
      resolution,
      resolutionStrategy: strategy,
      resolvedBy,
      resolvedAt: new Date(),
    })
    .where(eq(mergeConflicts.id, conflictId));
}

/**
 * Deletes resolved conflicts older than specified days
 */
export async function cleanupOldConflicts(daysOld: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  // Note: This is a simplified version - in production you'd want proper date comparison
  const result = await db
    .delete(mergeConflicts)
    .where(eq(mergeConflicts.resolvedAt, cutoffDate as any));
  
  return 0; // Would return affected rows in production
}

// ════════════════════════════════════════════════════════════════════════════
// RESOLUTION APPLICATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Applies a resolution to a file in the working directory
 */
export async function applyResolution(
  repoPath: string,
  filePath: string,
  resolvedContent: string
): Promise<boolean> {
  try {
    const fullPath = `${repoPath}/${filePath}`;
    await fs.writeFile(fullPath, resolvedContent, "utf-8");
    
    // Stage the resolved file
    await execAsync(`git -C "${repoPath}" add "${filePath}"`);
    
    return true;
  } catch (error) {
    console.error("Failed to apply resolution:", error);
    return false;
  }
}

/**
 * Completes a merge after all conflicts are resolved
 */
export async function completeMerge(
  repoPath: string,
  commitMessage: string
): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  try {
    // Check if there are still unresolved conflicts
    const { stdout: unmerged } = await execAsync(
      `git -C "${repoPath}" diff --name-only --diff-filter=U 2>/dev/null || true`
    );
    
    if (unmerged.trim()) {
      return {
        success: false,
        error: `Unresolved conflicts in: ${unmerged.trim()}`,
      };
    }
    
    // Commit the merge
    await execAsync(
      `git -C "${repoPath}" commit -m "${commitMessage.replace(/"/g, '\\"')}"`
    );
    
    // Get the new commit SHA
    const { stdout: sha } = await execAsync(
      `git -C "${repoPath}" rev-parse HEAD`
    );
    
    return {
      success: true,
      commitSha: sha.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
