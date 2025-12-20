# Hero IDE - Project TODO

## Phase 1: Database Schema
- [x] Users table with roles (admin/user)
- [x] Projects table with metadata and settings
- [x] Chat messages table with conversation history
- [x] Agents table with configuration and state
- [x] Agent executions table for tracking runs
- [x] Secrets table for encrypted API keys
- [x] GitHub connections table for OAuth tokens
- [x] Governance rules table
- [x] Change requests table for lifecycle tracking
- [x] Budget tracking table

## Phase 2: Authentication
- [x] Manus OAuth integration (using built-in auth)
- [x] Session management with JWT
- [x] User role management (admin/user)
- [x] Protected routes and procedures

## Phase 3: LLM Integration
- [x] Gemini API integration via built-in LLM helper
- [x] Streaming chat responses
- [x] Chat history persistence
- [x] Markdown rendering with Streamdown
- [x] System prompts and context management

## Phase 4: GitHub Integration
- [x] GitHub OAuth token storage
- [x] Repository listing and search
- [ ] Repository cloning/import
- [x] File browsing and tree view
- [x] File content viewing and editing
- [x] Branch management
- [ ] Pull request creation and viewing
- [ ] Issue tracking integration

## Phase 5: Project Management
- [x] Create new project
- [x] Import from GitHub
- [ ] Clone repository
- [x] Project settings
- [x] File editor with syntax highlighting (Monaco Editor)
- [x] Project dashboard

## Phase 6: Agent System
- [x] Agent configuration and rules
- [x] Agent execution engine (basic)
- [x] Goal declaration and validation
- [x] Step-by-step execution with checkpoints
- [x] Uncertainty threshold monitoring
- [x] Automatic halting on violations
- [x] Budget tracking per execution
- [ ] Rollback capability

## Phase 7: Settings Management
- [ ] API connections management
- [x] Secrets management (encrypted)
- [x] Agent rules configuration
- [x] Budget limits configuration
- [x] Model routing configuration
- [ ] MCP server configuration (future)

## Phase 8: Governance System
- [x] 8-step change lifecycle (schema)
- [x] Change request creation
- [x] Approval workflow
- [x] Violation detection
- [x] Audit logging
- [ ] Risk assessment UI

## Phase 9: UI Components
- [x] Dashboard layout with sidebar
- [x] Projects screen
- [x] Chat screen with streaming
- [x] Agents screen with monitoring
- [x] Settings screen with tabs
- [x] File editor component (Monaco Editor)
- [x] Repository browser component

## Phase 10: Testing & QA
- [x] Unit tests for core procedures (35 tests passing)
- [x] Integration tests for auth flow
- [x] Agent execution tests
- [x] Governance workflow tests

## Roadmap: Next Steps for Feature Completion

### Priority 1: GitHub Integration (Critical for IDE functionality)
- [ ] Implement GitHub OAuth flow for user token storage
- [ ] Build repository browser component
- [ ] Implement file tree navigation
- [ ] Add Monaco editor for code editing
- [ ] Enable commit and push functionality

### Priority 2: Advanced Agent Features
- [ ] Implement full agent execution loop with LLM
- [ ] Add real-time execution monitoring
- [ ] Build rollback mechanism
- [ ] Add execution history and replay

### Priority 3: Enhanced Governance
- [ ] Build risk assessment scoring
- [ ] Add change diff visualization
- [ ] Implement approval notifications
- [ ] Add governance dashboard

## New Features In Progress

### GitHub OAuth Integration
- [x] GitHub OAuth flow implementation
- [x] Token storage with encryption
- [x] Repository listing and search
- [x] Repository browser component
- [x] File tree navigation
- [x] File content viewer

### Monaco Editor Integration
- [x] Monaco Editor component setup
- [x] Syntax highlighting for multiple languages
- [x] File editing with save functionality
- [x] Integration with GitHub file operations

### Real-time Agent Monitoring
- [x] SSE setup for real-time updates
- [x] Live execution status display
- [x] Step-by-step progress visualization
- [x] Real-time log streaming

### Priority 4: MCP Integration (Future)
- [ ] MCP server connection management
- [ ] Tool discovery and registration
- [ ] Tool execution from agents



## Research Integration Tasks
- [x] Extract and analyze research files from zip attachment
- [x] Map research findings to existing Hero IDE features
- [x] Identify feature improvements and augmentations
- [x] Create integration report document (INTEGRATION_REPORT.md)
- [x] Create atomic roadmap for implementation (ATOMIC_ROADMAP.md)
- [x] Final QA verification of all features
  - [x] Metrics Dashboard displays correctly
  - [x] Navigation sidebar works with all pages
  - [x] Projects page loads and shows existing projects
  - [x] Agents page loads and shows existing agents
  - [x] Chat page loads with conversation history
  - [x] All 53 unit tests passing

## Sprint 1: Foundation Enhancements (From Research)
- [x] Add agentCheckpoints table for rollback capability
- [x] Add projectNotes table for context engineering
- [x] Add metricsDaily table for usage tracking
- [x] Add requirements table for spec-driven development
- [x] Add technicalDesigns table for design specs
- [x] Add hooks table for event-driven automation
- [x] Add hookExecutions table for hook tracking
- [x] Add database helper functions for new tables
- [x] Add checkpoint tRPC procedures
- [x] Add project notes tRPC procedures
- [x] Add metrics tRPC procedures
- [x] Add unit tests for new features (18 tests passing)
- [x] Add Metrics Dashboard UI
- [x] Add Checkpoint Timeline UI component


## Deep Research: AI Agent Safety & PM AI Optimization
- [x] Research AI agent safety and enforcement mechanisms in IDE tools
- [x] Research common risks and failure modes in AI coding assistants
- [x] Research prompt engineering best practices for AI agents
- [x] Analyze Manus AI patterns and context management strategies
- [x] Research memory and context persistence strategies for LLMs
- [x] Create comprehensive safety and enforcement documentation (AGENT_CONFIGURATION_FRAMEWORK.md)
- [x] Create PM AI customization and optimization guide (AGENT_SYSTEM_PROMPTS.md)
- [x] Define system prompts and guardrails for Hero IDE agents

## Expanded Research: Complete Agent Strategy Framework
- [x] Research AI agent initialization and system prompt injection strategies
- [x] Research agent safety enforcement across all agent types
- [x] Research context management and memory persistence patterns
- [x] Analyze leading AI coding tools (Cursor, Copilot, Devin) agent architectures
- [x] Research prompt engineering best practices for coding agents
- [x] Create comprehensive agent configuration framework (AGENT_CONFIGURATION_FRAMEWORK.md)
- [x] Design system prompts for all Hero IDE agent types (AGENT_SYSTEM_PROMPTS.md)
- [x] Define guardrails and safety boundaries for each agent
- [x] Create agent initialization pipeline documentation


## Implementation Roadmap Creation
- [x] Design lean implementation architecture
- [x] Create phased implementation roadmap document (IMPLEMENTATION_ROADMAP.md)
- [x] Define MVP vs future features
- [x] Identify dependencies and risks


## Full Roadmap Implementation

### Phase 1: Foundation
- [x] QA and improve roadmap document
- [x] Create prompt_templates table schema
- [x] Create user_agent_rules table schema
- [x] Implement promptTemplates.ts module
- [x] Implement safetyChecker.ts module
- [ ] Add userRules tRPC router
- [x] Write unit tests for Phase 1 (agent-system.test.ts - 29 tests)

### Phase 2: Execution Engine
- [x] Implement executionEngine.ts with state machine
- [x] Implement toolRegistry.ts
- [ ] Add execution tRPC procedures
- [ ] Implement confirmation flow
- [x] Write unit tests for Phase 2 (included in agent-system.test.ts)

### Phase 3: User Interface
- [x] Create AgentConfig page
- [x] Create RulesEditor component (integrated in AgentConfig)
- [x] Create ExecutionMonitor component (already existed)
- [x] Create AgentOnboarding component
- [x] Add routes and navigation

### Phase 4: Context Management
- [x] Implement contextBuilder.ts
- [x] Implement sessionManager.ts
- [x] Implement fileSelector.ts
- [x] Write unit tests for Phase 4 (included in agent-system.test.ts)

### Phase 5: Observability
- [x] Create agent_logs table schema
- [x] Implement logger.ts
- [x] Implement executionReplay.ts
- [x] Create ExecutionHistory page
- [x] Write unit tests for Phase 5 (included in agent-system.test.ts)

### Final QA
- [x] Run all tests (82 tests passing)
- [x] Verify all features work end-to-end
  - [x] Agent Config page working
  - [x] Execution History page working
  - [x] Navigation updated with all new pages
  - [x] All agent modules implemented and exported
- [ ] Fix any issues found


## Parallel Agent Execution Roadmap
- [x] Design parallel workstream architecture
- [x] Define file/feature boundaries for each agent
- [x] Create task specifications for parallel agents
- [x] Define integration and QA protocols
- [x] Create PARALLEL_ROADMAP.md document


## Sprint 1 Execution
- [x] Agent Alpha: Chat Integration (chatAgent.ts, chat-agent router, useChatAgent hook)
- [x] Agent Beta: Prompt Seeding (defaultPrompts.ts, promptSeeds.ts)
- [x] Agent Gamma: Metrics Wiring (metricsRecorder.ts)
- [x] QA Gate: Review all Sprint 1 code
- [x] Integration: Merge Sprint 1 into main codebase

## Sprint 2 Execution
- [x] Agent Alpha: Confirmation Modal (ConfirmationModal.tsx, useConfirmation.ts)
- [x] Agent Beta: Real-time Updates (useExecutionUpdates.ts)
- [x] Agent Gamma: Rule Presets (RulePresets.tsx)
- [x] QA Gate: Review all Sprint 2 code
- [x] Integration: Merge Sprint 2 into main codebase

## Sprint 3 Execution
- [x] Agent Alpha: Cost Tracking (costTracker.ts, CostDashboard.tsx)
- [x] Agent Beta: Agent Rollback (rollbackService.ts, RollbackPanel.tsx)
- [x] QA Gate: Review all Sprint 3 code
- [x] Integration: Merge Sprint 3 into main codebase
- [x] Final QA: Full test suite and smoke testing (82 tests passing)


## Next Steps Implementation
- [x] Run prompt seeding script to populate database with default prompts (5 prompts inserted)
- [x] Integrate CostDashboard into Settings page
- [x] Wire RollbackPanel to Agent Detail view
- [x] Run tests and QA verification (82 tests passing, TypeScript clean)


## Red Team QA Audit
- [x] Audit backend modules (chatAgent, promptSeeds, metricsRecorder, costTracker, rollbackService)
- [x] Audit frontend components (CostDashboard, RollbackPanel, ConfirmationModal, RulePresets)
- [x] Audit frontend hooks (useChatAgent, useConfirmation, useExecutionUpdates)
- [x] Audit database schema additions and routers
- [x] Check for security vulnerabilities (SQL injection, XSS, auth bypass)
- [x] Check for edge cases and error handling
- [x] Check for type safety issues
- [x] Fix all identified issues (see QA_FINDINGS.md)
- [x] Re-run all tests after fixes (127 tests passing)


## Chat to Agent System Integration
- [x] Analyze existing chat router and chatAgent.ts
- [x] Update chat router to use chatAgent service
- [x] Integrate safety checks into chat flow
- [x] Integrate prompt templates into chat flow
- [x] Add metrics recording to chat flow
- [ ] Update chat UI if needed
- [x] Test integration end-to-end (127 tests passing)
- [x] Verify safety checks block malicious prompts


## Comprehensive Site Logic Review
- [ ] Review all routers for improvement opportunities
- [ ] Review all database helpers for optimization
- [ ] Review all frontend components for UX improvements
- [ ] Review all hooks for efficiency
- [ ] Identify and fix code duplication
- [ ] Improve error handling across the site
- [ ] Optimize database queries
- [ ] Implement identified improvements


## PM-Centric IDE Transformation Roadmap
- [x] Analyze current state and capabilities
- [x] Define PM-centric vision and core workflows
- [x] Design spec-driven development system
- [x] Create AI-executable roadmap with atomic tasks (PM_CENTRIC_ROADMAP.md)
- [x] Define file boundaries for parallel agent execution
- [x] Create task dependency graph

### Phase 1: Kanban Foundation (63 total tasks across 6 phases)
- [x] P1-001: Add kanban_boards table
- [x] P1-002: Add kanban_columns table
- [x] P1-003: Add kanban_cards table
- [x] P1-004: Add card_dependencies table
- [x] P1-005: Add card_history table
- [x] P1-006: Add kanban CRUD helpers
- [x] P1-007: Add kanban tRPC router
- [x] P1-008: Create KanbanBoard.tsx
- [x] P1-009: Create KanbanColumn.tsx
- [x] P1-010: Create KanbanCard.tsx
- [x] P1-011: Create CardDetailModal.tsx (integrated in Board.tsx)
- [x] P1-012: Create useKanban.ts hook
- [x] P1-013: Create useDragAndDrop.ts hook (using @dnd-kit)
- [x] P1-014: Create Board.tsx page
- [x] P1-015: Write kanban.test.ts (21 tests passing)
- [x] P1-016: Write KanbanBoard.test.tsx (covered in kanban.test.ts)


### Phase 2: Spec-Driven Development
- [x] P2-001: Create RequirementsEditor component
- [x] P2-002: Add acceptance criteria management (integrated in RequirementsEditor)
- [x] P2-003: Link requirements to Kanban cards (linkCardToSpec, unlinkCardFromSpec APIs)
- [x] P2-004: Add spec status tracking (draft, approved, implemented)
- [x] P2-005: Create Requirements page (RequirementsList component)
- [ ] P2-006: Write spec-driven.test.ts

### Dependency Visualization
- [x] P2-007: Create DependencyGraph component
- [x] P2-008: Add visual dependency arrows on board (SVG bezier curves)
- [x] P2-009: Implement blocker highlighting (red border, blocked badge)
- [x] P2-010: Add dependency creation UI (via card edit modal)
- [ ] P2-011: Write dependency.test.ts

### Board Templates
- [x] P2-012: Create BoardTemplates component
- [x] P2-013: Add Sprint template (6 columns, 5 labels)
- [x] P2-014: Add Feature Development template (7 columns, 5 labels)
- [x] P2-015: Add Bug Triage template (7 columns, 6 labels)
- [x] P2-016: Add template selection to board creation ("From Template" button)
- [ ] P2-017: Write templates.test.ts


## Unified Workspace System

### Phase 1: Foundation
- [x] WS-001: Fix Board.tsx syntax error
- [x] WS-002: Create WorkspaceShell.tsx layout component
- [x] WS-003: Add 3 resizable panes using ResizablePanelGroup
- [x] WS-004: Create ContentPane.tsx with type selector dropdown
- [x] WS-005: Create useWorkspaceState.ts hook for state management

### Phase 2: Content Integration
- [x] WS-006: Wire KanbanBoard to load in ContentPane (type='board')
- [x] WS-007: Wire FileTree + CodeEditor to load in ContentPane (type='github')
- [x] WS-008: Create empty state for unused panes
- [x] WS-009: Add pane header with title and controls

### Phase 3: Agent Panel
- [x] WS-010: Create AgentPanel.tsx component
- [x] WS-011: Add collapsible right panel to WorkspaceShell
- [x] WS-012: Integrate AIChatBox into AgentPanel
- [x] WS-013: Add agent tabs (PM, Dev, QA, DevOps, Research)
- [x] WS-014: Add agent status indicators
- [x] WS-015: Add sub-task list view

### Phase 4: Browser Pane
- [x] WS-016: Create BrowserPane.tsx with iframe
- [x] WS-017: Add URL input bar with navigation controls
- [x] WS-018: Handle iframe security restrictions gracefully
- [x] WS-019: Add to ContentPane type options

### Phase 5: State & Persistence
- [x] WS-020: Persist pane contents to localStorage
- [x] WS-021: Persist pane sizes to localStorage
- [x] WS-022: Persist collapsed states to localStorage
- [x] WS-023: Restore state on page load

### Phase 6: Mobile & Polish
- [x] WS-024: Create mobile layout with stacked panes
- [x] WS-025: Add swipe navigation between panes on mobile
- [x] WS-026: Add bottom sheet for agent panel on mobile
- [x] WS-027: Add keyboard shortcuts (Cmd+1/2/3 for panes)
- [ ] WS-028: Add Cmd+K quick switcher (deferred)
