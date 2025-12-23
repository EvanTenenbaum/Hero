# HERO IDE Feature Audit - Cloud Migration Impact Analysis

## Purpose
This document audits all features implemented since the first commit to ensure nothing valuable has been lost, broken, or disconnected during the cloud-native E2B sandbox migration.

## Feature Inventory by Sprint/Commit

### Foundation Features (Pre-Sprint)
- [x] Basic project structure
- [x] tRPC API setup
- [x] Database schema (Drizzle ORM)
- [x] React frontend with Vite
- [x] Authentication system

### Sprint 1: Context Engine Foundation
**Files**: `server/context/`, `drizzle/schema.ts`
- [ ] Database schemas for context chunks
- [ ] Semantic chunker service
- [ ] File watcher for real-time updates
- [ ] Storage service for chunks
- [ ] tRPC router for context operations
- [ ] UI component for context display

### Sprint 2-3: Semantic Search + Prompt-to-Plan
**Files**: `server/context/`, `client/src/components/`
- [ ] Semantic search implementation
- [ ] Prompt-to-Plan workflow
- [ ] Plan generation from natural language

### Sprint 4: GitHub Integration (Initial)
**Files**: `server/github/`
- [ ] GitHub OAuth integration
- [ ] Repository connection
- [ ] Basic GitHub API operations

### Sprint 5: Context Engine - Gemini Embeddings
**Files**: `server/context/geminiEmbedding.ts`, `server/context/hybridSearch.ts`
- [ ] Gemini embedding integration (768 dimensions)
- [ ] Hybrid search (keyword + semantic + graph)
- [ ] Context retrieval service (markdown, compact, XML formats)
- [ ] ContextSearch UI component
- [ ] ContextPreview UI component

### Sprint 6: Prompt-to-Plan Workflow Complete
**Files**: `server/kickoff/`, `client/src/components/kickoff/`
- [ ] Four-phase workflow (Specify → Design → Tasks → Implement)
- [ ] Natural language to development plan transformation
- [ ] Full traceability

### Sprint 7-8: Enhanced GitHub + Agent Orchestration
**Files**: `server/github/`, `server/agents/`
- [ ] GitHub cloning
- [ ] Conflict detection
- [ ] Webhooks
- [ ] AI PR review
- [ ] PM Agent
- [ ] Task assignment
- [ ] Dependency graph
- [ ] Blocker detection

### Sprint 9: Sprint Planning & Cost Management
**Files**: `server/services/costTracker.ts`, `server/sprints/`
- [ ] Sprint CRUD operations
- [ ] Velocity tracking
- [ ] Burndown charts
- [ ] Budget management

### Sprint 10: Dashboard & Quick Actions
**Files**: `client/src/components/`
- [ ] SprintDashboard component
- [ ] Velocity charts
- [ ] Burndown graphs
- [ ] QuickActions component (desktop/mobile)
- [ ] Keyboard shortcuts (Ctrl+Shift+N/E/Q)

### Parallel Execution Sprints (1-3)
**Files**: `server/agents/`, `server/services/`

#### Sprint 1 - Foundation:
- [ ] chatAgent.ts: Chat integration with safety checks
- [ ] chat-agent router: tRPC procedures
- [ ] useChatAgent hook
- [ ] defaultPrompts.ts: Default system prompts
- [ ] promptSeeds.ts: Database seeding
- [ ] metricsRecorder.ts: Execution metrics

#### Sprint 2 - User Experience:
- [ ] ConfirmationModal.tsx: Risky action confirmation
- [ ] useConfirmation.ts hook
- [ ] useExecutionUpdates.ts: Real-time updates
- [ ] RulePresets.tsx: Pre-built rule sets

#### Sprint 3 - Advanced Features:
- [ ] costTracker.ts: Token usage tracking
- [ ] CostDashboard.tsx: Budget monitoring
- [ ] rollbackService.ts: Execution rollback
- [ ] RollbackPanel.tsx: Checkpoint management

### Kanban System (Phase 1-2)
**Files**: `server/kanban/`, `client/src/components/kanban/`
- [ ] Database schema: boards, columns, cards, dependencies, labels, comments, history
- [ ] tRPC router with full CRUD
- [ ] KanbanBoard component
- [ ] KanbanColumn component
- [ ] KanbanCard component
- [ ] Drag-and-drop (@dnd-kit)
- [ ] Board page with dialogs
- [ ] Filtering
- [ ] Agent assignment
- [ ] useKanban hook
- [ ] Requirements Editor
- [ ] Spec linking to cards
- [ ] Dependency Graph visualization
- [ ] Blocked card detection
- [ ] Critical path calculation
- [ ] Board Templates (Sprint, Feature Dev, Bug Triage, Basic)

### Unified Workspace System
**Files**: `client/src/components/workspace/`
- [ ] 3-pane resizable layout
- [ ] Board/GitHub/Browser content types
- [ ] Multi-agent chat panel (PM/Dev/QA/DevOps/Research)
- [ ] Mobile-responsive layout
- [ ] Swipe navigation
- [ ] Keyboard shortcuts (Ctrl+1/2/3, Ctrl+B, Ctrl+\)
- [ ] localStorage state persistence

### AI Sprint Orchestrator
**Files**: `server/agents/`, `server/sprints/`
- [ ] Intelligent task planning
- [ ] Conflict detection

### Google Drive Integration
**Files**: `server/drive/`
- [ ] Design file access
- [ ] OAuth setup

### Codebase Structure System
**Files**: `server/codebase/`
- [ ] Repository analysis
- [ ] Best practices validation

### Timeline & Calendar Views
**Files**: `client/src/components/`
- [ ] Gantt-style timeline view
- [ ] Calendar view
- [ ] View switching tabs

### Sprint 19: Agent Execution Engine
**Files**: `server/agents/executionEngine.ts`
- [ ] Agent execution engine
- [ ] Execution streaming
- [ ] Execution history

### Sprint 20: GitHub Integration Polish
**Files**: `server/github/`
- [ ] Enhanced GitHub features

### Design System (Sprint 21)
**Files**: `client/src/styles/`, `client/src/components/ui/`
- [ ] Slate Blue palette (#5B7C99)
- [ ] Typography system
- [ ] Mobile support
- [ ] Theme toggle

### Agent Kickoff Protocol (Sprint 22)
**Files**: `server/kickoff/`
- [ ] 5-step wizard flow
- [ ] Spec generation
- [ ] Templates: north-star, product-brief, architecture, quality-bar, slice-map, agent-brief

### Self-Modifying IDE (Sprint 23)
**Files**: `server/meta/`
- [ ] Meta agent
- [ ] File modification service
- [ ] Change preview UI

### Sprint 26: Reliability
**Files**: Various
- [ ] Error handling improvements
- [ ] Stability fixes

### Sprint 27: Performance
**Files**: Various
- [ ] Performance optimizations
- [ ] Query improvements

### Sprint 28: Features & Polish
**Files**: `client/src/components/`
- [ ] LLM streaming to Chat UI
- [ ] Cmd+K command palette
- [ ] Kickoff Wizard testing

### Sprint 29: GitHub Integration & Polish
**Files**: `server/github/`, `client/src/components/`
- [ ] CloneRepoDialog
- [ ] PR list panel
- [ ] Chat streaming end-to-end
- [ ] Structured logging (pino)
- [ ] Syntax highlighting (shiki)
- [ ] Keyboard shortcuts help modal

### Sprint 30: Agent Execution & Rollback
**Files**: `server/agents/`, `server/services/`
- [ ] Execution streaming
- [ ] Rollback service
- [ ] ExecutionHistory component
- [ ] ExecutionMonitor component

### Sprint 31: GitHub Integration Completion
**Files**: `server/github/`, `client/src/components/`
- [ ] PR detail panel
- [ ] Diff viewer
- [ ] Comments
- [ ] Reviews
- [ ] Merge capability

### Cloud Sandbox Migration (Recent)
**Files**: `server/services/sandboxManager.ts`, `server/services/projectHydrator.ts`, `server/agents/tools/`
- [x] E2B sandbox integration
- [x] Sandbox lifecycle management
- [x] Project hydration
- [x] Sandbox-aware filesystem tools
- [x] Sandbox-aware terminal tools
- [x] GitHub tools for PR workflow
- [x] Secrets management
- [x] Git sync router

---

## Analysis Required

For each feature above, we need to determine:
1. **Status**: Preserved / Broken / Lost / Needs Re-implementation
2. **Cloud Compatibility**: Works in cloud sandbox / Needs adaptation / N/A
3. **Integration Status**: Connected to current system / Orphaned / Missing
4. **Priority**: Critical / High / Medium / Low

