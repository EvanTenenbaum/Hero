# PM-Centric IDE Transformation Roadmap

## Vision Statement

Transform Hero IDE from a code-generation tool into a **spec-driven development platform** where the PM Agent orchestrates the entire software development lifecycle. The system will be designed for **exclusive AI agent execution**, with humans providing high-level direction and approval at key gates.

---

## Current State Assessment

### What We Have

| Component | Status | Readiness for PM-Centric |
|-----------|--------|--------------------------|
| Chat with 5 Agent Types | ✅ Complete | High - PM agent exists |
| Safety Checker | ✅ Complete | High - Can enforce rules |
| Prompt Templates | ✅ Complete | High - Can customize per workflow |
| Execution Engine | ✅ Complete | Medium - Needs workflow integration |
| GitHub Integration | ✅ Basic | Medium - Needs Issues/PRs |
| Requirements Table | ✅ Schema exists | Low - No UI or workflow |
| Technical Designs Table | ✅ Schema exists | Low - No UI or workflow |
| Metrics/Cost Tracking | ✅ Complete | High - Ready to use |
| Kanban/Task Board | ❌ Missing | Critical gap |

### What We Need

The transformation requires building a **spec-driven workflow** where:

1. **Specs drive everything** - No code without approved specs
2. **Kanban visualizes state** - All work items visible and trackable
3. **Agents execute autonomously** - Within defined boundaries
4. **Humans approve at gates** - Not in the weeds, just checkpoints

---

## Architecture: The Spec-Driven Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    HUMAN LAYER (Approval Gates)                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Vision   │───▶│ Spec     │───▶│ Design   │───▶│ Release  │  │
│  │ Approval │    │ Approval │    │ Approval │    │ Approval │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
└───────┬──────────────┬──────────────┬──────────────┬───────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PM AGENT (Orchestrator)                       │
│  • Breaks down vision into specs                                 │
│  • Assigns work to specialized agents                            │
│  • Tracks progress on Kanban board                               │
│  • Escalates blockers to human                                   │
│  • Manages dependencies and resources                            │
└───────┬──────────────┬──────────────┬──────────────┬───────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SPECIALIZED AGENTS (Executors)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Developer │  │   QA     │  │ DevOps   │  │ Research │        │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Kanban Board System

### Board Structure

The Kanban board is the **central nervous system** of the PM-centric IDE. It provides:

1. **Visual state management** - See all work at a glance
2. **Drag-and-drop workflow** - Move cards between columns
3. **Resource allocation** - Assign agents to tasks
4. **Dependency tracking** - Link blocked/blocking tasks
5. **Time tracking** - Estimate vs actual for AI execution
6. **Filtering and search** - By agent, priority, label, etc.

### Default Columns (Customizable)

| Column | Purpose | Entry Criteria | Exit Criteria |
|--------|---------|----------------|---------------|
| **Backlog** | Ideas and future work | Any idea | Prioritized |
| **Spec Writing** | Requirements being defined | Prioritized | Spec approved |
| **Design** | Technical design in progress | Spec approved | Design approved |
| **Ready** | Ready for agent execution | Design approved | Agent assigned |
| **In Progress** | Agent actively working | Agent assigned | Work complete |
| **Review** | Awaiting human review | Work complete | Approved/rejected |
| **Done** | Completed and merged | Approved | Archived |
| **Blocked** | Waiting on dependency | Any blocker | Blocker resolved |

### Card Structure

Each card represents a **work item** with:

```typescript
interface KanbanCard {
  id: string;
  title: string;
  description: string;
  type: 'epic' | 'feature' | 'task' | 'bug' | 'spike';
  status: ColumnId;
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Spec-driven fields
  specId?: string;           // Link to requirement spec
  designId?: string;         // Link to technical design
  acceptanceCriteria: string[];
  
  // Assignment
  assignedAgent?: AgentType;
  assignedBy: 'human' | 'pm_agent';
  
  // Dependencies
  blockedBy: string[];       // Card IDs this is blocked by
  blocks: string[];          // Card IDs this blocks
  
  // Resources
  estimatedTokens?: number;  // AI cost estimate
  actualTokens?: number;     // Actual AI cost
  estimatedMinutes?: number; // Time estimate
  actualMinutes?: number;    // Actual time
  
  // Tracking
  labels: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Audit trail
  history: CardEvent[];
}
```

### Swimlanes

Cards can be grouped by:
- **Agent Type** - See what each agent is working on
- **Priority** - Focus on critical items
- **Epic** - Group by parent feature
- **Label** - Custom groupings

---

## Implementation Roadmap

### Phase 1: Kanban Foundation (Week 1-2)

**Goal:** Build the interactive Kanban board with drag-and-drop functionality.

#### Database Schema

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P1-001 | `drizzle/schema.ts` | Add kanban_boards table | None | Alpha |
| P1-002 | `drizzle/schema.ts` | Add kanban_columns table | P1-001 | Alpha |
| P1-003 | `drizzle/schema.ts` | Add kanban_cards table | P1-002 | Alpha |
| P1-004 | `drizzle/schema.ts` | Add card_dependencies table | P1-003 | Alpha |
| P1-005 | `drizzle/schema.ts` | Add card_history table | P1-003 | Alpha |
| P1-006 | `server/db.ts` | Add kanban CRUD helpers | P1-005 | Alpha |
| P1-007 | `server/routers.ts` | Add kanban tRPC router | P1-006 | Alpha |

#### Frontend Components

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P1-008 | `client/src/components/KanbanBoard.tsx` | Main board container | P1-007 | Beta |
| P1-009 | `client/src/components/KanbanColumn.tsx` | Column component with drop zone | P1-008 | Beta |
| P1-010 | `client/src/components/KanbanCard.tsx` | Card component with drag handle | P1-009 | Beta |
| P1-011 | `client/src/components/CardDetailModal.tsx` | Card edit/view modal | P1-010 | Beta |
| P1-012 | `client/src/hooks/useKanban.ts` | Kanban state management hook | P1-007 | Beta |
| P1-013 | `client/src/hooks/useDragAndDrop.ts` | Drag-and-drop logic | P1-008 | Beta |
| P1-014 | `client/src/pages/Board.tsx` | Board page with routing | P1-013 | Beta |

#### Tests

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P1-015 | `server/kanban.test.ts` | Kanban router unit tests | P1-007 | Gamma |
| P1-016 | `client/src/components/KanbanBoard.test.tsx` | Board component tests | P1-014 | Gamma |

---

### Phase 2: Spec Integration (Week 3-4)

**Goal:** Connect specs and designs to Kanban cards, enabling spec-driven workflow.

#### Spec Management

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P2-001 | `server/routers/specs.ts` | Spec CRUD router | P1-007 | Alpha |
| P2-002 | `client/src/components/SpecEditor.tsx` | Markdown spec editor | P2-001 | Beta |
| P2-003 | `client/src/components/SpecViewer.tsx` | Spec display with sections | P2-002 | Beta |
| P2-004 | `client/src/components/SpecApproval.tsx` | Approval workflow UI | P2-003 | Beta |
| P2-005 | `server/agents/specAgent.ts` | AI spec generation from ideas | P2-001 | Alpha |

#### Design Documents

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P2-006 | `server/routers/designs.ts` | Design CRUD router | P2-001 | Alpha |
| P2-007 | `client/src/components/DesignEditor.tsx` | Technical design editor | P2-006 | Beta |
| P2-008 | `client/src/components/DesignViewer.tsx` | Design display with diagrams | P2-007 | Beta |
| P2-009 | `server/agents/designAgent.ts` | AI design generation from specs | P2-006 | Alpha |

#### Card-Spec Linking

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P2-010 | `client/src/components/CardSpecLink.tsx` | Link card to spec UI | P2-004 | Beta |
| P2-011 | `client/src/components/CardDesignLink.tsx` | Link card to design UI | P2-008 | Beta |
| P2-012 | `server/services/specValidator.ts` | Validate card has required spec | P2-010 | Alpha |

---

### Phase 3: PM Agent Orchestration (Week 5-6)

**Goal:** Enable PM Agent to manage the board, assign work, and track progress.

#### PM Agent Core

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P3-001 | `server/agents/pmOrchestrator.ts` | PM agent orchestration logic | P2-012 | Alpha |
| P3-002 | `server/agents/taskBreakdown.ts` | Break epics into tasks | P3-001 | Alpha |
| P3-003 | `server/agents/agentAssigner.ts` | Auto-assign tasks to agents | P3-002 | Alpha |
| P3-004 | `server/agents/progressTracker.ts` | Track and report progress | P3-003 | Alpha |
| P3-005 | `server/agents/blockerDetector.ts` | Detect and escalate blockers | P3-004 | Alpha |

#### Automation Rules

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P3-006 | `server/services/automationEngine.ts` | Rule-based card automation | P3-001 | Alpha |
| P3-007 | `client/src/components/AutomationRules.tsx` | Automation rule editor | P3-006 | Beta |
| P3-008 | `server/services/notificationService.ts` | Notify on card events | P3-006 | Alpha |

#### PM Dashboard

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P3-009 | `client/src/pages/PMDashboard.tsx` | PM overview dashboard | P3-005 | Beta |
| P3-010 | `client/src/components/VelocityChart.tsx` | Sprint velocity tracking | P3-009 | Beta |
| P3-011 | `client/src/components/BurndownChart.tsx` | Burndown visualization | P3-009 | Beta |
| P3-012 | `client/src/components/ResourceAllocation.tsx` | Agent workload view | P3-009 | Beta |

---

### Phase 4: Dependency Management (Week 7-8)

**Goal:** Visual dependency tracking with blocking/blocked relationships.

#### Dependency Visualization

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P4-001 | `client/src/components/DependencyGraph.tsx` | Visual dependency graph | P3-005 | Beta |
| P4-002 | `client/src/components/DependencyLines.tsx` | Draw lines between cards | P4-001 | Beta |
| P4-003 | `client/src/hooks/useDependencies.ts` | Dependency state management | P4-001 | Beta |
| P4-004 | `server/services/dependencyResolver.ts` | Calculate execution order | P4-003 | Alpha |
| P4-005 | `server/services/criticalPath.ts` | Critical path analysis | P4-004 | Alpha |

#### Blocking Detection

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P4-006 | `server/services/blockerAnalyzer.ts` | Analyze why card is blocked | P4-005 | Alpha |
| P4-007 | `client/src/components/BlockerBadge.tsx` | Visual blocker indicator | P4-006 | Beta |
| P4-008 | `client/src/components/UnblockSuggestions.tsx` | AI suggestions to unblock | P4-006 | Beta |

---

### Phase 5: GitHub Integration (Week 9-10)

**Goal:** Sync Kanban with GitHub Issues and PRs.

#### GitHub Sync

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P5-001 | `server/services/githubSync.ts` | Bi-directional sync service | P4-005 | Alpha |
| P5-002 | `server/routers/github-issues.ts` | GitHub Issues CRUD | P5-001 | Alpha |
| P5-003 | `server/routers/github-prs.ts` | GitHub PR management | P5-002 | Alpha |
| P5-004 | `client/src/components/GitHubIssueLink.tsx` | Link card to issue | P5-002 | Beta |
| P5-005 | `client/src/components/GitHubPRLink.tsx` | Link card to PR | P5-003 | Beta |

#### PR Workflow

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P5-006 | `server/agents/prCreator.ts` | Auto-create PR from card | P5-003 | Alpha |
| P5-007 | `server/agents/prReviewer.ts` | AI PR review | P5-006 | Alpha |
| P5-008 | `client/src/components/PRReviewPanel.tsx` | PR review UI | P5-007 | Beta |

---

### Phase 6: Resource & Cost Management (Week 11-12)

**Goal:** Track AI token usage, estimate costs, and manage budgets.

#### Cost Tracking

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P6-001 | `server/services/costEstimator.ts` | Estimate task token cost | P5-005 | Alpha |
| P6-002 | `server/services/budgetManager.ts` | Track budget per board/sprint | P6-001 | Alpha |
| P6-003 | `client/src/components/CostEstimate.tsx` | Show cost on cards | P6-001 | Beta |
| P6-004 | `client/src/components/BudgetGauge.tsx` | Budget remaining visual | P6-002 | Beta |

#### Resource Allocation

| Task ID | File | Description | Dependencies | Agent |
|---------|------|-------------|--------------|-------|
| P6-005 | `server/services/capacityPlanner.ts` | Agent capacity planning | P6-002 | Alpha |
| P6-006 | `client/src/components/AgentCapacity.tsx` | Agent workload visualization | P6-005 | Beta |
| P6-007 | `client/src/components/SprintPlanning.tsx` | Sprint capacity planning UI | P6-006 | Beta |

---

## File Ownership Matrix (For Parallel Execution)

To enable parallel agent execution without conflicts, each file has a single owner:

| File Pattern | Owner Agent | Can Read | Cannot Modify |
|--------------|-------------|----------|---------------|
| `drizzle/schema.ts` | Alpha | All | Beta, Gamma |
| `server/db.ts` | Alpha | All | Beta, Gamma |
| `server/routers/*.ts` | Alpha | All | Beta, Gamma |
| `server/services/*.ts` | Alpha | All | Beta, Gamma |
| `server/agents/*.ts` | Alpha | All | Beta, Gamma |
| `client/src/components/*.tsx` | Beta | All | Alpha, Gamma |
| `client/src/pages/*.tsx` | Beta | All | Alpha, Gamma |
| `client/src/hooks/*.ts` | Beta | All | Alpha, Gamma |
| `server/*.test.ts` | Gamma | All | Alpha, Beta |
| `client/src/**/*.test.tsx` | Gamma | All | Alpha, Beta |

---

## Dependency Graph

```
Phase 1 (Foundation)
├── P1-001 → P1-002 → P1-003 → P1-004, P1-005
│                              ↓
│                           P1-006 → P1-007
│                                      ↓
├── P1-008 → P1-009 → P1-010 → P1-011
│     ↓
├── P1-012, P1-013 → P1-014
│                      ↓
└── P1-015, P1-016 (can run in parallel after P1-014)

Phase 2 (Specs) - Depends on Phase 1
├── P2-001 → P2-002 → P2-003 → P2-004
│     ↓
├── P2-005 (parallel with P2-002)
│
├── P2-006 → P2-007 → P2-008
│     ↓
├── P2-009 (parallel with P2-007)
│
└── P2-010, P2-011 → P2-012

Phase 3 (PM Agent) - Depends on Phase 2
├── P3-001 → P3-002 → P3-003 → P3-004 → P3-005
│                                          ↓
├── P3-006 → P3-007, P3-008
│
└── P3-009 → P3-010, P3-011, P3-012 (parallel)

Phase 4 (Dependencies) - Depends on Phase 3
├── P4-001 → P4-002, P4-003
│     ↓
├── P4-004 → P4-005
│              ↓
└── P4-006 → P4-007, P4-008 (parallel)

Phase 5 (GitHub) - Depends on Phase 4
├── P5-001 → P5-002 → P5-003
│              ↓         ↓
├── P5-004    P5-005
│
└── P5-006 → P5-007 → P5-008

Phase 6 (Resources) - Depends on Phase 5
├── P6-001 → P6-002
│     ↓         ↓
├── P6-003    P6-004
│
└── P6-005 → P6-006 → P6-007
```

---

## Agent Execution Protocol

### Task Assignment Format

When assigning a task to an agent, use this format:

```markdown
## Task Assignment: [TASK_ID]

**Agent:** [Alpha/Beta/Gamma]
**Phase:** [Phase Number]
**Priority:** [Critical/High/Medium/Low]

### Context
[Brief description of where this fits in the overall system]

### Objective
[Clear, single-sentence goal]

### Files to Create/Modify
- `path/to/file.ts` - [What to do]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Dependencies
- Requires: [TASK_IDs that must be complete]
- Blocks: [TASK_IDs waiting on this]

### Constraints
- DO NOT modify: [files owned by other agents]
- MUST follow: [relevant patterns/conventions]
- Token budget: [max tokens for this task]

### Validation
- [ ] TypeScript compiles without errors
- [ ] All existing tests pass
- [ ] New tests written and passing
- [ ] No regressions in related features
```

### QA Gate Protocol

After each phase, the coordinator (you) must:

1. **Collect all agent outputs**
2. **Run full test suite**: `pnpm test`
3. **Check TypeScript**: `pnpm exec tsc --noEmit`
4. **Visual QA**: Navigate to affected pages
5. **Integration check**: Verify cross-component functionality
6. **Create checkpoint**: Only after all checks pass

### Conflict Resolution

If two agents need to modify the same file:

1. **Stop both agents**
2. **Identify the conflict**
3. **Reassign one task** to a different file or approach
4. **Resume execution**

---

## Success Metrics

### Phase 1 Complete When:
- [ ] Kanban board renders with default columns
- [ ] Cards can be created, edited, deleted
- [ ] Drag-and-drop moves cards between columns
- [ ] Card detail modal shows all fields
- [ ] 10+ unit tests passing

### Phase 2 Complete When:
- [ ] Specs can be created and edited
- [ ] Specs can be linked to cards
- [ ] Spec approval workflow functions
- [ ] Designs can be created from specs
- [ ] Cards cannot move to "Ready" without approved spec

### Phase 3 Complete When:
- [ ] PM Agent can break down epics into tasks
- [ ] PM Agent can assign tasks to other agents
- [ ] Progress is tracked automatically
- [ ] Blockers are detected and escalated
- [ ] PM Dashboard shows velocity and burndown

### Phase 4 Complete When:
- [ ] Dependencies visualized with lines
- [ ] Blocked cards show blocker badge
- [ ] Critical path is calculated
- [ ] Unblock suggestions are generated

### Phase 5 Complete When:
- [ ] Cards sync with GitHub Issues
- [ ] PRs can be created from cards
- [ ] PR status updates card status
- [ ] AI PR review generates comments

### Phase 6 Complete When:
- [ ] Token cost estimated per card
- [ ] Budget tracked per sprint
- [ ] Agent capacity visualized
- [ ] Sprint planning considers capacity

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Drag-and-drop complexity | High | Medium | Use proven library (@dnd-kit) |
| GitHub API rate limits | Medium | High | Implement caching and webhooks |
| Agent conflicts | Medium | Medium | Strict file ownership |
| Scope creep | High | High | Strict phase boundaries |
| Performance with many cards | Medium | Medium | Virtual scrolling, pagination |

---

## Estimated Timeline

| Phase | Duration | Parallel Agents | Total Tasks |
|-------|----------|-----------------|-------------|
| Phase 1 | 2 weeks | 3 | 16 |
| Phase 2 | 2 weeks | 2 | 12 |
| Phase 3 | 2 weeks | 2 | 12 |
| Phase 4 | 2 weeks | 2 | 8 |
| Phase 5 | 2 weeks | 2 | 8 |
| Phase 6 | 2 weeks | 2 | 7 |
| **Total** | **12 weeks** | - | **63 tasks** |

With aggressive parallel execution and no blockers, this could compress to 8 weeks.

---

## Next Immediate Actions

1. **Execute Phase 1, Sprint 1** - Database schema for Kanban (P1-001 through P1-007)
2. **Execute Phase 1, Sprint 2** - Frontend components (P1-008 through P1-014)
3. **Execute Phase 1, Sprint 3** - Tests (P1-015, P1-016)
4. **QA Gate** - Full verification before Phase 2

Ready to begin execution on your command.
