/**
 * Hero IDE - Safe Agentic Behavior System
 * 
 * Implements Section 6: Multi-Step Agent Behavior
 * - Goal/assumptions/stopping conditions declaration
 * - Maximum steps configuration
 * - Per-step re-evaluation
 * - Uncertainty threshold with auto-halt
 * - "Push through" prevention
 */

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type AgentState = 
  | "idle"
  | "planning"
  | "executing"
  | "waiting_approval"
  | "halted"
  | "completed"
  | "failed";

export type HaltReason =
  | "max_steps_reached"
  | "uncertainty_threshold"
  | "scope_expansion"
  | "budget_exceeded"
  | "user_requested"
  | "violation_detected"
  | "goal_invalid"
  | "dependency_failed"
  | "context_changed";

export interface AgentGoal {
  id: string;
  description: string;
  successCriteria: string[];
  assumptions: string[];
  stoppingConditions: string[];
  createdAt: Date;
  validatedAt?: Date;
  invalidatedReason?: string;
}

export interface AgentStep {
  id: string;
  stepNumber: number;
  description: string;
  action: string;
  status: "pending" | "executing" | "completed" | "failed" | "skipped";
  
  // Pre-execution checks
  preChecks: {
    goalStillValid: boolean;
    scopeUnchanged: boolean;
    uncertaintyLevel: number; // 0-100
    budgetRemaining: boolean;
    dependenciesMet: boolean;
  };
  
  // Execution results
  result?: {
    success: boolean;
    output?: string;
    error?: string;
    changesApplied: string[];
    rollbackAvailable: boolean;
  };
  
  // Timing
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface AgentExecution {
  id: string;
  agentType: string;
  goal: AgentGoal;
  state: AgentState;
  
  // Configuration
  maxSteps: number;
  uncertaintyThreshold: number; // 0-100, halt if exceeded
  allowScopeExpansion: boolean;
  requireApprovalForChanges: boolean;
  autoCheckpoint: boolean;
  
  // Progress
  steps: AgentStep[];
  currentStepIndex: number;
  
  // Metrics
  totalTokensUsed: number;
  totalCost: number;
  totalDurationMs: number;
  
  // Halt info
  haltReason?: HaltReason;
  haltDetails?: string;
  
  // Timestamps
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
}

export interface StepEvaluation {
  canProceed: boolean;
  reason?: string;
  uncertaintyLevel: number;
  warnings: string[];
  suggestedAction?: "proceed" | "pause" | "halt" | "rollback";
}

// ════════════════════════════════════════════════════════════════════════════
// HALT CONDITIONS
// ════════════════════════════════════════════════════════════════════════════

export interface HaltCondition {
  id: string;
  name: string;
  description: string;
  check: (execution: AgentExecution, step: AgentStep) => boolean;
  severity: "warning" | "halt";
  autoResume: boolean;
}

export const DEFAULT_HALT_CONDITIONS: HaltCondition[] = [
  {
    id: "max_steps",
    name: "Maximum Steps Reached",
    description: "Agent has reached the configured maximum number of steps",
    check: (exec) => exec.currentStepIndex >= exec.maxSteps,
    severity: "halt",
    autoResume: false,
  },
  {
    id: "high_uncertainty",
    name: "High Uncertainty",
    description: "Uncertainty level exceeds the configured threshold",
    check: (exec, step) => step.preChecks.uncertaintyLevel > exec.uncertaintyThreshold,
    severity: "halt",
    autoResume: false,
  },
  {
    id: "goal_invalid",
    name: "Goal Invalidated",
    description: "The original goal is no longer valid",
    check: (_, step) => !step.preChecks.goalStillValid,
    severity: "halt",
    autoResume: false,
  },
  {
    id: "scope_changed",
    name: "Scope Changed",
    description: "The task scope has expanded beyond original bounds",
    check: (exec, step) => !step.preChecks.scopeUnchanged && !exec.allowScopeExpansion,
    severity: "halt",
    autoResume: false,
  },
  {
    id: "budget_exceeded",
    name: "Budget Exceeded",
    description: "No budget remaining for this operation",
    check: (_, step) => !step.preChecks.budgetRemaining,
    severity: "halt",
    autoResume: false,
  },
  {
    id: "dependencies_failed",
    name: "Dependencies Failed",
    description: "Required dependencies are not met",
    check: (_, step) => !step.preChecks.dependenciesMet,
    severity: "halt",
    autoResume: false,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create a new agent execution
 */
export function createExecution(
  agentType: string,
  goal: AgentGoal,
  config: {
    maxSteps?: number;
    uncertaintyThreshold?: number;
    allowScopeExpansion?: boolean;
    requireApprovalForChanges?: boolean;
    autoCheckpoint?: boolean;
  } = {}
): AgentExecution {
  return {
    id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentType,
    goal,
    state: "idle",
    
    maxSteps: config.maxSteps ?? 10,
    uncertaintyThreshold: config.uncertaintyThreshold ?? 70,
    allowScopeExpansion: config.allowScopeExpansion ?? false,
    requireApprovalForChanges: config.requireApprovalForChanges ?? true,
    autoCheckpoint: config.autoCheckpoint ?? true,
    
    steps: [],
    currentStepIndex: 0,
    
    totalTokensUsed: 0,
    totalCost: 0,
    totalDurationMs: 0,
    
    startedAt: new Date(),
    lastActivityAt: new Date(),
  };
}

/**
 * Evaluate whether the agent can proceed to the next step
 */
export function evaluateStep(
  execution: AgentExecution,
  step: AgentStep,
  haltConditions: HaltCondition[] = DEFAULT_HALT_CONDITIONS
): StepEvaluation {
  const warnings: string[] = [];
  let canProceed = true;
  let reason: string | undefined;
  let suggestedAction: StepEvaluation["suggestedAction"] = "proceed";
  
  // Check all halt conditions
  for (const condition of haltConditions) {
    if (condition.check(execution, step)) {
      if (condition.severity === "halt") {
        canProceed = false;
        reason = condition.description;
        suggestedAction = "halt";
        break;
      } else {
        warnings.push(condition.description);
      }
    }
  }
  
  // Additional checks
  const uncertaintyLevel = step.preChecks.uncertaintyLevel;
  
  // Warning zone (50-70%)
  if (uncertaintyLevel > 50 && uncertaintyLevel <= execution.uncertaintyThreshold) {
    warnings.push(`Uncertainty at ${uncertaintyLevel}% - approaching threshold`);
    suggestedAction = "pause";
  }
  
  // Check for "push through" behavior
  if (execution.steps.length >= 2) {
    const recentSteps = execution.steps.slice(-2);
    const recentFailures = recentSteps.filter(s => s.result?.success === false);
    if (recentFailures.length >= 2) {
      canProceed = false;
      reason = "Multiple consecutive failures detected - refusing to push through";
      suggestedAction = "halt";
    }
  }
  
  return {
    canProceed,
    reason,
    uncertaintyLevel,
    warnings,
    suggestedAction,
  };
}

/**
 * Halt an execution
 */
export function haltExecution(
  execution: AgentExecution,
  reason: HaltReason,
  details?: string
): AgentExecution {
  return {
    ...execution,
    state: "halted",
    haltReason: reason,
    haltDetails: details,
    lastActivityAt: new Date(),
  };
}

/**
 * Resume a halted execution
 */
export function resumeExecution(
  execution: AgentExecution,
  resolution: string
): AgentExecution {
  if (execution.state !== "halted") {
    throw new Error("Can only resume halted executions");
  }
  
  return {
    ...execution,
    state: "executing",
    haltReason: undefined,
    haltDetails: undefined,
    lastActivityAt: new Date(),
    // Add a note about the resolution
    steps: [
      ...execution.steps,
      {
        id: `step_resume_${Date.now()}`,
        stepNumber: execution.steps.length + 1,
        description: `Resumed after halt: ${resolution}`,
        action: "resume",
        status: "completed",
        preChecks: {
          goalStillValid: true,
          scopeUnchanged: true,
          uncertaintyLevel: 0,
          budgetRemaining: true,
          dependenciesMet: true,
        },
        result: {
          success: true,
          output: `Execution resumed with resolution: ${resolution}`,
          changesApplied: [],
          rollbackAvailable: false,
        },
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 0,
      },
    ],
  };
}

/**
 * Complete an execution
 */
export function completeExecution(
  execution: AgentExecution,
  success: boolean,
  summary?: string
): AgentExecution {
  return {
    ...execution,
    state: success ? "completed" : "failed",
    completedAt: new Date(),
    lastActivityAt: new Date(),
    haltDetails: summary,
  };
}

/**
 * Add a step to an execution
 */
export function addStep(
  execution: AgentExecution,
  description: string,
  action: string
): { execution: AgentExecution; step: AgentStep } {
  const step: AgentStep = {
    id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    stepNumber: execution.steps.length + 1,
    description,
    action,
    status: "pending",
    preChecks: {
      goalStillValid: true,
      scopeUnchanged: true,
      uncertaintyLevel: 0,
      budgetRemaining: true,
      dependenciesMet: true,
    },
  };
  
  return {
    execution: {
      ...execution,
      steps: [...execution.steps, step],
      lastActivityAt: new Date(),
    },
    step,
  };
}

/**
 * Update step pre-checks
 */
export function updateStepPreChecks(
  execution: AgentExecution,
  stepId: string,
  preChecks: Partial<AgentStep["preChecks"]>
): AgentExecution {
  return {
    ...execution,
    steps: execution.steps.map((s) =>
      s.id === stepId
        ? { ...s, preChecks: { ...s.preChecks, ...preChecks } }
        : s
    ),
    lastActivityAt: new Date(),
  };
}

/**
 * Complete a step
 */
export function completeStep(
  execution: AgentExecution,
  stepId: string,
  result: AgentStep["result"]
): AgentExecution {
  const now = new Date();
  return {
    ...execution,
    steps: execution.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            status: result?.success ? "completed" : "failed",
            result,
            completedAt: now,
            durationMs: s.startedAt ? now.getTime() - s.startedAt.getTime() : 0,
          }
        : s
    ),
    currentStepIndex: execution.currentStepIndex + 1,
    lastActivityAt: now,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// UNCERTAINTY CALCULATION
// ════════════════════════════════════════════════════════════════════════════

export interface UncertaintyFactors {
  ambiguousGoal: number; // 0-100
  missingContext: number; // 0-100
  conflictingInstructions: number; // 0-100
  novelSituation: number; // 0-100
  previousFailures: number; // 0-100
  scopeCreep: number; // 0-100
}

export function calculateUncertainty(factors: UncertaintyFactors): number {
  const weights = {
    ambiguousGoal: 0.25,
    missingContext: 0.20,
    conflictingInstructions: 0.20,
    novelSituation: 0.15,
    previousFailures: 0.10,
    scopeCreep: 0.10,
  };
  
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    total += (factors[key as keyof UncertaintyFactors] || 0) * weight;
  }
  
  return Math.min(100, Math.round(total));
}

// ════════════════════════════════════════════════════════════════════════════
// SAFE OPTIONS
// ════════════════════════════════════════════════════════════════════════════

export interface SafeOption {
  id: string;
  label: string;
  description: string;
  action: "rollback" | "pause" | "narrow_scope" | "request_clarification" | "abort";
  risk: "low" | "medium" | "high";
}

export function getSafeOptions(
  execution: AgentExecution,
  haltReason: HaltReason
): SafeOption[] {
  const options: SafeOption[] = [];
  
  // Always offer rollback if available
  const lastStep = execution.steps[execution.steps.length - 1];
  if (lastStep?.result?.rollbackAvailable) {
    options.push({
      id: "rollback",
      label: "Rollback Changes",
      description: "Undo all changes made in this execution",
      action: "rollback",
      risk: "low",
    });
  }
  
  // Reason-specific options
  switch (haltReason) {
    case "uncertainty_threshold":
      options.push({
        id: "clarify",
        label: "Request Clarification",
        description: "Ask for more specific instructions",
        action: "request_clarification",
        risk: "low",
      });
      options.push({
        id: "narrow",
        label: "Narrow Scope",
        description: "Continue with a more limited scope",
        action: "narrow_scope",
        risk: "medium",
      });
      break;
      
    case "scope_expansion":
      options.push({
        id: "narrow",
        label: "Stick to Original Scope",
        description: "Continue without expanding scope",
        action: "narrow_scope",
        risk: "low",
      });
      break;
      
    case "max_steps_reached":
      options.push({
        id: "pause",
        label: "Pause and Review",
        description: "Review progress before deciding next steps",
        action: "pause",
        risk: "low",
      });
      break;
      
    case "budget_exceeded":
      options.push({
        id: "abort",
        label: "Abort Execution",
        description: "Stop execution to prevent further cost",
        action: "abort",
        risk: "low",
      });
      break;
  }
  
  // Always offer abort as last resort
  if (!options.find(o => o.action === "abort")) {
    options.push({
      id: "abort",
      label: "Abort Execution",
      description: "Stop execution completely",
      action: "abort",
      risk: "low",
    });
  }
  
  return options;
}

// ════════════════════════════════════════════════════════════════════════════
// EXECUTION SUMMARY
// ════════════════════════════════════════════════════════════════════════════

export interface ExecutionSummary {
  id: string;
  agentType: string;
  goalDescription: string;
  state: AgentState;
  
  stepsCompleted: number;
  stepsTotal: number;
  successRate: number;
  
  totalDuration: string;
  totalCost: string;
  
  changesApplied: string[];
  warnings: string[];
  
  haltInfo?: {
    reason: HaltReason;
    details?: string;
    safeOptions: SafeOption[];
  };
}

export function getExecutionSummary(execution: AgentExecution): ExecutionSummary {
  const completedSteps = execution.steps.filter(s => s.status === "completed");
  const successfulSteps = completedSteps.filter(s => s.result?.success);
  
  const changesApplied = execution.steps
    .flatMap(s => s.result?.changesApplied || []);
  
  const warnings = execution.steps
    .filter(s => s.preChecks.uncertaintyLevel > 50)
    .map(s => `Step ${s.stepNumber}: High uncertainty (${s.preChecks.uncertaintyLevel}%)`);
  
  return {
    id: execution.id,
    agentType: execution.agentType,
    goalDescription: execution.goal.description,
    state: execution.state,
    
    stepsCompleted: completedSteps.length,
    stepsTotal: execution.steps.length,
    successRate: completedSteps.length > 0
      ? Math.round((successfulSteps.length / completedSteps.length) * 100)
      : 0,
    
    totalDuration: formatDuration(execution.totalDurationMs),
    totalCost: `$${(execution.totalCost / 100).toFixed(4)}`,
    
    changesApplied,
    warnings,
    
    haltInfo: execution.haltReason
      ? {
          reason: execution.haltReason,
          details: execution.haltDetails,
          safeOptions: getSafeOptions(execution, execution.haltReason),
        }
      : undefined,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
