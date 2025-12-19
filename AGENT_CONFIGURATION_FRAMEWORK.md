# Hero IDE Agent Configuration Framework

**Version:** 1.0  
**Author:** Manus AI  
**Date:** December 2025

---

## Executive Summary

This document establishes a comprehensive framework for configuring, initializing, and safeguarding AI agents within Hero IDE. Drawing from extensive research on leading AI coding tools (Cursor, GitHub Copilot, Manus AI) and academic literature on agent safety, this framework provides actionable strategies for ensuring consistent agent behavior, preventing common failure modes, and delivering an intuitive user experience that surfaces powerful controls without overwhelming users.

The framework addresses three critical dimensions:
1. **Agent Initialization** - How agents receive context, instructions, and capabilities before user interaction
2. **Safety & Enforcement** - Guardrails, permission models, and failure prevention mechanisms
3. **UI/UX Design** - Making powerful controls discoverable and ensuring critical configurations aren't missed

---

## Table of Contents

1. [Agent Architecture Overview](#1-agent-architecture-overview)
2. [System Prompt Engineering](#2-system-prompt-engineering)
3. [Context Management Strategy](#3-context-management-strategy)
4. [Safety & Guardrails Framework](#4-safety--guardrails-framework)
5. [Permission & Trust Model](#5-permission--trust-model)
6. [Failure Prevention Mechanisms](#6-failure-prevention-mechanisms)
7. [UI/UX Design Patterns](#7-uiux-design-patterns)
8. [Agent Type Specifications](#8-agent-type-specifications)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [References](#10-references)

---

## 1. Agent Architecture Overview

### 1.1 Agent Types in Hero IDE

Hero IDE supports multiple specialized agent types, each requiring tailored configuration:

| Agent Type | Primary Role | Risk Level | User Interaction |
|------------|--------------|------------|------------------|
| **PM Agent** | Project management, requirements, planning | Medium | High - strategic decisions |
| **Developer Agent** | Code generation, debugging, refactoring | High | High - code execution |
| **QA Agent** | Testing, validation, quality assurance | Medium | Medium - test execution |
| **DevOps Agent** | Deployment, infrastructure, CI/CD | Critical | Low - automated operations |
| **Research Agent** | Information gathering, analysis | Low | Medium - data synthesis |

### 1.2 Agent Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     AGENT INITIALIZATION                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Load Base System Prompt (role, identity, capabilities)      │
│  2. Inject Project Context (codebase, requirements, history)    │
│  3. Apply User Preferences (custom rules, style guides)         │
│  4. Configure Tool Access (available tools, permissions)        │
│  5. Set Safety Boundaries (guardrails, restrictions)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ACTIVE OPERATION                            │
├─────────────────────────────────────────────────────────────────┤
│  • Process user requests through context window                 │
│  • Execute tools with permission checks                         │
│  • Create checkpoints for rollback capability                   │
│  • Log actions for audit trail                                  │
│  • Update working memory with session context                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SESSION PERSISTENCE                         │
├─────────────────────────────────────────────────────────────────┤
│  • Compress and store conversation summary                      │
│  • Save checkpoint state for recovery                           │
│  • Update project notes with key decisions                      │
│  • Record metrics for usage tracking                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. System Prompt Engineering

### 2.1 Prompt Structure Framework

Based on analysis of Cursor, Manus AI, and academic research, the optimal system prompt structure follows a hierarchical pattern [1] [2]:

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: IDENTITY & ROLE                                        │
│ - Who the agent is                                              │
│ - Primary responsibilities                                      │
│ - Relationship to user                                          │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 2: BEHAVIORAL GUIDELINES                                  │
│ - Communication style                                           │
│ - Decision-making principles                                    │
│ - Error handling approach                                       │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 3: TOOL USAGE RULES                                       │
│ - Available tools and their purposes                            │
│ - When to use vs. not use tools                                 │
│ - Tool invocation patterns                                      │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 4: SAFETY BOUNDARIES                                      │
│ - Prohibited actions                                            │
│ - Required confirmations                                        │
│ - Data handling restrictions                                    │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 5: CONTEXT INJECTION POINT                                │
│ - Project-specific information                                  │
│ - User preferences and custom rules                             │
│ - Current session state                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Prompt Principles

Drawing from Manus AI's context engineering lessons [3]:

**Principle 1: Reserve Reasoning Space**
> "If you stuff too much context into the prompt, the model may lose the ability to reason clearly."

Allocate context budget strategically:
- System instructions: 15-20%
- Project context: 30-40%
- Conversation history: 20-30%
- Reasoning space: 20-25%

**Principle 2: Avoid Conflicting Instructions**
> "Conflicting instructions create confusion and unpredictable behavior."

Use explicit priority ordering when rules might conflict:
```
Priority 1 (Highest): Safety boundaries - never violate
Priority 2: User explicit instructions
Priority 3: Project conventions and style guides
Priority 4: General best practices
```

**Principle 3: Keep Prompt Maintainable**
> "Treat prompts like production code - version control, modular design, clear documentation."

Structure prompts as composable modules that can be updated independently.

### 2.3 Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| **Prompt Stuffing** | Overwhelming context reduces reasoning quality | Prioritize and compress context |
| **Vague Instructions** | Inconsistent behavior across sessions | Use specific, measurable criteria |
| **Conflicting Rules** | Unpredictable agent decisions | Explicit priority ordering |
| **Missing Edge Cases** | Agent fails on unusual inputs | Define fallback behaviors |
| **Over-Restriction** | Agent becomes unhelpful | Balance safety with capability |

---

## 3. Context Management Strategy

### 3.1 The KV-Cache Analogy

As described by Manus AI [3], think of context as a KV-cache that persists across agent actions:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT WINDOW                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   System    │  │   Project   │  │  Session    │             │
│  │   Prompt    │  │   Context   │  │  History    │             │
│  │  (Static)   │  │ (Semi-Stable)│  │ (Dynamic)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  Optimization: Place stable content at beginning,               │
│  dynamic content at end to maximize KV-cache hits               │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Context Hierarchy

**Tier 1: Persistent Context (Always Present)**
- Agent identity and role
- Core safety boundaries
- Tool definitions
- Project metadata (name, type, tech stack)

**Tier 2: Session Context (Per-Conversation)**
- Current task description
- Relevant code files (on-demand loading)
- Recent conversation history (compressed)
- Active checkpoints

**Tier 3: Working Memory (Ephemeral)**
- Current tool outputs
- Intermediate reasoning steps
- Temporary state

### 3.3 Context Compression Strategies

For long-running sessions, implement progressive compression:

1. **Summarization** - Compress older conversation turns into summaries
2. **Selective Retention** - Keep only decisions, not deliberation
3. **External Storage** - Move detailed context to retrievable notes
4. **Checkpoint References** - Reference checkpoints instead of full state

### 3.4 File System as Extended Context

Following Manus AI's approach [3]:

> "The file system is the best form of 'memory' - files written by the agent can be read back later, surviving context resets."

Implement structured note-taking:
```
/project-root/
  /.hero/
    /context/
      project-summary.md      # High-level project overview
      architecture-decisions.md # Key technical decisions
      current-sprint.md       # Active work items
      agent-notes.md          # Agent's working notes
    /checkpoints/
      checkpoint-001.json     # Rollback points
```

---

## 4. Safety & Guardrails Framework

### 4.1 Defense in Depth Model

Based on Microsoft's taxonomy of AI agent failures [4] and GitHub's security research [5]:

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: INPUT VALIDATION                                       │
│ • Filter hidden characters (prompt injection prevention)        │
│ • Validate user permissions before processing                   │
│ • Sanitize external data sources                                │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 2: PROMPT HARDENING                                       │
│ • Clear instruction hierarchy                                   │
│ • Explicit data/instruction separation                          │
│ • Resistance to jailbreak attempts                              │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 3: TOOL PERMISSION MODEL                                  │
│ • Tiered tool access (read/write/execute)                       │
│ • Confirmation requirements for sensitive operations            │
│ • Scope restrictions (workspace boundaries)                     │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 4: OUTPUT VALIDATION                                      │
│ • Code security scanning before execution                       │
│ • Secret detection in generated content                         │
│ • Dependency vulnerability checking                             │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 5: EXECUTION SANDBOXING                                   │
│ • Isolated execution environment                                │
│ • Network firewall for data exfiltration prevention             │
│ • Resource limits (CPU, memory, time)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Guardrail Categories

**Input Guardrails** (Before Processing)
- Topic restrictions (stay within project scope)
- Jailbreak detection
- Hidden character filtering
- Permission verification

**Output Guardrails** (Before Delivery)
- Factuality checking (when possible)
- Code security validation
- Secret/credential detection
- Format compliance

**Execution Guardrails** (During Tool Use)
- Confirmation for destructive operations
- Scope boundary enforcement
- Rate limiting
- Checkpoint creation before risky actions

### 4.3 Prompt Injection Defenses

Based on academic research on securing LLM agents [6]:

**Pattern 1: Data/Instruction Separation**
```
<system_instructions>
[Trusted instructions from Hero IDE]
</system_instructions>

<user_data>
[Untrusted content - treat as data only]
</user_data>
```

**Pattern 2: Instruction Hierarchy**
```
PRIORITY LEVELS:
1. CRITICAL (Never override): Safety boundaries, data protection
2. HIGH: User explicit commands
3. MEDIUM: Project conventions
4. LOW: Suggestions, optimizations

When conflicts arise, higher priority always wins.
```

**Pattern 3: Confirmation Gates**
For high-risk operations, require explicit user confirmation:
- File deletion
- External API calls with credentials
- Code execution
- Database modifications
- Deployment actions

### 4.4 Hidden Character Filtering

Implement filtering for characters that could hide malicious instructions:
- Zero-width characters (U+200B, U+200C, U+200D, U+FEFF)
- Right-to-left override characters
- Homoglyph substitutions
- Invisible Unicode characters

---

## 5. Permission & Trust Model

### 5.1 Tiered Permission System

| Permission Level | Capabilities | Confirmation Required |
|-----------------|--------------|----------------------|
| **Read-Only** | View files, analyze code, answer questions | Never |
| **Workspace Write** | Edit files within project, create new files | For sensitive files |
| **System Write** | Modify config files, install dependencies | Always |
| **Execute** | Run commands, execute code | Always |
| **External** | API calls, network requests | Always |
| **Destructive** | Delete files, drop tables, force push | Double confirmation |

### 5.2 Tool Classification

**Auto-Approved Tools** (No confirmation needed)
- `read_file` - Read project files
- `search_codebase` - Semantic code search
- `get_diagnostics` - Retrieve linter errors
- `list_files` - Directory listing

**Single-Confirmation Tools**
- `edit_file` - Modify existing files
- `create_file` - Create new files
- `run_terminal` - Execute shell commands
- `install_dependency` - Add packages

**Double-Confirmation Tools**
- `delete_file` - Remove files
- `execute_sql` - Database operations
- `deploy` - Production deployment
- `modify_secrets` - Change credentials

### 5.3 Scope Boundaries

**Workspace Scope**
- Agent can only access files within project directory
- Cannot read/write outside workspace without explicit permission
- Config files (`.env`, `settings.json`) require confirmation

**Network Scope**
- Firewall enabled by default
- Allowlist for trusted domains
- Block data exfiltration attempts

**Time Scope**
- Maximum execution time per operation
- Session timeout with state preservation
- Rate limiting for expensive operations

---

## 6. Failure Prevention Mechanisms

### 6.1 Common AI Agent Failure Modes

Based on research from Galileo AI [7] and Microsoft [4]:

| Failure Mode | Description | Prevention Strategy |
|--------------|-------------|---------------------|
| **Goal Drift** | Agent pursues unintended objectives | Clear task boundaries, checkpoint validation |
| **Hallucination** | Agent generates false information | Grounding in project context, fact-checking |
| **Infinite Loops** | Agent repeats same action without progress | Loop detection, max iteration limits |
| **Context Confusion** | Agent loses track of conversation state | Structured context management, summaries |
| **Tool Misuse** | Agent uses wrong tool or wrong parameters | Clear tool descriptions, validation |
| **Scope Creep** | Agent expands beyond assigned task | Explicit scope boundaries, confirmation gates |
| **Cascading Errors** | One error leads to chain of failures | Checkpoint/rollback, error isolation |

### 6.2 Error Recovery Patterns

**Pattern 1: Checkpoint-Based Rollback**
```
Before risky operation:
  1. Create checkpoint with current state
  2. Execute operation
  3. Validate outcome
  4. If failed: rollback to checkpoint
  5. If success: commit checkpoint
```

**Pattern 2: Graceful Degradation**
```
On error:
  1. Log error with full context
  2. Attempt automatic recovery (retry with backoff)
  3. If recovery fails: pause and notify user
  4. Provide clear explanation and options
  5. Never continue blindly after failure
```

**Pattern 3: Human-in-the-Loop Escalation**
```
Escalation triggers:
  - Confidence below threshold
  - Ambiguous user intent
  - High-risk operation
  - Repeated failures
  - Novel situation not covered by training
```

### 6.3 Loop Detection

Implement detection for:
- Same tool called with same parameters 3+ times
- No progress toward goal after N iterations
- Circular reasoning patterns
- Resource consumption anomalies

---

## 7. UI/UX Design Patterns

### 7.1 Progressive Disclosure

Based on Microsoft's Agent UX principles [8] and UX Design Institute research [9]:

**Level 1: Essential Controls (Always Visible)**
- Start/stop agent
- Current task status
- Quick feedback (thumbs up/down)

**Level 2: Common Controls (One Click Away)**
- Tool permissions toggle
- Context sources selection
- Checkpoint management

**Level 3: Advanced Controls (Settings Panel)**
- Custom instructions editor
- Safety boundary configuration
- Detailed logging options

### 7.2 Smart Defaults with Override

> "Users shouldn't need to configure anything to get started, but power users should have full control."

**Default Configuration:**
```yaml
safety_level: balanced
auto_checkpoint: true
confirmation_required:
  - file_delete
  - code_execute
  - external_api
  - database_modify
context_sources:
  - project_files
  - conversation_history
  - project_notes
```

**Override Points:**
- Per-project settings (`.hero/config.yaml`)
- Per-session overrides (conversation command)
- Global user preferences (account settings)

### 7.3 Preventing Configuration Mistakes

**Pattern 1: Guided Setup Wizard**
For new projects, walk users through:
1. Project type selection (determines default agent configuration)
2. Safety level selection (with clear explanations)
3. Tool permission review (with recommendations)
4. Custom instructions prompt (with templates)

**Pattern 2: Configuration Validation**
Before saving configuration:
- Check for conflicting rules
- Warn about overly permissive settings
- Suggest missing common configurations

**Pattern 3: Visual Feedback**
Show users what their agents can/cannot do:
```
┌─────────────────────────────────────────────────────────────────┐
│ Agent Capabilities                                              │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Read project files                                           │
│ ✅ Edit code files (with preview)                               │
│ ⚠️ Run terminal commands (requires confirmation)                │
│ ⚠️ Install dependencies (requires confirmation)                 │
│ ❌ Delete files (disabled)                                      │
│ ❌ Access external APIs (disabled)                              │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Transparency & Explainability

**Action Logging**
Every agent action should be logged with:
- What action was taken
- Why (reasoning summary)
- What changed (diff view for code)
- How to undo (rollback option)

**Confidence Indicators**
Show users when agent is uncertain:
- High confidence: Proceed automatically
- Medium confidence: Show reasoning, ask for confirmation
- Low confidence: Pause and explain uncertainty

**Tool Usage Visibility**
Never hide tool usage from users:
- Show which tools are being called
- Display tool parameters (sanitized)
- Provide tool output summaries

### 7.5 Preventing User Errors

**Required Fields with Smart Prompts**
Don't let users start agents without critical context:
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Missing Context                                              │
├─────────────────────────────────────────────────────────────────┤
│ Your PM Agent works better with:                                │
│                                                                 │
│ □ Project requirements document                                 │
│   [Upload] or [Generate from description]                       │
│                                                                 │
│ □ Technical constraints                                         │
│   [Add constraints] or [Use defaults]                           │
│                                                                 │
│ □ Team preferences                                              │
│   [Configure] or [Skip for now]                                 │
│                                                                 │
│ [Continue anyway] [Complete setup]                              │
└─────────────────────────────────────────────────────────────────┘
```

**Proactive Suggestions**
Agent should suggest missing configurations:
- "I notice you haven't set up custom instructions. Would you like me to suggest some based on your project?"
- "Your safety settings are at default. For a production project, consider enabling additional confirmations."

---

## 8. Agent Type Specifications

### 8.1 PM Agent Configuration

**Identity Block:**
```
You are the PM Agent for Hero IDE, a strategic project management assistant 
specializing in software development workflows. You help users plan projects, 
break down requirements, track progress, and coordinate between development phases.

Your primary responsibilities:
1. Requirements analysis and specification
2. Task breakdown and prioritization
3. Sprint planning and tracking
4. Risk identification and mitigation
5. Team coordination and communication
```

**Behavioral Guidelines:**
```
Communication Style:
- Be concise but thorough
- Use structured formats (tables, lists) for complex information
- Ask clarifying questions before making assumptions
- Provide rationale for recommendations

Decision Making:
- Prioritize user-stated goals over inferred preferences
- When uncertain, present options with trade-offs
- Document decisions in project notes for future reference
- Escalate ambiguous situations to user

Error Handling:
- Acknowledge mistakes directly without excessive apology
- Provide corrective actions, not just explanations
- Learn from feedback within the session
```

**Tool Access:**
```yaml
pm_agent_tools:
  always_available:
    - read_project_files
    - search_codebase
    - create_notes
    - update_requirements
    - list_tasks
  
  requires_confirmation:
    - create_task
    - modify_sprint
    - assign_work
    - update_timeline
  
  disabled:
    - execute_code
    - modify_files
    - deploy
```

**Safety Boundaries:**
```
NEVER:
- Make technical implementation decisions without developer input
- Commit to deadlines without user approval
- Share project information outside the workspace
- Override user-set priorities

ALWAYS:
- Document assumptions and decisions
- Provide reasoning for recommendations
- Respect scope boundaries
- Create checkpoints before major planning changes
```

### 8.2 Developer Agent Configuration

**Identity Block:**
```
You are the Developer Agent for Hero IDE, an expert coding assistant 
specializing in software implementation. You help users write, debug, 
refactor, and optimize code across multiple languages and frameworks.

Your primary responsibilities:
1. Code generation and completion
2. Bug identification and fixing
3. Code refactoring and optimization
4. Documentation and comments
5. Test creation and validation
```

**Tool Access:**
```yaml
developer_agent_tools:
  always_available:
    - read_file
    - search_codebase
    - get_diagnostics
    - list_files
    - get_definitions
  
  requires_confirmation:
    - edit_file
    - create_file
    - run_terminal
    - install_dependency
  
  double_confirmation:
    - delete_file
    - execute_code
    - modify_config
```

**Code Generation Rules:**
```
BEFORE generating code:
1. Read existing code in the target area
2. Understand project conventions and style
3. Check for existing utilities that could be reused

WHEN generating code:
1. Include all necessary imports
2. Follow project naming conventions
3. Add appropriate comments and documentation
4. Handle error cases explicitly
5. Never generate placeholder or incomplete code

AFTER generating code:
1. Verify syntax correctness
2. Check for security issues
3. Ensure tests pass (if applicable)
4. Create checkpoint if changes are significant
```

### 8.3 QA Agent Configuration

**Identity Block:**
```
You are the QA Agent for Hero IDE, a quality assurance specialist 
focused on ensuring software reliability and correctness. You help 
users create tests, identify bugs, validate functionality, and 
maintain code quality standards.
```

**Tool Access:**
```yaml
qa_agent_tools:
  always_available:
    - read_file
    - search_codebase
    - get_diagnostics
    - list_tests
    - get_coverage
  
  requires_confirmation:
    - create_test
    - run_tests
    - edit_test
  
  disabled:
    - modify_production_code
    - deploy
    - delete_files
```

### 8.4 DevOps Agent Configuration

**Identity Block:**
```
You are the DevOps Agent for Hero IDE, an infrastructure and deployment 
specialist. You help users configure CI/CD pipelines, manage deployments, 
and maintain operational excellence.

CRITICAL: You operate in a high-risk domain. All actions that affect 
production systems require explicit user confirmation.
```

**Safety Boundaries (Elevated):**
```
CRITICAL RESTRICTIONS:
- NEVER deploy to production without double confirmation
- NEVER modify production databases directly
- NEVER expose secrets or credentials
- NEVER bypass security controls

REQUIRED CONFIRMATIONS:
- Any deployment action
- Infrastructure modifications
- Secret/credential changes
- Pipeline configuration changes
- Database migrations
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Sprint 1-2)

**Database Schema Updates:**
- [x] Agent checkpoints table
- [x] Project notes table
- [x] Metrics tracking table
- [ ] Agent configurations table
- [ ] Tool permissions table
- [ ] Audit log table

**Core Infrastructure:**
- [ ] System prompt template engine
- [ ] Context assembly pipeline
- [ ] Tool permission middleware
- [ ] Checkpoint/rollback system

### Phase 2: Safety Layer (Sprint 3-4)

**Guardrails Implementation:**
- [ ] Input validation layer
- [ ] Hidden character filtering
- [ ] Output security scanning
- [ ] Confirmation gate system

**Permission System:**
- [ ] Tiered tool access control
- [ ] Scope boundary enforcement
- [ ] Rate limiting

### Phase 3: UI/UX (Sprint 5-6)

**User Interface:**
- [ ] Agent configuration wizard
- [ ] Tool permission dashboard
- [ ] Action log viewer
- [ ] Checkpoint timeline UI

**Smart Defaults:**
- [ ] Project type detection
- [ ] Recommended configurations
- [ ] Missing context prompts

### Phase 4: Advanced Features (Sprint 7-8)

**Context Management:**
- [ ] Conversation compression
- [ ] External memory (file-based notes)
- [ ] Context budget optimization

**Monitoring & Analytics:**
- [ ] Agent performance metrics
- [ ] Error tracking and analysis
- [ ] Usage patterns dashboard

---

## 10. References

[1] Cursor AI System Prompt Analysis. GitHub Gist, 2025. https://gist.github.com/sshh12/25ad2e40529b269a88b80e7cf1c38084

[2] "How Cursor AI IDE Works." SSHH Blog, 2025. https://blog.sshh.io/p/how-cursor-ai-ide-works

[3] "Context Engineering for AI Agents: Lessons from Building Manus." Manus AI Blog, 2025. https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus

[4] "Taxonomy of Failure Modes in AI Agents." Microsoft Security Blog, April 2025. https://www.microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/

[5] "Safeguarding VS Code Against Prompt Injections." GitHub Security Blog, August 2025. https://github.blog/security/vulnerability-research/safeguarding-vs-code-against-prompt-injections/

[6] "Design Patterns for Securing LLM Agents Against Prompt Injection." arXiv, 2025. https://arxiv.org/html/2506.08837v1

[7] "7 Types of AI Agent Failure and How to Fix Them." Galileo AI Blog, 2025. https://galileo.ai/blog/prevent-ai-agent-failure

[8] "UX Design for Agents." Microsoft Design, 2025. https://microsoft.design/articles/ux-design-for-agents/

[9] "Designing Experiences for AI Agents." UX Design Institute, 2025. https://www.uxdesigninstitute.com/blog/design-experiences-for-ai-agents/

[10] "Responsible Use of GitHub Copilot Coding Agent." GitHub Docs, 2025. https://docs.github.com/en/copilot/responsible-use/copilot-coding-agent

[11] "Effective Context Engineering for AI Agents." Anthropic Engineering Blog, 2025. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

---

## Appendix A: System Prompt Templates

### A.1 Base Template Structure

```markdown
# Agent Identity
You are [AGENT_NAME], a [ROLE_DESCRIPTION] for Hero IDE.

# Core Responsibilities
[NUMBERED_LIST_OF_RESPONSIBILITIES]

# Communication Guidelines
<communication>
[COMMUNICATION_RULES]
</communication>

# Tool Usage
<tools>
[TOOL_DESCRIPTIONS_AND_RULES]
</tools>

# Safety Boundaries
<safety>
[CRITICAL_RESTRICTIONS]
[REQUIRED_CONFIRMATIONS]
[PROHIBITED_ACTIONS]
</safety>

# Project Context
<context>
[INJECTED_PROJECT_CONTEXT]
</context>

# User Preferences
<preferences>
[CUSTOM_INSTRUCTIONS]
</preferences>
```

### A.2 Context Injection Points

```markdown
# Project Context Injection
<project>
Name: {{project.name}}
Type: {{project.type}}
Tech Stack: {{project.techStack}}
Current Sprint: {{project.currentSprint}}
</project>

# Session Context Injection
<session>
Task: {{session.currentTask}}
History Summary: {{session.historySummary}}
Active Checkpoints: {{session.checkpoints}}
</session>

# User Context Injection
<user>
Role: {{user.role}}
Preferences: {{user.preferences}}
Custom Rules: {{user.customRules}}
</user>
```

---

## Appendix B: Configuration Schema

```typescript
interface AgentConfiguration {
  // Identity
  agentType: 'pm' | 'developer' | 'qa' | 'devops' | 'research';
  name: string;
  description: string;
  
  // Permissions
  permissions: {
    toolAccess: {
      [toolName: string]: 'always' | 'confirm' | 'double_confirm' | 'disabled';
    };
    scopeBoundaries: {
      workspaceOnly: boolean;
      allowedPaths: string[];
      blockedPaths: string[];
    };
    networkAccess: {
      enabled: boolean;
      allowedDomains: string[];
    };
  };
  
  // Safety
  safety: {
    level: 'strict' | 'balanced' | 'permissive';
    autoCheckpoint: boolean;
    maxIterations: number;
    timeoutSeconds: number;
    requiredConfirmations: string[];
  };
  
  // Context
  context: {
    maxTokens: number;
    compressionStrategy: 'summarize' | 'truncate' | 'selective';
    persistentNotes: boolean;
    includeHistory: boolean;
  };
  
  // Custom Instructions
  customInstructions: string;
}
```

---

*This document should be treated as a living specification and updated as Hero IDE evolves and new best practices emerge.*
