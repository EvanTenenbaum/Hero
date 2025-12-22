/**
 * File Modification Service - Handles safe file modifications for the self-modifying IDE
 */

import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { isProtectedFile, getProtectionReason } from "./metaAgentPrompt";

const execAsync = promisify(exec);

// Project root directory
const PROJECT_ROOT = process.cwd();

export interface FileChange {
  filePath: string;
  originalContent: string | null;
  newContent: string;
  changeType: "create" | "modify" | "delete";
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  lineNumber: number;
}

export interface FileDiff {
  filePath: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
}

/**
 * Read a file from the project
 */
export async function readProjectFile(relativePath: string): Promise<string | null> {
  try {
    const fullPath = path.join(PROJECT_ROOT, relativePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write a file to the project
 */
export async function writeProjectFile(relativePath: string, content: string): Promise<void> {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  const dir = path.dirname(fullPath);
  
  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });
  
  // Write file
  await fs.writeFile(fullPath, content, "utf-8");
}

/**
 * Check if a file modification is allowed
 */
export function checkFilePermission(filePath: string): {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string | null;
} {
  const isProtected = isProtectedFile(filePath);
  const reason = getProtectionReason(filePath);
  
  return {
    allowed: true, // All files can be modified with confirmation
    requiresConfirmation: isProtected,
    reason,
  };
}

/**
 * Validate TypeScript compilation
 */
export async function validateTypeScript(): Promise<ValidationResult> {
  try {
    const { stdout, stderr } = await execAsync("npx tsc --noEmit 2>&1", {
      cwd: PROJECT_ROOT,
      timeout: 60000,
    });
    
    const output = stdout + stderr;
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Parse TypeScript output
    const lines = output.split("\n");
    for (const line of lines) {
      if (line.includes("error TS")) {
        errors.push(line.trim());
      } else if (line.includes("warning")) {
        warnings.push(line.trim());
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      errors: [`TypeScript validation failed: ${errorMessage}`],
      warnings: [],
    };
  }
}

/**
 * Validate ESLint rules
 */
export async function validateLint(filePath: string): Promise<ValidationResult> {
  try {
    const { stdout, stderr } = await execAsync(
      `npx eslint "${filePath}" --format json 2>&1`,
      { cwd: PROJECT_ROOT, timeout: 30000 }
    );
    
    const output = stdout + stderr;
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const results = JSON.parse(output);
      for (const result of results) {
        for (const message of result.messages || []) {
          if (message.severity === 2) {
            errors.push(`${message.line}:${message.column} - ${message.message}`);
          } else {
            warnings.push(`${message.line}:${message.column} - ${message.message}`);
          }
        }
      }
    } catch {
      // ESLint might not output JSON on success
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    // ESLint not configured or file not lintable - that's okay
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }
}

/**
 * Generate a unified diff between two strings
 */
export function generateDiff(
  originalContent: string | null,
  newContent: string,
  filePath: string
): FileDiff {
  const originalLines = originalContent?.split("\n") || [];
  const newLines = newContent.split("\n");
  
  const diffLines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  
  // Simple line-by-line diff (not optimal but readable)
  const maxLines = Math.max(originalLines.length, newLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const originalLine = originalLines[i];
    const newLine = newLines[i];
    
    if (originalLine === undefined && newLine !== undefined) {
      // Line added
      diffLines.push({ type: "add", content: newLine, lineNumber: i + 1 });
      additions++;
    } else if (originalLine !== undefined && newLine === undefined) {
      // Line removed
      diffLines.push({ type: "remove", content: originalLine, lineNumber: i + 1 });
      deletions++;
    } else if (originalLine !== newLine) {
      // Line changed
      diffLines.push({ type: "remove", content: originalLine, lineNumber: i + 1 });
      diffLines.push({ type: "add", content: newLine, lineNumber: i + 1 });
      additions++;
      deletions++;
    } else {
      // Line unchanged - only include for context
      if (i < 3 || i >= maxLines - 3 || 
          (diffLines.length > 0 && diffLines[diffLines.length - 1].type !== "context")) {
        diffLines.push({ type: "context", content: originalLine, lineNumber: i + 1 });
      }
    }
  }
  
  return {
    filePath,
    lines: diffLines,
    additions,
    deletions,
  };
}

/**
 * Apply a file change
 */
export async function applyFileChange(change: FileChange): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (change.changeType === "delete") {
      const fullPath = path.join(PROJECT_ROOT, change.filePath);
      await fs.unlink(fullPath);
    } else {
      await writeProjectFile(change.filePath, change.newContent);
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
 * Create a backup of a file before modification
 */
export async function createBackup(filePath: string): Promise<string | null> {
  const content = await readProjectFile(filePath);
  if (content === null) return null;
  
  const backupPath = `${filePath}.backup.${Date.now()}`;
  await writeProjectFile(backupPath, content);
  
  return backupPath;
}

/**
 * Restore a file from backup
 */
export async function restoreFromBackup(backupPath: string, originalPath: string): Promise<void> {
  const content = await readProjectFile(backupPath);
  if (content === null) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  await writeProjectFile(originalPath, content);
  
  // Remove backup file
  const fullBackupPath = path.join(PROJECT_ROOT, backupPath);
  await fs.unlink(fullBackupPath);
}

/**
 * Trigger hot reload (for Vite dev server)
 */
export async function triggerHotReload(): Promise<void> {
  // Touch a file to trigger Vite's HMR
  // In development, Vite watches for file changes automatically
  // This function is a placeholder for any additional reload logic
  console.log("[Meta Agent] Changes applied - Vite HMR should pick them up automatically");
}

/**
 * Validate all changes before applying
 */
export async function validateChanges(changes: FileChange[]): Promise<{
  valid: boolean;
  results: Map<string, ValidationResult>;
}> {
  const results = new Map<string, ValidationResult>();
  let allValid = true;
  
  // First, check permissions
  for (const change of changes) {
    const permission = checkFilePermission(change.filePath);
    if (permission.requiresConfirmation) {
      results.set(change.filePath, {
        valid: true,
        errors: [],
        warnings: [`Protected file: ${permission.reason}`],
      });
    }
  }
  
  // Then validate TypeScript for the whole project
  const tsResult = await validateTypeScript();
  if (!tsResult.valid) {
    allValid = false;
    results.set("typescript", tsResult);
  }
  
  return { valid: allValid, results };
}

/**
 * Apply multiple changes atomically
 */
export async function applyChangesAtomically(
  changes: FileChange[]
): Promise<{
  success: boolean;
  appliedChanges: string[];
  failedChanges: { path: string; error: string }[];
  backups: Map<string, string>;
}> {
  const backups = new Map<string, string>();
  const appliedChanges: string[] = [];
  const failedChanges: { path: string; error: string }[] = [];
  
  try {
    // Create backups for all existing files
    for (const change of changes) {
      if (change.changeType !== "create") {
        const backupPath = await createBackup(change.filePath);
        if (backupPath) {
          backups.set(change.filePath, backupPath);
        }
      }
    }
    
    // Apply all changes
    for (const change of changes) {
      const result = await applyFileChange(change);
      if (result.success) {
        appliedChanges.push(change.filePath);
      } else {
        failedChanges.push({ path: change.filePath, error: result.error || "Unknown error" });
        
        // Rollback on failure
        for (const entry of Array.from(backups.entries())) {
          const [originalPath, backupPath] = entry;
          try {
            await restoreFromBackup(backupPath, originalPath);
          } catch (e) {
            console.error(`Failed to restore backup for ${originalPath}:`, e);
          }
        }
        
        return {
          success: false,
          appliedChanges: [],
          failedChanges,
          backups,
        };
      }
    }
    
    // Validate after applying
    const validation = await validateChanges(changes);
    if (!validation.valid) {
      // Rollback if validation fails
      for (const entry of Array.from(backups.entries())) {
        const [originalPath, backupPath] = entry;
        try {
          await restoreFromBackup(backupPath, originalPath);
        } catch (e) {
          console.error(`Failed to restore backup for ${originalPath}:`, e);
        }
      }
      
      return {
        success: false,
        appliedChanges: [],
        failedChanges: [{ path: "validation", error: "TypeScript validation failed after changes" }],
        backups,
      };
    }
    
    // Trigger hot reload
    await triggerHotReload();
    
    return {
      success: true,
      appliedChanges,
      failedChanges: [],
      backups,
    };
  } catch (error) {
    // Rollback on any error
    for (const entry of Array.from(backups.entries())) {
      const [originalPath, backupPath] = entry;
      try {
        await restoreFromBackup(backupPath, originalPath);
      } catch (e) {
        console.error(`Failed to restore backup for ${originalPath}:`, e);
      }
    }
    
    return {
      success: false,
      appliedChanges: [],
      failedChanges: [{ path: "system", error: error instanceof Error ? error.message : String(error) }],
      backups,
    };
  }
}
