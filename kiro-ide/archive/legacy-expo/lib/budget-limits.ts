/**
 * Hero IDE - Budget and Limits Enforcement System
 * 
 * Hard limits are ENFORCED by the system, not advisory.
 * Failing early is MANDATORY. Failing silently is FORBIDDEN.
 * 
 * Based on Section 9: Budgets, Limits, and Fail-Early Logic
 */

// ════════════════════════════════════════════════════════════════════════════
// LIMIT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface BudgetLimits {
  // Scope limits
  maxFilesInScope: number;
  maxLinesInScope: number;
  maxDirectoriesInScope: number;
  
  // Step limits
  maxStepsPerTask: number;
  maxAgentsParallel: number;
  maxChainedActions: number;
  
  // Cost limits
  maxTokensPerRequest: number;
  maxTokensPerSession: number;
  maxApiCostPerSession: number; // in cents
  
  // Time limits
  maxSecondsPerAction: number;
  maxSecondsPerTask: number;
  maxIdleSeconds: number;
  
  // Context limits
  maxContextSources: number;
  maxContextTokens: number;
  maxContextBreadth: number;
}

export const DEFAULT_LIMITS: BudgetLimits = {
  // Scope
  maxFilesInScope: 50,
  maxLinesInScope: 10000,
  maxDirectoriesInScope: 10,
  
  // Steps
  maxStepsPerTask: 20,
  maxAgentsParallel: 5,
  maxChainedActions: 10,
  
  // Cost
  maxTokensPerRequest: 32000,
  maxTokensPerSession: 500000,
  maxApiCostPerSession: 1000, // $10
  
  // Time
  maxSecondsPerAction: 60,
  maxSecondsPerTask: 600, // 10 minutes
  maxIdleSeconds: 300, // 5 minutes
  
  // Context
  maxContextSources: 20,
  maxContextTokens: 32000,
  maxContextBreadth: 5,
};

// ════════════════════════════════════════════════════════════════════════════
// USAGE TRACKING
// ════════════════════════════════════════════════════════════════════════════

export interface UsageMetrics {
  // Scope usage
  filesInScope: number;
  linesInScope: number;
  directoriesInScope: number;
  
  // Step usage
  stepsCompleted: number;
  activeAgents: number;
  chainedActions: number;
  
  // Cost usage
  tokensUsed: number;
  sessionTokens: number;
  apiCostCents: number;
  
  // Time usage
  currentActionSeconds: number;
  totalTaskSeconds: number;
  idleSeconds: number;
  
  // Context usage
  contextSources: number;
  contextTokens: number;
  contextBreadth: number;
}

export function createInitialUsage(): UsageMetrics {
  return {
    filesInScope: 0,
    linesInScope: 0,
    directoriesInScope: 0,
    stepsCompleted: 0,
    activeAgents: 0,
    chainedActions: 0,
    tokensUsed: 0,
    sessionTokens: 0,
    apiCostCents: 0,
    currentActionSeconds: 0,
    totalTaskSeconds: 0,
    idleSeconds: 0,
    contextSources: 0,
    contextTokens: 0,
    contextBreadth: 0,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// LIMIT VIOLATIONS
// ════════════════════════════════════════════════════════════════════════════

export type LimitType = keyof BudgetLimits;

export interface LimitViolation {
  id: string;
  type: LimitType;
  currentValue: number;
  limitValue: number;
  percentage: number;
  severity: "warning" | "exceeded" | "critical";
  timestamp: Date;
  message: string;
  safeOptions: SafeOption[];
}

export interface SafeOption {
  id: string;
  label: string;
  description: string;
  action: "reduce_scope" | "increase_limit" | "pause" | "cancel" | "checkpoint_and_continue";
  requiresApproval: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// BUDGET STATE
// ════════════════════════════════════════════════════════════════════════════

export interface BudgetState {
  limits: BudgetLimits;
  usage: UsageMetrics;
  violations: LimitViolation[];
  status: "safe" | "warning" | "constrained" | "exceeded";
  lastChecked: Date;
  
  // Enforcement
  isHalted: boolean;
  haltReason?: string;
  haltedAt?: Date;
}

export function createInitialBudgetState(
  customLimits?: Partial<BudgetLimits>
): BudgetState {
  return {
    limits: { ...DEFAULT_LIMITS, ...customLimits },
    usage: createInitialUsage(),
    violations: [],
    status: "safe",
    lastChecked: new Date(),
    isHalted: false,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// LIMIT CHECKING (ENFORCED, NOT ADVISORY)
// ════════════════════════════════════════════════════════════════════════════

export interface CheckResult {
  allowed: boolean;
  budgetState: BudgetState;
  violations: LimitViolation[];
  mustHalt: boolean;
  haltReason?: string;
}

export function checkLimits(state: BudgetState): CheckResult {
  const violations: LimitViolation[] = [];
  let mustHalt = false;
  let haltReason: string | undefined;

  // Check each limit
  const checks: { type: LimitType; current: keyof UsageMetrics }[] = [
    { type: "maxFilesInScope", current: "filesInScope" },
    { type: "maxLinesInScope", current: "linesInScope" },
    { type: "maxDirectoriesInScope", current: "directoriesInScope" },
    { type: "maxStepsPerTask", current: "stepsCompleted" },
    { type: "maxAgentsParallel", current: "activeAgents" },
    { type: "maxChainedActions", current: "chainedActions" },
    { type: "maxTokensPerRequest", current: "tokensUsed" },
    { type: "maxTokensPerSession", current: "sessionTokens" },
    { type: "maxApiCostPerSession", current: "apiCostCents" },
    { type: "maxSecondsPerAction", current: "currentActionSeconds" },
    { type: "maxSecondsPerTask", current: "totalTaskSeconds" },
    { type: "maxContextSources", current: "contextSources" },
    { type: "maxContextTokens", current: "contextTokens" },
    { type: "maxContextBreadth", current: "contextBreadth" },
  ];

  for (const check of checks) {
    const currentValue = state.usage[check.current];
    const limitValue = state.limits[check.type];
    const percentage = (currentValue / limitValue) * 100;

    if (percentage >= 100) {
      // EXCEEDED - MUST HALT
      const violation = createViolation(
        check.type,
        currentValue,
        limitValue,
        percentage,
        "exceeded"
      );
      violations.push(violation);
      mustHalt = true;
      haltReason = violation.message;
    } else if (percentage >= 90) {
      // CRITICAL WARNING
      violations.push(
        createViolation(check.type, currentValue, limitValue, percentage, "critical")
      );
    } else if (percentage >= 75) {
      // WARNING
      violations.push(
        createViolation(check.type, currentValue, limitValue, percentage, "warning")
      );
    }
  }

  // Determine overall status
  let status: BudgetState["status"] = "safe";
  if (violations.some((v) => v.severity === "exceeded")) {
    status = "exceeded";
  } else if (violations.some((v) => v.severity === "critical")) {
    status = "constrained";
  } else if (violations.length > 0) {
    status = "warning";
  }

  const newState: BudgetState = {
    ...state,
    violations: [...state.violations, ...violations],
    status,
    lastChecked: new Date(),
    isHalted: mustHalt || state.isHalted,
    haltReason: haltReason || state.haltReason,
    haltedAt: mustHalt ? new Date() : state.haltedAt,
  };

  return {
    allowed: !mustHalt,
    budgetState: newState,
    violations,
    mustHalt,
    haltReason,
  };
}

function createViolation(
  type: LimitType,
  currentValue: number,
  limitValue: number,
  percentage: number,
  severity: LimitViolation["severity"]
): LimitViolation {
  const messages: Record<LimitType, string> = {
    maxFilesInScope: `Files in scope: ${currentValue}/${limitValue}`,
    maxLinesInScope: `Lines in scope: ${currentValue}/${limitValue}`,
    maxDirectoriesInScope: `Directories in scope: ${currentValue}/${limitValue}`,
    maxStepsPerTask: `Steps completed: ${currentValue}/${limitValue}`,
    maxAgentsParallel: `Active agents: ${currentValue}/${limitValue}`,
    maxChainedActions: `Chained actions: ${currentValue}/${limitValue}`,
    maxTokensPerRequest: `Tokens this request: ${currentValue}/${limitValue}`,
    maxTokensPerSession: `Session tokens: ${currentValue}/${limitValue}`,
    maxApiCostPerSession: `API cost: $${(currentValue / 100).toFixed(2)}/$${(limitValue / 100).toFixed(2)}`,
    maxSecondsPerAction: `Action time: ${currentValue}s/${limitValue}s`,
    maxSecondsPerTask: `Task time: ${currentValue}s/${limitValue}s`,
    maxIdleSeconds: `Idle time: ${currentValue}s/${limitValue}s`,
    maxContextSources: `Context sources: ${currentValue}/${limitValue}`,
    maxContextTokens: `Context tokens: ${currentValue}/${limitValue}`,
    maxContextBreadth: `Context breadth: ${currentValue}/${limitValue}`,
  };

  return {
    id: generateViolationId(),
    type,
    currentValue,
    limitValue,
    percentage,
    severity,
    timestamp: new Date(),
    message: messages[type],
    safeOptions: generateSafeOptions(type, severity),
  };
}

function generateSafeOptions(
  type: LimitType,
  severity: LimitViolation["severity"]
): SafeOption[] {
  const options: SafeOption[] = [];

  // Always offer pause
  options.push({
    id: "pause",
    label: "Pause",
    description: "Pause execution and wait for guidance",
    action: "pause",
    requiresApproval: false,
  });

  // Scope-related limits
  if (type.includes("Scope") || type.includes("Context")) {
    options.push({
      id: "reduce_scope",
      label: "Reduce Scope",
      description: "Remove less relevant items from scope",
      action: "reduce_scope",
      requiresApproval: false,
    });
  }

  // Cost/token limits
  if (type.includes("Token") || type.includes("Cost")) {
    options.push({
      id: "increase_limit",
      label: "Increase Budget",
      description: "Request budget increase to continue",
      action: "increase_limit",
      requiresApproval: true,
    });
  }

  // Step limits
  if (type.includes("Step") || type.includes("Action")) {
    options.push({
      id: "checkpoint",
      label: "Checkpoint & Continue",
      description: "Save progress and continue with new budget",
      action: "checkpoint_and_continue",
      requiresApproval: true,
    });
  }

  // Always offer cancel
  options.push({
    id: "cancel",
    label: "Cancel",
    description: "Cancel the current operation",
    action: "cancel",
    requiresApproval: false,
  });

  return options;
}

// ════════════════════════════════════════════════════════════════════════════
// USAGE UPDATES
// ════════════════════════════════════════════════════════════════════════════

export function updateUsage(
  state: BudgetState,
  updates: Partial<UsageMetrics>
): CheckResult {
  const newUsage: UsageMetrics = {
    ...state.usage,
    ...updates,
  };

  const updatedState: BudgetState = {
    ...state,
    usage: newUsage,
  };

  // Always check limits after update
  return checkLimits(updatedState);
}

export function incrementUsage(
  state: BudgetState,
  field: keyof UsageMetrics,
  amount: number = 1
): CheckResult {
  return updateUsage(state, {
    [field]: state.usage[field] + amount,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// LIMIT MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

export function updateLimits(
  state: BudgetState,
  updates: Partial<BudgetLimits>
): BudgetState {
  return {
    ...state,
    limits: {
      ...state.limits,
      ...updates,
    },
  };
}

export function resetUsage(state: BudgetState): BudgetState {
  return {
    ...state,
    usage: createInitialUsage(),
    violations: [],
    status: "safe",
    isHalted: false,
    haltReason: undefined,
    haltedAt: undefined,
  };
}

export function resumeFromHalt(
  state: BudgetState,
  resolution: string
): BudgetState {
  if (!state.isHalted) return state;

  return {
    ...state,
    isHalted: false,
    haltReason: undefined,
    violations: state.violations.map((v) =>
      v.severity === "exceeded"
        ? { ...v, severity: "warning" as const }
        : v
    ),
    status: "warning",
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ════════════════════════════════════════════════════════════════════════════

export function getBudgetSummary(state: BudgetState): {
  status: string;
  statusColor: string;
  topConcerns: string[];
  utilizationPercent: number;
} {
  const statusColors: Record<BudgetState["status"], string> = {
    safe: "#22C55E",
    warning: "#F59E0B",
    constrained: "#F97316",
    exceeded: "#EF4444",
  };

  const statusLabels: Record<BudgetState["status"], string> = {
    safe: "Budget Safe",
    warning: "Approaching Limits",
    constrained: "Budget Constrained",
    exceeded: "Budget Exceeded",
  };

  // Calculate overall utilization
  const utilizationChecks = [
    state.usage.sessionTokens / state.limits.maxTokensPerSession,
    state.usage.apiCostCents / state.limits.maxApiCostPerSession,
    state.usage.stepsCompleted / state.limits.maxStepsPerTask,
  ];
  const avgUtilization = utilizationChecks.reduce((a, b) => a + b, 0) / utilizationChecks.length;

  // Get top concerns
  const topConcerns = state.violations
    .filter((v) => !v.severity || v.severity !== "warning")
    .slice(0, 3)
    .map((v) => v.message);

  return {
    status: statusLabels[state.status],
    statusColor: statusColors[state.status],
    topConcerns,
    utilizationPercent: Math.round(avgUtilization * 100),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function generateViolationId(): string {
  return `lim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
