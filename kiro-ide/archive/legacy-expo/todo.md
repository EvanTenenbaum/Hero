# Hero IDE - Project TODO

## Core Navigation & Theme
- [x] Update theme colors for dark IDE aesthetic
- [x] Configure tab navigation (Home, Chat, Agents, Settings)
- [x] Add icon mappings for all tabs
- [x] Create base screen layouts

## Explicit State Machine (Section 3)
- [x] Implement SystemState type with all operational states
- [x] Create state machine with allowed/forbidden actions per state
- [x] Build state indicator component (always visible)
- [x] Implement state transitions with explicit acknowledgment
- [x] States: Scoped/Unscoped, Read-Only/Propose/Apply, Non-Agentic/Agentic
- [x] States: Checkpointed/Uncheckpointed, Budget-Safe/Budget-Constrained
- [x] Make illegal actions structurally impossible (not just discouraged)

## Autonomy Modes as Contracts (Section 4)
- [x] Implement MODE A - DIRECTED (no scope expansion, no chaining)
- [x] Implement MODE B - COLLABORATIVE (propose with pause for approval)
- [x] Implement MODE C - AGENTIC (opt-in, auto-checkpoint, logging, halt on uncertainty)
- [x] Mode transition UI with explicit acknowledgment
- [x] Mode contract display showing allowed scope/actions/disclosures
- [x] Rollback guarantees per mode

## Context Governance (Section 5)
- [x] Context source tracking (user-provided, dependency-required, approved)
- [x] Context addition logging with source/purpose/relevance
- [x] Context inspection panel ("What am I reasoning from?")
- [x] Context threshold enforcement (size, breadth, ambiguity)
- [x] Auto-halt on context threshold exceeded
- [x] Context narrowing request UI

## Change Lifecycle (Section 6)
- [x] Forced 8-step change process UI
- [x] Step 1: DECLARE INTENT screen
- [x] Step 2: DECLARE SCOPE screen
- [x] Step 3: DECLARE RISK LEVEL screen
- [x] Step 4: PRESENT PREVIEW screen
- [x] Step 5: REQUIRE APPROVAL screen
- [x] Step 6: APPLY CHANGE (with confirmation)
- [x] Step 7: CONFIRM RESULT screen
- [x] Step 8: ENABLE RECOVERY (checkpoint/rollback)
- [x] No step skipping enforcement

## Multi-Step Agent Behavior (Section 7)
- [x] Agent goal/assumptions/stopping conditions declaration
- [x] Maximum steps configuration
- [x] Per-step re-evaluation ("Is goal valid? Scope changed? Uncertainty rising?")
- [x] Uncertainty threshold with auto-halt
- [x] "Push through" prevention (never continue through ambiguity)

## Model Orchestration (Section 8)
- [x] Risk-based model selection
- [x] Model choice justification display
- [x] Higher-risk = stronger reasoning + stricter guardrails
- [x] User override for model selection
- [x] Cheaper model warning for risky tasks

## Budgets & Limits (Section 9)
- [x] Hard limits: scope size, step count, cost, time, context expansion
- [x] Limit enforcement (not advisory)
- [x] Fail-early on limit reached
- [x] Constraint explanation UI
- [x] Safe options presentation on limit hit
- [x] Silent failure prevention

## Explainability (Section 10)
- [ ] Action explanation panel (what/why/rejected alternatives)
- [ ] "What would happen under different mode" display
- [ ] Decision audit trail
- [ ] Trust calibration UI

## Violation Handling (Section 11)
- [x] Violation detection system
- [x] Auto-halt on violation
- [x] Violation disclosure UI
- [x] Rollback/isolate effects
- [x] Recurrence prevention explanation
- [x] Self-reporting mechanism

## Anti-Patterns Prevention (Section 12)
- [x] Silent autonomy escalation blocker
- [x] Silent scope broadening blocker
- [x] Confidence-based rule breaking prevention
- [x] Context selection transparency
- [x] "Just to finish" continuation blocker
- [x] Speed-over-safety assumption prevention

## Project Management
- [x] Project list screen with cards
- [x] Create new project flow
- [x] Project workspace screen with tabs
- [ ] Local storage for projects (AsyncStorage)
- [ ] Context awareness system (file tracking, recent edits)

## Secrets Vault
- [x] Secure secrets storage screen
- [x] Add/edit/delete secrets (API keys, tokens)
- [x] Encrypted local storage for secrets
- [x] Secret categories (LLM keys, GitHub tokens, MCP credentials)
- [ ] Secret usage tracking per project

## Agent Rules & Context
- [x] Agent types configuration screen
- [x] Custom rules per agent type (coding, review, planning, etc.)
- [x] Context injection rules (what context to include)
- [x] Agent behavior presets
- [ ] Project-specific agent overrides

## Roadmap & Sprint Planning
- [x] Roadmap screen with task list
- [ ] Drag-and-drop task reordering
- [ ] Task properties (severity, dependencies, blockers, parallelizable)
- [ ] Smart sprint suggestions based on severity and context
- [ ] Intelligent task ordering (dependencies, blockers, parallel groups)
- [ ] Sprint creation and management
- [ ] Task status tracking (todo, in-progress, blocked, done)
- [ ] Natural language task editing via AI PM
- [ ] Dependency visualization

## Code Editor
- [ ] File browser/tree component
- [ ] Code editor with syntax highlighting
- [ ] File tabs for multiple open files
- [ ] Line numbers and gutter
- [ ] AI suggestion overlay

## LLM Integration
- [x] API connections settings screen
- [x] Multi-provider support (OpenAI, Anthropic, Google, Local)
- [x] Smart routing engine (task → model mapping)
- [x] API key secure storage
- [ ] Usage tracking and cost estimation

## MCP Connections
- [x] MCP servers list screen
- [x] Add/edit MCP server form
- [x] Connection status monitoring
- [ ] Tool browser for connected servers

## GitHub Integration
- [x] GitHub OAuth connection
- [x] Repository browser
- [x] Clone repository functionality
- [ ] Git operations (pull, push, commit)
- [ ] Branch management
- [ ] PR viewing

## AI Chat Interface
- [x] Chat screen with message history
- [x] Context indicator (current file/selection)
- [x] Model selector dropdown
- [x] Quick actions (Generate Plan, Create Tasks)
- [ ] Message streaming support
- [x] Natural language roadmap commands
- [x] Task creation/editing via chat
- [x] Sprint planning via conversation

## PM Configuration Capabilities
- [x] PM can configure IDE settings via natural language
- [x] PM can set up new API integrations (LLM providers)
- [x] PM can manage MCP server connections
- [x] PM can configure agent rules and behaviors
- [x] PM can adjust budget limits and governance settings
- [x] PM can manage secrets vault
- [x] PM can configure GitHub integration
- [x] PM can set project preferences
- [x] PM can manage autonomy mode transitions
- [x] Configuration command parser and executor

## Branding
- [x] Generate custom app icon
- [x] Rename app from Kiro to Hero throughout frontend
- [x] Update app name and configuration
- [ ] Splash screen setup

## API Keys Configuration
- [x] Add Gemini API key to secrets vault
- [x] Add Anthropic Claude API key to secrets vault
- [x] Add DigitalOcean API key to secrets vault
- [x] Add GitHub token to secrets vault
- [x] Enable all keys for smart routing
- [x] Configure Vercel MCP connection
- [x] Configure DigitalOcean MCP connections (accounts, apps, databases)
- [x] Configure GitHub MCP connection

## QA Testing
- [x] Red Hat QE Level 3 audit completed
- [x] Security review for API key handling
- [x] Token logging removed from production code
- [x] Governance system unit tests (15 tests passing)
- [x] Secrets management unit tests (18 tests passing)
- [x] KIRO references renamed to Hero

## Real LLM API Integration
- [x] Create LLM API client for Gemini
- [x] Create LLM API client for Claude/Anthropic
- [x] Integrate API client with PM chat hook
- [x] Add response streaming support
- [x] Add error handling and fallback logic
- [x] Test with real API calls (22 unit tests passing)
