/**
 * Hero IDE - Change Lifecycle System
 * 
 * All changes must follow a FORCED lifecycle.
 * THE SYSTEM MAY NOT SKIP STEPS, EVEN IF CONFIDENT.
 * 
 * Based on Section 6: Change-Making as a Formal Process
 */

// ════════════════════════════════════════════════════════════════════════════
// CHANGE LIFECYCLE STEPS
// ════════════════════════════════════════════════════════════════════════════

export type ChangeStep =
  | "declare_intent"
  | "declare_scope"
  | "declare_risk"
  | "present_preview"
  | "require_approval"
  | "apply_change"
  | "confirm_result"
  | "enable_recovery";

export interface ChangeStepInfo {
  id: ChangeStep;
  name: string;
  description: string;
}

export const CHANGE_STEPS: ChangeStepInfo[] = [
  { id: "declare_intent", name: "Declare Intent", description: "What is being changed and why" },
  { id: "declare_scope", name: "Declare Scope", description: "What files and systems will be affected" },
  { id: "declare_risk", name: "Declare Risk", description: "Assessment of potential impact" },
  { id: "present_preview", name: "Present Preview", description: "Review the exact changes" },
  { id: "require_approval", name: "Require Approval", description: "Explicit confirmation to proceed" },
  { id: "apply_change", name: "Apply Change", description: "Execute the changes" },
  { id: "confirm_result", name: "Confirm Result", description: "Verify changes were applied correctly" },
  { id: "enable_recovery", name: "Enable Recovery", description: "Ensure rollback is available" },
];

export const STEP_LABELS: Record<ChangeStep, string> = {
  declare_intent: "1. Declare Intent",
  declare_scope: "2. Declare Scope",
  declare_risk: "3. Declare Risk Level",
  present_preview: "4. Present Preview",
  require_approval: "5. Require Approval",
  apply_change: "6. Apply Change",
  confirm_result: "7. Confirm Result",
  enable_recovery: "8. Enable Recovery",
};

// ════════════════════════════════════════════════════════════════════════════
// CHANGE REQUEST TYPES
// ════════════════════════════════════════════════════════════════════════════

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ChangeIntent {
  description: string;
  goal: string;
  expectedOutcome: string;
  alternativesConsidered: string[];
}

export interface ChangeScope {
  files: string[];
  linesAffected: number;
  functionsAffected: string[];
  dependenciesAffected: string[];
  scopeJustification: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  factors: {
    factor: string;
    severity: RiskLevel;
    mitigation: string;
  }[];
  reversibility: "fully_reversible" | "partially_reversible" | "irreversible";
  testingRequired: boolean;
  reviewRequired: boolean;
}

export interface ChangePreview {
  diffs: {
    file: string;
    hunks: {
      oldStart: number;
      oldLines: number;
      newStart: number;
      newLines: number;
      content: string;
    }[];
  }[];
  summary: string;
  sideEffects: string[];
}

// Simplified proposal interface for UI
export interface ChangeProposal {
  intent: string;
  description: string;
  scope: {
    files: string[];
    dependencies: string[];
  };
  riskLevel: RiskLevel;
  preview: {
    file: string;
    type: "add" | "modify" | "delete";
    diff?: string;
  }[];
}

export interface ChangeApproval {
  approved: boolean;
  approvedBy: "user" | "auto";
  approvedAt: Date;
  conditions: string[];
  notes: string;
}

export interface ChangeResult {
  success: boolean;
  filesModified: string[];
  errors: string[];
  warnings: string[];
  executionTime: number;
}

export interface RecoveryInfo {
  checkpointId: string;
  checkpointCreatedAt: Date;
  rollbackAvailable: boolean;
  rollbackSteps: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// CHANGE REQUEST STATE
// ════════════════════════════════════════════════════════════════════════════

export interface ChangeRequest {
  id: string;
  createdAt: Date;
  currentStep: ChangeStep;
  completedSteps: ChangeStep[];
  
  // Step data
  intent: ChangeIntent | null;
  scope: ChangeScope | null;
  risk: RiskAssessment | null;
  preview: ChangePreview | null;
  approval: ChangeApproval | null;
  result: ChangeResult | null;
  recovery: RecoveryInfo | null;
  
  // Metadata
  projectId: string;
  requestedBy: "user" | "agent";
  agentId?: string;
  
  // Status
  status: "in_progress" | "completed" | "failed" | "rolled_back" | "cancelled";
  statusMessage: string;
}

// ════════════════════════════════════════════════════════════════════════════
// CHANGE LIFECYCLE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

export function createChangeRequest(
  projectId: string,
  requestedBy: "user" | "agent",
  agentId?: string
): ChangeRequest {
  return {
    id: generateChangeId(),
    createdAt: new Date(),
    currentStep: "declare_intent",
    completedSteps: [],
    intent: null,
    scope: null,
    risk: null,
    preview: null,
    approval: null,
    result: null,
    recovery: null,
    projectId,
    requestedBy,
    agentId,
    status: "in_progress",
    statusMessage: "Awaiting intent declaration",
  };
}

export interface StepResult {
  success: boolean;
  error?: string;
  canProceed: boolean;
  nextStep?: ChangeStep;
  warnings?: string[];
}

export function completeStep(
  request: ChangeRequest,
  step: ChangeStep,
  data: any
): { request: ChangeRequest; result: StepResult } {
  // ENFORCE: Cannot skip steps
  if (step !== request.currentStep) {
    return {
      request,
      result: {
        success: false,
        error: `Cannot complete step "${step}". Current step is "${request.currentStep}". Steps cannot be skipped.`,
        canProceed: false,
      },
    };
  }

  // ENFORCE: Previous steps must be completed
  const stepIndex = CHANGE_STEPS.findIndex((s) => s.id === step);
  const requiredSteps = CHANGE_STEPS.slice(0, stepIndex).map((s) => s.id);
  const missingSteps = requiredSteps.filter(
    (s) => !request.completedSteps.includes(s)
  );
  
  if (missingSteps.length > 0) {
    return {
      request,
      result: {
        success: false,
        error: `Cannot complete step "${step}". Missing required steps: ${missingSteps.join(", ")}`,
        canProceed: false,
      },
    };
  }

  // Validate and process step data
  const validation = validateStepData(step, data, request);
  if (!validation.valid) {
    return {
      request,
      result: {
        success: false,
        error: validation.error,
        canProceed: false,
      },
    };
  }

  // Update request with step data
  const updatedRequest = applyStepData(request, step, data);
  
  // Determine next step
  const nextStepIndex = stepIndex + 1;
  const nextStepInfo = nextStepIndex < CHANGE_STEPS.length ? CHANGE_STEPS[nextStepIndex] : undefined;
  const nextStep = nextStepInfo?.id;

  // Check if change is complete
  const isComplete = step === "enable_recovery";

  return {
    request: {
      ...updatedRequest,
      currentStep: nextStep || step,
      completedSteps: [...updatedRequest.completedSteps, step],
      status: isComplete ? "completed" : "in_progress",
      statusMessage: isComplete
        ? "Change completed successfully"
        : `Awaiting ${nextStep ? STEP_LABELS[nextStep] : "completion"}`,
    },
    result: {
      success: true,
      canProceed: !isComplete,
      nextStep,
      warnings: validation.warnings,
    },
  };
}

export function cancelChange(
  request: ChangeRequest,
  reason: string
): ChangeRequest {
  return {
    ...request,
    status: "cancelled",
    statusMessage: `Cancelled: ${reason}`,
  };
}

export function rollbackChange(
  request: ChangeRequest
): { request: ChangeRequest; success: boolean; error?: string } {
  if (!request.recovery?.rollbackAvailable) {
    return {
      request,
      success: false,
      error: "Rollback not available. No checkpoint was created.",
    };
  }

  if (request.status !== "completed" && request.status !== "failed") {
    return {
      request,
      success: false,
      error: "Can only rollback completed or failed changes.",
    };
  }

  return {
    request: {
      ...request,
      status: "rolled_back",
      statusMessage: `Rolled back to checkpoint ${request.recovery.checkpointId}`,
    },
    success: true,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// STEP VALIDATION
// ════════════════════════════════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

function validateStepData(
  step: ChangeStep,
  data: any,
  request: ChangeRequest
): ValidationResult {
  switch (step) {
    case "declare_intent":
      return validateIntent(data);
    case "declare_scope":
      return validateScope(data);
    case "declare_risk":
      return validateRisk(data, request);
    case "present_preview":
      return validatePreview(data);
    case "require_approval":
      return validateApproval(data, request);
    case "apply_change":
      return validateApply(data);
    case "confirm_result":
      return validateResult(data);
    case "enable_recovery":
      return validateRecovery(data);
    default:
      return { valid: false, error: `Unknown step: ${step}` };
  }
}

function validateIntent(data: ChangeIntent): ValidationResult {
  if (!data.description || data.description.length < 10) {
    return { valid: false, error: "Intent description must be at least 10 characters" };
  }
  if (!data.goal) {
    return { valid: false, error: "Goal is required" };
  }
  if (!data.expectedOutcome) {
    return { valid: false, error: "Expected outcome is required" };
  }
  return { valid: true };
}

function validateScope(data: ChangeScope): ValidationResult {
  if (!data.files || data.files.length === 0) {
    return { valid: false, error: "At least one file must be in scope" };
  }
  if (!data.scopeJustification) {
    return { valid: false, error: "Scope justification is required" };
  }
  
  const warnings: string[] = [];
  if (data.files.length > 10) {
    warnings.push("Large scope: More than 10 files affected");
  }
  if (data.linesAffected > 500) {
    warnings.push("Large change: More than 500 lines affected");
  }
  
  return { valid: true, warnings };
}

function validateRisk(data: RiskAssessment, request: ChangeRequest): ValidationResult {
  if (!data.level) {
    return { valid: false, error: "Risk level is required" };
  }
  if (!data.factors || data.factors.length === 0) {
    return { valid: false, error: "At least one risk factor must be identified" };
  }
  if (!data.reversibility) {
    return { valid: false, error: "Reversibility assessment is required" };
  }
  
  const warnings: string[] = [];
  if (data.level === "critical" && !data.reviewRequired) {
    warnings.push("Critical risk level should require review");
  }
  if (data.reversibility === "irreversible") {
    warnings.push("Irreversible change - extra caution required");
  }
  
  return { valid: true, warnings };
}

function validatePreview(data: ChangePreview): ValidationResult {
  if (!data.diffs || data.diffs.length === 0) {
    return { valid: false, error: "Preview must include diffs" };
  }
  if (!data.summary) {
    return { valid: false, error: "Preview summary is required" };
  }
  return { valid: true };
}

function validateApproval(data: ChangeApproval, request: ChangeRequest): ValidationResult {
  if (!data.approved) {
    return { valid: false, error: "Change was not approved" };
  }
  
  // Critical risk changes require user approval
  if (request.risk?.level === "critical" && data.approvedBy !== "user") {
    return { valid: false, error: "Critical risk changes require explicit user approval" };
  }
  
  return { valid: true };
}

function validateApply(data: any): ValidationResult {
  // Application validation happens during execution
  return { valid: true };
}

function validateResult(data: ChangeResult): ValidationResult {
  if (data.errors && data.errors.length > 0) {
    return { 
      valid: true, 
      warnings: [`Change completed with errors: ${data.errors.join(", ")}`] 
    };
  }
  return { valid: true };
}

function validateRecovery(data: RecoveryInfo): ValidationResult {
  if (!data.checkpointId) {
    return { valid: false, error: "Checkpoint ID is required for recovery" };
  }
  if (!data.rollbackAvailable) {
    return { 
      valid: true, 
      warnings: ["Rollback not available - change may not be reversible"] 
    };
  }
  return { valid: true };
}

// ════════════════════════════════════════════════════════════════════════════
// STEP DATA APPLICATION
// ════════════════════════════════════════════════════════════════════════════

function applyStepData(
  request: ChangeRequest,
  step: ChangeStep,
  data: any
): ChangeRequest {
  switch (step) {
    case "declare_intent":
      return { ...request, intent: data };
    case "declare_scope":
      return { ...request, scope: data };
    case "declare_risk":
      return { ...request, risk: data };
    case "present_preview":
      return { ...request, preview: data };
    case "require_approval":
      return { ...request, approval: data };
    case "apply_change":
      return request; // Applied separately
    case "confirm_result":
      return { ...request, result: data };
    case "enable_recovery":
      return { ...request, recovery: data };
    default:
      return request;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// RISK CALCULATION
// ════════════════════════════════════════════════════════════════════════════

export function calculateRiskLevel(scope: ChangeScope): RiskLevel {
  let riskScore = 0;

  // File count factor
  if (scope.files.length > 20) riskScore += 3;
  else if (scope.files.length > 10) riskScore += 2;
  else if (scope.files.length > 5) riskScore += 1;

  // Lines affected factor
  if (scope.linesAffected > 1000) riskScore += 3;
  else if (scope.linesAffected > 500) riskScore += 2;
  else if (scope.linesAffected > 100) riskScore += 1;

  // Dependencies factor
  if (scope.dependenciesAffected.length > 5) riskScore += 2;
  else if (scope.dependenciesAffected.length > 0) riskScore += 1;

  // Critical files factor
  const criticalPatterns = [
    /package\.json$/,
    /tsconfig\.json$/,
    /\.env/,
    /auth/i,
    /security/i,
    /database/i,
  ];
  const hasCriticalFiles = scope.files.some((f) =>
    criticalPatterns.some((p) => p.test(f))
  );
  if (hasCriticalFiles) riskScore += 2;

  // Determine level
  if (riskScore >= 8) return "critical";
  if (riskScore >= 5) return "high";
  if (riskScore >= 2) return "medium";
  return "low";
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function generateChangeId(): string {
  return `chg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getStepProgress(request: ChangeRequest): {
  current: number;
  total: number;
  percentage: number;
} {
  const current = request.completedSteps.length;
  const total = CHANGE_STEPS.length;
  return {
    current,
    total,
    percentage: Math.round((current / total) * 100),
  };
}

export function canSkipApproval(request: ChangeRequest): boolean {
  // Never skip approval for high/critical risk
  if (request.risk?.level === "high" || request.risk?.level === "critical") {
    return false;
  }
  // Never skip for irreversible changes
  if (request.risk?.reversibility === "irreversible") {
    return false;
  }
  // Never skip for multi-file changes
  if (request.scope && request.scope.files.length > 1) {
    return false;
  }
  return false; // Actually, never skip - this is for documentation
}
