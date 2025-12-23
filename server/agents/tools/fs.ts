/**
 * Filesystem Tools
 * 
 * Provides file operations that work with both local filesystem
 * and remote E2B sandbox filesystem.
 * 
 * @module server/agents/tools/fs
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentToolContext, ToolResult } from './index';
import { escapeShellArg, escapeRegex } from '../../utils/shell';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const MAX_FILE_SIZE = 1024 * 1024; // 1MB max file size for reading
const SANDBOX_TIMEOUT_MS = 30000;
const MAX_LIST_FILES = 1000;

// ════════════════════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Read a file from the project
 * Routes to sandbox or local filesystem based on context
 */
export async function readFile(
  ctx: AgentToolContext,
  filePath: string,
  options?: { startLine?: number; endLine?: number }
): Promise<ToolResult> {
  try {
    // SECURITY: Validate sandbox is available when cloud mode is enabled
    if (ctx.useCloudSandbox && !ctx.sandbox) {
      return {
        success: false,
        error: 'Cloud sandbox is enabled but sandbox instance is not available',
      };
    }

    const fullPath = resolvePath(ctx, filePath);
    let content: string;

    if (ctx.useCloudSandbox && ctx.sandbox) {
      // Read from E2B sandbox
      content = await ctx.sandbox.files.read(fullPath);
    } else {
      // Read from local filesystem
      content = await fs.readFile(fullPath, 'utf-8');
    }

    // Apply line range if specified
    if (options?.startLine !== undefined || options?.endLine !== undefined) {
      const lines = content.split('\n');
      const start = (options.startLine ?? 1) - 1;
      const end = options.endLine ?? lines.length;
      content = lines.slice(start, end).join('\n');
    }

    // Check file size
    if (content.length > MAX_FILE_SIZE) {
      return {
        success: true,
        output: {
          content: content.slice(0, MAX_FILE_SIZE),
          truncated: true,
          totalSize: content.length,
        },
      };
    }

    return {
      success: true,
      output: { content, truncated: false },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Write content to a file
 * Routes to sandbox or local filesystem based on context
 */
export async function writeFile(
  ctx: AgentToolContext,
  filePath: string,
  content: string
): Promise<ToolResult> {
  try {
    // SECURITY: Validate sandbox is available when cloud mode is enabled
    if (ctx.useCloudSandbox && !ctx.sandbox) {
      return {
        success: false,
        error: 'Cloud sandbox is enabled but sandbox instance is not available',
      };
    }

    const fullPath = resolvePath(ctx, filePath);

    if (ctx.useCloudSandbox && ctx.sandbox) {
      // Write to E2B sandbox
      await ctx.sandbox.files.write(fullPath, content);
    } else {
      // Write to local filesystem
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    return {
      success: true,
      output: { path: filePath, bytesWritten: content.length },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Edit a file with find/replace operations
 */
export async function editFile(
  ctx: AgentToolContext,
  filePath: string,
  edits: Array<{ find: string; replace: string; all?: boolean }>
): Promise<ToolResult> {
  try {
    // First read the file
    const readResult = await readFile(ctx, filePath);
    if (!readResult.success) {
      return readResult;
    }

    let content = (readResult.output as { content: string }).content;
    let totalReplacements = 0;

    // Apply each edit
    for (const edit of edits) {
      if (edit.all) {
        const count = (content.match(new RegExp(escapeRegex(edit.find), 'g')) || []).length;
        content = content.split(edit.find).join(edit.replace);
        totalReplacements += count;
      } else {
        if (content.includes(edit.find)) {
          content = content.replace(edit.find, edit.replace);
          totalReplacements += 1;
        }
      }
    }

    // Write the modified content back
    const writeResult = await writeFile(ctx, filePath, content);
    if (!writeResult.success) {
      return writeResult;
    }

    return {
      success: true,
      output: { path: filePath, replacements: totalReplacements },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to edit file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete a file
 */
export async function deleteFile(
  ctx: AgentToolContext,
  filePath: string
): Promise<ToolResult> {
  try {
    // SECURITY: Validate sandbox is available when cloud mode is enabled
    if (ctx.useCloudSandbox && !ctx.sandbox) {
      return {
        success: false,
        error: 'Cloud sandbox is enabled but sandbox instance is not available',
      };
    }

    const fullPath = resolvePath(ctx, filePath);

    if (ctx.useCloudSandbox && ctx.sandbox) {
      // SECURITY: Use escapeShellArg to prevent command injection
      const result = await ctx.sandbox.commands.run(`rm -f ${escapeShellArg(fullPath)}`, {
        timeoutMs: SANDBOX_TIMEOUT_MS,
      });
      if (result.exitCode !== 0) {
        throw new Error(result.stderr);
      }
    } else {
      // Delete from local filesystem
      await fs.unlink(fullPath);
    }

    return {
      success: true,
      output: { path: filePath, deleted: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * List files in a directory
 */
export async function listFiles(
  ctx: AgentToolContext,
  dirPath: string,
  options?: { recursive?: boolean }
): Promise<ToolResult> {
  try {
    // SECURITY: Validate sandbox is available when cloud mode is enabled
    if (ctx.useCloudSandbox && !ctx.sandbox) {
      return {
        success: false,
        error: 'Cloud sandbox is enabled but sandbox instance is not available',
      };
    }

    const fullPath = resolvePath(ctx, dirPath);
    let files: string[];

    if (ctx.useCloudSandbox && ctx.sandbox) {
      // SECURITY: Use escapeShellArg to prevent command injection
      const escapedPath = escapeShellArg(fullPath);
      const cmd = options?.recursive
        ? `find ${escapedPath} -type f -not -path '*/.git/*' -not -path '*/node_modules/*' 2>/dev/null | head -${MAX_LIST_FILES}`
        : `ls -1 ${escapedPath} 2>/dev/null`;
      
      const result = await ctx.sandbox.commands.run(cmd, {
        timeoutMs: SANDBOX_TIMEOUT_MS,
      });
      
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || 'Failed to list files');
      }
      
      files = result.stdout.split('\n').filter(f => f.trim());
      
      // Make paths relative to repo path
      if (options?.recursive) {
        files = files.map(f => f.replace(ctx.repoPath + '/', ''));
      }
    } else {
      // List files from local filesystem
      if (options?.recursive) {
        files = await listFilesRecursive(fullPath, fullPath);
      } else {
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        files = entries.map(e => e.isDirectory() ? `${e.name}/` : e.name);
      }
    }

    return {
      success: true,
      output: { path: dirPath, files, count: files.length },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(
  ctx: AgentToolContext,
  filePath: string
): Promise<ToolResult> {
  try {
    // SECURITY: Validate sandbox is available when cloud mode is enabled
    if (ctx.useCloudSandbox && !ctx.sandbox) {
      return {
        success: false,
        error: 'Cloud sandbox is enabled but sandbox instance is not available',
      };
    }

    const fullPath = resolvePath(ctx, filePath);
    let exists: boolean;

    if (ctx.useCloudSandbox && ctx.sandbox) {
      // SECURITY: Use escapeShellArg to prevent command injection
      const result = await ctx.sandbox.commands.run(`test -e ${escapeShellArg(fullPath)} && echo "exists"`, {
        timeoutMs: SANDBOX_TIMEOUT_MS,
      });
      exists = result.stdout.includes('exists');
    } else {
      try {
        await fs.access(fullPath);
        exists = true;
      } catch {
        exists = false;
      }
    }

    return {
      success: true,
      output: { path: filePath, exists },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to check file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a relative path to an absolute path within the project
 * Includes robust path traversal protection
 * 
 * SECURITY: This function is critical for preventing path traversal attacks.
 * It uses canonicalization to ensure the resolved path is within the project directory.
 */
function resolvePath(ctx: AgentToolContext, filePath: string): string {
  // Remove null bytes which can be used for path manipulation
  const sanitizedPath = filePath.replace(/\0/g, '');
  
  // Normalize the path to resolve any .. or . components
  const normalizedPath = path.normalize(sanitizedPath);
  
  let fullPath: string;
  
  // If already absolute, use as-is (but ensure it's within repo)
  if (path.isAbsolute(normalizedPath)) {
    fullPath = normalizedPath;
  } else {
    // Otherwise, resolve relative to repo path
    fullPath = path.join(ctx.repoPath, normalizedPath);
  }
  
  // SECURITY: Canonicalize both paths and verify containment
  // This is the primary defense against path traversal
  const resolvedPath = path.resolve(fullPath);
  const resolvedRepoPath = path.resolve(ctx.repoPath);
  
  // Ensure the resolved path starts with the repo path
  // Add trailing separator to prevent partial directory name matches
  // e.g., /home/user/repo-evil should not match /home/user/repo
  if (!resolvedPath.startsWith(resolvedRepoPath + path.sep) && resolvedPath !== resolvedRepoPath) {
    throw new Error('Access denied: path is outside project directory');
  }
  
  return resolvedPath;
}

/**
 * Recursively list files in a directory (local filesystem only)
 */
async function listFilesRecursive(dir: string, baseDir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      // Skip node_modules and .git
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      const subFiles = await listFilesRecursive(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}
