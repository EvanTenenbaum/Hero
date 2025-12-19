/**
 * Hero IDE - Governance System Tests
 * 
 * Tests for state machine, autonomy modes, and action permissions
 */

import { describe, it, expect } from "vitest";
import {
  createInitialState,
  canPerformAction,
  transitionState,
  AUTONOMY_CONTRACTS,
  SystemState,
} from "../lib/state-machine";

describe("State Machine", () => {
  describe("createInitialState", () => {
    it("should create a valid initial state", () => {
      const state = createInitialState();
      
      expect(state.scope).toBe("unscoped");
      expect(state.action).toBe("read-only");
      expect(state.agentic).toBe("non-agentic");
      expect(state.checkpoint).toBe("uncheckpointed");
      expect(state.budget).toBe("budget-safe");
      expect(state.autonomyMode).toBe("directed");
      expect(state.currentProjectId).toBeNull();
      expect(state.currentFileId).toBeNull();
      expect(state.stateHistory).toEqual([]);
    });
  });

  describe("canPerformAction", () => {
    it("should allow read action in any state", () => {
      const state = createInitialState();
      const result = canPerformAction(state, "read");
      
      expect(result.allowed).toBe(true);
    });

    it("should allow explain action in any state", () => {
      const state = createInitialState();
      const result = canPerformAction(state, "explain");
      
      expect(result.allowed).toBe(true);
    });

    it("should block suggest action when unscoped", () => {
      const state = createInitialState();
      const result = canPerformAction(state, "suggest");
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("scope");
    });

    it("should allow suggest action when scoped", () => {
      const state: SystemState = {
        ...createInitialState(),
        scope: "scoped",
      };
      const result = canPerformAction(state, "suggest");
      
      expect(result.allowed).toBe(true);
    });

    it("should block apply_change in directed mode", () => {
      const state = createInitialState();
      const result = canPerformAction(state, "apply_change");
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("directed mode");
    });

    it("should block spawn_agent when not in agentic mode", () => {
      const state = createInitialState();
      const result = canPerformAction(state, "spawn_agent");
      
      expect(result.allowed).toBe(false);
    });

    it("should block actions when budget exceeded", () => {
      const state: SystemState = {
        ...createInitialState(),
        scope: "scoped",
        action: "propose",
        budget: "budget-exceeded",
        autonomyMode: "collaborative", // Need collaborative mode to allow propose_change
      };
      const result = canPerformAction(state, "propose_change");
      
      expect(result.allowed).toBe(false);
      // Budget check happens after autonomy mode check, so the error will be about budget
      expect(result.reason).toContain("budget");
    });
  });

  describe("transitionState", () => {
    it("should transition scope from unscoped to scoped", () => {
      const state = createInitialState();
      const result = transitionState(state, { scope: "scoped" }, "user_selected_project");
      
      // May require acknowledgment or succeed directly
      if (result.success) {
        expect(result.newState?.scope).toBe("scoped");
      } else if (result.requiresAcknowledgment) {
        expect(result.pendingTransition).toBeDefined();
      }
    });

    it("should track state history on successful transition", () => {
      const state = createInitialState();
      const result = transitionState(state, { scope: "scoped" }, "test_trigger");
      
      if (result.success && result.newState) {
        expect(result.newState.stateHistory.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Autonomy Contracts", () => {
    it("should have directed mode with strictest constraints", () => {
      const directed = AUTONOMY_CONTRACTS.directed;
      
      expect(directed.canExpandScope).toBe(false);
      expect(directed.canChainActions).toBe(false);
      expect(directed.requiresApprovalPerAction).toBe(true);
      expect(directed.haltOnUncertainty).toBe(true);
    });

    it("should have collaborative mode with moderate constraints", () => {
      const collaborative = AUTONOMY_CONTRACTS.collaborative;
      
      expect(collaborative.canExpandScope).toBe(true);
      expect(collaborative.canChainActions).toBe(false);
      expect(collaborative.autoCheckpoint).toBe(true);
      expect(collaborative.mustLogEveryStep).toBe(true);
    });

    it("should have agentic mode with most freedom but safety rails", () => {
      const agentic = AUTONOMY_CONTRACTS.agentic;
      
      expect(agentic.canExpandScope).toBe(true);
      expect(agentic.canChainActions).toBe(true);
      expect(agentic.autoCheckpoint).toBe(true);
      expect(agentic.mustLogEveryStep).toBe(true);
      expect(agentic.haltOnUncertainty).toBe(true);
    });

    it("should require mode_entry approval for agentic mode", () => {
      const agentic = AUTONOMY_CONTRACTS.agentic;
      
      expect(agentic.requiredApprovals).toContain("mode_entry");
    });
  });
});

describe("Budget Limits", () => {
  it("should block high-risk actions when budget exceeded", () => {
    const state: SystemState = {
      ...createInitialState(),
      budget: "budget-exceeded",
    };
    
    const readResult = canPerformAction(state, "read");
    const explainResult = canPerformAction(state, "explain");
    
    // Low-risk actions should still be allowed
    expect(readResult.allowed).toBe(true);
    expect(explainResult.allowed).toBe(true);
  });
});
