/**
 * Hero IDE - Violation Detection and Self-Reporting System
 * 
 * If the system detects a violation, it MUST:
 * - Immediately halt
 * - Disclose the violation
 * - Rollback or isolate effects
 * - Explain how to prevent recurrence
 * 
 * Self-reporting violations is MANDATORY.
 * 
 * Based on Section 11: Violation Handling (Critical)
 */

// ════════════════════════════════════════════════════════════════════════════
// VIOLATION TYPES
// ════════════════════════════════════════════════════════════════════════════

export type ViolationType =
  | "scope_exceeded"
  | "unauthorized_context"
  | "autonomy_violation"
  | "limit_exceeded"
  | "approval_bypassed"
  | "step_skipped"
  | "silent_escalation"
  | "silent_scope_broadening"
  | "confidence_rule_breaking"
  | "hidden_context"
  | "push_through_ambiguity"
  | "speed_over_safety";

export interface Violation {
  id: string;
  type: ViolationType;
  severity: "minor" | "major" | "critical";
  timestamp: Date;
  
  // What happened
  description: string;
  details: string;
  
  // Evidence
  evidence: {
    action: string;
    expectedBehavior: string;
    actualBehavior: string;
    context: Record<string, any>;
  };
  
  // Impact
  affectedResources: string[];
  potentialDamage: string;
  
  // Response
  halted: boolean;
  haltedAt: Date | null;
  disclosed: boolean;
  disclosedAt: Date | null;
  
  // Recovery
  rollbackAvailable: boolean;
  rollbackPerformed: boolean;
  isolationPerformed: boolean;
  
  // User acknowledgment
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  
  // Prevention
  preventionSteps: string[];
  recurrenceRisk: "low" | "medium" | "high";
  suggestedAction?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// ANTI-PATTERN DEFINITIONS (Section 12)
// ════════════════════════════════════════════════════════════════════════════

export const ANTI_PATTERNS: Record<ViolationType, {
  name: string;
  description: string;
  detection: string;
  prevention: string[];
}> = {
  scope_exceeded: {
    name: "Scope Exceeded",
    description: "System operated outside declared scope",
    detection: "Action affected files/resources not in declared scope",
    prevention: [
      "Always declare scope before taking action",
      "Validate each action against declared scope",
      "Request scope expansion if needed",
    ],
  },
  unauthorized_context: {
    name: "Unauthorized Context",
    description: "System used context not explicitly approved",
    detection: "Context source not in approved list",
    prevention: [
      "Only use user-provided or dependency-required context",
      "Request approval for additional context",
      "Log all context additions",
    ],
  },
  autonomy_violation: {
    name: "Autonomy Violation",
    description: "System exceeded autonomy mode permissions",
    detection: "Action not allowed in current autonomy mode",
    prevention: [
      "Check autonomy mode before each action",
      "Request mode transition if more autonomy needed",
      "Never assume permissions",
    ],
  },
  limit_exceeded: {
    name: "Limit Exceeded",
    description: "System exceeded budget or resource limits",
    detection: "Usage metric exceeded configured limit",
    prevention: [
      "Check limits before each action",
      "Fail early when approaching limits",
      "Request limit increase if needed",
    ],
  },
  approval_bypassed: {
    name: "Approval Bypassed",
    description: "System took action without required approval",
    detection: "Action requiring approval executed without it",
    prevention: [
      "Always check approval requirements",
      "Never skip approval steps",
      "Log all approval decisions",
    ],
  },
  step_skipped: {
    name: "Step Skipped",
    description: "System skipped required lifecycle step",
    detection: "Change lifecycle step not completed",
    prevention: [
      "Follow forced lifecycle for all changes",
      "Validate step completion before proceeding",
      "Never skip steps even if confident",
    ],
  },
  silent_escalation: {
    name: "Silent Autonomy Escalation",
    description: "System increased autonomy without disclosure",
    detection: "Autonomy level changed without user acknowledgment",
    prevention: [
      "Always disclose autonomy changes",
      "Require explicit acknowledgment",
      "Log all mode transitions",
    ],
  },
  silent_scope_broadening: {
    name: "Silent Scope Broadening",
    description: "System expanded scope without disclosure",
    detection: "Scope increased without user notification",
    prevention: [
      "Always disclose scope changes",
      "Request approval for scope expansion",
      "Maintain scope audit trail",
    ],
  },
  confidence_rule_breaking: {
    name: "Confidence-Based Rule Breaking",
    description: "System broke rules due to high confidence",
    detection: "Rule violated with confidence as justification",
    prevention: [
      "Rules apply regardless of confidence",
      "Confidence is not a valid override",
      "Report rule conflicts instead of breaking",
    ],
  },
  hidden_context: {
    name: "Hidden Context Selection",
    description: "System used context without transparency",
    detection: "Context used but not logged or disclosed",
    prevention: [
      "Log all context selections",
      "Make context inspectable",
      "Never hide reasoning inputs",
    ],
  },
  push_through_ambiguity: {
    name: "Push Through Ambiguity",
    description: "System continued despite high uncertainty",
    detection: "Action taken when ambiguity threshold exceeded",
    prevention: [
      "Halt on high ambiguity",
      "Request clarification",
      "Never assume user prefers completion",
    ],
  },
  speed_over_safety: {
    name: "Speed Over Safety",
    description: "System prioritized speed over safety checks",
    detection: "Safety check skipped for performance",
    prevention: [
      "Safety checks are mandatory",
      "Never optimize away safety",
      "Report performance concerns separately",
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// VIOLATION STATE
// ════════════════════════════════════════════════════════════════════════════

export interface ViolationState {
  violations: Violation[];
  isHalted: boolean;
  haltReason: string | null;
  pendingDisclosures: Violation[];
  pendingRollbacks: Violation[];
}

export function createInitialViolationState(): ViolationState {
  return {
    violations: [],
    isHalted: false,
    haltReason: null,
    pendingDisclosures: [],
    pendingRollbacks: [],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// VIOLATION DETECTION
// ════════════════════════════════════════════════════════════════════════════

export interface DetectionResult {
  violated: boolean;
  violations: Violation[];
  mustHalt: boolean;
  mustDisclose: boolean;
  mustRollback: boolean;
}

export function detectViolation(
  type: ViolationType,
  evidence: Violation["evidence"],
  affectedResources: string[]
): DetectionResult {
  const pattern = ANTI_PATTERNS[type];
  
  const violation: Violation = {
    id: generateViolationId(),
    type,
    severity: determineSeverity(type, affectedResources),
    timestamp: new Date(),
    description: pattern.description,
    details: `${pattern.detection}. Action: ${evidence.action}`,
    evidence,
    affectedResources,
    potentialDamage: assessDamage(type, affectedResources),
    halted: false,
    haltedAt: null,
    disclosed: false,
    disclosedAt: null,
    rollbackAvailable: canRollback(type),
    rollbackPerformed: false,
    isolationPerformed: false,
    acknowledged: false,
    acknowledgedAt: null,
    preventionSteps: pattern.prevention,
    recurrenceRisk: assessRecurrenceRisk(type),
    suggestedAction: pattern.prevention[0] || "Review and prevent recurrence",
  };

  return {
    violated: true,
    violations: [violation],
    mustHalt: violation.severity !== "minor",
    mustDisclose: true, // Always disclose
    mustRollback: violation.severity === "critical" && violation.rollbackAvailable,
  };
}

function determineSeverity(
  type: ViolationType,
  affectedResources: string[]
): Violation["severity"] {
  // Critical violations
  const criticalTypes: ViolationType[] = [
    "autonomy_violation",
    "approval_bypassed",
    "silent_escalation",
    "confidence_rule_breaking",
  ];
  if (criticalTypes.includes(type)) return "critical";

  // Major violations
  const majorTypes: ViolationType[] = [
    "scope_exceeded",
    "unauthorized_context",
    "step_skipped",
    "silent_scope_broadening",
    "push_through_ambiguity",
  ];
  if (majorTypes.includes(type)) return "major";

  // Resource-based escalation
  if (affectedResources.length > 5) return "major";
  if (affectedResources.some((r) => r.includes("config") || r.includes("env"))) {
    return "major";
  }

  return "minor";
}

function assessDamage(type: ViolationType, resources: string[]): string {
  if (resources.length === 0) {
    return "No resources directly affected";
  }
  
  const criticalResources = resources.filter(
    (r) => r.includes("config") || r.includes("env") || r.includes("auth")
  );
  
  if (criticalResources.length > 0) {
    return `Critical resources affected: ${criticalResources.join(", ")}`;
  }
  
  return `${resources.length} resource(s) affected: ${resources.slice(0, 3).join(", ")}${resources.length > 3 ? "..." : ""}`;
}

function canRollback(type: ViolationType): boolean {
  // Some violations can't be rolled back
  const noRollback: ViolationType[] = [
    "hidden_context", // Already used
    "speed_over_safety", // Damage may be done
  ];
  return !noRollback.includes(type);
}

function assessRecurrenceRisk(type: ViolationType): Violation["recurrenceRisk"] {
  // Systemic issues have higher recurrence risk
  const highRisk: ViolationType[] = [
    "confidence_rule_breaking",
    "speed_over_safety",
    "push_through_ambiguity",
  ];
  if (highRisk.includes(type)) return "high";

  const mediumRisk: ViolationType[] = [
    "silent_escalation",
    "silent_scope_broadening",
    "hidden_context",
  ];
  if (mediumRisk.includes(type)) return "medium";

  return "low";
}

// ════════════════════════════════════════════════════════════════════════════
// VIOLATION RESPONSE (MANDATORY)
// ════════════════════════════════════════════════════════════════════════════

export interface ResponseResult {
  state: ViolationState;
  actions: {
    halted: boolean;
    disclosed: boolean;
    rolledBack: boolean;
    isolated: boolean;
  };
  userMessage: string;
  preventionAdvice: string[];
}

export function respondToViolation(
  state: ViolationState,
  violation: Violation
): ResponseResult {
  const actions = {
    halted: false,
    disclosed: false,
    rolledBack: false,
    isolated: false,
  };

  // 1. IMMEDIATELY HALT (if severity warrants)
  if (violation.severity !== "minor") {
    violation.halted = true;
    violation.haltedAt = new Date();
    actions.halted = true;
  }

  // 2. DISCLOSE THE VIOLATION (always)
  violation.disclosed = true;
  violation.disclosedAt = new Date();
  actions.disclosed = true;

  // 3. ROLLBACK OR ISOLATE (if critical)
  if (violation.severity === "critical") {
    if (violation.rollbackAvailable) {
      violation.rollbackPerformed = true;
      actions.rolledBack = true;
    } else {
      violation.isolationPerformed = true;
      actions.isolated = true;
    }
  }

  // Update state
  const newState: ViolationState = {
    violations: [...state.violations, violation],
    isHalted: actions.halted || state.isHalted,
    haltReason: actions.halted ? violation.description : state.haltReason,
    pendingDisclosures: state.pendingDisclosures.filter((v) => v.id !== violation.id),
    pendingRollbacks: actions.rolledBack
      ? state.pendingRollbacks.filter((v) => v.id !== violation.id)
      : state.pendingRollbacks,
  };

  // Generate user message
  const userMessage = generateUserMessage(violation, actions);

  return {
    state: newState,
    actions,
    userMessage,
    preventionAdvice: violation.preventionSteps,
  };
}

function generateUserMessage(
  violation: Violation,
  actions: ResponseResult["actions"]
): string {
  const parts: string[] = [];

  // Severity indicator
  const severityEmoji = {
    minor: "⚠️",
    major: "🚨",
    critical: "🛑",
  };
  parts.push(`${severityEmoji[violation.severity]} **Violation Detected: ${ANTI_PATTERNS[violation.type].name}**`);

  // What happened
  parts.push(`\n**What happened:** ${violation.description}`);
  parts.push(`\n**Details:** ${violation.details}`);

  // Actions taken
  const actionsTaken: string[] = [];
  if (actions.halted) actionsTaken.push("Execution halted");
  if (actions.rolledBack) actionsTaken.push("Changes rolled back");
  if (actions.isolated) actionsTaken.push("Effects isolated");
  if (actionsTaken.length > 0) {
    parts.push(`\n**Actions taken:** ${actionsTaken.join(", ")}`);
  }

  // Affected resources
  if (violation.affectedResources.length > 0) {
    parts.push(`\n**Affected resources:** ${violation.affectedResources.join(", ")}`);
  }

  // Prevention
  parts.push(`\n**To prevent recurrence:**`);
  violation.preventionSteps.forEach((step, i) => {
    parts.push(`${i + 1}. ${step}`);
  });

  return parts.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
// VIOLATION AUDIT
// ════════════════════════════════════════════════════════════════════════════

export interface ViolationAudit {
  timestamp: Date;
  totalViolations: number;
  bySeverity: Record<Violation["severity"], number>;
  byType: Record<ViolationType, number>;
  unresolved: number;
  recurrencePatterns: {
    type: ViolationType;
    count: number;
    lastOccurred: Date;
  }[];
  recommendations: string[];
}

export function auditViolations(state: ViolationState): ViolationAudit {
  const bySeverity: Record<Violation["severity"], number> = {
    minor: 0,
    major: 0,
    critical: 0,
  };

  const byType: Partial<Record<ViolationType, number>> = {};
  const typeLastOccurred: Partial<Record<ViolationType, Date>> = {};

  for (const violation of state.violations) {
    bySeverity[violation.severity]++;
    byType[violation.type] = (byType[violation.type] || 0) + 1;
    
    if (!typeLastOccurred[violation.type] || 
        violation.timestamp > typeLastOccurred[violation.type]!) {
      typeLastOccurred[violation.type] = violation.timestamp;
    }
  }

  // Find recurrence patterns
  const recurrencePatterns = Object.entries(byType)
    .filter(([_, count]) => count > 1)
    .map(([type, count]) => ({
      type: type as ViolationType,
      count,
      lastOccurred: typeLastOccurred[type as ViolationType]!,
    }))
    .sort((a, b) => b.count - a.count);

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (bySeverity.critical > 0) {
    recommendations.push("Review and strengthen critical violation prevention measures");
  }
  
  for (const pattern of recurrencePatterns.slice(0, 3)) {
    const antiPattern = ANTI_PATTERNS[pattern.type];
    recommendations.push(
      `Address recurring ${antiPattern.name} violations (${pattern.count} occurrences)`
    );
  }

  return {
    timestamp: new Date(),
    totalViolations: state.violations.length,
    bySeverity,
    byType: byType as Record<ViolationType, number>,
    unresolved: state.violations.filter((v) => !v.rollbackPerformed && !v.isolationPerformed).length,
    recurrencePatterns,
    recommendations,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function generateViolationId(): string {
  return `viol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
