/**
 * HERO Hooks Service
 *
 * KIRO-inspired hooks system for agent lifecycle events.
 * Hooks are defined in .hero/hooks/ directory or in database.
 *
 * Hook Types:
 * - pre_execution: Run before agent starts a task
 * - post_execution: Run after agent completes a task
 * - on_file_change: Run when agent modifies a file
 * - on_error: Run when agent encounters an error
 * - on_approval_required: Run when agent needs user approval
 */

import { z } from 'zod';
import { logger } from '../_core/logger';
import { invokeLLM, Message } from '../_core/llm';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type HookType =
  | 'pre_execution'
  | 'post_execution'
  | 'on_file_change'
  | 'on_error'
  | 'on_approval_required'
  | 'on_checkpoint';

export type HookActionType =
  | 'validate'      // Run validation and potentially block
  | 'transform'     // Transform the input/output
  | 'notify'        // Send notification (no blocking)
  | 'log'           // Just log (no blocking)
  | 'execute'       // Run custom script/LLM prompt
  | 'guard';        // Safety guard (can block)

export interface Hook {
  id: string;
  name: string;
  description?: string;
  type: HookType;
  actionType: HookActionType;
  enabled: boolean;
  priority: number;        // Lower = higher priority (0-100)
  condition?: HookCondition;
  action: HookAction;
  projectId?: number;      // If set, only applies to this project
  createdAt: Date;
  updatedAt: Date;
}

export interface HookCondition {
  agentTypes?: string[];           // Only run for these agent types
  filePatterns?: string[];         // Only run for files matching these patterns
  messagePatterns?: string[];      // Only run for messages matching these patterns
  minConfidence?: number;          // Only run when confidence < this threshold
}

export interface HookAction {
  // For 'validate' and 'guard' action types
  validationPrompt?: string;       // LLM prompt for validation
  blockedMessage?: string;         // Message to show if blocked

  // For 'transform' action type
  transformPrompt?: string;        // LLM prompt for transformation

  // For 'notify' action type
  notifyEndpoint?: string;         // Webhook URL
  notifyTemplate?: string;         // Message template

  // For 'execute' action type
  executeScript?: string;          // Script to run
  executePrompt?: string;          // LLM prompt to run

  // For 'log' action type
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logTemplate?: string;
}

export interface HookContext {
  userId: number;
  projectId: number;
  agentType: string;
  executionId?: string;
  message?: string;
  files?: string[];
  error?: Error;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface HookResult {
  hookId: string;
  hookName: string;
  success: boolean;
  blocked?: boolean;
  blockedReason?: string;
  transformedData?: unknown;
  logs?: string[];
  error?: string;
  durationMs: number;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK REGISTRY
// ════════════════════════════════════════════════════════════════════════════

// In-memory hook registry
const hookRegistry = new Map<string, Hook>();

// Default hooks (built-in safety guards)
const DEFAULT_HOOKS: Omit<Hook, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'security_guard',
    description: 'Prevents execution of potentially dangerous operations',
    type: 'pre_execution',
    actionType: 'guard',
    enabled: true,
    priority: 0, // Highest priority
    action: {
      validationPrompt: `Analyze the following request for security concerns:
---
{{message}}
---
Check for:
1. SQL injection attempts
2. Command injection attempts
3. Path traversal attempts
4. Requests to access sensitive files (.env, credentials, etc.)
5. Requests to delete critical files
6. Requests to make destructive git operations

Respond with JSON: {"safe": true/false, "reason": "explanation if unsafe"}`,
      blockedMessage: 'Request blocked due to security concerns',
    },
  },
  {
    name: 'force_push_guard',
    description: 'Prevents force push to protected branches',
    type: 'on_file_change',
    actionType: 'guard',
    enabled: true,
    priority: 1,
    condition: {
      messagePatterns: ['force.*push', 'push.*-f', 'push.*--force'],
    },
    action: {
      blockedMessage: 'Force push is not allowed. Please use regular push.',
    },
  },
  {
    name: 'large_file_warning',
    description: 'Warns when modifying large files',
    type: 'on_file_change',
    actionType: 'notify',
    enabled: true,
    priority: 50,
    action: {
      logLevel: 'warn',
      logTemplate: 'Large file modification detected: {{file}}',
    },
  },
  {
    name: 'execution_logger',
    description: 'Logs all agent executions',
    type: 'post_execution',
    actionType: 'log',
    enabled: true,
    priority: 100, // Lowest priority
    action: {
      logLevel: 'info',
      logTemplate: 'Agent {{agentType}} completed execution in {{durationMs}}ms',
    },
  },
];

// Initialize default hooks
DEFAULT_HOOKS.forEach((hook, index) => {
  const fullHook: Hook = {
    ...hook,
    id: `default-hook-${index}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  hookRegistry.set(fullHook.id, fullHook);
});

// ════════════════════════════════════════════════════════════════════════════
// HOOK EXECUTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check if a hook's condition matches the context.
 */
function matchesCondition(hook: Hook, context: HookContext): boolean {
  if (!hook.condition) return true;

  const { agentTypes, filePatterns, messagePatterns, minConfidence } = hook.condition;

  // Check agent type
  if (agentTypes && agentTypes.length > 0) {
    if (!agentTypes.includes(context.agentType)) return false;
  }

  // Check file patterns
  if (filePatterns && filePatterns.length > 0 && context.files) {
    const hasMatch = context.files.some(file =>
      filePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(file);
      })
    );
    if (!hasMatch) return false;
  }

  // Check message patterns
  if (messagePatterns && messagePatterns.length > 0 && context.message) {
    const hasMatch = messagePatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(context.message!);
    });
    if (!hasMatch) return false;
  }

  // Check confidence threshold
  if (minConfidence !== undefined && context.confidence !== undefined) {
    if (context.confidence >= minConfidence) return false;
  }

  return true;
}

/**
 * Execute a single hook.
 */
async function executeHook(hook: Hook, context: HookContext): Promise<HookResult> {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    // Check condition
    if (!matchesCondition(hook, context)) {
      return {
        hookId: hook.id,
        hookName: hook.name,
        success: true,
        durationMs: Date.now() - startTime,
        logs: ['Condition not matched, skipping'],
      };
    }

    switch (hook.actionType) {
      case 'validate':
      case 'guard': {
        if (hook.action.validationPrompt) {
          // Run LLM validation
          const prompt = hook.action.validationPrompt
            .replace('{{message}}', context.message || '')
            .replace('{{files}}', (context.files || []).join(', '));

          const response = await invokeLLM({
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 500,
          });

          const content = response.choices[0]?.message?.content;
          if (typeof content === 'string') {
            try {
              const result = JSON.parse(content);
              if (!result.safe) {
                return {
                  hookId: hook.id,
                  hookName: hook.name,
                  success: true,
                  blocked: true,
                  blockedReason: result.reason || hook.action.blockedMessage,
                  durationMs: Date.now() - startTime,
                  logs: [`Validation failed: ${result.reason}`],
                };
              }
            } catch {
              logs.push('Could not parse LLM validation response');
            }
          }
        }
        break;
      }

      case 'transform': {
        if (hook.action.transformPrompt && context.message) {
          const prompt = hook.action.transformPrompt
            .replace('{{message}}', context.message)
            .replace('{{files}}', (context.files || []).join(', '));

          const response = await invokeLLM({
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 2000,
          });

          const content = response.choices[0]?.message?.content;
          return {
            hookId: hook.id,
            hookName: hook.name,
            success: true,
            transformedData: content,
            durationMs: Date.now() - startTime,
            logs,
          };
        }
        break;
      }

      case 'notify': {
        // Log for now (in production, would send webhook)
        const message = (hook.action.notifyTemplate || 'Notification from hook: {{hookName}}')
          .replace('{{hookName}}', hook.name)
          .replace('{{agentType}}', context.agentType)
          .replace('{{executionId}}', context.executionId || 'unknown');
        logs.push(`Notification: ${message}`);
        break;
      }

      case 'log': {
        const message = (hook.action.logTemplate || 'Hook {{hookName}} executed')
          .replace('{{hookName}}', hook.name)
          .replace('{{agentType}}', context.agentType)
          .replace('{{durationMs}}', String(Date.now() - startTime))
          .replace('{{file}}', (context.files || [])[0] || 'unknown');

        switch (hook.action.logLevel) {
          case 'debug': logger.debug({}, message); break;
          case 'info': logger.info({}, message); break;
          case 'warn': logger.warn({}, message); break;
          case 'error': logger.error({}, message); break;
        }
        logs.push(message);
        break;
      }

      case 'execute': {
        if (hook.action.executePrompt) {
          const prompt = hook.action.executePrompt
            .replace('{{message}}', context.message || '')
            .replace('{{files}}', (context.files || []).join(', '));

          const response = await invokeLLM({
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 2000,
          });

          logs.push(`Executed LLM prompt, response length: ${response.choices[0]?.message?.content?.length || 0}`);
        }
        break;
      }
    }

    return {
      hookId: hook.id,
      hookName: hook.name,
      success: true,
      durationMs: Date.now() - startTime,
      logs,
    };

  } catch (error) {
    return {
      hookId: hook.id,
      hookName: hook.name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      logs,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

/**
 * Run all hooks of a given type for a context.
 */
export async function runHooks(
  hookType: HookType,
  context: HookContext
): Promise<{ results: HookResult[]; blocked: boolean; blockedReason?: string }> {
  const hooks = Array.from(hookRegistry.values())
    .filter(hook => hook.type === hookType && hook.enabled)
    .filter(hook => !hook.projectId || hook.projectId === context.projectId)
    .sort((a, b) => a.priority - b.priority);

  if (hooks.length === 0) {
    return { results: [], blocked: false };
  }

  const results: HookResult[] = [];

  for (const hook of hooks) {
    const result = await executeHook(hook, context);
    results.push(result);

    // If a guard hook blocks, stop processing
    if (result.blocked) {
      logger.warn({ hookId: hook.id, hookName: hook.name }, 'Hook blocked execution');
      return { results, blocked: true, blockedReason: result.blockedReason };
    }
  }

  return { results, blocked: false };
}

/**
 * Register a new hook.
 */
export function registerHook(hook: Omit<Hook, 'id' | 'createdAt' | 'updatedAt'>): Hook {
  const id = `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullHook: Hook = {
    ...hook,
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  hookRegistry.set(id, fullHook);
  return fullHook;
}

/**
 * Update an existing hook.
 */
export function updateHook(id: string, updates: Partial<Omit<Hook, 'id' | 'createdAt'>>): Hook | null {
  const hook = hookRegistry.get(id);
  if (!hook) return null;

  const updated: Hook = {
    ...hook,
    ...updates,
    updatedAt: new Date(),
  };
  hookRegistry.set(id, updated);
  return updated;
}

/**
 * Delete a hook.
 */
export function deleteHook(id: string): boolean {
  return hookRegistry.delete(id);
}

/**
 * Get a hook by ID.
 */
export function getHook(id: string): Hook | undefined {
  return hookRegistry.get(id);
}

/**
 * List all hooks.
 */
export function listHooks(projectId?: number): Hook[] {
  return Array.from(hookRegistry.values())
    .filter(hook => !projectId || !hook.projectId || hook.projectId === projectId)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * List hooks by type.
 */
export function listHooksByType(hookType: HookType, projectId?: number): Hook[] {
  return listHooks(projectId).filter(hook => hook.type === hookType);
}
