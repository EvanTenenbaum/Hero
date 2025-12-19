# Hero IDE Atomic Implementation Roadmap

**Version:** 1.0  
**Date:** December 19, 2025  
**Author:** Manus AI

---

## Overview

This roadmap provides an atomic, step-by-step implementation plan for integrating research findings into Hero IDE. Each task is designed to be independently completable, testable, and deployable. Tasks are organized into sprints with clear dependencies and acceptance criteria.

---

## Sprint 1: Foundation Enhancements (Critical Priority)

**Goal:** Strengthen existing features and address critical gaps identified in QA analysis.

### Task 1.1: Implement Agent Checkpoint System
**Priority:** Critical  
**Estimated Effort:** 4 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Add `checkpoints` table to database schema with fields: id, agentId, executionId, state (JSON), createdAt
- [ ] Create tRPC procedure `agents.createCheckpoint` to snapshot execution state
- [ ] Create tRPC procedure `agents.listCheckpoints` to retrieve checkpoint history
- [ ] Create tRPC procedure `agents.rollbackToCheckpoint` to restore previous state
- [ ] Add unit tests for all checkpoint procedures
- [ ] Checkpoint automatically created before each agent action

**Files to Modify:**
- `drizzle/schema.ts` - Add checkpoints table
- `server/routers.ts` - Add checkpoint procedures
- `server/*.test.ts` - Add checkpoint tests

---

### Task 1.2: Implement Rollback UI Component
**Priority:** Critical  
**Estimated Effort:** 3 hours  
**Dependencies:** Task 1.1  

**Acceptance Criteria:**
- [ ] Create `CheckpointTimeline` component showing checkpoint history
- [ ] Add "Rollback" button to each checkpoint entry
- [ ] Implement confirmation dialog before rollback
- [ ] Show diff preview of state changes
- [ ] Integrate into AgentDetail page

**Files to Modify:**
- `client/src/components/CheckpointTimeline.tsx` - New component
- `client/src/pages/Agents.tsx` - Integration

---

### Task 1.3: Enhance Token Budget Dashboard
**Priority:** High  
**Estimated Effort:** 3 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Create `TokenBudgetCard` component showing current spend vs. limit
- [ ] Add real-time cost tracking during agent execution
- [ ] Implement budget warning alerts at 80% and 95% thresholds
- [ ] Add historical usage chart (last 7 days)
- [ ] Integrate into Settings page

**Files to Modify:**
- `client/src/components/TokenBudgetCard.tsx` - New component
- `client/src/pages/Settings.tsx` - Integration
- `server/routers.ts` - Add budget tracking procedures

---

### Task 1.4: Add Metrics Dashboard
**Priority:** High  
**Estimated Effort:** 4 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Create `MetricsDashboard` page with key metrics
- [ ] Track: tasks completed by AI, messages sent, tokens used, execution time
- [ ] Add date range selector for filtering
- [ ] Implement data visualization with charts
- [ ] Add route to navigation

**Files to Modify:**
- `client/src/pages/Metrics.tsx` - New page
- `client/src/App.tsx` - Add route
- `server/routers.ts` - Add metrics aggregation procedures

---

## Sprint 2: Spec-Driven Development Flow

**Goal:** Implement structured specification workflow inspired by Kiro.

### Task 2.1: Create Requirements Schema
**Priority:** High  
**Estimated Effort:** 2 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Add `requirements` table: id, projectId, title, description, userStories (JSON), acceptanceCriteria (JSON), assumptions (JSON), status, createdAt
- [ ] Add `designs` table: id, requirementId, dataFlow (JSON), interfaces (JSON), schemas (JSON), endpoints (JSON), status, createdAt
- [ ] Add `taskLinks` table: id, taskId, requirementId, designId
- [ ] Run database migration

**Files to Modify:**
- `drizzle/schema.ts` - Add new tables
- Run `pnpm db:push`

---

### Task 2.2: Implement Requirements Generation
**Priority:** High  
**Estimated Effort:** 4 hours  
**Dependencies:** Task 2.1  

**Acceptance Criteria:**
- [ ] Create tRPC procedure `specs.generateRequirements` that takes user goal and returns structured requirements
- [ ] Use LLM with EARS notation prompt template
- [ ] Generate user stories with acceptance criteria
- [ ] Make assumptions explicit
- [ ] Return structured JSON response
- [ ] Add unit tests

**Files to Modify:**
- `server/routers.ts` - Add specs router
- `server/*.test.ts` - Add tests

**LLM Prompt Template:**
```
You are a requirements analyst. Transform the user's goal into structured requirements using EARS notation.

Goal: {{userGoal}}

Generate:
1. User stories in format: "As a [role], I want [feature], so that [benefit]"
2. Acceptance criteria for each story
3. Explicit assumptions
4. Edge cases to consider

Output as JSON with fields: userStories, acceptanceCriteria, assumptions, edgeCases
```

---

### Task 2.3: Implement Technical Design Generation
**Priority:** High  
**Estimated Effort:** 4 hours  
**Dependencies:** Task 2.2  

**Acceptance Criteria:**
- [ ] Create tRPC procedure `specs.generateDesign` that takes requirements and codebase context
- [ ] Generate: API endpoints, database schema changes, component hierarchy
- [ ] Output TypeScript interfaces
- [ ] Create data flow description
- [ ] Add unit tests

**Files to Modify:**
- `server/routers.ts` - Extend specs router
- `server/*.test.ts` - Add tests

---

### Task 2.4: Create Spec Flow UI
**Priority:** High  
**Estimated Effort:** 5 hours  
**Dependencies:** Tasks 2.2, 2.3  

**Acceptance Criteria:**
- [ ] Create `SpecFlow` component with three-step wizard
- [ ] Step 1: Requirements review with approve/edit/reject actions
- [ ] Step 2: Design review with approve/edit/reject actions
- [ ] Step 3: Task list generation and assignment
- [ ] Progress indicator showing current step
- [ ] Integrate with Chat page as alternative mode

**Files to Modify:**
- `client/src/components/SpecFlow.tsx` - New component
- `client/src/components/RequirementsReview.tsx` - New component
- `client/src/components/DesignReview.tsx` - New component
- `client/src/pages/Chat.tsx` - Integration

---

### Task 2.5: Implement Approval Gates
**Priority:** High  
**Estimated Effort:** 3 hours  
**Dependencies:** Task 2.4  

**Acceptance Criteria:**
- [ ] Create `ApprovalGate` component with approve/reject/edit actions
- [ ] Store approval status in database
- [ ] Block progression until approval received
- [ ] Support edit mode for modifications
- [ ] Log all approval decisions for audit

**Files to Modify:**
- `client/src/components/ApprovalGate.tsx` - New component
- `server/routers.ts` - Add approval procedures

---

## Sprint 3: Context Engineering

**Goal:** Implement advanced context management for better LLM performance.

### Task 3.1: Implement Conversation Compaction
**Priority:** Medium  
**Estimated Effort:** 4 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Create `compactConversation` utility function
- [ ] Detect when conversation approaches context limit (80% of 128k tokens)
- [ ] Summarize conversation preserving: decisions, unresolved issues, key code references
- [ ] Discard: redundant tool outputs, superseded messages
- [ ] Store compacted summary in database
- [ ] Add unit tests

**Files to Modify:**
- `server/utils/contextEngineering.ts` - New utility
- `server/routers.ts` - Integrate with chat router
- `server/*.test.ts` - Add tests

---

### Task 3.2: Implement Project Notes System
**Priority:** Medium  
**Estimated Effort:** 3 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Add `projectNotes` table: id, projectId, category, content, createdAt, updatedAt
- [ ] Create tRPC procedures for CRUD operations on notes
- [ ] Categories: architecture, decisions, todos, bugs, context
- [ ] Auto-inject relevant notes into agent context
- [ ] Add unit tests

**Files to Modify:**
- `drizzle/schema.ts` - Add projectNotes table
- `server/routers.ts` - Add notes procedures
- `server/*.test.ts` - Add tests

---

### Task 3.3: Create Notes UI
**Priority:** Medium  
**Estimated Effort:** 3 hours  
**Dependencies:** Task 3.2  

**Acceptance Criteria:**
- [ ] Create `ProjectNotes` component with category tabs
- [ ] Support markdown editing
- [ ] Auto-save on blur
- [ ] Show last updated timestamp
- [ ] Integrate into Project detail page

**Files to Modify:**
- `client/src/components/ProjectNotes.tsx` - New component
- `client/src/pages/Projects.tsx` - Integration

---

### Task 3.4: Implement Just-in-Time Context Retrieval
**Priority:** Medium  
**Estimated Effort:** 4 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Create `contextRetrieval` utility for dynamic context loading
- [ ] Maintain lightweight file path index
- [ ] Load file contents on demand during agent execution
- [ ] Implement relevance scoring for context selection
- [ ] Add unit tests

**Files to Modify:**
- `server/utils/contextRetrieval.ts` - New utility
- `server/routers.ts` - Integrate with agent execution
- `server/*.test.ts` - Add tests

---

## Sprint 4: Event-Driven Hooks

**Goal:** Implement automated triggers for common workflows.

### Task 4.1: Create Hooks Schema
**Priority:** Medium  
**Estimated Effort:** 2 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Add `hooks` table: id, projectId, name, triggerType, triggerPattern, action, systemPrompt, enabled, createdAt
- [ ] Trigger types: file_save, file_create, pre_commit, schedule
- [ ] Run database migration

**Files to Modify:**
- `drizzle/schema.ts` - Add hooks table
- Run `pnpm db:push`

---

### Task 4.2: Implement Hook Execution Engine
**Priority:** Medium  
**Estimated Effort:** 4 hours  
**Dependencies:** Task 4.1  

**Acceptance Criteria:**
- [ ] Create `HookEngine` class to manage hook execution
- [ ] Support file pattern matching (glob patterns)
- [ ] Execute hook action via LLM
- [ ] Log all hook executions
- [ ] Support dry-run mode
- [ ] Add unit tests

**Files to Modify:**
- `server/utils/hookEngine.ts` - New utility
- `server/routers.ts` - Add hook procedures
- `server/*.test.ts` - Add tests

---

### Task 4.3: Create Hook Configuration UI
**Priority:** Medium  
**Estimated Effort:** 4 hours  
**Dependencies:** Task 4.2  

**Acceptance Criteria:**
- [ ] Create `HookManager` component for CRUD operations
- [ ] Form for creating new hooks with trigger type selection
- [ ] Pattern builder for file matching
- [ ] Enable/disable toggle
- [ ] Test hook button (dry-run)
- [ ] Integrate into Settings page

**Files to Modify:**
- `client/src/components/HookManager.tsx` - New component
- `client/src/pages/Settings.tsx` - Integration

---

## Sprint 5: Enhanced Agent System

**Goal:** Improve agent capabilities and coordination.

### Task 5.1: Implement Agent Role Definitions
**Priority:** Medium  
**Estimated Effort:** 3 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Define clear role boundaries for each agent type
- [ ] Create role-specific system prompts
- [ ] Add role configuration to agent schema
- [ ] Implement role-based tool access
- [ ] Add unit tests

**Agent Roles:**
| Role | Scope | Tools |
|------|-------|-------|
| Frontend | UI/UX implementation | Component scaffolders, style linters |
| Backend | Server-side logic, APIs | API clients, database queries |
| QA | Testing | Test frameworks, coverage analyzers |
| Security | Vulnerability scanning | SAST/DAST scanners |
| Docs | Documentation | Markdown generators |
| Refactor | Code quality | AST parsers, profilers |

**Files to Modify:**
- `server/utils/agentRoles.ts` - New utility
- `drizzle/schema.ts` - Extend agents table
- `server/*.test.ts` - Add tests

---

### Task 5.2: Implement Trust Levels
**Priority:** Medium  
**Estimated Effort:** 3 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Add `trustLevel` field to governance schema
- [ ] Define trust levels: low (manual approval), medium (auto-approve safe), high (auto-approve all)
- [ ] Implement auto-approval logic based on trust level
- [ ] Create trust level configuration UI
- [ ] Add unit tests

**Files to Modify:**
- `drizzle/schema.ts` - Add trustLevel field
- `server/routers.ts` - Implement auto-approval logic
- `client/src/pages/Settings.tsx` - Add trust level config
- `server/*.test.ts` - Add tests

---

### Task 5.3: Implement Parallel Execution Context
**Priority:** Medium  
**Estimated Effort:** 5 hours  
**Dependencies:** Task 5.1  

**Acceptance Criteria:**
- [ ] Create isolated execution context per agent
- [ ] Implement context state management
- [ ] Support multiple concurrent agent executions
- [ ] Add merge/apply workflow for completed work
- [ ] Implement conflict detection
- [ ] Add unit tests

**Files to Modify:**
- `server/utils/executionContext.ts` - New utility
- `server/routers.ts` - Extend agent execution
- `server/*.test.ts` - Add tests

---

## Sprint 6: UI/UX Enhancements

**Goal:** Improve mobile editing experience and add power-user features.

### Task 6.1: Implement Command Palette
**Priority:** Medium  
**Estimated Effort:** 4 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Create `CommandPalette` component with fuzzy search
- [ ] Support keyboard shortcut (Cmd/Ctrl + K)
- [ ] Include commands: file operations, navigation, agent actions
- [ ] Show recent commands
- [ ] Integrate with Monaco Editor

**Files to Modify:**
- `client/src/components/CommandPalette.tsx` - New component
- `client/src/components/MonacoEditor.tsx` - Integration

---

### Task 6.2: Add Intelligent Code Folding
**Priority:** Low  
**Estimated Effort:** 3 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Configure Monaco for intelligent folding
- [ ] Auto-fold imports on file open
- [ ] Add "Focus Mode" to show only current function
- [ ] Persist folding state per file
- [ ] Add keyboard shortcuts for fold/unfold

**Files to Modify:**
- `client/src/components/MonacoEditor.tsx` - Configuration

---

### Task 6.3: Implement Interactive Roadmap View
**Priority:** Medium  
**Estimated Effort:** 5 hours  
**Dependencies:** Tasks 2.1-2.5  

**Acceptance Criteria:**
- [ ] Create `RoadmapView` component showing task dependency graph
- [ ] Visual representation with nodes and edges
- [ ] Color-coded status (queued, running, blocked, complete)
- [ ] Click to expand task details
- [ ] Real-time status updates via SSE
- [ ] Add to navigation

**Files to Modify:**
- `client/src/components/RoadmapView.tsx` - New component
- `client/src/pages/Roadmap.tsx` - New page
- `client/src/App.tsx` - Add route

---

## Sprint 7: MCP Integration (Future)

**Goal:** Enable external tool integration via Model Context Protocol.

### Task 7.1: Create MCP Server Registry
**Priority:** Low  
**Estimated Effort:** 4 hours  
**Dependencies:** None  

**Acceptance Criteria:**
- [ ] Add `mcpServers` table: id, name, url, capabilities (JSON), status, createdAt
- [ ] Create tRPC procedures for server management
- [ ] Implement server health check
- [ ] Add unit tests

---

### Task 7.2: Implement Tool Discovery
**Priority:** Low  
**Estimated Effort:** 4 hours  
**Dependencies:** Task 7.1  

**Acceptance Criteria:**
- [ ] Query MCP servers for available tools
- [ ] Parse tool definitions and input schemas
- [ ] Store tool metadata in database
- [ ] Create tool browser UI

---

### Task 7.3: Implement Tool Execution
**Priority:** Low  
**Estimated Effort:** 5 hours  
**Dependencies:** Task 7.2  

**Acceptance Criteria:**
- [ ] Create tool execution engine
- [ ] Support approval dialogs for tool calls
- [ ] Log all tool executions
- [ ] Handle errors gracefully
- [ ] Integrate with agent system

---

## Implementation Schedule

| Sprint | Duration | Focus Area | Key Deliverables |
|--------|----------|------------|------------------|
| Sprint 1 | Week 1 | Foundation | Checkpoints, Rollback, Budget Dashboard, Metrics |
| Sprint 2 | Week 2 | Spec-Driven | Requirements, Design, Approval Gates |
| Sprint 3 | Week 3 | Context | Compaction, Notes, JIT Retrieval |
| Sprint 4 | Week 4 | Hooks | Schema, Engine, Configuration UI |
| Sprint 5 | Week 5 | Agents | Roles, Trust Levels, Parallel Execution |
| Sprint 6 | Week 6 | UI/UX | Command Palette, Folding, Roadmap |
| Sprint 7 | Week 7+ | MCP | Registry, Discovery, Execution |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | >80% | Vitest coverage report |
| Build Success | 100% | CI/CD pipeline |
| Feature Completion | 100% per sprint | Todo.md tracking |
| Performance | <2s page load | Lighthouse audit |
| User Satisfaction | >4.0/5.0 | User feedback |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Schema migration failures | Medium | High | Test migrations in staging, maintain rollback scripts |
| Performance degradation | Medium | Medium | Profile before/after, implement caching |
| Feature conflicts | Low | Medium | Feature flags, incremental rollout |
| Test regressions | Low | High | Run full test suite before each merge |

---

**Document Status:** Complete  
**Tracking:** Update todo.md as tasks are completed
