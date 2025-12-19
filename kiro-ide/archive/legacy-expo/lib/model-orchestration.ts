/**
 * KIRO IDE - Model Orchestration System
 * 
 * Smart routing to 3rd party LLMs based on:
 * - Task type and complexity
 * - Model known strengths
 * - Risk level
 * - Cost optimization
 * - Latency requirements
 * 
 * Based on Section 7: Model Orchestration
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
  | "together"
  | "local";

export type ModelCapability =
  | "code_generation"
  | "code_review"
  | "code_explanation"
  | "debugging"
  | "refactoring"
  | "documentation"
  | "planning"
  | "reasoning"
  | "creative_writing"
  | "data_analysis"
  | "math"
  | "vision"
  | "function_calling"
  | "long_context"
  | "fast_inference";

export interface ModelDefinition {
  id: string;
  provider: ModelProvider;
  name: string;
  displayName: string;
  
  // Capabilities and strengths
  capabilities: ModelCapability[];
  strengths: {
    capability: ModelCapability;
    score: number; // 0-100
  }[];
  
  // Limits
  maxTokens: number;
  contextWindow: number;
  
  // Cost (per 1M tokens)
  inputCostPer1M: number;
  outputCostPer1M: number;
  
  // Performance
  avgLatencyMs: number;
  reliability: number; // 0-100
  
  // Risk profile
  safeForSensitiveData: boolean;
  requiresApiKey: boolean;
  
  // Availability
  available: boolean;
  rateLimitPerMin: number;
}

export const DEFAULT_MODELS: ModelDefinition[] = [
  {
    id: "gpt-4o",
    provider: "openai",
    name: "gpt-4o",
    displayName: "GPT-4o",
    capabilities: ["code_generation", "code_review", "reasoning", "planning", "vision", "function_calling"],
    strengths: [
      { capability: "code_generation", score: 95 },
      { capability: "reasoning", score: 95 },
      { capability: "function_calling", score: 98 },
      { capability: "vision", score: 90 },
    ],
    maxTokens: 16384,
    contextWindow: 128000,
    inputCostPer1M: 2500, // $2.50
    outputCostPer1M: 10000, // $10.00
    avgLatencyMs: 2000,
    reliability: 98,
    safeForSensitiveData: true,
    requiresApiKey: true,
    available: true,
    rateLimitPerMin: 500,
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    name: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    capabilities: ["code_generation", "code_review", "fast_inference", "function_calling"],
    strengths: [
      { capability: "fast_inference", score: 95 },
      { capability: "code_generation", score: 85 },
      { capability: "function_calling", score: 90 },
    ],
    maxTokens: 16384,
    contextWindow: 128000,
    inputCostPer1M: 150, // $0.15
    outputCostPer1M: 600, // $0.60
    avgLatencyMs: 800,
    reliability: 98,
    safeForSensitiveData: true,
    requiresApiKey: true,
    available: true,
    rateLimitPerMin: 2000,
  },
  {
    id: "claude-3-5-sonnet",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    capabilities: ["code_generation", "code_review", "reasoning", "planning", "long_context", "documentation"],
    strengths: [
      { capability: "code_generation", score: 98 },
      { capability: "code_review", score: 95 },
      { capability: "reasoning", score: 96 },
      { capability: "long_context", score: 95 },
      { capability: "documentation", score: 92 },
    ],
    maxTokens: 8192,
    contextWindow: 200000,
    inputCostPer1M: 3000, // $3.00
    outputCostPer1M: 15000, // $15.00
    avgLatencyMs: 2500,
    reliability: 97,
    safeForSensitiveData: true,
    requiresApiKey: true,
    available: true,
    rateLimitPerMin: 300,
  },
  {
    id: "claude-3-haiku",
    provider: "anthropic",
    name: "claude-3-haiku-20240307",
    displayName: "Claude 3 Haiku",
    capabilities: ["code_generation", "fast_inference", "code_explanation"],
    strengths: [
      { capability: "fast_inference", score: 98 },
      { capability: "code_explanation", score: 88 },
    ],
    maxTokens: 4096,
    contextWindow: 200000,
    inputCostPer1M: 250, // $0.25
    outputCostPer1M: 1250, // $1.25
    avgLatencyMs: 500,
    reliability: 97,
    safeForSensitiveData: true,
    requiresApiKey: true,
    available: true,
    rateLimitPerMin: 1000,
  },
  {
    id: "gemini-2.0-flash",
    provider: "google",
    name: "gemini-2.0-flash-exp",
    displayName: "Gemini 2.0 Flash",
    capabilities: ["code_generation", "reasoning", "vision", "fast_inference", "long_context"],
    strengths: [
      { capability: "fast_inference", score: 95 },
      { capability: "vision", score: 92 },
      { capability: "long_context", score: 98 },
      { capability: "code_generation", score: 90 },
    ],
    maxTokens: 8192,
    contextWindow: 1000000,
    inputCostPer1M: 75, // $0.075
    outputCostPer1M: 300, // $0.30
    avgLatencyMs: 600,
    reliability: 95,
    safeForSensitiveData: true,
    requiresApiKey: true,
    available: true,
    rateLimitPerMin: 1500,
  },
  {
    id: "deepseek-coder",
    provider: "together",
    name: "deepseek-ai/deepseek-coder-33b-instruct",
    displayName: "DeepSeek Coder 33B",
    capabilities: ["code_generation", "debugging", "refactoring"],
    strengths: [
      { capability: "code_generation", score: 92 },
      { capability: "debugging", score: 88 },
      { capability: "refactoring", score: 85 },
    ],
    maxTokens: 4096,
    contextWindow: 16384,
    inputCostPer1M: 200,
    outputCostPer1M: 200,
    avgLatencyMs: 1500,
    reliability: 92,
    safeForSensitiveData: false,
    requiresApiKey: true,
    available: true,
    rateLimitPerMin: 500,
  },
  {
    id: "llama-3-70b",
    provider: "groq",
    name: "llama-3.1-70b-versatile",
    displayName: "Llama 3.1 70B (Groq)",
    capabilities: ["code_generation", "reasoning", "fast_inference"],
    strengths: [
      { capability: "fast_inference", score: 99 },
      { capability: "code_generation", score: 85 },
      { capability: "reasoning", score: 88 },
    ],
    maxTokens: 8192,
    contextWindow: 131072,
    inputCostPer1M: 590,
    outputCostPer1M: 790,
    avgLatencyMs: 200,
    reliability: 94,
    safeForSensitiveData: false,
    requiresApiKey: true,
    available: true,
    rateLimitPerMin: 30,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// TASK TYPES AND ROUTING
// ════════════════════════════════════════════════════════════════════════════

export type TaskType =
  | "code_completion"
  | "code_generation"
  | "code_review"
  | "bug_fix"
  | "refactor"
  | "explain"
  | "document"
  | "plan"
  | "analyze"
  | "chat"
  | "vision_analysis";

export interface TaskRequirements {
  type: TaskType;
  complexity: "simple" | "moderate" | "complex";
  requiredCapabilities: ModelCapability[];
  preferredCapabilities?: ModelCapability[];
  
  // Constraints
  maxLatencyMs?: number;
  maxCostCents?: number;
  minReliability?: number;
  requiresSensitiveDataHandling?: boolean;
  
  // Context
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  
  // Risk
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface RoutingDecision {
  selectedModel: ModelDefinition;
  fallbackModels: ModelDefinition[];
  reasoning: string;
  estimatedCost: number;
  estimatedLatency: number;
  riskAssessment: {
    level: string;
    factors: string[];
    mitigations: string[];
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTING ENGINE
// ════════════════════════════════════════════════════════════════════════════

export interface RoutingConfig {
  models: ModelDefinition[];
  apiKeys: Record<ModelProvider, string | null>;
  preferences: {
    prioritizeCost: boolean;
    prioritizeSpeed: boolean;
    prioritizeQuality: boolean;
    allowExternalProviders: boolean;
    preferredProviders: ModelProvider[];
  };
  budgetLimits: {
    maxCostPerRequest: number;
    maxCostPerSession: number;
    currentSessionCost: number;
  };
}

export function routeTask(
  requirements: TaskRequirements,
  config: RoutingConfig
): RoutingDecision {
  const availableModels = config.models.filter((m) => {
    // Must be available
    if (!m.available) return false;
    
    // Must have API key if required
    if (m.requiresApiKey && !config.apiKeys[m.provider]) return false;
    
    // Must handle sensitive data if required
    if (requirements.requiresSensitiveDataHandling && !m.safeForSensitiveData) return false;
    
    // Must have required capabilities
    const hasRequired = requirements.requiredCapabilities.every((cap) =>
      m.capabilities.includes(cap)
    );
    if (!hasRequired) return false;
    
    // Must fit context window
    if (requirements.estimatedInputTokens > m.contextWindow * 0.8) return false;
    
    // Must meet latency requirement
    if (requirements.maxLatencyMs && m.avgLatencyMs > requirements.maxLatencyMs) return false;
    
    // Must meet reliability requirement
    if (requirements.minReliability && m.reliability < requirements.minReliability) return false;
    
    // Check provider preferences
    if (!config.preferences.allowExternalProviders && m.provider !== "local") return false;
    
    return true;
  });

  if (availableModels.length === 0) {
    throw new Error("No suitable models available for this task");
  }

  // Score each model
  const scoredModels = availableModels.map((model) => ({
    model,
    score: scoreModel(model, requirements, config),
  }));

  // Sort by score
  scoredModels.sort((a, b) => b.score - a.score);

  const selected = scoredModels[0].model;
  const fallbacks = scoredModels.slice(1, 4).map((s) => s.model);

  // Calculate estimated cost
  const estimatedCost = calculateCost(
    selected,
    requirements.estimatedInputTokens,
    requirements.estimatedOutputTokens
  );

  // Check budget
  if (estimatedCost > config.budgetLimits.maxCostPerRequest) {
    // Try to find a cheaper alternative
    const cheaperModel = scoredModels.find(
      (s) =>
        calculateCost(s.model, requirements.estimatedInputTokens, requirements.estimatedOutputTokens) <=
        config.budgetLimits.maxCostPerRequest
    );
    if (cheaperModel) {
      return routeTask(requirements, {
        ...config,
        models: [cheaperModel.model, ...fallbacks],
      });
    }
  }

  return {
    selectedModel: selected,
    fallbackModels: fallbacks,
    reasoning: generateReasoning(selected, requirements, config),
    estimatedCost,
    estimatedLatency: selected.avgLatencyMs,
    riskAssessment: assessRisk(selected, requirements),
  };
}

function scoreModel(
  model: ModelDefinition,
  requirements: TaskRequirements,
  config: RoutingConfig
): number {
  let score = 0;

  // Capability match (40%)
  const capabilityScore = calculateCapabilityScore(model, requirements);
  score += capabilityScore * 0.4;

  // Cost efficiency (20%)
  const costScore = calculateCostScore(model, requirements, config);
  score += costScore * 0.2;

  // Speed (15%)
  const speedScore = calculateSpeedScore(model, requirements);
  score += speedScore * 0.15;

  // Reliability (15%)
  const reliabilityScore = model.reliability;
  score += reliabilityScore * 0.15;

  // Provider preference (10%)
  const preferenceScore = config.preferences.preferredProviders.includes(model.provider)
    ? 100
    : 50;
  score += preferenceScore * 0.1;

  // Risk adjustment
  if (requirements.riskLevel === "critical" || requirements.riskLevel === "high") {
    // Prefer more reliable, safer models for high-risk tasks
    if (model.safeForSensitiveData && model.reliability > 95) {
      score *= 1.2;
    }
  }

  return score;
}

function calculateCapabilityScore(
  model: ModelDefinition,
  requirements: TaskRequirements
): number {
  let score = 0;
  let maxScore = 0;

  // Required capabilities
  for (const cap of requirements.requiredCapabilities) {
    maxScore += 100;
    const strength = model.strengths.find((s) => s.capability === cap);
    score += strength?.score || (model.capabilities.includes(cap) ? 70 : 0);
  }

  // Preferred capabilities (half weight)
  for (const cap of requirements.preferredCapabilities || []) {
    maxScore += 50;
    const strength = model.strengths.find((s) => s.capability === cap);
    score += (strength?.score || (model.capabilities.includes(cap) ? 70 : 0)) * 0.5;
  }

  return maxScore > 0 ? (score / maxScore) * 100 : 50;
}

function calculateCostScore(
  model: ModelDefinition,
  requirements: TaskRequirements,
  config: RoutingConfig
): number {
  const cost = calculateCost(
    model,
    requirements.estimatedInputTokens,
    requirements.estimatedOutputTokens
  );

  // Normalize cost score (lower is better)
  const maxCost = config.budgetLimits.maxCostPerRequest;
  if (cost >= maxCost) return 0;
  return ((maxCost - cost) / maxCost) * 100;
}

function calculateSpeedScore(
  model: ModelDefinition,
  requirements: TaskRequirements
): number {
  const maxLatency = requirements.maxLatencyMs || 5000;
  if (model.avgLatencyMs >= maxLatency) return 0;
  return ((maxLatency - model.avgLatencyMs) / maxLatency) * 100;
}

function calculateCost(
  model: ModelDefinition,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1000000) * model.inputCostPer1M;
  const outputCost = (outputTokens / 1000000) * model.outputCostPer1M;
  return inputCost + outputCost;
}

function generateReasoning(
  model: ModelDefinition,
  requirements: TaskRequirements,
  config: RoutingConfig
): string {
  const reasons: string[] = [];

  // Capability match
  const matchedCaps = requirements.requiredCapabilities.filter((cap) =>
    model.capabilities.includes(cap)
  );
  reasons.push(`Matches ${matchedCaps.length}/${requirements.requiredCapabilities.length} required capabilities`);

  // Strengths
  const relevantStrengths = model.strengths
    .filter((s) => requirements.requiredCapabilities.includes(s.capability))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  if (relevantStrengths.length > 0) {
    reasons.push(
      `Strong in ${relevantStrengths.map((s) => `${s.capability} (${s.score}%)`).join(", ")}`
    );
  }

  // Cost
  const cost = calculateCost(
    model,
    requirements.estimatedInputTokens,
    requirements.estimatedOutputTokens
  );
  reasons.push(`Estimated cost: $${(cost / 100).toFixed(4)}`);

  // Speed
  reasons.push(`Average latency: ${model.avgLatencyMs}ms`);

  return reasons.join(". ");
}

function assessRisk(
  model: ModelDefinition,
  requirements: TaskRequirements
): RoutingDecision["riskAssessment"] {
  const factors: string[] = [];
  const mitigations: string[] = [];

  // Data sensitivity
  if (requirements.requiresSensitiveDataHandling) {
    if (model.safeForSensitiveData) {
      mitigations.push("Model is certified for sensitive data handling");
    } else {
      factors.push("Model may not be suitable for sensitive data");
    }
  }

  // Reliability
  if (model.reliability < 95) {
    factors.push(`Model reliability is ${model.reliability}%`);
    mitigations.push("Fallback models configured");
  }

  // External provider
  if (model.provider !== "local") {
    factors.push("Data sent to external provider");
    mitigations.push("Use API with encryption in transit");
  }

  // Task risk level
  if (requirements.riskLevel === "critical" || requirements.riskLevel === "high") {
    factors.push(`Task risk level: ${requirements.riskLevel}`);
    mitigations.push("Human review recommended before applying changes");
  }

  return {
    level: factors.length > 2 ? "high" : factors.length > 0 ? "medium" : "low",
    factors,
    mitigations,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// TASK TYPE MAPPINGS
// ════════════════════════════════════════════════════════════════════════════

export const TASK_CAPABILITY_MAP: Record<TaskType, ModelCapability[]> = {
  code_completion: ["code_generation", "fast_inference"],
  code_generation: ["code_generation", "reasoning"],
  code_review: ["code_review", "reasoning"],
  bug_fix: ["debugging", "code_generation"],
  refactor: ["refactoring", "code_generation"],
  explain: ["code_explanation", "reasoning"],
  document: ["documentation", "code_explanation"],
  plan: ["planning", "reasoning"],
  analyze: ["data_analysis", "reasoning"],
  chat: ["reasoning"],
  vision_analysis: ["vision", "reasoning"],
};

export function getRequiredCapabilities(taskType: TaskType): ModelCapability[] {
  return TASK_CAPABILITY_MAP[taskType] || ["reasoning"];
}
