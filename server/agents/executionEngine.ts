/**
 * Execution Engine Module
 * 
 * Manages agent task execution with a simple state machine.
 * Handles step-by-step execution, confirmations, and rollback.
 */

import { checkSafety, SafetyRule, SafetyCheckResult } from './safetyChecker';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type ExecutionState = 
  | 'idle'
  | 'planning'
  | 'executing'
  | 'awaiting_confirmation'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  action: string;
  description: string;
  input?: Record<string, unknown>;
  status: 'pending' | 'running' | 'awaiting_confirmation' | 'complete' | 'failed' | 'skipped';
  requiresConfirmation: boolean;
  safetyCheck?: SafetyCheckResult;
  result?: {
    success: boolean;
    output?: unknown;
    error?: string;
  };
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface ExecutionContext {
  executionId: string;
  userId: number;
  agentType: string;
  projectId?: number;
  goal: string;
  customRules?: SafetyRule[];
  maxSteps?: number;
  timeoutMs?: number;
}

export interface ExecutionResult {
  executionId: string;
  state: ExecutionState;
  steps: ExecutionStep[];
  currentStepIndex: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  totalDurationMs?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// EXECUTION ENGINE CLASS
// ════════════════════════════════════════════════════════════════════════════

export class ExecutionEngine {
  private state: ExecutionState = 'idle';
  private steps: ExecutionStep[] = [];
  private currentStepIndex: number = 0;
  private context: ExecutionContext;
  private startedAt?: Date;
  private completedAt?: Date;
  
  // Event callbacks
  private onStateChange?: (state: ExecutionState) => void;
  private onStepComplete?: (step: ExecutionStep) => void;
  private onConfirmationRequired?: (step: ExecutionStep) => Promise<boolean>;
  private onError?: (error: Error, step?: ExecutionStep) => void;
  
  constructor(context: ExecutionContext) {
    this.context = context;
  }
  
  // ── Event Handlers ─────────────────────────────────────────────────────────
  
  setOnStateChange(handler: (state: ExecutionState) => void): void {
    this.onStateChange = handler;
  }
  
  setOnStepComplete(handler: (step: ExecutionStep) => void): void {
    this.onStepComplete = handler;
  }
  
  setOnConfirmationRequired(handler: (step: ExecutionStep) => Promise<boolean>): void {
    this.onConfirmationRequired = handler;
  }
  
  setOnError(handler: (error: Error, step?: ExecutionStep) => void): void {
    this.onError = handler;
  }
  
  // ── State Management ───────────────────────────────────────────────────────
  
  private setState(newState: ExecutionState): void {
    this.state = newState;
    this.onStateChange?.(newState);
  }
  
  getState(): ExecutionState {
    return this.state;
  }
  
  getResult(): ExecutionResult {
    return {
      executionId: this.context.executionId,
      state: this.state,
      steps: this.steps,
      currentStepIndex: this.currentStepIndex,
      startedAt: this.startedAt || new Date(),
      completedAt: this.completedAt,
      totalDurationMs: this.completedAt && this.startedAt
        ? this.completedAt.getTime() - this.startedAt.getTime()
        : undefined,
    };
  }
  
  // ── Step Management ────────────────────────────────────────────────────────
  
  /**
   * Add steps to the execution plan
   */
  addSteps(steps: Array<{ action: string; description: string; input?: Record<string, unknown> }>): void {
    if (this.state !== 'idle' && this.state !== 'planning') {
      throw new Error(`Cannot add steps in state: ${this.state}`);
    }
    
    const maxSteps = this.context.maxSteps || 50;
    if (this.steps.length + steps.length > maxSteps) {
      throw new Error(`Exceeds maximum steps limit of ${maxSteps}`);
    }
    
    for (const step of steps) {
      // Run safety check on the action
      const safetyCheck = checkSafety(step.action, this.context.customRules);
      
      this.steps.push({
        id: `step-${this.steps.length + 1}`,
        stepNumber: this.steps.length + 1,
        action: step.action,
        description: step.description,
        input: step.input,
        status: 'pending',
        requiresConfirmation: safetyCheck.requiresConfirmation,
        safetyCheck,
      });
    }
  }
  
  /**
   * Get the current step
   */
  getCurrentStep(): ExecutionStep | undefined {
    return this.steps[this.currentStepIndex];
  }
  
  /**
   * Get all steps
   */
  getSteps(): ExecutionStep[] {
    return [...this.steps];
  }
  
  // ── Execution Control ──────────────────────────────────────────────────────
  
  /**
   * Check if execution can start
   */
  canStart(): { canStart: boolean; reason?: string } {
    if (this.state !== 'idle' && this.state !== 'planning') {
      return { canStart: false, reason: `Cannot start execution in state: ${this.state}` };
    }
    if (this.steps.length === 0) {
      return { canStart: false, reason: 'No steps to execute. Add steps using addSteps() first.' };
    }
    return { canStart: true };
  }
  
  /**
   * Start execution
   */
  async start(): Promise<ExecutionResult> {
    const check = this.canStart();
    if (!check.canStart) {
      // Return a failed result instead of throwing
      this.startedAt = new Date();
      this.completedAt = new Date();
      this.setState('failed');
      return {
        ...this.getResult(),
        error: check.reason,
      };
    }
    
    this.startedAt = new Date();
    this.setState('executing');
    
    try {
      await this.executeSteps();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
    
    return this.getResult();
  }
  
  /**
   * Execute steps sequentially
   */
  private async executeSteps(): Promise<void> {
    while (this.currentStepIndex < this.steps.length && this.state === 'executing') {
      const step = this.steps[this.currentStepIndex];
      
      // Check if action is blocked by safety rules
      if (step.safetyCheck && !step.safetyCheck.allowed) {
        step.status = 'failed';
        step.result = {
          success: false,
          error: `Blocked by safety rule: ${step.safetyCheck.reason}`,
        };
        this.onStepComplete?.(step);
        this.setState('failed');
        return;
      }
      
      // Check if confirmation is required
      if (step.requiresConfirmation && this.onConfirmationRequired) {
        step.status = 'awaiting_confirmation';
        this.setState('awaiting_confirmation');
        
        const confirmed = await this.onConfirmationRequired(step);
        
        if (!confirmed) {
          step.status = 'skipped';
          step.result = { success: false, error: 'User declined confirmation' };
          this.onStepComplete?.(step);
          this.currentStepIndex++;
          this.setState('executing');
          continue;
        }
        
        this.setState('executing');
      }
      
      // Execute the step
      await this.executeStep(step);
      
      // Check if step failed
      if (step.status === 'failed') {
        this.setState('failed');
        return;
      }
      
      this.currentStepIndex++;
    }
    
    // All steps completed
    if (this.state === 'executing') {
      this.completedAt = new Date();
      this.setState('completed');
    }
  }
  
  /**
   * Execute a single step (override this for actual tool execution)
   */
  protected async executeStep(step: ExecutionStep): Promise<void> {
    step.status = 'running';
    step.startedAt = new Date();
    
    try {
      // This is a placeholder - actual execution would call the appropriate tool
      // In a real implementation, this would dispatch to the tool registry
      await this.simulateStepExecution(step);
      
      step.status = 'complete';
      step.result = { success: true };
    } catch (error) {
      step.status = 'failed';
      step.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    
    step.completedAt = new Date();
    step.durationMs = step.completedAt.getTime() - (step.startedAt?.getTime() || 0);
    this.onStepComplete?.(step);
  }
  
  /**
   * Simulate step execution (for testing/demo)
   */
  private async simulateStepExecution(step: ExecutionStep): Promise<void> {
    // Simulate some execution time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check for simulated failures
    if (step.action.includes('fail')) {
      throw new Error('Simulated failure');
    }
  }
  
  /**
   * Pause execution
   */
  pause(): void {
    if (this.state === 'executing') {
      this.setState('paused');
    }
  }
  
  /**
   * Resume execution
   */
  async resume(): Promise<ExecutionResult> {
    if (this.state !== 'paused') {
      throw new Error(`Cannot resume from state: ${this.state}`);
    }
    
    this.setState('executing');
    
    try {
      await this.executeSteps();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
    
    return this.getResult();
  }
  
  /**
   * Cancel execution
   */
  cancel(): void {
    if (this.state === 'executing' || this.state === 'paused' || this.state === 'awaiting_confirmation') {
      this.completedAt = new Date();
      this.setState('cancelled');
    }
  }
  
  /**
   * Confirm the current step
   */
  async confirmCurrentStep(): Promise<void> {
    const step = this.getCurrentStep();
    if (!step || this.state !== 'awaiting_confirmation') {
      throw new Error('No step awaiting confirmation');
    }
    
    step.status = 'pending';
    step.requiresConfirmation = false; // Already confirmed
    this.setState('executing');
    await this.executeSteps();
  }
  
  /**
   * Skip the current step
   */
  skipCurrentStep(): void {
    const step = this.getCurrentStep();
    if (!step) {
      throw new Error('No current step to skip');
    }
    
    step.status = 'skipped';
    step.result = { success: false, error: 'Skipped by user' };
    this.onStepComplete?.(step);
    this.currentStepIndex++;
    
    if (this.state === 'awaiting_confirmation') {
      this.setState('executing');
    }
  }
  
  // ── Error Handling ─────────────────────────────────────────────────────────
  
  private handleError(error: Error): void {
    const currentStep = this.getCurrentStep();
    this.onError?.(error, currentStep);
    this.completedAt = new Date();
    this.setState('failed');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create a new execution engine instance
 */
export function createExecutionEngine(context: ExecutionContext): ExecutionEngine {
  return new ExecutionEngine(context);
}

/**
 * Generate a unique execution ID
 */
export function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
