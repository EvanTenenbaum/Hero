/**
 * Safety Checker Module
 * 
 * Validates agent actions against safety rules before execution.
 * Uses a simple whitelist/blacklist approach for predictability.
 */

export interface SafetyRule {
  id: string;
  type: 'allow' | 'deny' | 'confirm';
  pattern: string;
  description: string;
  category: 'file' | 'terminal' | 'network' | 'system' | 'custom';
}

export interface SafetyCheckResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
  matchedRule?: SafetyRule;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActionContext {
  action: string;
  agentType: string;
  userId: number;
  projectId?: number;
  metadata?: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT SAFETY RULES
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_RULES: SafetyRule[] = [
  // ── File Operations ──────────────────────────────────────────────────────
  {
    id: 'deny-system-files',
    type: 'deny',
    pattern: '/etc/**',
    description: 'System configuration files are off-limits',
    category: 'file',
  },
  {
    id: 'deny-root-files',
    type: 'deny',
    pattern: '/root/**',
    description: 'Root user files are off-limits',
    category: 'file',
  },
  {
    id: 'deny-env-files',
    type: 'deny',
    pattern: '**/.env*',
    description: 'Environment files require manual editing',
    category: 'file',
  },
  {
    id: 'deny-ssh-keys',
    type: 'deny',
    pattern: '**/.ssh/**',
    description: 'SSH keys are off-limits',
    category: 'file',
  },
  {
    id: 'deny-git-internal',
    type: 'deny',
    pattern: '**/.git/**',
    description: 'Git internal files should not be modified directly',
    category: 'file',
  },
  {
    id: 'confirm-delete',
    type: 'confirm',
    pattern: 'delete:*',
    description: 'File deletion requires confirmation',
    category: 'file',
  },
  {
    id: 'confirm-config-edit',
    type: 'confirm',
    pattern: 'edit:**/config.*',
    description: 'Configuration file changes require confirmation',
    category: 'file',
  },
  
  // ── Terminal Operations ──────────────────────────────────────────────────
  {
    id: 'deny-sudo',
    type: 'deny',
    pattern: 'sudo *',
    description: 'Sudo commands are not allowed',
    category: 'terminal',
  },
  {
    id: 'deny-su',
    type: 'deny',
    pattern: 'su *',
    description: 'User switching is not allowed',
    category: 'terminal',
  },
  {
    id: 'deny-rm-rf',
    type: 'deny',
    pattern: 'rm -rf *',
    description: 'Recursive force delete is not allowed',
    category: 'terminal',
  },
  {
    id: 'deny-rm-rf-root',
    type: 'deny',
    pattern: 'rm -rf /',
    description: 'Deleting root is absolutely forbidden',
    category: 'terminal',
  },
  {
    id: 'deny-chmod-777',
    type: 'deny',
    pattern: 'chmod 777 *',
    description: 'World-writable permissions are not allowed',
    category: 'terminal',
  },
  {
    id: 'deny-curl-pipe-bash',
    type: 'deny',
    pattern: 'curl * | bash',
    description: 'Piping curl to bash is not allowed',
    category: 'terminal',
  },
  {
    id: 'deny-wget-pipe-bash',
    type: 'deny',
    pattern: 'wget * | bash',
    description: 'Piping wget to bash is not allowed',
    category: 'terminal',
  },
  {
    id: 'confirm-install',
    type: 'confirm',
    pattern: 'npm install *',
    description: 'Package installation requires confirmation',
    category: 'terminal',
  },
  {
    id: 'confirm-pnpm-add',
    type: 'confirm',
    pattern: 'pnpm add *',
    description: 'Package installation requires confirmation',
    category: 'terminal',
  },
  {
    id: 'confirm-yarn-add',
    type: 'confirm',
    pattern: 'yarn add *',
    description: 'Package installation requires confirmation',
    category: 'terminal',
  },
  {
    id: 'confirm-pip-install',
    type: 'confirm',
    pattern: 'pip install *',
    description: 'Package installation requires confirmation',
    category: 'terminal',
  },
  {
    id: 'confirm-git-push',
    type: 'confirm',
    pattern: 'git push *',
    description: 'Git push requires confirmation',
    category: 'terminal',
  },
  {
    id: 'confirm-git-force',
    type: 'confirm',
    pattern: 'git * --force*',
    description: 'Force operations require confirmation',
    category: 'terminal',
  },
  
  // ── Network Operations ───────────────────────────────────────────────────
  {
    id: 'confirm-external-fetch',
    type: 'confirm',
    pattern: 'fetch:http*',
    description: 'External API calls require confirmation',
    category: 'network',
  },
  {
    id: 'deny-localhost-admin',
    type: 'deny',
    pattern: 'fetch:*localhost*/admin*',
    description: 'Admin endpoints are off-limits',
    category: 'network',
  },
  
  // ── System Operations ────────────────────────────────────────────────────
  {
    id: 'deny-shutdown',
    type: 'deny',
    pattern: 'shutdown *',
    description: 'System shutdown is not allowed',
    category: 'system',
  },
  {
    id: 'deny-reboot',
    type: 'deny',
    pattern: 'reboot *',
    description: 'System reboot is not allowed',
    category: 'system',
  },
  {
    id: 'deny-kill-all',
    type: 'deny',
    pattern: 'killall *',
    description: 'Killing all processes is not allowed',
    category: 'system',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// PATTERN MATCHING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Simple glob pattern matching (no regex to avoid ReDoS)
 */
function matchesPattern(action: string, pattern: string): boolean {
  // Escape special regex characters except * and ?
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  
  try {
    const regex = new RegExp(`^${escaped}$`, 'i');
    return regex.test(action);
  } catch {
    // If pattern is invalid, don't match
    return false;
  }
}

/**
 * Determine risk level based on action and matched rule
 */
function determineRiskLevel(
  action: string,
  rule?: SafetyRule
): 'low' | 'medium' | 'high' | 'critical' {
  if (!rule) return 'low';
  
  // Critical: system-level or destructive operations
  if (rule.category === 'system') return 'critical';
  if (action.includes('rm -rf')) return 'critical';
  if (action.includes('--force')) return 'high';
  
  // High: terminal commands that modify state
  if (rule.category === 'terminal' && rule.type === 'deny') return 'high';
  
  // Medium: file operations that need confirmation
  if (rule.type === 'confirm') return 'medium';
  
  return 'low';
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check if an action is allowed based on safety rules
 */
export function checkSafety(
  action: string,
  customRules: SafetyRule[] = []
): SafetyCheckResult {
  // Combine default rules with custom rules (custom rules take precedence)
  const allRules = [...customRules, ...DEFAULT_RULES];
  
  // Check each rule in order
  for (const rule of allRules) {
    if (matchesPattern(action, rule.pattern)) {
      if (rule.type === 'deny') {
        return {
          allowed: false,
          requiresConfirmation: false,
          reason: rule.description,
          matchedRule: rule,
          riskLevel: determineRiskLevel(action, rule),
        };
      }
      
      if (rule.type === 'confirm') {
        return {
          allowed: true,
          requiresConfirmation: true,
          reason: rule.description,
          matchedRule: rule,
          riskLevel: determineRiskLevel(action, rule),
        };
      }
      
      // 'allow' type - explicitly allowed
      if (rule.type === 'allow') {
        return {
          allowed: true,
          requiresConfirmation: false,
          matchedRule: rule,
          riskLevel: 'low',
        };
      }
    }
  }
  
  // Default: allow without confirmation
  return {
    allowed: true,
    requiresConfirmation: false,
    riskLevel: 'low',
  };
}

/**
 * Check multiple actions at once
 */
export function checkMultipleActions(
  actions: string[],
  customRules: SafetyRule[] = []
): Map<string, SafetyCheckResult> {
  const results = new Map<string, SafetyCheckResult>();
  
  for (const action of actions) {
    results.set(action, checkSafety(action, customRules));
  }
  
  return results;
}

/**
 * Get all default rules
 */
export function getDefaultRules(): SafetyRule[] {
  return [...DEFAULT_RULES];
}

/**
 * Get rules by category
 */
export function getRulesByCategory(category: SafetyRule['category']): SafetyRule[] {
  return DEFAULT_RULES.filter(rule => rule.category === category);
}

/**
 * Create a custom rule
 */
export function createRule(
  id: string,
  type: SafetyRule['type'],
  pattern: string,
  description: string,
  category: SafetyRule['category'] = 'custom'
): SafetyRule {
  return { id, type, pattern, description, category };
}

/**
 * Validate a pattern is safe to use (no ReDoS risk)
 */
export function validatePattern(pattern: string): { valid: boolean; error?: string } {
  // Check for common ReDoS patterns
  const dangerousPatterns = [
    /\(\.\*\)\+/,  // (.*)+
    /\(\.\+\)\+/,  // (.+)+
    /\(\[.*\]\+\)\+/, // ([...]+)+
  ];
  
  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      return {
        valid: false,
        error: 'Pattern contains potentially dangerous regex constructs',
      };
    }
  }
  
  // Try to compile the pattern
  try {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    new RegExp(`^${escaped}$`);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid pattern: ${e instanceof Error ? e.message : 'unknown error'}`,
    };
  }
}

/**
 * Format a safety check result for display
 */
export function formatCheckResult(result: SafetyCheckResult): string {
  if (!result.allowed) {
    return `❌ BLOCKED: ${result.reason || 'Action not allowed'}`;
  }
  
  if (result.requiresConfirmation) {
    return `⚠️ CONFIRM: ${result.reason || 'Action requires confirmation'}`;
  }
  
  return `✅ ALLOWED`;
}
