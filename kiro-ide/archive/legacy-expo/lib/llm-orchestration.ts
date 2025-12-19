/**
 * KIRO IDE - LLM Orchestration System
 * 
 * Smart routing of prompts to strategic 3rd party LLMs based on:
 * - Prompt goals and complexity
 * - Model known strengths
 * - Risk level of the task
 * - Budget constraints
 * - Latency requirements
 */

// ════════════════════════════════════════════════════════════════════════════
// MODEL DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

export type ModelProvider = 
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "groq"
  | "local";

export type ModelCapability =
  | "code_generation"
  | "code_review"
  | "reasoning"
  | "planning"
  | "documentation"
  | "refactoring"
  | "debugging"
  | "testing"
  | "natural_language"
  | "vision"
  | "function_calling"
  | "long_context";

export interface ModelProfile {
  id: string;
  provider: ModelProvider;
  name: string;
  displayName: string;
  
  // Capabilities
  capabilities: ModelCapability[];
  strengths: string[];
  weaknesses: string[];
  
  // Performance
  contextWindow: number;
  maxOutputTokens: number;
  averageLatencyMs: number;
  
  // Cost
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  
  // Risk profile
  reliabilityScore: number; // 0-100
  hallucinationRisk: "low" | "medium" | "high";
  
  // Availability
  available: boolean;
  rateLimit: number; // requests per minute
}

export const MODEL_PROFILES: ModelProfile[] = [
  {
    id: "gpt-4o",
    provider: "openai",
    name: "gpt-4o",
    displayName: "GPT-4o",
    capabilities: ["code_generation", "reasoning", "planning", "function_calling", "vision"],
    strengths: ["Broad knowledge", "Good at following instructions", "Strong reasoning"],
    weaknesses: ["Can be verbose", "Expensive for simple tasks"],
    contextWindow: 128000,
    maxOutputTokens: 16384,
    averageLatencyMs: 2000,
    inputCostPer1kTokens: 0.005,
    outputCostPer1kTokens: 0.015,
    reliabilityScore: 90,
    hallucinationRisk: "low",
    available: true,
    rateLimit: 500,
  },
  {
    id: "claude-3-5-sonnet",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    capabilities: ["code_generation", "code_review", "reasoning", "long_context", "documentation"],
    strengths: ["Excellent code quality", "Strong reasoning", "Good at nuance", "200K context"],
    weaknesses: ["Can be overly cautious", "Sometimes verbose"],
    contextWindow: 200000,
    maxOutputTokens: 8192,
    averageLatencyMs: 1500,
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    reliabilityScore: 95,
    hallucinationRisk: "low",
    available: true,
    rateLimit: 1000,
  },
  {
    id: "gemini-2.0-flash",
    provider: "google",
    name: "gemini-2.0-flash-exp",
    displayName: "Gemini 2.0 Flash",
    capabilities: ["code_generation", "reasoning", "vision", "function_calling", "long_context"],
    strengths: ["Fast", "Good multimodal", "Large context", "Cost effective"],
    weaknesses: ["Less nuanced than larger models"],
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    averageLatencyMs: 800,
    inputCostPer1kTokens: 0.00035,
    outputCostPer1kTokens: 0.0014,
    reliabilityScore: 85,
    hallucinationRisk: "medium",
    available: true,
    rateLimit: 2000,
  },
  {
    id: "mistral-large",
    provider: "mistral",
    name: "mistral-large-latest",
    displayName: "Mistral Large",
    capabilities: ["code_generation", "reasoning", "function_calling"],
    strengths: ["Good code generation", "Fast", "Competitive pricing"],
    weaknesses: ["Smaller context", "Less capable at complex reasoning"],
    contextWindow: 32000,
    maxOutputTokens: 8192,
    averageLatencyMs: 1000,
    inputCostPer1kTokens: 0.004,
    outputCostPer1kTokens: 0.012,
    reliabilityScore: 80,
    hallucinationRisk: "medium",
    available: true,
    rateLimit: 500,
  },
  {
    id: "llama-3.1-70b",
    provider: "groq",
    name: "llama-3.1-70b-versatile",
    displayName: "Llama 3.1 70B (Groq)",
    capabilities: ["code_generation", "reasoning", "natural_language"],
    strengths: ["Very fast", "Open source", "Good for simple tasks"],
    weaknesses: ["Less capable than frontier models", "Smaller context"],
    contextWindow: 131072,
    maxOutputTokens: 8192,
    averageLatencyMs: 300,
    inputCostPer1kTokens: 0.00059,
    outputCostPer1kTokens: 0.00079,
    reliabilityScore: 75,
    hallucinationRisk: "medium",
    available: true,
    rateLimit: 30,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// TASK CLASSIFICATION
// ════════════════════════════════════════════════════════════════════════════

export type TaskType =
  | "code_generation"
  | "code_review"
  | "bug_fix"
  | "refactoring"
  | "documentation"
  | "planning"
  | "testing"
  | "explanation"
  | "chat"
  | "agent_action";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface TaskClassification {
  type: TaskType;
  complexity: "trivial" | "simple" | "moderate" | "complex" | "expert";
  riskLevel: RiskLevel;
  requiredCapabilities: ModelCapability[];
  estimatedTokens: number;
  latencyRequirement: "fast" | "normal" | "slow_ok";
  qualityRequirement: "draft" | "standard" | "high" | "critical";
}

export function classifyTask(
  prompt: string,
  context: {
    isAgentAction?: boolean;
    affectedFiles?: string[];
    hasTests?: boolean;
    isProduction?: boolean;
  }
): TaskClassification {
  const lowerPrompt = prompt.toLowerCase();
  
  // Determine task type
  let type: TaskType = "chat";
  if (context.isAgentAction) type = "agent_action";
  else if (lowerPrompt.includes("write") || lowerPrompt.includes("create") || lowerPrompt.includes("implement")) {
    type = "code_generation";
  } else if (lowerPrompt.includes("review") || lowerPrompt.includes("check")) {
    type = "code_review";
  } else if (lowerPrompt.includes("fix") || lowerPrompt.includes("bug") || lowerPrompt.includes("error")) {
    type = "bug_fix";
  } else if (lowerPrompt.includes("refactor") || lowerPrompt.includes("improve")) {
    type = "refactoring";
  } else if (lowerPrompt.includes("document") || lowerPrompt.includes("explain")) {
    type = "documentation";
  } else if (lowerPrompt.includes("plan") || lowerPrompt.includes("design") || lowerPrompt.includes("architect")) {
    type = "planning";
  } else if (lowerPrompt.includes("test")) {
    type = "testing";
  }

  // Determine complexity
  const wordCount = prompt.split(/\s+/).length;
  let complexity: TaskClassification["complexity"] = "simple";
  if (wordCount > 500) complexity = "expert";
  else if (wordCount > 200) complexity = "complex";
  else if (wordCount > 100) complexity = "moderate";
  else if (wordCount > 30) complexity = "simple";
  else complexity = "trivial";

  // Determine risk level
  let riskLevel: RiskLevel = "low";
  if (context.isProduction) riskLevel = "critical";
  else if (context.affectedFiles && context.affectedFiles.length > 5) riskLevel = "high";
  else if (type === "agent_action" || type === "refactoring") riskLevel = "medium";
  else if (!context.hasTests && type === "code_generation") riskLevel = "medium";

  // Determine required capabilities
  const requiredCapabilities: ModelCapability[] = [];
  if (type === "code_generation" || type === "bug_fix" || type === "refactoring") {
    requiredCapabilities.push("code_generation");
  }
  if (type === "code_review") {
    requiredCapabilities.push("code_review", "reasoning");
  }
  if (type === "planning") {
    requiredCapabilities.push("planning", "reasoning");
  }
  if (type === "documentation") {
    requiredCapabilities.push("documentation", "natural_language");
  }
  if (complexity === "complex" || complexity === "expert") {
    requiredCapabilities.push("reasoning");
  }

  // Estimate tokens
  const estimatedTokens = Math.max(500, wordCount * 4 + 1000);

  // Determine latency requirement
  let latencyRequirement: TaskClassification["latencyRequirement"] = "normal";
  if (type === "chat" || complexity === "trivial") latencyRequirement = "fast";
  else if (type === "planning" || complexity === "expert") latencyRequirement = "slow_ok";

  // Determine quality requirement
  let qualityRequirement: TaskClassification["qualityRequirement"] = "standard";
  if (riskLevel === "critical") qualityRequirement = "critical";
  else if (riskLevel === "high" || type === "code_review") qualityRequirement = "high";
  else if (type === "chat" || complexity === "trivial") qualityRequirement = "draft";

  return {
    type,
    complexity,
    riskLevel,
    requiredCapabilities,
    estimatedTokens,
    latencyRequirement,
    qualityRequirement,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// MODEL SELECTION
// ════════════════════════════════════════════════════════════════════════════

export interface ModelSelectionCriteria {
  task: TaskClassification;
  budgetCentsRemaining: number;
  preferredProviders?: ModelProvider[];
  excludedProviders?: ModelProvider[];
  maxLatencyMs?: number;
  minReliability?: number;
}

export interface ModelSelection {
  primary: ModelProfile;
  fallback?: ModelProfile;
  reasoning: string;
  estimatedCost: number;
  estimatedLatency: number;
  confidenceScore: number;
}

export function selectModel(criteria: ModelSelectionCriteria): ModelSelection {
  const { task, budgetCentsRemaining, preferredProviders, excludedProviders, maxLatencyMs, minReliability } = criteria;
  
  // Filter available models
  let candidates = MODEL_PROFILES.filter((m) => {
    if (!m.available) return false;
    if (excludedProviders?.includes(m.provider)) return false;
    if (minReliability && m.reliabilityScore < minReliability) return false;
    if (maxLatencyMs && m.averageLatencyMs > maxLatencyMs) return false;
    
    // Check capabilities
    const hasRequiredCapabilities = task.requiredCapabilities.every(
      (cap) => m.capabilities.includes(cap)
    );
    if (!hasRequiredCapabilities) return false;
    
    // Check budget
    const estimatedCost = calculateCost(m, task.estimatedTokens);
    if (estimatedCost > budgetCentsRemaining) return false;
    
    return true;
  });

  // Prefer specified providers
  if (preferredProviders && preferredProviders.length > 0) {
    const preferred = candidates.filter((m) => preferredProviders.includes(m.provider));
    if (preferred.length > 0) candidates = preferred;
  }

  // Score candidates
  const scored = candidates.map((model) => ({
    model,
    score: scoreModel(model, task),
  }));

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    // Fallback to cheapest available model
    const cheapest = MODEL_PROFILES.filter((m) => m.available).sort(
      (a, b) => a.inputCostPer1kTokens - b.inputCostPer1kTokens
    )[0];
    
    return {
      primary: cheapest,
      reasoning: "No ideal model found, using cheapest available",
      estimatedCost: calculateCost(cheapest, task.estimatedTokens),
      estimatedLatency: cheapest.averageLatencyMs,
      confidenceScore: 50,
    };
  }

  const primary = scored[0].model;
  const fallback = scored.length > 1 ? scored[1].model : undefined;

  return {
    primary,
    fallback,
    reasoning: generateReasoning(primary, task),
    estimatedCost: calculateCost(primary, task.estimatedTokens),
    estimatedLatency: primary.averageLatencyMs,
    confidenceScore: scored[0].score,
  };
}

function scoreModel(model: ModelProfile, task: TaskClassification): number {
  let score = 50; // Base score

  // Capability match
  const capabilityMatch = task.requiredCapabilities.filter(
    (cap) => model.capabilities.includes(cap)
  ).length / task.requiredCapabilities.length;
  score += capabilityMatch * 20;

  // Quality match
  if (task.qualityRequirement === "critical" && model.reliabilityScore >= 90) {
    score += 15;
  } else if (task.qualityRequirement === "high" && model.reliabilityScore >= 80) {
    score += 10;
  }

  // Latency match
  if (task.latencyRequirement === "fast" && model.averageLatencyMs < 1000) {
    score += 10;
  } else if (task.latencyRequirement === "normal" && model.averageLatencyMs < 2000) {
    score += 5;
  }

  // Risk consideration
  if (task.riskLevel === "critical" && model.hallucinationRisk === "low") {
    score += 15;
  } else if (task.riskLevel === "high" && model.hallucinationRisk !== "high") {
    score += 10;
  }

  // Cost efficiency
  const costPer1k = model.inputCostPer1kTokens + model.outputCostPer1kTokens;
  if (costPer1k < 0.01) score += 5;
  else if (costPer1k < 0.02) score += 3;

  // Reliability bonus
  score += model.reliabilityScore * 0.1;

  return Math.min(100, score);
}

function calculateCost(model: ModelProfile, estimatedTokens: number): number {
  const inputTokens = estimatedTokens * 0.7;
  const outputTokens = estimatedTokens * 0.3;
  
  const inputCost = (inputTokens / 1000) * model.inputCostPer1kTokens;
  const outputCost = (outputTokens / 1000) * model.outputCostPer1kTokens;
  
  return (inputCost + outputCost) * 100; // Convert to cents
}

function generateReasoning(model: ModelProfile, task: TaskClassification): string {
  const reasons: string[] = [];

  if (task.riskLevel === "critical" || task.riskLevel === "high") {
    reasons.push(`Selected ${model.displayName} for ${task.riskLevel} risk task due to ${model.hallucinationRisk} hallucination risk`);
  }

  if (task.qualityRequirement === "critical" || task.qualityRequirement === "high") {
    reasons.push(`${model.reliabilityScore}% reliability score meets ${task.qualityRequirement} quality requirement`);
  }

  if (task.latencyRequirement === "fast") {
    reasons.push(`${model.averageLatencyMs}ms average latency suitable for fast response`);
  }

  const matchingStrengths = model.strengths.filter((s) => {
    const lower = s.toLowerCase();
    return task.requiredCapabilities.some((cap) => lower.includes(cap.replace("_", " ")));
  });
  
  if (matchingStrengths.length > 0) {
    reasons.push(`Model strengths align: ${matchingStrengths.slice(0, 2).join(", ")}`);
  }

  return reasons.join(". ") || `${model.displayName} selected as best match for ${task.type} task`;
}

// ════════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

export interface APIConfig {
  provider: ModelProvider;
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
  enabled: boolean;
}

export interface LLMOrchestratorConfig {
  apis: APIConfig[];
  defaultProvider: ModelProvider;
  budgetLimitCents: number;
  riskTolerance: RiskLevel;
  preferFastModels: boolean;
  enableFallback: boolean;
}

export function createDefaultConfig(): LLMOrchestratorConfig {
  return {
    apis: [],
    defaultProvider: "anthropic",
    budgetLimitCents: 1000, // $10 default
    riskTolerance: "medium",
    preferFastModels: false,
    enableFallback: true,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════════════

export interface OrchestratorState {
  config: LLMOrchestratorConfig;
  usageHistory: {
    modelId: string;
    tokens: number;
    cost: number;
    timestamp: Date;
    taskType: TaskType;
    success: boolean;
  }[];
  totalSpentCents: number;
  requestCount: number;
}

export function createInitialOrchestratorState(): OrchestratorState {
  return {
    config: createDefaultConfig(),
    usageHistory: [],
    totalSpentCents: 0,
    requestCount: 0,
  };
}

export function getAvailableModels(config: LLMOrchestratorConfig): ModelProfile[] {
  const enabledProviders = config.apis
    .filter((api) => api.enabled && api.apiKey)
    .map((api) => api.provider);

  return MODEL_PROFILES.filter(
    (m) => m.available && enabledProviders.includes(m.provider)
  );
}

export function getModelStats(state: OrchestratorState): {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  successRate: number;
  modelUsage: Record<string, number>;
  taskTypeDistribution: Record<TaskType, number>;
} {
  const modelUsage: Record<string, number> = {};
  const taskTypeDistribution: Record<TaskType, number> = {} as Record<TaskType, number>;
  let totalTokens = 0;
  let successCount = 0;

  for (const usage of state.usageHistory) {
    modelUsage[usage.modelId] = (modelUsage[usage.modelId] || 0) + 1;
    taskTypeDistribution[usage.taskType] = (taskTypeDistribution[usage.taskType] || 0) + 1;
    totalTokens += usage.tokens;
    if (usage.success) successCount++;
  }

  return {
    totalRequests: state.requestCount,
    totalTokens,
    totalCost: state.totalSpentCents / 100,
    successRate: state.requestCount > 0 ? (successCount / state.requestCount) * 100 : 100,
    modelUsage,
    taskTypeDistribution,
  };
}
