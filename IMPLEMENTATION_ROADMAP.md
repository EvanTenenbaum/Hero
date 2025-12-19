# Hero IDE: Practical Implementation Roadmap

**Version:** 1.0  
**Author:** Manus AI  
**Date:** December 2025

---

## Executive Summary

This roadmap translates the research findings from the Agent Configuration Framework into a practical, phased implementation plan. The guiding principles are **simplicity**, **reliability**, and **incremental value delivery**. Each phase builds on the previous one, and features are designed to be independently useful rather than dependent on a complex web of interconnections.

The roadmap avoids common pitfalls identified in the research: over-abstraction, premature optimization, and building features that users won't discover or use. Instead, it focuses on high-impact improvements that make Hero IDE agents safer, more effective, and easier to configure.

---

## Design Philosophy

### What We're Building

Hero IDE needs an agent system that is **predictable**, **controllable**, and **transparent**. Users should always understand what an agent can do, what it's currently doing, and how to stop or adjust it. The research identified several key requirements:

1. **Consistent agent behavior** through well-structured system prompts
2. **Safety guardrails** that prevent harmful actions without blocking legitimate work
3. **Context management** that gives agents the information they need without overwhelming them
4. **User controls** that are discoverable and easy to use
5. **Observability** so users can understand and debug agent behavior

### What We're NOT Building

Based on the research on AI agent failures and the principle of avoiding complexity, we will explicitly avoid:

| Anti-Pattern | Why We Avoid It | What We Do Instead |
|--------------|-----------------|---------------------|
| Complex multi-agent orchestration | Fragile, hard to debug, unpredictable | Single agent per task with clear handoffs |
| Dynamic prompt generation | Hard to test, inconsistent behavior | Template-based prompts with slot filling |
| Automatic tool chaining | Can spiral out of control | Explicit user confirmation for each action |
| Persistent agent memory across sessions | Privacy concerns, stale context | Session-scoped memory with explicit save |
| AI-generated safety rules | Can be bypassed or inconsistent | Human-defined, version-controlled rules |

---

## Architecture Overview

The implementation follows a **layered architecture** where each layer has a single responsibility:

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  Agent Config Panel │ Execution Monitor │ Rules Editor          │
├─────────────────────────────────────────────────────────────────┤
│                      AGENT SERVICE LAYER                        │
│  PromptAssembler │ ExecutionEngine │ SafetyChecker              │
├─────────────────────────────────────────────────────────────────┤
│                      DATA & CONTEXT LAYER                       │
│  ContextBuilder │ SessionManager │ ToolRegistry                 │
├─────────────────────────────────────────────────────────────────┤
│                      STORAGE LAYER                              │
│  Database │ File System │ External APIs                         │
└─────────────────────────────────────────────────────────────────┘
```

Each component is designed to be:
- **Testable**: Can be unit tested in isolation
- **Replaceable**: Clear interfaces allow swapping implementations
- **Observable**: Logs and metrics at each layer

---

## Phase 1: Foundation (Week 1-2)

**Goal:** Establish the core infrastructure for agent prompt management and basic safety checks.

### 1.1 Prompt Template System

The first step is creating a simple, reliable system for managing agent prompts. Rather than generating prompts dynamically, we use **static templates with variable slots**.

**Implementation:**

```typescript
// server/agents/promptTemplates.ts

export interface PromptTemplate {
  id: string;
  agentType: 'pm' | 'developer' | 'qa' | 'devops' | 'research';
  version: string;
  sections: {
    identity: string;
    communication: string;
    tools: string;
    safety: string;
  };
}

export interface PromptContext {
  project?: {
    name: string;
    description: string;
    techStack: string[];
    conventions: string;
  };
  user?: {
    preferences: string;
    customRules: string[];
  };
  session?: {
    recentActions: string[];
    openFiles: string[];
  };
}

export function assemblePrompt(
  template: PromptTemplate,
  context: PromptContext
): string {
  // Simple string interpolation - no complex logic
  let prompt = `# Identity\n\n${template.sections.identity}\n\n`;
  prompt += `# Communication Guidelines\n\n${template.sections.communication}\n\n`;
  prompt += `# Tool Usage Rules\n\n${template.sections.tools}\n\n`;
  prompt += `# Safety Boundaries\n\n${template.sections.safety}\n\n`;
  
  if (context.project) {
    prompt += `# Project Context\n\n`;
    prompt += `**Name:** ${context.project.name}\n`;
    prompt += `**Tech Stack:** ${context.project.techStack.join(', ')}\n`;
    prompt += `**Description:** ${context.project.description}\n\n`;
  }
  
  if (context.user?.customRules?.length) {
    prompt += `# User Rules\n\n`;
    context.user.customRules.forEach(rule => {
      prompt += `- ${rule}\n`;
    });
    prompt += '\n';
  }
  
  return prompt;
}
```

**Why this approach:**
- Templates are stored as plain text, easy to version and review
- No runtime code generation that could fail unpredictably
- Context injection is explicit and traceable
- Easy to test: input template + context → output string

**Database Schema Addition:**

```sql
CREATE TABLE prompt_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agent_type VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL,
  identity_section TEXT NOT NULL,
  communication_section TEXT NOT NULL,
  tools_section TEXT NOT NULL,
  safety_section TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_type_version (agent_type, version)
);
```

### 1.2 Basic Safety Checker

A lightweight safety layer that validates agent actions before execution. This is intentionally simple—a whitelist approach rather than trying to detect all possible bad behaviors.

**Implementation:**

```typescript
// server/agents/safetyChecker.ts

export interface SafetyRule {
  id: string;
  type: 'allow' | 'deny' | 'confirm';
  pattern: string; // Simple glob or exact match
  description: string;
}

export interface SafetyCheckResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
  matchedRule?: SafetyRule;
}

const DEFAULT_RULES: SafetyRule[] = [
  // File operations
  { id: 'deny-system-files', type: 'deny', pattern: '/etc/*', description: 'System files are off-limits' },
  { id: 'deny-env-files', type: 'deny', pattern: '**/.env*', description: 'Environment files require manual editing' },
  { id: 'confirm-delete', type: 'confirm', pattern: 'delete:*', description: 'File deletion requires confirmation' },
  
  // Terminal operations
  { id: 'deny-sudo', type: 'deny', pattern: 'sudo *', description: 'Sudo commands are not allowed' },
  { id: 'deny-rm-rf', type: 'deny', pattern: 'rm -rf *', description: 'Recursive force delete is not allowed' },
  { id: 'confirm-install', type: 'confirm', pattern: 'npm install *', description: 'Package installation requires confirmation' },
  
  // Network operations
  { id: 'confirm-fetch', type: 'confirm', pattern: 'fetch:*', description: 'External API calls require confirmation' },
];

export function checkSafety(
  action: string,
  rules: SafetyRule[] = DEFAULT_RULES
): SafetyCheckResult {
  for (const rule of rules) {
    if (matchesPattern(action, rule.pattern)) {
      if (rule.type === 'deny') {
        return { allowed: false, requiresConfirmation: false, reason: rule.description, matchedRule: rule };
      }
      if (rule.type === 'confirm') {
        return { allowed: true, requiresConfirmation: true, reason: rule.description, matchedRule: rule };
      }
    }
  }
  
  // Default: allow without confirmation
  return { allowed: true, requiresConfirmation: false };
}

function matchesPattern(action: string, pattern: string): boolean {
  // Simple glob matching - no regex to avoid ReDoS
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexPattern}$`).test(action);
}
```

**Why this approach:**
- Whitelist/blacklist is easier to reason about than heuristics
- Rules are data, not code—can be updated without deployment
- Simple pattern matching avoids regex complexity
- Default-allow with explicit denials is more usable than default-deny

### 1.3 User Rules Storage

Allow users to define their own rules that augment the defaults.

**Database Schema:**

```sql
CREATE TABLE user_agent_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  agent_type VARCHAR(50), -- NULL means applies to all agents
  rule_type ENUM('instruction', 'allow', 'deny', 'confirm') NOT NULL,
  rule_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**tRPC Procedures:**

```typescript
// In server/routers.ts

const userRulesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserAgentRules(ctx.user.id);
  }),
  
  create: protectedProcedure
    .input(z.object({
      agentType: z.enum(['pm', 'developer', 'qa', 'devops', 'research']).optional(),
      ruleType: z.enum(['instruction', 'allow', 'deny', 'confirm']),
      ruleContent: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createUserAgentRule({
        userId: ctx.user.id,
        ...input,
      });
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteUserAgentRule(input.id, ctx.user.id);
      return { success: true };
    }),
});
```

### Phase 1 Deliverables

| Component | Description | Test Coverage |
|-----------|-------------|---------------|
| `promptTemplates.ts` | Template storage and assembly | Unit tests for assembly logic |
| `safetyChecker.ts` | Action validation against rules | Unit tests for pattern matching |
| `user_agent_rules` table | User rule storage | Integration tests for CRUD |
| `userRulesRouter` | API for rule management | API tests |

**Estimated Effort:** 3-4 days of implementation, 1-2 days of testing

---

## Phase 2: Agent Execution Engine (Week 3-4)

**Goal:** Build a reliable execution loop that applies prompts, enforces safety, and provides visibility.

### 2.1 Execution Loop

The execution engine follows a simple state machine pattern. Each execution goes through defined states, and transitions are explicit and logged.

```
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│ PENDING │ ──▶ │ RUNNING  │ ──▶ │ AWAITING  │ ──▶ │ COMPLETE │
└─────────┘     └──────────┘     │ CONFIRM   │     └──────────┘
                    │            └───────────┘          │
                    │                 │                 │
                    ▼                 ▼                 ▼
               ┌─────────┐      ┌─────────┐       ┌─────────┐
               │ FAILED  │      │ TIMEOUT │       │ STOPPED │
               └─────────┘      └─────────┘       └─────────┘
```

**Implementation:**

```typescript
// server/agents/executionEngine.ts

export type ExecutionState = 
  | 'pending' 
  | 'running' 
  | 'awaiting_confirmation' 
  | 'complete' 
  | 'failed' 
  | 'timeout' 
  | 'stopped';

export interface ExecutionStep {
  id: number;
  executionId: number;
  stepNumber: number;
  action: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
  requiresConfirmation: boolean;
  confirmedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class ExecutionEngine {
  private maxSteps = 20; // Hard limit to prevent runaway
  private stepTimeout = 30000; // 30 seconds per step
  
  async execute(
    executionId: number,
    prompt: string,
    tools: Tool[],
    onStep: (step: ExecutionStep) => void
  ): Promise<void> {
    let stepCount = 0;
    let state: ExecutionState = 'running';
    
    while (state === 'running' && stepCount < this.maxSteps) {
      stepCount++;
      
      // 1. Get next action from LLM
      const action = await this.getNextAction(prompt, tools);
      
      if (action.type === 'complete') {
        state = 'complete';
        break;
      }
      
      // 2. Safety check
      const safetyResult = checkSafety(action.name);
      
      if (!safetyResult.allowed) {
        await this.logStep(executionId, stepCount, {
          action: action.name,
          status: 'failed',
          error: `Blocked by safety rule: ${safetyResult.reason}`,
        });
        state = 'failed';
        break;
      }
      
      // 3. Handle confirmation if needed
      if (safetyResult.requiresConfirmation) {
        const step = await this.createPendingStep(executionId, stepCount, action);
        onStep(step);
        state = 'awaiting_confirmation';
        // Execution pauses here - will be resumed by confirmStep()
        return;
      }
      
      // 4. Execute the action
      try {
        const result = await this.executeAction(action, tools);
        await this.logStep(executionId, stepCount, {
          action: action.name,
          input: action.input,
          output: result,
          status: 'complete',
        });
        onStep({ /* step details */ });
      } catch (error) {
        await this.logStep(executionId, stepCount, {
          action: action.name,
          status: 'failed',
          error: error.message,
        });
        state = 'failed';
        break;
      }
    }
    
    if (stepCount >= this.maxSteps) {
      state = 'timeout';
    }
    
    await db.updateExecutionState(executionId, state);
  }
  
  async confirmStep(executionId: number, stepId: number, approved: boolean): Promise<void> {
    if (!approved) {
      await db.updateExecutionState(executionId, 'stopped');
      return;
    }
    
    await db.confirmStep(stepId);
    // Resume execution from where it left off
    // ... (implementation continues)
  }
}
```

**Key Design Decisions:**

1. **Hard step limit (20)**: Prevents infinite loops. If an agent needs more steps, the task should be broken down.

2. **Step timeout (30s)**: Prevents hanging on slow operations. Can be configured per-tool.

3. **Confirmation pauses execution**: Rather than running in background and asking forgiveness, we stop and wait for explicit approval.

4. **State machine**: Makes it easy to understand and debug what's happening.

### 2.2 Tool Registry

A simple registry that maps tool names to implementations and their safety classifications.

```typescript
// server/agents/toolRegistry.ts

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: unknown) => Promise<unknown>;
  safetyLevel: 'auto' | 'confirm' | 'dangerous';
}

const TOOL_REGISTRY: Map<string, Tool> = new Map();

export function registerTool(tool: Tool): void {
  TOOL_REGISTRY.set(tool.name, tool);
}

export function getTool(name: string): Tool | undefined {
  return TOOL_REGISTRY.get(name);
}

export function getToolsForAgent(agentType: string): Tool[] {
  // Return tools appropriate for this agent type
  const toolsByAgent: Record<string, string[]> = {
    pm: ['read_file', 'search_codebase', 'create_note', 'list_tasks', 'create_task'],
    developer: ['read_file', 'edit_file', 'create_file', 'run_terminal', 'search_codebase'],
    qa: ['read_file', 'search_codebase', 'run_tests', 'create_test'],
    devops: ['read_file', 'edit_file', 'run_terminal'],
    research: ['search_web', 'read_file', 'create_note'],
  };
  
  const allowedTools = toolsByAgent[agentType] || [];
  return allowedTools.map(name => TOOL_REGISTRY.get(name)).filter(Boolean);
}

// Register built-in tools
registerTool({
  name: 'read_file',
  description: 'Read the contents of a file',
  parameters: z.object({ path: z.string() }),
  execute: async ({ path }) => {
    // Validate path is within workspace
    const safePath = validatePath(path);
    return fs.readFile(safePath, 'utf-8');
  },
  safetyLevel: 'auto',
});

registerTool({
  name: 'edit_file',
  description: 'Edit a file by replacing content',
  parameters: z.object({
    path: z.string(),
    find: z.string(),
    replace: z.string(),
  }),
  execute: async ({ path, find, replace }) => {
    const safePath = validatePath(path);
    const content = await fs.readFile(safePath, 'utf-8');
    const newContent = content.replace(find, replace);
    await fs.writeFile(safePath, newContent);
    return { success: true };
  },
  safetyLevel: 'confirm',
});
```

### 2.3 Execution Visibility

Real-time updates for the UI showing what the agent is doing.

```typescript
// server/agents/executionStream.ts

export function createExecutionStream(executionId: number): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      // Subscribe to execution updates
      const unsubscribe = subscribeToExecution(executionId, (event) => {
        sendUpdate(event);
        
        if (event.type === 'complete' || event.type === 'failed') {
          controller.close();
        }
      });
      
      // Cleanup on close
      return () => unsubscribe();
    },
  });
}
```

### Phase 2 Deliverables

| Component | Description | Test Coverage |
|-----------|-------------|---------------|
| `executionEngine.ts` | State machine execution loop | Unit tests for state transitions |
| `toolRegistry.ts` | Tool registration and lookup | Unit tests for tool filtering |
| `executionStream.ts` | SSE for real-time updates | Integration tests |
| Confirmation flow | Pause/resume on confirmation | E2E tests |

**Estimated Effort:** 5-6 days of implementation, 2-3 days of testing

---

## Phase 3: User Interface (Week 5-6)

**Goal:** Build intuitive UI components that surface agent controls without overwhelming users.

### 3.1 Agent Configuration Panel

A settings panel where users can configure agent behavior. The key insight from the research is that **users won't use features they don't know exist**, so we need to make configuration discoverable.

**Design Principles:**
1. **Smart defaults**: Everything works out of the box
2. **Progressive disclosure**: Basic settings visible, advanced hidden until needed
3. **Inline help**: Explain what each setting does
4. **Preview**: Show how rules will affect behavior

**Component Structure:**

```tsx
// client/src/pages/AgentConfig.tsx

export function AgentConfigPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'prompts' | 'tools'>('rules');
  
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Agent Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Customize how AI agents behave in your projects
          </p>
        </header>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="prompts">Instructions</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rules">
            <RulesEditor />
          </TabsContent>
          
          <TabsContent value="prompts">
            <InstructionsEditor />
          </TabsContent>
          
          <TabsContent value="tools">
            <ToolsConfig />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
```

### 3.2 Rules Editor

A user-friendly interface for creating and managing safety rules.

```tsx
// client/src/components/RulesEditor.tsx

export function RulesEditor() {
  const { data: rules, isLoading } = trpc.userRules.list.useQuery();
  const createRule = trpc.userRules.create.useMutation();
  const deleteRule = trpc.userRules.delete.useMutation();
  
  const [newRule, setNewRule] = useState({
    ruleType: 'instruction' as const,
    ruleContent: '',
    agentType: undefined as string | undefined,
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Rules</CardTitle>
        <CardDescription>
          Add instructions or restrictions that agents must follow
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Preset rules section */}
        <div>
          <h3 className="font-medium mb-3">Quick Add</h3>
          <div className="flex flex-wrap gap-2">
            <PresetRuleButton 
              label="Always use TypeScript"
              rule={{ ruleType: 'instruction', ruleContent: 'Always write code in TypeScript, not JavaScript' }}
            />
            <PresetRuleButton 
              label="No console.log"
              rule={{ ruleType: 'instruction', ruleContent: 'Never use console.log for debugging. Use proper logging.' }}
            />
            <PresetRuleButton 
              label="Confirm before delete"
              rule={{ ruleType: 'confirm', ruleContent: 'delete:*' }}
            />
          </div>
        </div>
        
        {/* Custom rule form */}
        <div className="border-t pt-6">
          <h3 className="font-medium mb-3">Add Custom Rule</h3>
          <div className="space-y-4">
            <div>
              <Label>Rule Type</Label>
              <Select 
                value={newRule.ruleType}
                onValueChange={(v) => setNewRule({ ...newRule, ruleType: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instruction">
                    <div>
                      <div className="font-medium">Instruction</div>
                      <div className="text-xs text-muted-foreground">
                        Tell the agent what to do or how to behave
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="confirm">
                    <div>
                      <div className="font-medium">Require Confirmation</div>
                      <div className="text-xs text-muted-foreground">
                        Agent must ask before taking this action
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="deny">
                    <div>
                      <div className="font-medium">Block Action</div>
                      <div className="text-xs text-muted-foreground">
                        Agent cannot take this action at all
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>
                {newRule.ruleType === 'instruction' ? 'Instruction' : 'Pattern'}
              </Label>
              <Textarea
                value={newRule.ruleContent}
                onChange={(e) => setNewRule({ ...newRule, ruleContent: e.target.value })}
                placeholder={
                  newRule.ruleType === 'instruction'
                    ? 'e.g., Always add error handling to async functions'
                    : 'e.g., rm -rf * or delete:*.env'
                }
              />
            </div>
            
            <Button onClick={() => createRule.mutate(newRule)}>
              Add Rule
            </Button>
          </div>
        </div>
        
        {/* Existing rules list */}
        <div className="border-t pt-6">
          <h3 className="font-medium mb-3">Active Rules</h3>
          {isLoading ? (
            <Skeleton className="h-20" />
          ) : rules?.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No custom rules yet. Add some above or use the quick add buttons.
            </p>
          ) : (
            <div className="space-y-2">
              {rules?.map((rule) => (
                <RuleCard 
                  key={rule.id} 
                  rule={rule} 
                  onDelete={() => deleteRule.mutate({ id: rule.id })}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3.3 Execution Monitor

A real-time view of what the agent is doing, with controls to pause, stop, or approve actions.

```tsx
// client/src/components/ExecutionMonitor.tsx

export function ExecutionMonitor({ executionId }: { executionId: number }) {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [status, setStatus] = useState<ExecutionState>('pending');
  
  // Subscribe to real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/executions/${executionId}/stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'step') {
        setSteps((prev) => [...prev, data.step]);
      } else if (data.type === 'status') {
        setStatus(data.status);
      }
    };
    
    return () => eventSource.close();
  }, [executionId]);
  
  const confirmStep = trpc.executions.confirmStep.useMutation();
  const stopExecution = trpc.executions.stop.useMutation();
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Execution Progress</CardTitle>
          <CardDescription>
            <StatusBadge status={status} />
          </CardDescription>
        </div>
        
        {status === 'running' && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => stopExecution.mutate({ executionId })}
          >
            Stop
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <StepCard 
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
              onConfirm={(approved) => confirmStep.mutate({ 
                executionId, 
                stepId: step.id, 
                approved 
              })}
            />
          ))}
          
          {status === 'running' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Agent is thinking...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StepCard({ 
  step, 
  isLast, 
  onConfirm 
}: { 
  step: ExecutionStep; 
  isLast: boolean;
  onConfirm: (approved: boolean) => void;
}) {
  return (
    <div className={cn(
      "border rounded-lg p-4",
      step.status === 'complete' && "border-green-500/20 bg-green-500/5",
      step.status === 'failed' && "border-red-500/20 bg-red-500/5",
      step.requiresConfirmation && step.status === 'pending' && "border-yellow-500/20 bg-yellow-500/5",
    )}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{step.action}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {JSON.stringify(step.input, null, 2)}
          </div>
        </div>
        
        <StepStatusIcon status={step.status} />
      </div>
      
      {step.requiresConfirmation && step.status === 'pending' && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => onConfirm(true)}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onConfirm(false)}>
            Reject
          </Button>
        </div>
      )}
      
      {step.error && (
        <div className="mt-2 text-sm text-red-500">
          Error: {step.error}
        </div>
      )}
      
      {step.output && (
        <div className="mt-2">
          <details>
            <summary className="text-sm text-muted-foreground cursor-pointer">
              View output
            </summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify(step.output, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
```

### 3.4 Onboarding Flow

First-time users need guidance on what agents can do and how to configure them. Rather than a separate tutorial, we integrate hints into the normal workflow.

```tsx
// client/src/components/AgentOnboarding.tsx

export function AgentOnboarding() {
  const { data: hasRules } = trpc.userRules.list.useQuery();
  const [dismissed, setDismissed] = useState(false);
  
  // Don't show if user already has rules or dismissed
  if (dismissed || (hasRules && hasRules.length > 0)) {
    return null;
  }
  
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <Lightbulb className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Customize Your AI Agents</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You can add rules to control how agents behave. For example:
            </p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• "Always use TypeScript" - agents will prefer TS over JS</li>
              <li>• "Ask before deleting files" - agents will confirm destructive actions</li>
              <li>• "Follow our coding style guide" - agents will match your conventions</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <Button size="sm" asChild>
                <Link to="/settings/agents">Configure Agents</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Phase 3 Deliverables

| Component | Description | Test Coverage |
|-----------|-------------|---------------|
| `AgentConfigPage` | Main configuration UI | Component tests |
| `RulesEditor` | Rule creation and management | Component tests |
| `ExecutionMonitor` | Real-time execution view | Integration tests |
| `AgentOnboarding` | First-time user guidance | Component tests |

**Estimated Effort:** 5-6 days of implementation, 2 days of testing

---

## Phase 4: Context Management (Week 7-8)

**Goal:** Give agents the right information at the right time without overwhelming the context window.

### 4.1 Context Builder

A service that assembles relevant context for each agent interaction. The key insight from the research is that **more context isn't always better**—we need to be selective.

```typescript
// server/agents/contextBuilder.ts

export interface ContextConfig {
  maxTokens: number;
  includeProjectInfo: boolean;
  includeRecentFiles: boolean;
  includeRecentActions: boolean;
  includeUserRules: boolean;
}

const DEFAULT_CONFIG: ContextConfig = {
  maxTokens: 8000, // Reserve space for response
  includeProjectInfo: true,
  includeRecentFiles: true,
  includeRecentActions: true,
  includeUserRules: true,
};

export class ContextBuilder {
  async build(
    userId: number,
    projectId: number | null,
    sessionId: string,
    config: Partial<ContextConfig> = {}
  ): Promise<PromptContext> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const context: PromptContext = {};
    let tokenBudget = cfg.maxTokens;
    
    // Priority 1: User rules (always include, they're usually small)
    if (cfg.includeUserRules) {
      const rules = await db.getUserAgentRules(userId);
      context.user = {
        customRules: rules.map(r => r.ruleContent),
        preferences: '', // Could be expanded
      };
      tokenBudget -= estimateTokens(JSON.stringify(context.user));
    }
    
    // Priority 2: Project info (essential for context)
    if (cfg.includeProjectInfo && projectId) {
      const project = await db.getProjectById(projectId);
      if (project) {
        context.project = {
          name: project.name,
          description: project.description || '',
          techStack: project.techStack || [],
          conventions: project.conventions || '',
        };
        tokenBudget -= estimateTokens(JSON.stringify(context.project));
      }
    }
    
    // Priority 3: Recent actions (helps with continuity)
    if (cfg.includeRecentActions && tokenBudget > 1000) {
      const actions = await this.getRecentActions(sessionId, 10);
      context.session = {
        recentActions: actions.map(a => `${a.action}: ${a.summary}`),
        openFiles: [],
      };
      tokenBudget -= estimateTokens(JSON.stringify(context.session));
    }
    
    // Priority 4: Recent files (if we have budget)
    if (cfg.includeRecentFiles && tokenBudget > 2000 && projectId) {
      const files = await this.getRecentlyEditedFiles(projectId, 5);
      if (context.session) {
        context.session.openFiles = files.map(f => f.path);
      }
    }
    
    return context;
  }
  
  private async getRecentActions(sessionId: string, limit: number) {
    // Get recent actions from this session
    return db.getSessionActions(sessionId, limit);
  }
  
  private async getRecentlyEditedFiles(projectId: number, limit: number) {
    // Get recently modified files in the project
    return db.getRecentProjectFiles(projectId, limit);
  }
}

function estimateTokens(text: string): number {
  // Rough estimate: 4 characters per token
  return Math.ceil(text.length / 4);
}
```

### 4.2 Session Management

Track session state to provide continuity across interactions.

```typescript
// server/agents/sessionManager.ts

export interface Session {
  id: string;
  userId: number;
  projectId: number | null;
  agentType: string;
  startedAt: Date;
  lastActivityAt: Date;
  actions: SessionAction[];
  metadata: Record<string, unknown>;
}

export interface SessionAction {
  id: string;
  action: string;
  summary: string;
  timestamp: Date;
  success: boolean;
}

export class SessionManager {
  private sessions = new Map<string, Session>();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  getOrCreate(
    userId: number, 
    projectId: number | null, 
    agentType: string
  ): Session {
    const key = `${userId}-${projectId}-${agentType}`;
    
    let session = this.sessions.get(key);
    
    if (session && this.isExpired(session)) {
      this.sessions.delete(key);
      session = undefined;
    }
    
    if (!session) {
      session = {
        id: crypto.randomUUID(),
        userId,
        projectId,
        agentType,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        actions: [],
        metadata: {},
      };
      this.sessions.set(key, session);
    }
    
    return session;
  }
  
  recordAction(sessionId: string, action: SessionAction): void {
    const session = this.findById(sessionId);
    if (session) {
      session.actions.push(action);
      session.lastActivityAt = new Date();
      
      // Keep only last 50 actions
      if (session.actions.length > 50) {
        session.actions = session.actions.slice(-50);
      }
    }
  }
  
  private isExpired(session: Session): boolean {
    return Date.now() - session.lastActivityAt.getTime() > this.sessionTimeout;
  }
  
  private findById(sessionId: string): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.id === sessionId) {
        return session;
      }
    }
    return undefined;
  }
}
```

### 4.3 Intelligent File Selection

When an agent needs file context, we don't want to dump the entire codebase. Instead, we select relevant files based on the task.

```typescript
// server/agents/fileSelector.ts

export interface FileRelevance {
  path: string;
  score: number;
  reason: string;
}

export async function selectRelevantFiles(
  projectId: number,
  task: string,
  maxFiles: number = 10
): Promise<FileRelevance[]> {
  // Get all project files
  const allFiles = await db.getProjectFiles(projectId);
  
  // Score each file based on relevance to the task
  const scored: FileRelevance[] = [];
  
  for (const file of allFiles) {
    let score = 0;
    const reasons: string[] = [];
    
    // Check if file is mentioned in the task
    if (task.toLowerCase().includes(file.name.toLowerCase())) {
      score += 10;
      reasons.push('mentioned in task');
    }
    
    // Check file type relevance
    const ext = file.path.split('.').pop()?.toLowerCase();
    if (task.includes('test') && (ext === 'test.ts' || ext === 'spec.ts')) {
      score += 5;
      reasons.push('test file for testing task');
    }
    if (task.includes('style') && (ext === 'css' || ext === 'scss')) {
      score += 5;
      reasons.push('style file for styling task');
    }
    
    // Boost recently modified files
    const hoursSinceModified = (Date.now() - file.updatedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceModified < 24) {
      score += 3;
      reasons.push('recently modified');
    }
    
    // Boost entry points and config files
    if (['index.ts', 'main.ts', 'app.ts', 'package.json', 'tsconfig.json'].includes(file.name)) {
      score += 2;
      reasons.push('entry point or config');
    }
    
    if (score > 0) {
      scored.push({
        path: file.path,
        score,
        reason: reasons.join(', '),
      });
    }
  }
  
  // Sort by score and return top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles);
}
```

### Phase 4 Deliverables

| Component | Description | Test Coverage |
|-----------|-------------|---------------|
| `contextBuilder.ts` | Assemble context with token budgeting | Unit tests |
| `sessionManager.ts` | Track session state | Unit tests |
| `fileSelector.ts` | Select relevant files | Unit tests |

**Estimated Effort:** 4-5 days of implementation, 2 days of testing

---

## Phase 5: Observability & Debugging (Week 9-10)

**Goal:** Make it easy to understand what agents are doing and debug issues when they occur.

### 5.1 Structured Logging

All agent actions should be logged in a structured format that's easy to query and analyze.

```typescript
// server/agents/logger.ts

export interface AgentLog {
  timestamp: Date;
  executionId: number;
  sessionId: string;
  userId: number;
  agentType: string;
  event: string;
  data: Record<string, unknown>;
  level: 'debug' | 'info' | 'warn' | 'error';
}

export class AgentLogger {
  async log(log: Omit<AgentLog, 'timestamp'>): Promise<void> {
    const entry: AgentLog = {
      ...log,
      timestamp: new Date(),
    };
    
    // Write to database for persistence
    await db.insertAgentLog(entry);
    
    // Also write to console for real-time debugging
    const prefix = `[${entry.level.toUpperCase()}] [${entry.agentType}]`;
    console.log(`${prefix} ${entry.event}`, entry.data);
  }
  
  // Convenience methods
  info(executionId: number, sessionId: string, userId: number, agentType: string, event: string, data: Record<string, unknown> = {}) {
    return this.log({ executionId, sessionId, userId, agentType, event, data, level: 'info' });
  }
  
  error(executionId: number, sessionId: string, userId: number, agentType: string, event: string, data: Record<string, unknown> = {}) {
    return this.log({ executionId, sessionId, userId, agentType, event, data, level: 'error' });
  }
}

export const agentLogger = new AgentLogger();
```

### 5.2 Execution Replay

Allow users to see exactly what happened in a past execution.

```typescript
// server/agents/executionReplay.ts

export interface ExecutionReplay {
  execution: {
    id: number;
    agentType: string;
    startedAt: Date;
    completedAt: Date | null;
    status: ExecutionState;
    totalSteps: number;
  };
  steps: Array<{
    stepNumber: number;
    action: string;
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    error: string | null;
  }>;
  logs: AgentLog[];
  context: {
    prompt: string;
    projectContext: Record<string, unknown>;
    userRules: string[];
  };
}

export async function getExecutionReplay(executionId: number): Promise<ExecutionReplay> {
  const execution = await db.getExecution(executionId);
  const steps = await db.getExecutionSteps(executionId);
  const logs = await db.getAgentLogs({ executionId });
  const context = await db.getExecutionContext(executionId);
  
  return {
    execution: {
      id: execution.id,
      agentType: execution.agentType,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      status: execution.status,
      totalSteps: steps.length,
    },
    steps: steps.map(s => ({
      stepNumber: s.stepNumber,
      action: s.action,
      input: s.input,
      output: s.output,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      error: s.error,
    })),
    logs,
    context: {
      prompt: context.prompt,
      projectContext: context.projectContext,
      userRules: context.userRules,
    },
  };
}
```

### 5.3 Debug Panel UI

A UI component for viewing execution history and debugging issues.

```tsx
// client/src/pages/ExecutionHistory.tsx

export function ExecutionHistoryPage() {
  const { data: executions, isLoading } = trpc.executions.list.useQuery({
    limit: 50,
  });
  
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Execution list */}
        <div className="w-80 border-r overflow-auto">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Execution History</h2>
          </div>
          
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-16 mb-2" />
              <Skeleton className="h-16 mb-2" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="divide-y">
              {executions?.map((exec) => (
                <button
                  key={exec.id}
                  className={cn(
                    "w-full p-4 text-left hover:bg-muted/50",
                    selectedId === exec.id && "bg-muted"
                  )}
                  onClick={() => setSelectedId(exec.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{exec.agentType}</span>
                    <StatusBadge status={exec.status} size="sm" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatDistanceToNow(exec.startedAt)} ago
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {exec.totalSteps} steps
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Execution detail */}
        <div className="flex-1 overflow-auto">
          {selectedId ? (
            <ExecutionDetail executionId={selectedId} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select an execution to view details
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ExecutionDetail({ executionId }: { executionId: number }) {
  const { data: replay, isLoading } = trpc.executions.getReplay.useQuery({ executionId });
  const [activeTab, setActiveTab] = useState<'steps' | 'logs' | 'context'>('steps');
  
  if (isLoading) {
    return <div className="p-6"><Skeleton className="h-96" /></div>;
  }
  
  if (!replay) {
    return <div className="p-6">Execution not found</div>;
  }
  
  return (
    <div className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold capitalize">{replay.execution.agentType} Agent</h2>
          <StatusBadge status={replay.execution.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Started {format(replay.execution.startedAt, 'PPpp')}
          {replay.execution.completedAt && (
            <> • Completed {format(replay.execution.completedAt, 'PPpp')}</>
          )}
        </p>
      </header>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="steps">Steps ({replay.steps.length})</TabsTrigger>
          <TabsTrigger value="logs">Logs ({replay.logs.length})</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
        </TabsList>
        
        <TabsContent value="steps" className="mt-4">
          <div className="space-y-4">
            {replay.steps.map((step) => (
              <StepCard key={step.stepNumber} step={step} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="logs" className="mt-4">
          <div className="font-mono text-sm space-y-1">
            {replay.logs.map((log, i) => (
              <div 
                key={i}
                className={cn(
                  "p-2 rounded",
                  log.level === 'error' && "bg-red-500/10 text-red-500",
                  log.level === 'warn' && "bg-yellow-500/10 text-yellow-500",
                )}
              >
                <span className="text-muted-foreground">
                  {format(log.timestamp, 'HH:mm:ss.SSS')}
                </span>
                {' '}
                <span className="font-semibold">[{log.level.toUpperCase()}]</span>
                {' '}
                {log.event}
                {Object.keys(log.data).length > 0 && (
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="context" className="mt-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">System Prompt</h3>
              <pre className="text-sm bg-muted p-4 rounded overflow-auto max-h-96">
                {replay.context.prompt}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">User Rules</h3>
              {replay.context.userRules.length > 0 ? (
                <ul className="list-disc list-inside text-sm">
                  {replay.context.userRules.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No custom rules</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Phase 5 Deliverables

| Component | Description | Test Coverage |
|-----------|-------------|---------------|
| `logger.ts` | Structured agent logging | Unit tests |
| `executionReplay.ts` | Replay past executions | Unit tests |
| `ExecutionHistoryPage` | Debug UI | Component tests |
| `agent_logs` table | Log storage | Integration tests |

**Estimated Effort:** 4-5 days of implementation, 2 days of testing

---

## Implementation Timeline

| Phase | Duration | Dependencies | Key Deliverables |
|-------|----------|--------------|------------------|
| Phase 1: Foundation | Week 1-2 | None | Prompt templates, safety checker, user rules |
| Phase 2: Execution Engine | Week 3-4 | Phase 1 | Execution loop, tool registry, confirmations |
| Phase 3: User Interface | Week 5-6 | Phase 1, 2 | Config panel, execution monitor, onboarding |
| Phase 4: Context Management | Week 7-8 | Phase 1, 2 | Context builder, session manager, file selector |
| Phase 5: Observability | Week 9-10 | Phase 1-4 | Logging, replay, debug UI |

**Total Estimated Duration:** 10 weeks

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM response unpredictability | High | Medium | Strict output parsing, fallback behaviors |
| Context window overflow | Medium | High | Token budgeting, context pruning |
| Tool execution failures | Medium | Medium | Retry logic, graceful degradation |
| Performance issues with logging | Low | Medium | Async logging, log rotation |

### Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users don't discover features | High | High | Onboarding, inline hints, smart defaults |
| Rules too complex to configure | Medium | Medium | Presets, simple UI, good documentation |
| Agents too restrictive | Medium | Medium | Easy rule adjustment, clear feedback |
| Agents not restrictive enough | Medium | High | Conservative defaults, audit logging |

---

## Success Metrics

### Phase 1-2 (Foundation)
- [ ] 100% of agent actions pass through safety checker
- [ ] All tool executions are logged
- [ ] Confirmation flow works for all "confirm" level tools

### Phase 3 (UI)
- [ ] 80% of users who view agent config page create at least one rule
- [ ] Average time to create a rule < 30 seconds
- [ ] Execution monitor shows real-time updates within 500ms

### Phase 4 (Context)
- [ ] Context assembly < 100ms for typical projects
- [ ] Token usage stays within budget 99% of the time
- [ ] Session continuity maintained across page refreshes

### Phase 5 (Observability)
- [ ] All executions can be replayed
- [ ] Log queries return in < 1 second
- [ ] Users can identify failure cause from debug UI

---

## Appendix: File Structure

After implementation, the agent-related code will be organized as follows:

```
server/
  agents/
    index.ts              # Main exports
    promptTemplates.ts    # Template management
    safetyChecker.ts      # Safety validation
    executionEngine.ts    # Execution loop
    toolRegistry.ts       # Tool management
    contextBuilder.ts     # Context assembly
    sessionManager.ts     # Session tracking
    fileSelector.ts       # Intelligent file selection
    logger.ts             # Structured logging
    executionReplay.ts    # Replay functionality
    
client/src/
  pages/
    AgentConfig.tsx       # Configuration page
    ExecutionHistory.tsx  # Debug/history page
  components/
    RulesEditor.tsx       # Rule management UI
    ExecutionMonitor.tsx  # Real-time execution view
    AgentOnboarding.tsx   # First-time user hints
    
drizzle/
  schema.ts               # Updated with new tables
```

---

## Conclusion

This roadmap provides a practical path to implementing the research findings without over-engineering. Each phase delivers independent value, and the architecture is designed to be maintainable and debuggable. The focus on simplicity, user discoverability, and observability addresses the key risks identified in the research while avoiding the complexity that often leads to fragile systems.

The implementation prioritizes:
1. **Reliability** over sophistication
2. **User control** over automation
3. **Transparency** over magic
4. **Incremental delivery** over big-bang releases

By following this roadmap, Hero IDE will have a robust agent system that users can trust and customize to their needs.
