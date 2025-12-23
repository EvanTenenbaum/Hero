/**
 * Cloud Execution Engine
 * 
 * This is the unified execution engine that connects the agent system
 * to the E2B cloud sandbox. It replaces the placeholder execution in
 * the original executionEngine.ts with real cloud-based tool execution.
 * 
 * @module server/agents/cloudExecutionEngine
 */

import { Sandbox } from '@e2b/code-interpreter';
import { sandboxManager, REPO_PATH } from '../services/sandboxManager';
import { projectHydrator } from '../services/projectHydrator';
import { checkSafety, SafetyCheckResult, SafetyRule } from './safetyChecker';
import { agentLogger } from './logger';
import * as db from '../db';

// Import the cloud sandbox tools
import { 
  AgentToolContext, 
  ToolResult,
  createToolContext,
  readFile,
  writeFile,
  editFile,
  deleteFile,
  listFiles,
  fileExists,
} from './tools';
import { runShellCommand, runPackageManager, runGitCommand } from './tools/terminal';
import { submitPR, createGitBranch, commitChanges, getGitDiff, getGitStatus, checkoutBranch } from './tools/github';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type CloudExecutionState = 
  | 'idle'
  | 'initializing'
  | 'hydrating'
  | 'planning'
  | 'executing'
  | 'awaiting_confirmation'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface CloudExecutionStep {
  id: string;
  stepNumber: number;
  toolName: string;
  action: string;
  description: string;
  input: Record<string, unknown>;
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

export interface CloudExecutionContext {
  executionId: string;
  userId: number;
  agentType: string;
  projectId: number;
  goal: string;
  customRules?: SafetyRule[];
  maxSteps?: number;
  timeoutMs?: number;
  // Governance settings
  budgetLimit?: number;  // Max cost in USD
  uncertaintyThreshold?: number;  // 0-100, halt if uncertainty exceeds this
  requireCheckpoints?: boolean;  // Create checkpoints before destructive actions
}

export interface CloudExecutionResult {
  executionId: string;
  state: CloudExecutionState;
  steps: CloudExecutionStep[];
  currentStepIndex: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  totalDurationMs?: number;
  sandboxId?: string;
}

// Tool definitions for the cloud execution engine
export type CloudToolName = 
  // File System Tools
  | 'read_file'
  | 'write_file'
  | 'edit_file'
  | 'delete_file'
  | 'list_directory'
  | 'create_directory'
  | 'file_exists'
  | 'search_files'
  // Terminal Tools
  | 'run_command'
  | 'run_script'
  | 'install_packages'
  // GitHub Tools
  | 'submit_pr'
  | 'create_branch'
  | 'commit_changes'
  | 'push_changes'
  | 'get_diff'
  | 'get_status';

export interface CloudToolDefinition {
  name: CloudToolName;
  description: string;
  category: 'file' | 'terminal' | 'git';
  requiresConfirmation: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

// ════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const CLOUD_TOOLS: CloudToolDefinition[] = [
  // File System Tools
  { name: 'read_file', description: 'Read file contents', category: 'file', requiresConfirmation: false, riskLevel: 'low' },
  { name: 'write_file', description: 'Write content to a file', category: 'file', requiresConfirmation: true, riskLevel: 'medium' },
  { name: 'edit_file', description: 'Make targeted edits to a file', category: 'file', requiresConfirmation: true, riskLevel: 'medium' },
  { name: 'delete_file', description: 'Delete a file', category: 'file', requiresConfirmation: true, riskLevel: 'high' },
  { name: 'list_directory', description: 'List directory contents', category: 'file', requiresConfirmation: false, riskLevel: 'low' },
  { name: 'create_directory', description: 'Create a directory', category: 'file', requiresConfirmation: false, riskLevel: 'low' },
  { name: 'file_exists', description: 'Check if a file exists', category: 'file', requiresConfirmation: false, riskLevel: 'low' },
  { name: 'search_files', description: 'Search for files matching a pattern', category: 'file', requiresConfirmation: false, riskLevel: 'low' },
  
  // Terminal Tools
  { name: 'run_command', description: 'Run a shell command', category: 'terminal', requiresConfirmation: true, riskLevel: 'high' },
  { name: 'run_script', description: 'Run a script file', category: 'terminal', requiresConfirmation: true, riskLevel: 'high' },
  { name: 'install_packages', description: 'Install npm/pip packages', category: 'terminal', requiresConfirmation: true, riskLevel: 'medium' },
  
  // GitHub Tools
  { name: 'submit_pr', description: 'Create a pull request', category: 'git', requiresConfirmation: true, riskLevel: 'medium' },
  { name: 'create_branch', description: 'Create a new branch', category: 'git', requiresConfirmation: false, riskLevel: 'low' },
  { name: 'commit_changes', description: 'Commit staged changes', category: 'git', requiresConfirmation: true, riskLevel: 'medium' },
  { name: 'push_changes', description: 'Push commits to remote', category: 'git', requiresConfirmation: true, riskLevel: 'high' },
  { name: 'get_diff', description: 'Get current diff', category: 'git', requiresConfirmation: false, riskLevel: 'low' },
  { name: 'get_status', description: 'Get git status', category: 'git', requiresConfirmation: false, riskLevel: 'low' },
];

// ════════════════════════════════════════════════════════════════════════════
// CLOUD EXECUTION ENGINE CLASS
// ════════════════════════════════════════════════════════════════════════════

export class CloudExecutionEngine {
  private state: CloudExecutionState = 'idle';
  private steps: CloudExecutionStep[] = [];
  private currentStepIndex: number = 0;
  private context: CloudExecutionContext;
  private startedAt?: Date;
  private completedAt?: Date;
  private sandbox?: Sandbox;
  private toolContext?: AgentToolContext;
  private logger = agentLogger;
  
  // Project info for GitHub operations
  private repoOwner?: string;
  private repoName?: string;
  private defaultBranch?: string;
  
  // Governance tracking
  private tokensUsed: number = 0;
  private costIncurred: number = 0;
  private uncertaintyLevel: number = 0;
  private pendingConfirmationStep?: CloudExecutionStep;
  
  // Event callbacks
  private onStateChange?: (state: CloudExecutionState) => void;
  private onStepComplete?: (step: CloudExecutionStep) => void;
  private onConfirmationRequired?: (step: CloudExecutionStep) => Promise<boolean>;
  private onError?: (error: Error, step?: CloudExecutionStep) => void;
  private onGovernanceHalt?: (reason: string) => void;
  
  constructor(context: CloudExecutionContext) {
    this.context = context;
    // Set default governance limits
    this.context.budgetLimit = context.budgetLimit ?? 1.0; // $1 default
    this.context.maxSteps = context.maxSteps ?? 50; // 50 steps default
    this.context.uncertaintyThreshold = context.uncertaintyThreshold ?? 70; // 70% default
  }
  
  // ── Event Handlers ─────────────────────────────────────────────────────────
  
  setOnStateChange(handler: (state: CloudExecutionState) => void): void {
    this.onStateChange = handler;
  }
  
  setOnStepComplete(handler: (step: CloudExecutionStep) => void): void {
    this.onStepComplete = handler;
  }
  
  setOnConfirmationRequired(handler: (step: CloudExecutionStep) => Promise<boolean>): void {
    this.onConfirmationRequired = handler;
  }
  
  setOnError(handler: (error: Error, step?: CloudExecutionStep) => void): void {
    this.onError = handler;
  }
  
  // ── State Management ───────────────────────────────────────────────────────
  
  private setState(newState: CloudExecutionState): void {
    this.state = newState;
    this.onStateChange?.(newState);
  }
  
  getState(): CloudExecutionState {
    return this.state;
  }
  
  // ── Initialization ─────────────────────────────────────────────────────────
  
  /**
   * Initialize the cloud sandbox and hydrate the project
   */
  async initialize(): Promise<void> {
    this.setState('initializing');
    
    try {
      // Get or start the sandbox for this project
      this.sandbox = await sandboxManager.getOrStartSandbox(String(this.context.projectId));
      
      if (!this.sandbox) {
        throw new Error('Failed to start cloud sandbox');
      }
      
      // Get project details
      const project = await db.getProjectById(this.context.projectId, this.context.userId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      // Store project info for GitHub operations
      this.repoOwner = (project as any).repoOwner || '';
      this.repoName = (project as any).repoName || '';
      this.defaultBranch = (project as any).defaultBranch || 'main';
      
      // Hydrate the sandbox with the project
      this.setState('hydrating');
      await projectHydrator.hydrate(this.sandbox, project as any);
      
      // Create tool context
      this.toolContext = createToolContext({
        userId: this.context.userId,
        projectId: this.context.projectId,
        agentId: 0, // Will be set when executing
        executionId: 0, // Will be set when executing
        sandbox: this.sandbox,
        useCloudSandbox: true,
      });
      
      await this.logger.info(
        `Cloud sandbox initialized for project ${this.context.projectId}`,
        this.context.agentType,
        this.context.userId,
        { data: { sandboxId: this.sandbox.sandboxId } }
      );
      
      this.setState('idle');
    } catch (error) {
      this.setState('failed');
      throw error;
    }
  }
  
  // ── Step Management ────────────────────────────────────────────────────────
  
  /**
   * Add steps to the execution plan
   */
  addSteps(steps: Array<{ toolName: CloudToolName; action: string; description: string; input: Record<string, unknown> }>): void {
    for (const step of steps) {
      const toolDef = CLOUD_TOOLS.find(t => t.name === step.toolName);
      if (!toolDef) {
        throw new Error(`Unknown tool: ${step.toolName}`);
      }
      
      // Run safety check
      const actionString = this.buildActionString(step.toolName, step.input);
      const safetyCheck = checkSafety(actionString, this.context.customRules);
      
      this.steps.push({
        id: `step_${this.steps.length + 1}_${Date.now()}`,
        stepNumber: this.steps.length + 1,
        toolName: step.toolName,
        action: step.action,
        description: step.description,
        input: step.input,
        status: 'pending',
        requiresConfirmation: toolDef.requiresConfirmation || safetyCheck.requiresConfirmation,
        safetyCheck,
      });
    }
  }
  
  /**
   * Build an action string for safety checking
   */
  private buildActionString(toolName: CloudToolName, input: Record<string, unknown>): string {
    switch (toolName) {
      case 'read_file':
      case 'write_file':
      case 'edit_file':
      case 'delete_file':
        return `${toolName}:${input.path || ''}`;
      case 'run_command':
        return String(input.command || '');
      case 'run_script':
        return `run_script:${input.scriptPath || ''}`;
      case 'submit_pr':
        return `git push && create PR`;
      case 'push_changes':
        return `git push ${input.remote || 'origin'} ${input.branch || ''}`.trim();
      default:
        return toolName;
    }
  }
  
  // ── Execution ──────────────────────────────────────────────────────────────
  
  /**
   * Start execution
   */
  async start(): Promise<CloudExecutionResult> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start execution in state: ${this.state}`);
    }
    
    if (!this.sandbox) {
      await this.initialize();
    }
    
    if (this.steps.length === 0) {
      return {
        ...this.getResult(),
        error: 'No steps to execute',
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
   * Execute steps sequentially with governance checks
   */
  private async executeSteps(): Promise<void> {
    while (this.currentStepIndex < this.steps.length && this.state === 'executing') {
      const step = this.steps[this.currentStepIndex];
      
      // ── Governance Checks ────────────────────────────────────────────────────
      const governanceCheck = this.checkGovernance();
      if (governanceCheck.shouldHalt) {
        await this.logger.warn(
          `Execution halted by governance: ${governanceCheck.reason}`,
          this.context.agentType,
          this.context.userId,
          { data: { reason: governanceCheck.reason, step: this.currentStepIndex } }
        );
        this.onGovernanceHalt?.(governanceCheck.reason!);
        this.setState('paused');
        return;
      }
      
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
        this.pendingConfirmationStep = step;
        this.setState('awaiting_confirmation');
        
        const confirmed = await this.onConfirmationRequired(step);
        this.pendingConfirmationStep = undefined;
        
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
   * Check governance rules
   */
  private checkGovernance(): { shouldHalt: boolean; reason?: string } {
    // Check budget limit
    if (this.context.budgetLimit && this.costIncurred >= this.context.budgetLimit) {
      return { shouldHalt: true, reason: `Budget limit reached ($${this.costIncurred.toFixed(4)} >= $${this.context.budgetLimit.toFixed(2)})` };
    }
    
    // Check max steps
    if (this.context.maxSteps && this.currentStepIndex >= this.context.maxSteps) {
      return { shouldHalt: true, reason: `Maximum steps reached (${this.currentStepIndex} >= ${this.context.maxSteps})` };
    }
    
    // Check uncertainty threshold
    if (this.context.uncertaintyThreshold && this.uncertaintyLevel > this.context.uncertaintyThreshold) {
      return { shouldHalt: true, reason: `Uncertainty level (${this.uncertaintyLevel}%) exceeds threshold (${this.context.uncertaintyThreshold}%)` };
    }
    
    return { shouldHalt: false };
  }
  
  /**
   * Update cost tracking (called after LLM invocations)
   */
  updateCost(tokensUsed: number): void {
    this.tokensUsed += tokensUsed;
    // Approximate cost: $0.001 per 1000 tokens
    this.costIncurred = (this.tokensUsed / 1000) * 0.001;
  }
  
  /**
   * Update uncertainty level
   */
  setUncertaintyLevel(level: number): void {
    this.uncertaintyLevel = Math.max(0, Math.min(100, level));
  }
  
  /**
   * Get pending confirmation step
   */
  getPendingConfirmation(): CloudExecutionStep | undefined {
    return this.pendingConfirmationStep;
  }
  
  /**
   * Execute a single step using the cloud sandbox tools
   */
  private async executeStep(step: CloudExecutionStep): Promise<void> {
    step.status = 'running';
    step.startedAt = new Date();
    
    try {
      const result = await this.executeToolAction(step.toolName as CloudToolName, step.input);
      step.status = result.success ? 'complete' : 'failed';
      step.result = result;
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
   * Execute a tool action in the cloud sandbox
   */
  private async executeToolAction(toolName: CloudToolName, input: Record<string, unknown>): Promise<ToolResult> {
    if (!this.toolContext) {
      return { success: false, error: 'Tools not initialized. Call initialize() first.' };
    }
    
    const ctx = this.toolContext;
    
    switch (toolName) {
      // File System Tools
      case 'read_file':
        return readFile(ctx, String(input.path));
      case 'write_file':
        return writeFile(ctx, String(input.path), String(input.content));
      case 'edit_file':
        return editFile(ctx, String(input.path), input.edits as Array<{ find: string; replace: string }>);
      case 'delete_file':
        return deleteFile(ctx, String(input.path));
      case 'list_directory':
        return listFiles(ctx, String(input.path || '.'));
      case 'create_directory':
        // Use runShellCommand to create directory
        return runShellCommand(ctx, `mkdir -p ${String(input.path)}`);
      case 'file_exists':
        return fileExists(ctx, String(input.path));
      case 'search_files':
        // Use runShellCommand with find
        return runShellCommand(ctx, `find ${String(input.directory || '.')} -name "${String(input.pattern)}"`);
      
      // Terminal Tools
      case 'run_command':
        return runShellCommand(ctx, String(input.command), { cwd: input.cwd as string | undefined });
      case 'run_script':
        // Run script using shell command
        const scriptPath = String(input.scriptPath);
        const args = (input.args as string[] || []).join(' ');
        return runShellCommand(ctx, `bash ${scriptPath} ${args}`.trim());
      case 'install_packages':
        const packages = (input.packages as string[] || []).join(' ');
        return runPackageManager(
          ctx, 
          `install ${packages}`,
          input.packageManager as 'npm' | 'pnpm' | 'yarn' | undefined
        );
      
      // GitHub Tools
      case 'submit_pr':
        return submitPR(ctx, {
          title: String(input.title),
          body: String(input.description),
          branchName: String(input.branch),
          baseBranch: input.targetBranch as string || this.defaultBranch || 'main',
        });
      case 'create_branch':
        return createGitBranch(ctx, String(input.branchName), input.baseBranch as string | undefined);
      case 'commit_changes':
        return commitChanges(ctx, String(input.message), { files: input.files as string[] | undefined });
      case 'push_changes':
        // Use runGitCommand for push
        const branch = input.branch as string || '';
        const forceFlag = input.force ? '--force' : '';
        return runGitCommand(ctx, `push origin ${branch} ${forceFlag}`.trim());
      case 'get_diff':
        return getGitDiff(ctx, { staged: input.staged as boolean | undefined });
      case 'get_status':
        return getGitStatus(ctx);
      
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }
  
  // ── Control Methods ────────────────────────────────────────────────────────
  
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
  async resume(): Promise<CloudExecutionResult> {
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
  
  // ── Error Handling ─────────────────────────────────────────────────────────
  
  private handleError(error: Error): void {
    const currentStep = this.steps[this.currentStepIndex];
    this.onError?.(error, currentStep);
    this.completedAt = new Date();
    this.setState('failed');
  }
  
  // ── Result ─────────────────────────────────────────────────────────────────
  
  getResult(): CloudExecutionResult {
    return {
      executionId: this.context.executionId,
      state: this.state,
      steps: [...this.steps],
      currentStepIndex: this.currentStepIndex,
      startedAt: this.startedAt || new Date(),
      completedAt: this.completedAt,
      totalDurationMs: this.completedAt && this.startedAt 
        ? this.completedAt.getTime() - this.startedAt.getTime() 
        : undefined,
      sandboxId: this.sandbox?.sandboxId,
    };
  }
  
  /**
   * Get execution history (completed steps)
   */
  getHistory(): CloudExecutionStep[] {
    return this.steps.filter(s => s.status === 'complete' || s.status === 'failed' || s.status === 'skipped');
  }
  
  /**
   * Get governance status
   */
  getGovernanceStatus(): {
    tokensUsed: number;
    costIncurred: number;
    budgetLimit: number;
    budgetRemaining: number;
    stepsExecuted: number;
    maxSteps: number;
    uncertaintyLevel: number;
    uncertaintyThreshold: number;
  } {
    return {
      tokensUsed: this.tokensUsed,
      costIncurred: this.costIncurred,
      budgetLimit: this.context.budgetLimit || 1.0,
      budgetRemaining: (this.context.budgetLimit || 1.0) - this.costIncurred,
      stepsExecuted: this.currentStepIndex,
      maxSteps: this.context.maxSteps || 50,
      uncertaintyLevel: this.uncertaintyLevel,
      uncertaintyThreshold: this.context.uncertaintyThreshold || 70,
    };
  }
  
  // ── Cleanup ────────────────────────────────────────────────────────────────
  
  /**
   * Cleanup resources (sandbox will be managed by sandboxManager)
   */
  async cleanup(): Promise<void> {
    // The sandbox is managed by sandboxManager, so we don't close it here
    // Just clear local references
    this.sandbox = undefined;
    this.toolContext = undefined;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ════════════════════════════════════════════════════════════════════════════

let executionCounter = 0;

export function generateExecutionId(): string {
  executionCounter++;
  return `exec_${Date.now()}_${executionCounter}`;
}

export function createCloudExecutionEngine(context: Omit<CloudExecutionContext, 'executionId'>): CloudExecutionEngine {
  return new CloudExecutionEngine({
    ...context,
    executionId: generateExecutionId(),
  });
}

// ════════════════════════════════════════════════════════════════════════════
// TOOL REGISTRY (for compatibility with existing code)
// ════════════════════════════════════════════════════════════════════════════

export function getCloudToolDefinitions(): CloudToolDefinition[] {
  return [...CLOUD_TOOLS];
}

export function getCloudToolByName(name: CloudToolName): CloudToolDefinition | undefined {
  return CLOUD_TOOLS.find(t => t.name === name);
}

export function getCloudToolsByCategory(category: 'file' | 'terminal' | 'git'): CloudToolDefinition[] {
  return CLOUD_TOOLS.filter(t => t.category === category);
}
