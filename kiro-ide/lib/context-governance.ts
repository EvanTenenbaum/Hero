/**
 * Hero IDE - Context Governance System
 * 
 * Context selection is governed by enforceable logic.
 * No information may be used unless explicitly tracked and approved.
 * 
 * Based on Section 5: Context Governance (Primary Failure Vector)
 */

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT SOURCE TYPES
// ════════════════════════════════════════════════════════════════════════════

export type ContextSourceType =
  | "user-provided"
  | "dependency-required"
  | "explicitly-approved"
  | "auto-included"; // Only allowed in agentic mode with logging

export interface ContextSource {
  id: string;
  type: ContextSourceType;
  source: string; // e.g., "file:src/index.ts", "user:message", "system:project-structure"
  purpose: string;
  relevance: number; // 0-1, marginal relevance score
  addedAt: Date;
  approvedBy: "user" | "system" | "agent" | null;
  tokenCount: number;
  content: string;
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT THRESHOLDS
// ════════════════════════════════════════════════════════════════════════════

export interface ContextThresholds {
  maxTotalTokens: number;
  maxSourceCount: number;
  maxBreadth: number; // Number of different directories/modules
  minRelevanceScore: number;
  ambiguityThreshold: number; // 0-1, above this requires clarification
}

export const DEFAULT_THRESHOLDS: ContextThresholds = {
  maxTotalTokens: 32000,
  maxSourceCount: 20,
  maxBreadth: 5,
  minRelevanceScore: 0.3,
  ambiguityThreshold: 0.7,
};

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT STATE
// ════════════════════════════════════════════════════════════════════════════

export interface ContextState {
  sources: ContextSource[];
  totalTokens: number;
  breadth: number;
  ambiguityScore: number;
  thresholds: ContextThresholds;
  
  // Threshold violations
  violations: ContextViolation[];
  
  // Inspection state
  lastInspected: Date | null;
  inspectionRequired: boolean;
}

export interface ContextViolation {
  id: string;
  type: "token_limit" | "source_limit" | "breadth_limit" | "low_relevance" | "high_ambiguity" | "unauthorized_source";
  severity: "warning" | "error" | "critical";
  message: string;
  source?: ContextSource;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT GOVERNANCE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

export function createInitialContextState(): ContextState {
  return {
    sources: [],
    totalTokens: 0,
    breadth: 0,
    ambiguityScore: 0,
    thresholds: { ...DEFAULT_THRESHOLDS },
    violations: [],
    lastInspected: null,
    inspectionRequired: false,
  };
}

export interface AddContextResult {
  success: boolean;
  contextState: ContextState;
  violations: ContextViolation[];
  requiresApproval: boolean;
  requiresNarrowing: boolean;
  message?: string;
}

export function addContextSource(
  state: ContextState,
  source: Omit<ContextSource, "id" | "addedAt">
): AddContextResult {
  const newSource: ContextSource = {
    ...source,
    id: generateContextId(),
    addedAt: new Date(),
  };

  const violations: ContextViolation[] = [];
  let requiresApproval = false;
  let requiresNarrowing = false;

  // Check source type authorization
  if (source.type === "auto-included" && source.approvedBy !== "user") {
    violations.push({
      id: generateViolationId(),
      type: "unauthorized_source",
      severity: "error",
      message: `Auto-included context requires explicit user approval: ${source.source}`,
      source: newSource,
      timestamp: new Date(),
      resolved: false,
    });
    requiresApproval = true;
  }

  // Check relevance threshold
  if (source.relevance < state.thresholds.minRelevanceScore) {
    violations.push({
      id: generateViolationId(),
      type: "low_relevance",
      severity: "warning",
      message: `Low relevance score (${source.relevance.toFixed(2)}): ${source.source}`,
      source: newSource,
      timestamp: new Date(),
      resolved: false,
    });
  }

  // Check token limit
  const newTotalTokens = state.totalTokens + source.tokenCount;
  if (newTotalTokens > state.thresholds.maxTotalTokens) {
    violations.push({
      id: generateViolationId(),
      type: "token_limit",
      severity: "critical",
      message: `Token limit exceeded: ${newTotalTokens} > ${state.thresholds.maxTotalTokens}`,
      timestamp: new Date(),
      resolved: false,
    });
    requiresNarrowing = true;
  }

  // Check source count
  const newSourceCount = state.sources.length + 1;
  if (newSourceCount > state.thresholds.maxSourceCount) {
    violations.push({
      id: generateViolationId(),
      type: "source_limit",
      severity: "error",
      message: `Source count limit exceeded: ${newSourceCount} > ${state.thresholds.maxSourceCount}`,
      timestamp: new Date(),
      resolved: false,
    });
    requiresNarrowing = true;
  }

  // Check breadth
  const newBreadth = calculateBreadth([...state.sources, newSource]);
  if (newBreadth > state.thresholds.maxBreadth) {
    violations.push({
      id: generateViolationId(),
      type: "breadth_limit",
      severity: "error",
      message: `Breadth limit exceeded: ${newBreadth} directories > ${state.thresholds.maxBreadth}`,
      timestamp: new Date(),
      resolved: false,
    });
    requiresApproval = true;
  }

  // If critical violations, don't add the source
  const hasCritical = violations.some((v) => v.severity === "critical");
  if (hasCritical) {
    return {
      success: false,
      contextState: {
        ...state,
        violations: [...state.violations, ...violations],
        inspectionRequired: true,
      },
      violations,
      requiresApproval,
      requiresNarrowing,
      message: "Critical threshold exceeded. Context narrowing required.",
    };
  }

  // Add source with warnings
  const newState: ContextState = {
    ...state,
    sources: [...state.sources, newSource],
    totalTokens: newTotalTokens,
    breadth: newBreadth,
    violations: [...state.violations, ...violations],
    inspectionRequired: violations.length > 0,
  };

  return {
    success: true,
    contextState: newState,
    violations,
    requiresApproval,
    requiresNarrowing,
  };
}

export function removeContextSource(
  state: ContextState,
  sourceId: string
): ContextState {
  const source = state.sources.find((s) => s.id === sourceId);
  if (!source) return state;

  const newSources = state.sources.filter((s) => s.id !== sourceId);
  
  return {
    ...state,
    sources: newSources,
    totalTokens: state.totalTokens - source.tokenCount,
    breadth: calculateBreadth(newSources),
    // Resolve violations related to this source
    violations: state.violations.map((v) =>
      v.source?.id === sourceId
        ? { ...v, resolved: true, resolution: "Source removed" }
        : v
    ),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT INSPECTION
// ════════════════════════════════════════════════════════════════════════════

export interface ContextInspection {
  timestamp: Date;
  question: "What information am I reasoning from right now?";
  sources: {
    source: string;
    type: ContextSourceType;
    purpose: string;
    relevance: number;
    tokenCount: number;
  }[];
  summary: {
    totalSources: number;
    totalTokens: number;
    breadth: number;
    averageRelevance: number;
    unresolvedViolations: number;
  };
  warnings: string[];
}

export function inspectContext(state: ContextState): ContextInspection {
  const unresolvedViolations = state.violations.filter((v) => !v.resolved);
  const avgRelevance =
    state.sources.length > 0
      ? state.sources.reduce((sum, s) => sum + s.relevance, 0) / state.sources.length
      : 0;

  const warnings: string[] = [];
  
  if (unresolvedViolations.length > 0) {
    warnings.push(`${unresolvedViolations.length} unresolved context violations`);
  }
  
  if (state.totalTokens > state.thresholds.maxTotalTokens * 0.8) {
    warnings.push("Approaching token limit (>80%)");
  }
  
  if (avgRelevance < 0.5) {
    warnings.push("Low average relevance score - consider narrowing context");
  }

  return {
    timestamp: new Date(),
    question: "What information am I reasoning from right now?",
    sources: state.sources.map((s) => ({
      source: s.source,
      type: s.type,
      purpose: s.purpose,
      relevance: s.relevance,
      tokenCount: s.tokenCount,
    })),
    summary: {
      totalSources: state.sources.length,
      totalTokens: state.totalTokens,
      breadth: state.breadth,
      averageRelevance: avgRelevance,
      unresolvedViolations: unresolvedViolations.length,
    },
    warnings,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// AMBIGUITY DETECTION
// ════════════════════════════════════════════════════════════════════════════

export interface AmbiguityAnalysis {
  score: number; // 0-1
  factors: {
    factor: string;
    contribution: number;
    description: string;
  }[];
  recommendation: "proceed" | "clarify" | "halt";
  clarificationQuestions?: string[];
}

export function analyzeAmbiguity(state: ContextState): AmbiguityAnalysis {
  const factors: AmbiguityAnalysis["factors"] = [];
  let totalScore = 0;

  // Factor 1: Conflicting information
  const conflictScore = detectConflicts(state.sources);
  if (conflictScore > 0) {
    factors.push({
      factor: "conflicting_information",
      contribution: conflictScore * 0.3,
      description: "Multiple sources contain potentially conflicting information",
    });
    totalScore += conflictScore * 0.3;
  }

  // Factor 2: Missing context
  const missingScore = detectMissingContext(state.sources);
  if (missingScore > 0) {
    factors.push({
      factor: "missing_context",
      contribution: missingScore * 0.25,
      description: "Referenced files or dependencies not included in context",
    });
    totalScore += missingScore * 0.25;
  }

  // Factor 3: Low relevance average
  const avgRelevance =
    state.sources.length > 0
      ? state.sources.reduce((sum, s) => sum + s.relevance, 0) / state.sources.length
      : 1;
  const relevanceScore = 1 - avgRelevance;
  if (relevanceScore > 0.3) {
    factors.push({
      factor: "low_relevance",
      contribution: relevanceScore * 0.2,
      description: "Context sources have low relevance scores",
    });
    totalScore += relevanceScore * 0.2;
  }

  // Factor 4: High breadth
  const breadthScore = state.breadth / state.thresholds.maxBreadth;
  if (breadthScore > 0.6) {
    factors.push({
      factor: "high_breadth",
      contribution: breadthScore * 0.15,
      description: "Context spans many different areas of the codebase",
    });
    totalScore += breadthScore * 0.15;
  }

  // Factor 5: Unresolved violations
  const violationScore = state.violations.filter((v) => !v.resolved).length / 5;
  if (violationScore > 0) {
    factors.push({
      factor: "unresolved_violations",
      contribution: Math.min(violationScore, 1) * 0.1,
      description: "Context has unresolved governance violations",
    });
    totalScore += Math.min(violationScore, 1) * 0.1;
  }

  // Determine recommendation
  let recommendation: AmbiguityAnalysis["recommendation"];
  let clarificationQuestions: string[] | undefined;

  if (totalScore < 0.3) {
    recommendation = "proceed";
  } else if (totalScore < state.thresholds.ambiguityThreshold) {
    recommendation = "clarify";
    clarificationQuestions = generateClarificationQuestions(factors);
  } else {
    recommendation = "halt";
    clarificationQuestions = generateClarificationQuestions(factors);
  }

  return {
    score: Math.min(totalScore, 1),
    factors,
    recommendation,
    clarificationQuestions,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function calculateBreadth(sources: ContextSource[]): number {
  const directories = new Set<string>();
  for (const source of sources) {
    if (source.source.startsWith("file:")) {
      const path = source.source.replace("file:", "");
      const dir = path.split("/").slice(0, -1).join("/");
      if (dir) directories.add(dir);
    }
  }
  return directories.size;
}

function detectConflicts(sources: ContextSource[]): number {
  // Simplified conflict detection - in production, this would be more sophisticated
  // Check for multiple versions of same file, conflicting comments, etc.
  const fileVersions = new Map<string, number>();
  for (const source of sources) {
    if (source.source.startsWith("file:")) {
      const file = source.source.replace("file:", "");
      fileVersions.set(file, (fileVersions.get(file) || 0) + 1);
    }
  }
  const duplicates = Array.from(fileVersions.values()).filter((v) => v > 1).length;
  return duplicates > 0 ? Math.min(duplicates / 3, 1) : 0;
}

function detectMissingContext(sources: ContextSource[]): number {
  // Simplified missing context detection
  // In production, would analyze imports, references, etc.
  const hasImports = sources.some((s) => s.content.includes("import "));
  const hasReferences = sources.some((s) => s.content.includes("require("));
  
  if ((hasImports || hasReferences) && sources.length < 3) {
    return 0.5; // Likely missing dependency context
  }
  return 0;
}

function generateClarificationQuestions(
  factors: AmbiguityAnalysis["factors"]
): string[] {
  const questions: string[] = [];
  
  for (const factor of factors) {
    switch (factor.factor) {
      case "conflicting_information":
        questions.push("Which version of the conflicting information should I prioritize?");
        break;
      case "missing_context":
        questions.push("Should I include additional related files in the context?");
        break;
      case "low_relevance":
        questions.push("Can you help me narrow down which parts of the codebase are most relevant?");
        break;
      case "high_breadth":
        questions.push("Should I focus on a specific module or area of the codebase?");
        break;
    }
  }
  
  return questions;
}

function generateContextId(): string {
  return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateViolationId(): string {
  return `vio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
