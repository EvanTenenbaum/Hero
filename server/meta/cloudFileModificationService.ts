/**
 * Cloud File Modification Service
 * 
 * Cloud-compatible version of fileModificationService that works with E2B sandboxes.
 * Handles safe file modifications for the self-modifying IDE in cloud environments.
 * 
 * @module server/meta/cloudFileModificationService
 */

import { Sandbox } from '@e2b/code-interpreter';
import { isProtectedFile, getProtectionReason } from "./metaAgentPrompt";
import { REPO_PATH } from '../services/sandboxManager';

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
 * Read a file from the cloud sandbox
 */
export async function readProjectFile(
  sandbox: Sandbox,
  relativePath: string
): Promise<string | null> {
  try {
    const fullPath = `${REPO_PATH}/${relativePath}`.replace(/\/+/g, '/');
    const content = await sandbox.files.read(fullPath);
    return content;
  } catch (error) {
    // File doesn't exist
    return null;
  }
}

/**
 * Write a file to the cloud sandbox
 */
export async function writeProjectFile(
  sandbox: Sandbox,
  relativePath: string,
  content: string
): Promise<void> {
  const fullPath = `${REPO_PATH}/${relativePath}`.replace(/\/+/g, '/');
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
  
  // Ensure directory exists
  await sandbox.commands.run(`mkdir -p "${dir}"`);
  
  // Write file
  await sandbox.files.write(fullPath, content);
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
 * Validate TypeScript compilation in cloud sandbox
 */
export async function validateTypeScript(sandbox: Sandbox): Promise<ValidationResult> {
  try {
    const result = await sandbox.commands.run(
      `cd ${REPO_PATH} && npx tsc --noEmit 2>&1`,
      { timeoutMs: 60000 }
    );
    
    const output = result.stdout + result.stderr;
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
 * Validate ESLint rules in cloud sandbox
 */
export async function validateLint(
  sandbox: Sandbox,
  filePath: string
): Promise<ValidationResult> {
  try {
    const fullPath = `${REPO_PATH}/${filePath}`.replace(/\/+/g, '/');
    const result = await sandbox.commands.run(
      `cd ${REPO_PATH} && npx eslint "${fullPath}" --format json 2>&1`,
      { timeoutMs: 30000 }
    );
    
    const output = result.stdout + result.stderr;
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const results = JSON.parse(output);
      for (const res of results) {
        for (const message of res.messages || []) {
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
 * Apply a file change in cloud sandbox
 */
export async function applyFileChange(
  sandbox: Sandbox,
  change: FileChange
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (change.changeType === "delete") {
      const fullPath = `${REPO_PATH}/${change.filePath}`.replace(/\/+/g, '/');
      await sandbox.commands.run(`rm -f "${fullPath}"`);
    } else {
      await writeProjectFile(sandbox, change.filePath, change.newContent);
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
export async function createBackup(
  sandbox: Sandbox,
  filePath: string
): Promise<string | null> {
  const content = await readProjectFile(sandbox, filePath);
  if (content === null) return null;
  
  const backupPath = `${filePath}.backup.${Date.now()}`;
  await writeProjectFile(sandbox, backupPath, content);
  
  return backupPath;
}

/**
 * Restore a file from backup
 */
export async function restoreFromBackup(
  sandbox: Sandbox,
  backupPath: string,
  originalPath: string
): Promise<void> {
  const content = await readProjectFile(sandbox, backupPath);
  if (content === null) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  await writeProjectFile(sandbox, originalPath, content);
  
  // Remove backup file
  const fullBackupPath = `${REPO_PATH}/${backupPath}`.replace(/\/+/g, '/');
  await sandbox.commands.run(`rm -f "${fullBackupPath}"`);
}

/**
 * Validate all changes before applying
 */
export async function validateChanges(
  sandbox: Sandbox,
  changes: FileChange[]
): Promise<{
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
  const tsResult = await validateTypeScript(sandbox);
  if (!tsResult.valid) {
    allValid = false;
    results.set("typescript", tsResult);
  }
  
  return { valid: allValid, results };
}

/**
 * Apply multiple changes atomically in cloud sandbox
 */
export async function applyChangesAtomically(
  sandbox: Sandbox,
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
        const backupPath = await createBackup(sandbox, change.filePath);
        if (backupPath) {
          backups.set(change.filePath, backupPath);
        }
      }
    }
    
    // Apply all changes
    for (const change of changes) {
      const result = await applyFileChange(sandbox, change);
      if (result.success) {
        appliedChanges.push(change.filePath);
      } else {
        failedChanges.push({ path: change.filePath, error: result.error || "Unknown error" });
        
        // Rollback on failure
        for (const entry of Array.from(backups.entries())) {
          const [originalPath, backupPath] = entry;
          try {
            await restoreFromBackup(sandbox, backupPath, originalPath);
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
    const validation = await validateChanges(sandbox, changes);
    if (!validation.valid) {
      // Rollback if validation fails
      for (const entry of Array.from(backups.entries())) {
        const [originalPath, backupPath] = entry;
        try {
          await restoreFromBackup(sandbox, backupPath, originalPath);
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
        await restoreFromBackup(sandbox, backupPath, originalPath);
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
