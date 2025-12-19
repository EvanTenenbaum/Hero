/**
 * Hero IDE - Explicit State Machine
 * 
 * This module implements structural compliance enforcement.
 * Illegal actions are IMPOSSIBLE, not merely discouraged.
 * 
 * Based on Section 3: Explicit State Machine (Mandatory)
 */

// ════════════════════════════════════════════════════════════════════════════
// OPERATIONAL STATES
// ════════════════════════════════════════════════════════════════════════════

export type ScopeState = "unscoped" | "scoped";
export type ActionState = "read-only" | "propose" | "apply";
export type AgenticState = "non-agentic" | "agentic";
export type CheckpointState = "uncheckpointed" | "checkpointed";
export type BudgetState = "budget-safe" | "budget-constrained" | "budget-exceeded";

export interface SystemState {
  scope: ScopeState;
  action: ActionState;
  agentic: AgenticState;
  checkpoint: CheckpointState;
  budget: BudgetState;
  
  // Current context
  currentProjectId: string | null;
  currentFileId: string | null;
  
  // Autonomy mode (Section 4)
  autonomyMode: AutonomyMode;
  
  // Tracking
  lastStateChange: Date;
  stateHistory: StateTransition[];
}

// ════════════════════════════════════════════════════════════════════════════
// AUTONOMY MODES (CONTRACTS, NOT SUGGESTIONS)
// ════════════════════════════════════════════════════════════════════════════

export type AutonomyMode = "directed" | "collaborative" | "agentic";

export interface AutonomyModeContract {
  mode: AutonomyMode;
  allowedScope: string[];
  allowedActions: ActionType[];
  requiredDisclosures: string[];
  requiredApprovals: string[];
  rollbackGuarantees: string[];
  
  // Behavioral constraints
  canExpandScope: boolean;
  canChainActions: boolean;
  requiresApprovalPerAction: boolean;
  autoCheckpoint: boolean;
  mustLogEveryStep: boolean;
  haltOnUncertainty: boolean;
}

export const AUTONOMY_CONTRACTS: Record<AutonomyMode, AutonomyModeContract> = {
  directed: {
    mode: "directed",
    allowedScope: ["current_file", "selected_text"],
    allowedActions: ["read", "explain", "suggest"],
    requiredDisclosures: ["intent", "scope"],
    requiredApprovals: ["any_change", "any_action"],
    rollbackGuarantees: ["full_undo"],
    canExpandScope: false,
    canChainActions: false,
    requiresApprovalPerAction: true,
    autoCheckpoint: false,
    mustLogEveryStep: false,
    haltOnUncertainty: true,
  },
  collaborative: {
    mode: "collaborative",
    allowedScope: ["current_file", "related_files", "project_structure"],
    allowedActions: ["read", "explain", "suggest", "propose_change", "propose_scope_expansion"],
    requiredDisclosures: ["intent", "scope", "risk_level", "affected_files"],
    requiredApprovals: ["scope_expansion", "multi_file_change", "destructive_action"],
    rollbackGuarantees: ["full_undo", "checkpoint_restore"],
    canExpandScope: true, // but must pause for approval
    canChainActions: false, // must confirm each step
    requiresApprovalPerAction: false,
    autoCheckpoint: true,
    mustLogEveryStep: true,
    haltOnUncertainty: true,
  },
  agentic: {
    mode: "agentic",
    allowedScope: ["project_wide"],
    allowedActions: ["read", "explain", "suggest", "propose_change", "apply_change", "chain_actions"],
    requiredDisclosures: ["goal", "assumptions", "stopping_conditions", "max_steps", "uncertainty_level"],
    requiredApprovals: ["mode_entry", "budget_increase", "scope_beyond_project"],
    rollbackGuarantees: ["full_undo", "checkpoint_restore", "step_by_step_rollback"],
    canExpandScope: true,
    canChainActions: true,
    requiresApprovalPerAction: false,
    autoCheckpoint: true,
    mustLogEveryStep: true,
    haltOnUncertainty: true,
  },
};

// ════════════════════════════════════════════════════════════════════════════
// ACTION TYPES AND PERMISSIONS
// ════════════════════════════════════════════════════════════════════════════

export type ActionType =
  | "read"
  | "explain"
  | "suggest"
  | "propose_change"
  | "propose_scope_expansion"
  | "apply_change"
  | "chain_actions"
  | "spawn_agent"
  | "kill_agent"
  | "modify_roadmap"
  | "create_checkpoint"
  | "rollback";

export interface ActionPermission {
  action: ActionType;
  requiredStates: Partial<SystemState>;
  forbiddenStates: Partial<SystemState>;
  requiredApprovals: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
}

export const ACTION_PERMISSIONS: ActionPermission[] = [
  {
    action: "read",
    requiredStates: {},
    forbiddenStates: {},
    requiredApprovals: [],
    riskLevel: "low",
  },
  {
    action: "explain",
    requiredStates: {},
    forbiddenStates: {},
    requiredApprovals: [],
    riskLevel: "low",
  },
  {
    action: "suggest",
    requiredStates: { scope: "scoped" },
    forbiddenStates: {},
    requiredApprovals: [],
    riskLevel: "low",
  },
  {
    action: "propose_change",
    requiredStates: { scope: "scoped", action: "propose" },
    forbiddenStates: { budget: "budget-exceeded" },
    requiredApprovals: [],
    riskLevel: "medium",
  },
  {
    action: "apply_change",
    requiredStates: { scope: "scoped", action: "apply", checkpoint: "checkpointed" },
    forbiddenStates: { budget: "budget-exceeded" },
    requiredApprovals: ["user_approval"],
    riskLevel: "high",
  },
  {
    action: "spawn_agent",
    requiredStates: { agentic: "agentic", checkpoint: "checkpointed" },
    forbiddenStates: { budget: "budget-exceeded" },
    requiredApprovals: ["user_approval"],
    riskLevel: "high",
  },
  {
    action: "chain_actions",
    requiredStates: { agentic: "agentic", checkpoint: "checkpointed" },
    forbiddenStates: { budget: "budget-exceeded" },
    requiredApprovals: ["user_approval"],
    riskLevel: "critical",
  },
];

// ════════════════════════════════════════════════════════════════════════════
// STATE TRANSITIONS
// ════════════════════════════════════════════════════════════════════════════

export interface StateTransition {
  id: string;
  timestamp: Date;
  fromState: Partial<SystemState>;
  toState: Partial<SystemState>;
  trigger: string;
  requiresAcknowledgment: boolean;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
}

export interface TransitionResult {
  success: boolean;
  newState?: SystemState;
  error?: string;
  requiresAcknowledgment?: boolean;
  pendingTransition?: StateTransition;
}

// ════════════════════════════════════════════════════════════════════════════
// STATE MACHINE IMPLEMENTATION
// ════════════════════════════════════════════════════════════════════════════

export function createInitialState(): SystemState {
  return {
    scope: "unscoped",
    action: "read-only",
    agentic: "non-agentic",
    checkpoint: "uncheckpointed",
    budget: "budget-safe",
    currentProjectId: null,
    currentFileId: null,
    autonomyMode: "directed",
    lastStateChange: new Date(),
    stateHistory: [],
  };
}

export function canPerformAction(state: SystemState, action: ActionType): {
  allowed: boolean;
  reason?: string;
  requiredApprovals?: string[];
} {
  const permission = ACTION_PERMISSIONS.find((p) => p.action === action);
  if (!permission) {
    return { allowed: false, reason: `Unknown action: ${action}` };
  }

  // Check autonomy mode contract
  const contract = AUTONOMY_CONTRACTS[state.autonomyMode];
  if (!contract.allowedActions.includes(action)) {
    return {
      allowed: false,
      reason: `Action "${action}" not allowed in ${state.autonomyMode} mode`,
    };
  }

  // Check required states
  for (const [key, value] of Object.entries(permission.requiredStates)) {
    if (state[key as keyof SystemState] !== value) {
      return {
        allowed: false,
        reason: `Required state: ${key} must be "${value}" (current: "${state[key as keyof SystemState]}")`,
      };
    }
  }

  // Check forbidden states
  for (const [key, value] of Object.entries(permission.forbiddenStates)) {
    if (state[key as keyof SystemState] === value) {
      return {
        allowed: false,
        reason: `Forbidden state: ${key} cannot be "${value}"`,
      };
    }
  }

  // Check budget
  if (state.budget === "budget-exceeded" && permission.riskLevel !== "low") {
    return {
      allowed: false,
      reason: "Budget exceeded. Only read operations allowed.",
    };
  }

  return {
    allowed: true,
    requiredApprovals: permission.requiredApprovals,
  };
}

export function transitionState(
  currentState: SystemState,
  changes: Partial<SystemState>,
  trigger: string
): TransitionResult {
  // Validate transition
  const validation = validateTransition(currentState, changes);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  // Determine if acknowledgment is required
  const requiresAck = transitionRequiresAcknowledgment(currentState, changes);

  const transition: StateTransition = {
    id: generateId(),
    timestamp: new Date(),
    fromState: extractChangedFields(currentState, changes),
    toState: changes,
    trigger,
    requiresAcknowledgment: requiresAck,
    acknowledged: !requiresAck,
    acknowledgedAt: requiresAck ? null : new Date(),
  };

  if (requiresAck) {
    return {
      success: false,
      requiresAcknowledgment: true,
      pendingTransition: transition,
    };
  }

  const newState: SystemState = {
    ...currentState,
    ...changes,
    lastStateChange: new Date(),
    stateHistory: [...currentState.stateHistory, transition],
  };

  return { success: true, newState };
}

export function acknowledgeTransition(
  currentState: SystemState,
  transition: StateTransition
): TransitionResult {
  const acknowledgedTransition: StateTransition = {
    ...transition,
    acknowledged: true,
    acknowledgedAt: new Date(),
  };

  const newState: SystemState = {
    ...currentState,
    ...transition.toState,
    lastStateChange: new Date(),
    stateHistory: [...currentState.stateHistory, acknowledgedTransition],
  };

  return { success: true, newState };
}

// ════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ════════════════════════════════════════════════════════════════════════════

function validateTransition(
  current: SystemState,
  changes: Partial<SystemState>
): { valid: boolean; reason?: string } {
  // Cannot go to agentic mode without checkpoint
  if (changes.agentic === "agentic" && current.checkpoint !== "checkpointed") {
    return {
      valid: false,
      reason: "Cannot enter agentic mode without a checkpoint. Create a checkpoint first.",
    };
  }

  // Cannot apply changes without being scoped
  if (changes.action === "apply" && current.scope !== "scoped") {
    return {
      valid: false,
      reason: "Cannot apply changes without a defined scope.",
    };
  }

  // Cannot exceed budget and continue
  if (current.budget === "budget-exceeded" && changes.action === "apply") {
    return {
      valid: false,
      reason: "Budget exceeded. Cannot apply changes until budget is increased or scope is reduced.",
    };
  }

  return { valid: true };
}

function transitionRequiresAcknowledgment(
  current: SystemState,
  changes: Partial<SystemState>
): boolean {
  // Mode changes always require acknowledgment
  if (changes.autonomyMode && changes.autonomyMode !== current.autonomyMode) {
    return true;
  }

  // Entering agentic state requires acknowledgment
  if (changes.agentic === "agentic" && current.agentic !== "agentic") {
    return true;
  }

  // Moving from read-only to apply requires acknowledgment
  if (changes.action === "apply" && current.action === "read-only") {
    return true;
  }

  return false;
}

function extractChangedFields(
  current: SystemState,
  changes: Partial<SystemState>
): Partial<SystemState> {
  const changed: Partial<SystemState> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (current[key as keyof SystemState] !== value) {
      (changed as any)[key] = current[key as keyof SystemState];
    }
  }
  return changed;
}

function generateId(): string {
  return `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ════════════════════════════════════════════════════════════════════════════
// STATE DISPLAY HELPERS
// ════════════════════════════════════════════════════════════════════════════

export function getStateDisplayInfo(state: SystemState): {
  label: string;
  color: string;
  icon: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (state.checkpoint === "uncheckpointed") {
    warnings.push("No checkpoint - changes cannot be rolled back");
  }
  if (state.budget === "budget-constrained") {
    warnings.push("Approaching budget limit");
  }
  if (state.budget === "budget-exceeded") {
    warnings.push("Budget exceeded - only read operations allowed");
  }

  const modeLabels: Record<AutonomyMode, string> = {
    directed: "Directed Mode",
    collaborative: "Collaborative Mode",
    agentic: "Agentic Mode",
  };

  const modeColors: Record<AutonomyMode, string> = {
    directed: "#22C55E", // Green - safest
    collaborative: "#F59E0B", // Amber - moderate
    agentic: "#EF4444", // Red - highest autonomy
  };

  return {
    label: modeLabels[state.autonomyMode],
    color: modeColors[state.autonomyMode],
    icon: state.agentic === "agentic" ? "cpu.fill" : "person.fill",
    warnings,
  };
}
