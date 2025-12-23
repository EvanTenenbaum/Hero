/**
 * Terminal Tools
 * 
 * Provides shell command execution that works with both local system
 * and remote E2B sandbox.
 * 
 * @module server/agents/tools/terminal
 */

import { spawn } from 'child_process';
import { AgentToolContext, ToolResult } from './index';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds
const MAX_OUTPUT_SIZE = 100000; // 100KB max output
const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'rm -rf /*',
  'mkfs',
  'dd if=/dev/zero',
  ':(){:|:&};:',
  'chmod -R 777 /',
  'chown -R',
];

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

interface RunCommandOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

// ════════════════════════════════════════════════════════════════════════════
// COMMAND EXECUTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Run a shell command
 * Routes to sandbox or local system based on context
 */
export async function runShellCommand(
  ctx: AgentToolContext,
  command: string,
  options?: RunCommandOptions
): Promise<ToolResult> {
  try {
    // Safety check
    const safetyResult = checkCommandSafety(command);
    if (!safetyResult.safe) {
      return {
        success: false,
        error: `Command blocked: ${safetyResult.reason}`,
      };
    }

    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
    let result: CommandResult;

    if (ctx.useCloudSandbox && ctx.sandbox) {
      // Execute in E2B sandbox
      result = await runInSandbox(ctx, command, { ...options, timeout });
    } else {
      // Execute locally
      result = await runLocally(command, { ...options, timeout, cwd: options?.cwd ?? ctx.repoPath });
    }

    // Truncate output if too large
    const truncatedStdout = truncateOutput(result.stdout);
    const truncatedStderr = truncateOutput(result.stderr);

    return {
      success: result.exitCode === 0,
      output: {
        stdout: truncatedStdout.content,
        stderr: truncatedStderr.content,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        truncated: truncatedStdout.truncated || truncatedStderr.truncated,
      },
      error: result.exitCode !== 0 ? `Command exited with code ${result.exitCode}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to run command: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Run a command in the E2B sandbox
 */
async function runInSandbox(
  ctx: AgentToolContext,
  command: string,
  options: RunCommandOptions & { timeout: number }
): Promise<CommandResult> {
  if (!ctx.sandbox) {
    throw new Error('Sandbox not available');
  }

  const cwd = options.cwd ?? ctx.repoPath;
  const fullCommand = `cd "${cwd}" && ${command}`;

  try {
    const result = await ctx.sandbox.commands.run(fullCommand, {
      timeoutMs: options.timeout,
      envs: options.env,
    });

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode ?? 0,
      timedOut: false,
    };
  } catch (error) {
    // Check if it was a timeout
    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        stdout: '',
        stderr: 'Command timed out',
        exitCode: 124,
        timedOut: true,
      };
    }
    throw error;
  }
}

/**
 * Run a command locally
 */
async function runLocally(
  command: string,
  options: RunCommandOptions & { timeout: number }
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', command], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeout);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? (timedOut ? 124 : 1),
        timedOut,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr: error.message,
        exitCode: 1,
        timedOut: false,
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SPECIALIZED COMMANDS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Run npm/pnpm/yarn commands
 */
export async function runPackageManager(
  ctx: AgentToolContext,
  args: string,
  packageManager?: 'npm' | 'pnpm' | 'yarn'
): Promise<ToolResult> {
  // Detect package manager if not specified
  const pm = packageManager ?? await detectPackageManager(ctx);
  const command = `${pm} ${args}`;
  
  return runShellCommand(ctx, command, {
    timeout: 300000, // 5 minutes for package operations
  });
}

/**
 * Detect which package manager to use
 */
async function detectPackageManager(ctx: AgentToolContext): Promise<string> {
  const checkFile = async (filename: string): Promise<boolean> => {
    if (ctx.useCloudSandbox && ctx.sandbox) {
      const result = await ctx.sandbox.commands.run(
        `test -f "${ctx.repoPath}/${filename}" && echo "exists"`,
        { timeoutMs: 5000 }
      );
      return result.stdout.includes('exists');
    } else {
      try {
        const fs = await import('fs/promises');
        await fs.access(`${ctx.repoPath}/${filename}`);
        return true;
      } catch {
        return false;
      }
    }
  };

  if (await checkFile('pnpm-lock.yaml')) return 'pnpm';
  if (await checkFile('yarn.lock')) return 'yarn';
  return 'npm';
}

/**
 * Run git commands
 */
export async function runGitCommand(
  ctx: AgentToolContext,
  args: string
): Promise<ToolResult> {
  const command = `git ${args}`;
  return runShellCommand(ctx, command, {
    timeout: 120000, // 2 minutes for git operations
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SAFETY CHECKS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check if a command is safe to execute
 */
function checkCommandSafety(command: string): { safe: boolean; reason?: string } {
  const normalizedCommand = command.toLowerCase().trim();

  // Check for dangerous commands
  for (const dangerous of DANGEROUS_COMMANDS) {
    if (normalizedCommand.includes(dangerous.toLowerCase())) {
      return { safe: false, reason: `Dangerous command pattern detected: ${dangerous}` };
    }
  }

  // Check for attempts to escape sandbox
  if (normalizedCommand.includes('../../') && normalizedCommand.includes('rm')) {
    return { safe: false, reason: 'Path traversal with delete operation not allowed' };
  }

  // Check for network exfiltration attempts
  if (normalizedCommand.includes('curl') && normalizedCommand.includes('|') && normalizedCommand.includes('sh')) {
    return { safe: false, reason: 'Piping remote content to shell not allowed' };
  }

  return { safe: true };
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Truncate output if too large
 */
function truncateOutput(output: string): { content: string; truncated: boolean } {
  if (output.length > MAX_OUTPUT_SIZE) {
    return {
      content: output.slice(0, MAX_OUTPUT_SIZE) + '\n... (output truncated)',
      truncated: true,
    };
  }
  return { content: output, truncated: false };
}
