/**
 * Shell Utility Functions
 * 
 * Provides secure shell argument escaping and command safety utilities.
 * 
 * @module server/utils/shell
 */

// ════════════════════════════════════════════════════════════════════════════
// SHELL ARGUMENT ESCAPING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Escape a string for safe use as a shell argument.
 * Wraps the argument in single quotes and escapes any existing single quotes.
 * 
 * @param arg - The argument to escape
 * @returns The escaped argument safe for shell use
 */
export function escapeShellArg(arg: string): string {
  // Replace single quotes with '\'' (end quote, escaped quote, start quote)
  // Then wrap the entire string in single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Escape multiple shell arguments
 * 
 * @param args - Array of arguments to escape
 * @returns Array of escaped arguments
 */
export function escapeShellArgs(args: string[]): string[] {
  return args.map(escapeShellArg);
}

// ════════════════════════════════════════════════════════════════════════════
// COMMAND SAFETY CHECKS
// ════════════════════════════════════════════════════════════════════════════

/**
 * List of dangerous command patterns that should be blocked
 */
const DANGEROUS_PATTERNS = [
  /rm\s+(-rf?|--recursive)\s+[\/~]/i,     // rm -rf / or rm -r ~
  /rm\s+-[a-z]*f[a-z]*\s+[\/~]/i,         // rm with force flag on root
  /mkfs/i,                                  // Format filesystem
  /dd\s+.*of=\/dev/i,                       // Direct disk write
  />\s*\/dev\/sd[a-z]/i,                    // Redirect to disk device
  /chmod\s+(-R\s+)?777\s+\//i,              // chmod 777 on root
  /chown\s+-R\s+.*\s+\//i,                  // chown -R on root
  /:\(\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;/,     // Fork bomb
  /curl.*\|\s*(ba)?sh/i,                    // Pipe curl to shell
  /wget.*\|\s*(ba)?sh/i,                    // Pipe wget to shell
  /eval\s*\(/,                              // eval() calls
  /\$\(.*\)/,                               // Command substitution (potential injection)
  /`.*`/,                                   // Backtick command substitution
];

/**
 * List of explicitly dangerous commands
 */
const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'rm -rf /*',
  'rm -rf ~',
  'rm -rf ~/*',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'init 0',
  'init 6',
  ':(){:|:&};:',  // Fork bomb
];

/**
 * Check if a command is potentially dangerous
 * 
 * @param command - The command to check
 * @returns Object with safe boolean and optional reason
 */
export function checkCommandSafety(command: string): { safe: boolean; reason?: string } {
  const normalizedCommand = command.trim().toLowerCase();
  
  // Check against explicit dangerous commands
  for (const dangerous of DANGEROUS_COMMANDS) {
    if (normalizedCommand.includes(dangerous.toLowerCase())) {
      return { safe: false, reason: `Blocked dangerous command: ${dangerous}` };
    }
  }
  
  // Check against dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { safe: false, reason: `Command matches dangerous pattern: ${pattern.source}` };
    }
  }
  
  return { safe: true };
}

/**
 * Sanitize a path for use in shell commands
 * Removes null bytes and validates the path doesn't contain dangerous sequences
 * 
 * @param inputPath - The path to sanitize
 * @returns The sanitized path
 * @throws Error if path contains dangerous characters
 */
export function sanitizePath(inputPath: string): string {
  // Remove null bytes
  const sanitized = inputPath.replace(/\0/g, '');
  
  // Check for command injection attempts in path
  if (/[;&|`$()]/.test(sanitized)) {
    throw new Error('Path contains invalid characters');
  }
  
  return sanitized;
}

/**
 * Build a safe shell command with escaped arguments
 * 
 * @param command - The base command
 * @param args - Arguments to escape and append
 * @returns The complete command string
 */
export function buildSafeCommand(command: string, args: string[]): string {
  const escapedArgs = args.map(escapeShellArg);
  return `${command} ${escapedArgs.join(' ')}`;
}

// ════════════════════════════════════════════════════════════════════════════
// REGEX UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Escape special regex characters in a string
 * 
 * @param str - The string to escape
 * @returns The escaped string safe for use in RegExp
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
