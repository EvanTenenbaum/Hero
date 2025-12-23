/**
 * Agent Execution Service
 * Handles real-time agent execution with streaming updates via Server-Sent Events
 */

import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export interface AgentStep {
  id: string;
  type: "thinking" | "action" | "result" | "error" | "checkpoint";
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ExecutionState {
  agentId: number;
  executionId: number;
  status: "running" | "paused" | "completed" | "failed" | "awaiting_approval";
  currentStep: number;
  maxSteps: number;
  tokensUsed: number;
  costIncurred: number;
  budgetLimit: number;
  steps: AgentStep[];
  goal?: string;
  uncertaintyLevel?: number;
}

// In-memory cache for active executions (backed by database for persistence)
// This cache is used for fast access during execution, but state is always persisted to DB
const activeExecutions = new Map<number, ExecutionState>();

// Event emitters for SSE connections
const executionListeners = new Map<number, Set<(event: AgentStep) => void>>();

/**
 * Persist execution state to database
 * Called after every state change to ensure recoverability
 */
async function persistExecutionState(state: ExecutionState): Promise<void> {
  try {
    await db.updateAgentExecution(state.executionId, {
      state: state.status === "running" ? "executing" : 
             state.status === "paused" ? "halted" :
             state.status === "completed" ? "completed" :
             state.status === "failed" ? "failed" :
             state.status === "awaiting_approval" ? "waiting_approval" : "halted",
      currentStep: state.currentStep,
      totalTokensUsed: state.tokensUsed,
      totalCostUsd: state.costIncurred.toString(),
      // Store steps as JSON in metadata or a separate field
    });
  } catch (error) {
    console.error('Failed to persist execution state:', error);
  }
}

/**
 * Recover active executions from database on server restart
 * Call this during server initialization
 */
export async function recoverActiveExecutions(): Promise<number> {
  try {
    // Find all executions that were running when server stopped
    const runningExecutions = await db.getRunningExecutions();
    let recovered = 0;
    
    for (const execution of runningExecutions) {
      // Mark as halted - user can manually resume if needed
      await db.updateAgentExecution(execution.id, {
        state: 'halted',
      });
      recovered++;
    }
    
    console.debug(`Recovered ${recovered} interrupted executions (marked as halted)`);
    return recovered;
  } catch (error) {
    console.error('Failed to recover active executions:', error);
    return 0;
  }
}

/**
 * Subscribe to execution updates
 */
export function subscribeToExecution(executionId: number, callback: (event: AgentStep) => void): () => void {
  if (!executionListeners.has(executionId)) {
    executionListeners.set(executionId, new Set());
  }
  executionListeners.get(executionId)!.add(callback);
  
  // Return unsubscribe function
  return () => {
    const listeners = executionListeners.get(executionId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        executionListeners.delete(executionId);
      }
    }
  };
}

/**
 * Emit step to all listeners
 */
function emitStep(executionId: number, step: AgentStep): void {
  const listeners = executionListeners.get(executionId);
  if (listeners) {
    listeners.forEach(callback => callback(step));
  }
}

/**
 * Generate a unique step ID
 */
function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate cost based on tokens used (approximate pricing)
 */
function calculateCost(tokensUsed: number): number {
  // Approximate cost: $0.001 per 1000 tokens
  return (tokensUsed / 1000) * 0.001;
}

/**
 * Check if execution should halt based on governance rules
 */
async function checkGovernance(
  state: ExecutionState,
  agent: NonNullable<Awaited<ReturnType<typeof db.getAgentById>>>
): Promise<{ shouldHalt: boolean; reason?: string }> {
  // Check budget limit
  if (state.costIncurred >= state.budgetLimit) {
    return { shouldHalt: true, reason: "Budget limit reached" };
  }
  
  // Check max steps
  if (state.currentStep >= state.maxSteps) {
    return { shouldHalt: true, reason: "Maximum steps reached" };
  }
  
  // Check uncertainty threshold
  if (state.uncertaintyLevel && state.uncertaintyLevel > (agent.uncertaintyThreshold || 70)) {
    return { shouldHalt: true, reason: `Uncertainty level (${state.uncertaintyLevel}%) exceeds threshold (${agent.uncertaintyThreshold}%)` };
  }
  
  return { shouldHalt: false };
}

/**
 * Execute a single agent step
 */
async function executeStep(
  state: ExecutionState,
  agent: NonNullable<Awaited<ReturnType<typeof db.getAgentById>>>,
  context: string
): Promise<AgentStep> {
  const stepId = generateStepId();
  
  // Emit thinking step
  const thinkingStep: AgentStep = {
    id: generateStepId(),
    type: "thinking",
    content: "Analyzing the current context and planning next action...",
    timestamp: new Date(),
  };
  emitStep(state.executionId, thinkingStep);
  state.steps.push(thinkingStep);
  
  try {
    // Pre-validate budget before making LLM call to avoid wasted requests
    const estimatedCostPerCall = 0.002; // ~2000 tokens average
    if (state.costIncurred + estimatedCostPerCall > state.budgetLimit) {
      const errorStep: AgentStep = {
        id: stepId,
        type: "error",
        content: `Budget limit would be exceeded. Current: $${state.costIncurred.toFixed(4)}, Limit: $${state.budgetLimit.toFixed(2)}`,
        timestamp: new Date(),
      };
      return errorStep;
    }
    
    // Build the prompt based on agent type
    const systemPrompt = buildAgentSystemPrompt(agent);
    const userPrompt = buildUserPrompt(state, context);
    
    // Call LLM
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent) || "No response generated";
    const tokensUsed = response.usage?.total_tokens || 0;
    
    // Update state
    state.tokensUsed += tokensUsed;
    state.costIncurred = calculateCost(state.tokensUsed);
    state.currentStep++;
    
    // Persist state after each step for recoverability
    await persistExecutionState(state);
    
    // Parse uncertainty from response if mentioned
    const uncertaintyMatch = content.match(/uncertainty[:\s]+(\d+)%/i);
    if (uncertaintyMatch) {
      state.uncertaintyLevel = parseInt(uncertaintyMatch[1], 10);
    }
    
    // Create result step
    const resultStep: AgentStep = {
      id: stepId,
      type: "result",
      content,
      timestamp: new Date(),
      metadata: {
        tokensUsed,
        cost: calculateCost(tokensUsed),
        step: state.currentStep,
      },
    };
    
    return resultStep;
  } catch (error: any) {
    const errorStep: AgentStep = {
      id: stepId,
      type: "error",
      content: `Error executing step: ${error.message}`,
      timestamp: new Date(),
    };
    return errorStep;
  }
}

/**
 * Build system prompt based on agent type
 */
function buildAgentSystemPrompt(agent: NonNullable<Awaited<ReturnType<typeof db.getAgentById>>>): string {
  const basePrompt = `You are ${agent.name}, an AI agent assistant.`;
  
  const typePrompts: Record<string, string> = {
    coder: `${basePrompt} You specialize in writing, reviewing, and debugging code. You follow best practices and write clean, maintainable code.`,
    reviewer: `${basePrompt} You specialize in code review, identifying bugs, security issues, and suggesting improvements.`,
    planner: `${basePrompt} You specialize in project planning, breaking down tasks, and creating actionable roadmaps.`,
    custom: `${basePrompt} ${agent.systemPrompt || "You help with various tasks as instructed."}`,
  };
  
  return typePrompts[agent.type] || typePrompts.custom;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(state: ExecutionState, context: string): string {
  let prompt = "";
  
  if (state.goal) {
    prompt += `Goal: ${state.goal}\n\n`;
  }
  
  prompt += `Current Step: ${state.currentStep + 1} of ${state.maxSteps}\n`;
  prompt += `Budget Used: $${state.costIncurred.toFixed(4)} of $${state.budgetLimit.toFixed(2)}\n\n`;
  
  if (context) {
    prompt += `Context:\n${context}\n\n`;
  }
  
  prompt += `Please proceed with the next action. If you're uncertain about something, indicate your uncertainty level as a percentage.`;
  
  return prompt;
}

/**
 * Start agent execution
 */
export async function startExecution(
  agentId: number,
  userId: number,
  goal: string,
  context?: string
): Promise<ExecutionState> {
  // Get agent configuration
  const agent = await db.getAgentById(agentId, userId);
  if (!agent) {
    throw new Error("Agent not found");
  }
  
  // Create execution record
  const execution = await db.createAgentExecution({
    agentId,
    userId,
    goal,
    state: "executing",
    currentStep: 0,
    totalTokensUsed: 0,
    totalCostUsd: "0",
    startedAt: new Date(),
  });
  
  // Initialize execution state
  const state: ExecutionState = {
    agentId,
    executionId: execution.id,
    status: "running",
    currentStep: 0,
    maxSteps: agent.maxSteps || 10,
    tokensUsed: 0,
    costIncurred: 0,
    budgetLimit: parseFloat(agent.budgetLimitUsd || "1.00"),
    steps: [],
    goal,
  };
  
  activeExecutions.set(execution.id, state);
  
  // Persist initial state
  await persistExecutionState(state);
  
  // Start execution loop (non-blocking)
  runExecutionLoop(state, agent, context || "").catch(console.error);
  
  return state;
}

/**
 * Main execution loop
 */
async function runExecutionLoop(
  state: ExecutionState,
  agent: NonNullable<Awaited<ReturnType<typeof db.getAgentById>>>,
  context: string
): Promise<void> {
  while (state.status === "running") {
    // Check governance rules
    const governance = await checkGovernance(state, agent);
    if (governance.shouldHalt) {
      // Create checkpoint step
      const checkpointStep: AgentStep = {
        id: generateStepId(),
        type: "checkpoint",
        content: `Execution halted: ${governance.reason}`,
        timestamp: new Date(),
        metadata: {
          requiresApproval: agent.requireApprovalForChanges,
        },
      };
      emitStep(state.executionId, checkpointStep);
      state.steps.push(checkpointStep);
      
      if (agent.requireApprovalForChanges) {
        state.status = "awaiting_approval";
      } else {
        state.status = "completed";
      }
      break;
    }
    
    // Execute next step
    const step = await executeStep(state, agent, context);
    emitStep(state.executionId, step);
    state.steps.push(step);
    
    // Check for errors
    if (step.type === "error") {
      state.status = "failed";
      break;
    }
    
    // Update context with step result for next iteration
    context = `Previous step result:\n${step.content}`;
    
    // Small delay between steps
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Update execution record in database
  await db.updateAgentExecution(state.executionId, {
    state: state.status === "completed" ? "completed" : state.status === "failed" ? "failed" : state.status === "awaiting_approval" ? "waiting_approval" : "halted",
    currentStep: state.currentStep,
    totalTokensUsed: state.tokensUsed,
    totalCostUsd: state.costIncurred.toString(),
    completedAt: state.status !== "awaiting_approval" ? new Date() : undefined,
  });
  
  // Clean up
  activeExecutions.delete(state.executionId);
}

/**
 * Pause execution
 */
export async function pauseExecution(executionId: number, userId: number): Promise<void> {
  const state = activeExecutions.get(executionId);
  if (state) {
    state.status = "paused";
    await db.updateAgentExecution(executionId, { state: "halted" });
  }
}

/**
 * Resume execution
 */
export async function resumeExecution(executionId: number, userId: number): Promise<void> {
  const execution = await db.getAgentExecutionById(executionId, userId);
  if (!execution) {
    throw new Error("Execution not found");
  }
  
  const agent = await db.getAgentById(execution.agentId, userId);
  if (!agent) {
    throw new Error("Agent not found");
  }
  
  // Restore state
  const state: ExecutionState = {
    agentId: execution.agentId,
    executionId: execution.id,
    status: "running",
    currentStep: execution.currentStep || 0,
    maxSteps: agent.maxSteps || 10,
    tokensUsed: execution.totalTokensUsed || 0,
    costIncurred: parseFloat(execution.totalCostUsd || "0"),
    budgetLimit: parseFloat(agent.budgetLimitUsd || "1.00"),
    steps: [],
    goal: execution.goal || undefined,
  };
  
  activeExecutions.set(executionId, state);
  
  // Resume execution loop
  runExecutionLoop(state, agent, "").catch(console.error);
}

/**
 * Stop execution
 */
export async function stopExecution(executionId: number, userId: number): Promise<void> {
  const state = activeExecutions.get(executionId);
  if (state) {
    state.status = "completed";
  }
  await db.updateAgentExecution(executionId, {
    state: "halted",
    completedAt: new Date(),
  });
  activeExecutions.delete(executionId);
}

/**
 * Get current execution state
 */
export function getExecutionState(executionId: number): ExecutionState | undefined {
  return activeExecutions.get(executionId);
}

/**
 * Approve pending execution
 */
export async function approveExecution(executionId: number, userId: number): Promise<void> {
  const state = activeExecutions.get(executionId);
  if (!state || state.status !== "awaiting_approval") {
    throw new Error("Execution not awaiting approval");
  }
  
  // Log approval (could add to violations table as info)
  
  // Resume execution
  state.status = "running";
  
  const agent = await db.getAgentById(state.agentId, userId);
  if (agent) {
    runExecutionLoop(state, agent, "").catch(console.error);
  }
}

/**
 * Reject pending execution
 */
export async function rejectExecution(executionId: number, userId: number, reason?: string): Promise<void> {
  const state = activeExecutions.get(executionId);
  
  // Log rejection (could add to violations table as info)
  
  if (state) {
    state.status = "completed";
    activeExecutions.delete(executionId);
  }
  
  await db.updateAgentExecution(executionId, {
    state: "failed",
    completedAt: new Date(),
  });
}
