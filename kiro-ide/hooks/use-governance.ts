/**
 * KIRO IDE - Unified Governance Hook
 * 
 * This hook provides a single interface to all compliance systems:
 * - State Machine
 * - Context Governance
 * - Change Lifecycle
 * - Budget Limits
 * - Violation Handling
 * 
 * Compliance is ENFORCED BY STRUCTURE, not memory.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  SystemState,
  AutonomyMode,
  ActionType,
  createInitialState,
  canPerformAction,
  transitionState,
  acknowledgeTransition,
  getStateDisplayInfo,
  AUTONOMY_CONTRACTS,
  StateTransition,
} from "@/lib/state-machine";

import {
  ContextState,
  ContextSource,
  createInitialContextState,
  addContextSource,
  removeContextSource,
  inspectContext,
  analyzeAmbiguity,
  ContextInspection,
  AmbiguityAnalysis,
} from "@/lib/context-governance";

import {
  ChangeRequest,
  ChangeStep,
  createChangeRequest,
  completeStep,
  cancelChange,
  rollbackChange,
  getStepProgress,
  STEP_LABELS,
} from "@/lib/change-lifecycle";

import {
  BudgetState,
  BudgetLimits,
  UsageMetrics,
  createInitialBudgetState,
  checkLimits,
  updateUsage,
  incrementUsage,
  updateLimits,
  resetUsage,
  getBudgetSummary,
} from "@/lib/budget-limits";

import {
  ViolationState,
  Violation,
  ViolationType,
  createInitialViolationState,
  detectViolation,
  respondToViolation,
  auditViolations,
} from "@/lib/violation-handler";

const GOVERNANCE_KEY = "hero_governance_state";

// ════════════════════════════════════════════════════════════════════════════
// UNIFIED GOVERNANCE STATE
// ════════════════════════════════════════════════════════════════════════════

export interface GovernanceState {
  system: SystemState;
  context: ContextState;
  budget: BudgetState;
  violations: ViolationState;
  activeChanges: ChangeRequest[];
  
  // Global halt state
  isHalted: boolean;
  haltReasons: string[];
  
  // Pending acknowledgments
  pendingAcknowledgments: StateTransition[];
}

function createInitialGovernanceState(): GovernanceState {
  return {
    system: createInitialState(),
    context: createInitialContextState(),
    budget: createInitialBudgetState(),
    violations: createInitialViolationState(),
    activeChanges: [],
    isHalted: false,
    haltReasons: [],
    pendingAcknowledgments: [],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// GOVERNANCE HOOK
// ════════════════════════════════════════════════════════════════════════════

export function useGovernance() {
  const [state, setState] = useState<GovernanceState>(createInitialGovernanceState);
  const [loading, setLoading] = useState(true);

  // Load persisted state
  useEffect(() => {
    loadState();
  }, []);

  const loadState = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(GOVERNANCE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Restore dates
        parsed.system.lastStateChange = new Date(parsed.system.lastStateChange);
        setState(parsed);
      }
    } catch (error) {
      console.error("Failed to load governance state:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveState = useCallback(async (newState: GovernanceState) => {
    try {
      await AsyncStorage.setItem(GOVERNANCE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error("Failed to save governance state:", error);
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // STATE MACHINE OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const checkAction = useCallback(
    (action: ActionType) => {
      if (state.isHalted) {
        return {
          allowed: false,
          reason: `System halted: ${state.haltReasons.join(", ")}`,
        };
      }
      return canPerformAction(state.system, action);
    },
    [state]
  );

  const changeAutonomyMode = useCallback(
    async (mode: AutonomyMode) => {
      const result = transitionState(
        state.system,
        { autonomyMode: mode },
        `User requested mode change to ${mode}`
      );

      if (result.requiresAcknowledgment && result.pendingTransition) {
        setState((prev) => ({
          ...prev,
          pendingAcknowledgments: [...prev.pendingAcknowledgments, result.pendingTransition!],
        }));
        return { success: false, requiresAcknowledgment: true };
      }

      if (result.success && result.newState) {
        const newGovernance = { ...state, system: result.newState };
        setState(newGovernance);
        await saveState(newGovernance);
        return { success: true };
      }

      return { success: false, error: result.error };
    },
    [state, saveState]
  );

  const acknowledgeTransitionRequest = useCallback(
    async (transitionId: string) => {
      const transition = state.pendingAcknowledgments.find((t) => t.id === transitionId);
      if (!transition) return { success: false, error: "Transition not found" };

      const result = acknowledgeTransition(state.system, transition);
      if (result.success && result.newState) {
        const newGovernance = {
          ...state,
          system: result.newState,
          pendingAcknowledgments: state.pendingAcknowledgments.filter(
            (t) => t.id !== transitionId
          ),
        };
        setState(newGovernance);
        await saveState(newGovernance);
        return { success: true };
      }

      return { success: false, error: "Failed to acknowledge transition" };
    },
    [state, saveState]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // CONTEXT OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const addContext = useCallback(
    async (source: Omit<ContextSource, "id" | "addedAt">) => {
      const result = addContextSource(state.context, source);

      if (result.requiresNarrowing) {
        // HALT - context threshold exceeded
        const newGovernance = {
          ...state,
          context: result.contextState,
          isHalted: true,
          haltReasons: [...state.haltReasons, "Context threshold exceeded"],
        };
        setState(newGovernance);
        await saveState(newGovernance);
        return { success: false, requiresNarrowing: true, violations: result.violations };
      }

      if (result.requiresApproval) {
        return { success: false, requiresApproval: true, violations: result.violations };
      }

      const newGovernance = { ...state, context: result.contextState };
      setState(newGovernance);
      await saveState(newGovernance);
      return { success: true, violations: result.violations };
    },
    [state, saveState]
  );

  const removeContext = useCallback(
    async (sourceId: string) => {
      const newContext = removeContextSource(state.context, sourceId);
      const newGovernance = { ...state, context: newContext };
      setState(newGovernance);
      await saveState(newGovernance);
    },
    [state, saveState]
  );

  const getContextInspection = useCallback((): ContextInspection => {
    return inspectContext(state.context);
  }, [state.context]);

  const getAmbiguityAnalysis = useCallback((): AmbiguityAnalysis => {
    return analyzeAmbiguity(state.context);
  }, [state.context]);

  // ══════════════════════════════════════════════════════════════════════════
  // CHANGE LIFECYCLE OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const startChange = useCallback(
    async (projectId: string, requestedBy: "user" | "agent", agentId?: string) => {
      // Check if action is allowed
      const actionCheck = checkAction("propose_change");
      if (!actionCheck.allowed) {
        return { success: false, error: actionCheck.reason };
      }

      const change = createChangeRequest(projectId, requestedBy, agentId);
      const newGovernance = {
        ...state,
        activeChanges: [...state.activeChanges, change],
      };
      setState(newGovernance);
      await saveState(newGovernance);
      return { success: true, changeId: change.id };
    },
    [state, saveState, checkAction]
  );

  const advanceChange = useCallback(
    async (changeId: string, stepData: any) => {
      const change = state.activeChanges.find((c) => c.id === changeId);
      if (!change) return { success: false, error: "Change not found" };

      const { request, result } = completeStep(change, change.currentStep, stepData);

      const newGovernance = {
        ...state,
        activeChanges: state.activeChanges.map((c) =>
          c.id === changeId ? request : c
        ),
      };
      setState(newGovernance);
      await saveState(newGovernance);

      return result;
    },
    [state, saveState]
  );

  const cancelActiveChange = useCallback(
    async (changeId: string, reason: string) => {
      const change = state.activeChanges.find((c) => c.id === changeId);
      if (!change) return { success: false, error: "Change not found" };

      const cancelled = cancelChange(change, reason);
      const newGovernance = {
        ...state,
        activeChanges: state.activeChanges.map((c) =>
          c.id === changeId ? cancelled : c
        ),
      };
      setState(newGovernance);
      await saveState(newGovernance);
      return { success: true };
    },
    [state, saveState]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // BUDGET OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const trackUsage = useCallback(
    async (updates: Partial<UsageMetrics>) => {
      const result = updateUsage(state.budget, updates);

      if (result.mustHalt) {
        const newGovernance = {
          ...state,
          budget: result.budgetState,
          isHalted: true,
          haltReasons: [...state.haltReasons, result.haltReason || "Budget exceeded"],
        };
        setState(newGovernance);
        await saveState(newGovernance);
        return { success: false, halted: true, violations: result.violations };
      }

      const newGovernance = { ...state, budget: result.budgetState };
      setState(newGovernance);
      await saveState(newGovernance);
      return { success: true, violations: result.violations };
    },
    [state, saveState]
  );

  const setBudgetLimits = useCallback(
    async (limits: Partial<BudgetLimits>) => {
      const newBudget = updateLimits(state.budget, limits);
      const newGovernance = { ...state, budget: newBudget };
      setState(newGovernance);
      await saveState(newGovernance);
    },
    [state, saveState]
  );

  const resetBudget = useCallback(async () => {
    const newBudget = resetUsage(state.budget);
    const newGovernance = { ...state, budget: newBudget };
    setState(newGovernance);
    await saveState(newGovernance);
  }, [state, saveState]);

  // ══════════════════════════════════════════════════════════════════════════
  // VIOLATION OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const reportViolation = useCallback(
    async (
      type: ViolationType,
      evidence: Violation["evidence"],
      affectedResources: string[]
    ) => {
      const detection = detectViolation(type, evidence, affectedResources);
      
      if (detection.violated) {
        const violation = detection.violations[0];
        const response = respondToViolation(state.violations, violation);

        const newGovernance = {
          ...state,
          violations: response.state,
          isHalted: response.actions.halted || state.isHalted,
          haltReasons: response.actions.halted
            ? [...state.haltReasons, violation.description]
            : state.haltReasons,
        };
        setState(newGovernance);
        await saveState(newGovernance);

        return {
          violated: true,
          halted: response.actions.halted,
          message: response.userMessage,
          preventionAdvice: response.preventionAdvice,
        };
      }

      return { violated: false };
    },
    [state, saveState]
  );

  const getViolationAudit = useCallback(() => {
    return auditViolations(state.violations);
  }, [state.violations]);

  // ══════════════════════════════════════════════════════════════════════════
  // GLOBAL OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const resumeFromHalt = useCallback(
    async (resolution: string) => {
      const newGovernance = {
        ...state,
        isHalted: false,
        haltReasons: [],
      };
      setState(newGovernance);
      await saveState(newGovernance);
    },
    [state, saveState]
  );

  const resetGovernance = useCallback(async () => {
    const initial = createInitialGovernanceState();
    setState(initial);
    await saveState(initial);
  }, [saveState]);

  // ══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ══════════════════════════════════════════════════════════════════════════

  const stateDisplay = useMemo(
    () => getStateDisplayInfo(state.system),
    [state.system]
  );

  const budgetSummary = useMemo(
    () => getBudgetSummary(state.budget),
    [state.budget]
  );

  const currentContract = useMemo(
    () => AUTONOMY_CONTRACTS[state.system.autonomyMode],
    [state.system.autonomyMode]
  );

  const activeChange = useMemo(
    () => state.activeChanges.find((c) => c.status === "in_progress"),
    [state.activeChanges]
  );

  const changeProgress = useMemo(
    () => (activeChange ? getStepProgress(activeChange) : null),
    [activeChange]
  );

  return {
    // State
    state,
    loading,
    isHalted: state.isHalted,
    haltReasons: state.haltReasons,

    // State Machine
    checkAction,
    changeAutonomyMode,
    acknowledgeTransition: acknowledgeTransitionRequest,
    pendingAcknowledgments: state.pendingAcknowledgments,

    // Context
    addContext,
    removeContext,
    getContextInspection,
    getAmbiguityAnalysis,
    contextSources: state.context.sources,

    // Change Lifecycle
    startChange,
    advanceChange,
    cancelChange: cancelActiveChange,
    activeChange,
    changeProgress,
    stepLabels: STEP_LABELS,

    // Budget
    trackUsage,
    setBudgetLimits,
    resetBudget,
    budgetSummary,
    budgetState: state.budget,

    // Violations
    reportViolation,
    getViolationAudit,
    violations: state.violations.violations,

    // Global
    resumeFromHalt,
    resetGovernance,

    // Display
    stateDisplay,
    currentContract,
    autonomyMode: state.system.autonomyMode,
  };
}
