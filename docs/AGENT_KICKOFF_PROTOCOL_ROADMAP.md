# Agent Kickoff Protocol Integration Roadmap

**Integrating Spec-Driven Development into Hero IDE Project Creation**

*Author: Manus AI | December 2024*

---

## Executive Summary

This roadmap defines how to integrate the Agent Kickoff Protocol—a structured methodology for AI-agent-driven development—into Hero IDE's project creation flow. The protocol provides templates and guardrails that enable AI agents to build applications safely, quickly, and with verifiable outcomes. The integration is designed to be optional (skippable for quick starts) while providing significant value for users who want structured, spec-driven development.

---

## Part 1: Protocol Overview

### 1.1 What is the Agent Kickoff Protocol?

The Agent Kickoff Protocol is a repo-native system that provides AI agents with the constraints and verification mechanisms needed to build software reliably. It consists of two main components:

**Specification Documents (`/docs`):** Define the "what" and "why" of the project through structured templates that capture requirements, constraints, and success criteria.

**Operating Documents (`/ops`):** Define the "how" for AI agents through execution rules, verification requirements, and decision-making protocols.

### 1.2 Core Documents

| Document | Purpose | Required |
|----------|---------|----------|
| `north-star.md` | Hard constraints, invariants, success metrics | Yes |
| `product-brief.md` | User stories, MVP boundary, data model | Yes |
| `architecture.md` | System boundaries, API contracts, module boundaries | Yes |
| `quality-bar.md` | CI gates, testing targets, regression policy | Yes |
| `slice-map.md` | Vertical slices, prioritized feature breakdown | Yes |
| `agent-brief.md` | Agent operating rules, completion criteria | Yes |
| `ticket-template.md` | Slice ticket format with acceptance criteria | Yes |
| `definition-of-done.md` | Completion checklist for all work | Yes |
| `risk-tiers.md` | Verification levels by risk category | Recommended |
| `decision-request.md` | Template for handling ambiguity | Recommended |
| `diff-budget.md` | PR size limits and split rules | Recommended |
| `release-safety.md` | Feature flags, rollback plans | Recommended |

### 1.3 Integration Philosophy

The integration follows these principles:

1. **Optional but Valuable:** Users can skip the kickoff wizard for quick experiments, but structured projects benefit from the protocol.

2. **Progressive Disclosure:** Start with essential documents, reveal advanced options (risk tiers, diff budgets) for power users.

3. **AI-Assisted Generation:** The wizard uses AI to generate initial document content based on user inputs, not just blank templates.

4. **Living Documents:** Generated documents are stored in the project and can be edited anytime.

5. **Agent Integration:** The agent-brief becomes part of the agent's system prompt when working on the project.

---

## Part 2: User Experience Design

### 2.1 Project Creation Flow (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Create New Project                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Project Name: [________________________]                       │
│                                                                 │
│  Description: [________________________]                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🚀 Quick Start                                          │   │
│  │  Jump right in with a blank project                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📋 Guided Setup (Recommended)                           │   │
│  │  Define specs, constraints, and success criteria         │   │
│  │  AI agents work more effectively with clear guidelines   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📥 Import from GitHub                                   │   │
│  │  Clone an existing repository                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Guided Setup Wizard (5 Steps)

**Step 1: North Star**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1 of 5: Define Your North Star                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What are you building? (1-2 sentences)                         │
│  [________________________________________________________]     │
│                                                                 │
│  Who is it for?                                                 │
│  [________________________________________________________]     │
│                                                                 │
│  What problem does it solve?                                    │
│  [________________________________________________________]     │
│                                                                 │
│  Success Metrics (how will you know it's working?)              │
│  • [____________________________________] [+ Add another]       │
│                                                                 │
│  What are you NOT building? (explicit non-goals)                │
│  • [____________________________________] [+ Add another]       │
│                                                                 │
│                                    [Back]  [Next: Product →]    │
└─────────────────────────────────────────────────────────────────┘
```

**Step 2: Product Brief**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 2 of 5: Product Brief                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Top 5 User Stories (what can users do?)                        │
│  1. As a [user], I can [action] so that [value]                 │
│     [________________________________________________________]  │
│  2. [________________________________________________________]  │
│  3. [________________________________________________________]  │
│  4. [________________________________________________________]  │
│  5. [________________________________________________________]  │
│                                                                 │
│  MVP Boundary                                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │ Included in MVP      │  │ Excluded (Later)     │            │
│  │ • [___________]      │  │ • [___________]      │            │
│  │ • [___________]      │  │ • [___________]      │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                 │
│  Key UX Principles                                              │
│  • [____________________________________]                       │
│                                                                 │
│                                [Back]  [Next: Architecture →]   │
└─────────────────────────────────────────────────────────────────┘
```

**Step 3: Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 3 of 5: Architecture                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tech Stack (select or specify)                                 │
│  Frontend: [React ▼] [Next.js ▼] [Tailwind ▼]                  │
│  Backend:  [Node.js ▼] [tRPC ▼]                                │
│  Database: [PostgreSQL ▼]                                       │
│  Other:    [________________________]                           │
│                                                                 │
│  Main Entities (data model)                                     │
│  • [User    ] → [has many] → [Projects]                        │
│  • [Project ] → [has many] → [Tasks   ]                        │
│  [+ Add entity]                                                 │
│                                                                 │
│  External Integrations                                          │
│  □ GitHub  □ Stripe  □ Auth0  □ SendGrid  □ Other: [___]       │
│                                                                 │
│  Architectural Constraints                                      │
│  • [No business logic in UI                    ]               │
│  • [All writes must be validated               ]               │
│  [+ Add constraint]                                             │
│                                                                 │
│                                [Back]  [Next: Quality Bar →]    │
└─────────────────────────────────────────────────────────────────┘
```

**Step 4: Quality Bar**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 4 of 5: Quality Bar                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CI Gates (what must pass before merge?)                        │
│  ☑ TypeScript type checking                                     │
│  ☑ ESLint/Prettier                                              │
│  ☑ Unit tests                                                   │
│  □ Integration tests                                            │
│  □ E2E tests                                                    │
│  □ Security scanning                                            │
│                                                                 │
│  Testing Strategy                                               │
│  Unit tests for:    [Core domain logic, utilities        ]     │
│  Contract tests for: [API endpoints, external services   ]     │
│  E2E tests for:      [Critical user paths               ]      │
│                                                                 │
│  Regression Policy                                              │
│  ☑ Bug fixes must include failing test first                   │
│  ☑ No PR merges without CI passing                             │
│                                                                 │
│                                [Back]  [Next: Slice Map →]      │
└─────────────────────────────────────────────────────────────────┘
```

**Step 5: Slice Map**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 5 of 5: Slice Map                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  A "slice" is one user-visible outcome that crosses             │
│  UI → API → Database. Define your first slices:                 │
│                                                                 │
│  S1: Walking Skeleton (proves the stack works)                  │
│  User can: [Create account and see empty dashboard      ]       │
│  Proves:   [Auth, routing, database, deployment         ]       │
│                                                                 │
│  S2: [_________________________________________________]        │
│  User can: [________________________________________    ]       │
│                                                                 │
│  S3: [_________________________________________________]        │
│  User can: [________________________________________    ]       │
│                                                                 │
│  [+ Add more slices]                                            │
│                                                                 │
│  ──────────────────────────────────────────────────────────     │
│                                                                 │
│  ☑ Generate agent operating documents (recommended)             │
│  □ Enable advanced options (risk tiers, diff budgets)           │
│                                                                 │
│                                [Back]  [Create Project →]       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Generated Output

After completing the wizard, the system generates:

```
project-name/
├── docs/
│   ├── adr/
│   │   └── 0001-record-architecture-decisions.md
│   ├── north-star.md          ← Generated from Step 1
│   ├── product-brief.md       ← Generated from Step 2
│   ├── architecture.md        ← Generated from Step 3
│   ├── quality-bar.md         ← Generated from Step 4
│   ├── slice-map.md           ← Generated from Step 5
│   └── glossary.md            ← Auto-generated from entities
├── ops/
│   ├── agent-brief.md         ← Generated (agent operating rules)
│   ├── ticket-template.md     ← Standard template
│   ├── pr-template.md         ← Standard template
│   ├── review-checklist.md    ← Standard template
│   └── definition-of-done.md  ← Standard template
└── src/
    └── ... (project code)
```

---

## Part 3: Technical Architecture

### 3.1 Database Schema Additions

```sql
-- Store kickoff wizard responses
CREATE TABLE project_kickoff (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  
  -- Step 1: North Star
  purpose TEXT,
  target_user TEXT,
  problem_solved TEXT,
  success_metrics JSON,  -- Array of strings
  non_goals JSON,        -- Array of strings
  
  -- Step 2: Product Brief
  user_stories JSON,     -- Array of {role, action, value}
  mvp_included JSON,     -- Array of strings
  mvp_excluded JSON,     -- Array of strings
  ux_principles JSON,    -- Array of strings
  
  -- Step 3: Architecture
  tech_stack JSON,       -- {frontend, backend, database, other}
  entities JSON,         -- Array of {name, relationships}
  integrations JSON,     -- Array of strings
  constraints JSON,      -- Array of strings
  
  -- Step 4: Quality Bar
  ci_gates JSON,         -- Array of strings
  testing_strategy JSON, -- {unit, contract, e2e}
  regression_policy JSON,-- Array of strings
  
  -- Step 5: Slice Map
  slices JSON,           -- Array of {name, user_can, proves}
  
  -- Metadata
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Store generated documents
CREATE TABLE project_docs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  doc_type TEXT NOT NULL,  -- 'north-star', 'product-brief', etc.
  content TEXT NOT NULL,   -- Markdown content
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Service Architecture

```typescript
// server/kickoff/kickoffService.ts

export interface KickoffWizardData {
  northStar: {
    purpose: string;
    targetUser: string;
    problemSolved: string;
    successMetrics: string[];
    nonGoals: string[];
  };
  productBrief: {
    userStories: { role: string; action: string; value: string }[];
    mvpIncluded: string[];
    mvpExcluded: string[];
    uxPrinciples: string[];
  };
  architecture: {
    techStack: { frontend: string; backend: string; database: string; other: string };
    entities: { name: string; relationships: string[] }[];
    integrations: string[];
    constraints: string[];
  };
  qualityBar: {
    ciGates: string[];
    testingStrategy: { unit: string; contract: string; e2e: string };
    regressionPolicy: string[];
  };
  sliceMap: {
    slices: { name: string; userCan: string; proves?: string }[];
  };
}

export async function generateKickoffDocs(
  projectId: string,
  data: KickoffWizardData
): Promise<GeneratedDocs> {
  // Use LLM to generate polished markdown from wizard inputs
  const northStar = await generateNorthStar(data.northStar);
  const productBrief = await generateProductBrief(data.productBrief);
  const architecture = await generateArchitecture(data.architecture);
  const qualityBar = await generateQualityBar(data.qualityBar);
  const sliceMap = await generateSliceMap(data.sliceMap);
  const agentBrief = await generateAgentBrief(data);
  
  // Store in database
  await storeProjectDocs(projectId, {
    'north-star': northStar,
    'product-brief': productBrief,
    'architecture': architecture,
    'quality-bar': qualityBar,
    'slice-map': sliceMap,
    'agent-brief': agentBrief,
  });
  
  return { northStar, productBrief, architecture, qualityBar, sliceMap, agentBrief };
}
```

### 3.3 Agent Integration

The agent-brief becomes part of the agent's context when working on a project:

```typescript
// server/agents/contextBuilder.ts

export async function buildAgentContext(
  projectId: string,
  agentType: AgentType
): Promise<AgentContext> {
  // Get project kickoff docs
  const agentBrief = await getProjectDoc(projectId, 'agent-brief');
  const northStar = await getProjectDoc(projectId, 'north-star');
  const architecture = await getProjectDoc(projectId, 'architecture');
  
  // Build context with kickoff docs
  return {
    systemPrompt: `
      ${getBaseSystemPrompt(agentType)}
      
      ## Project Operating Rules
      ${agentBrief || 'No agent brief defined.'}
      
      ## Project North Star
      ${northStar || 'No north star defined.'}
      
      ## Architecture Constraints
      ${architecture || 'No architecture defined.'}
    `,
    // ... other context
  };
}
```

### 3.4 Slice-to-Kanban Integration

Slices from the wizard automatically become Kanban cards:

```typescript
// server/kickoff/sliceToKanban.ts

export async function createCardsFromSlices(
  projectId: string,
  boardId: string,
  slices: Slice[]
): Promise<void> {
  const backlogColumnId = await getBacklogColumn(boardId);
  
  for (const slice of slices) {
    await createKanbanCard({
      boardId,
      columnId: backlogColumnId,
      title: slice.name,
      description: `**User can:** ${slice.userCan}\n\n**Proves:** ${slice.proves || 'N/A'}`,
      labels: ['slice'],
      position: slice.order,
    });
  }
}
```

---

## Part 4: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| Task | Description | Effort |
|------|-------------|--------|
| P1-001 | Add `project_kickoff` table to schema | 2h |
| P1-002 | Add `project_docs` table to schema | 1h |
| P1-003 | Create `kickoffService.ts` with wizard data types | 4h |
| P1-004 | Create document generation prompts | 8h |
| P1-005 | Implement `generateNorthStar()` | 4h |
| P1-006 | Implement `generateProductBrief()` | 4h |
| P1-007 | Implement `generateArchitecture()` | 4h |
| P1-008 | Implement `generateQualityBar()` | 2h |
| P1-009 | Implement `generateSliceMap()` | 2h |
| P1-010 | Implement `generateAgentBrief()` | 4h |
| P1-011 | Add kickoff tRPC router | 4h |
| P1-012 | Write unit tests | 8h |

### Phase 2: UI Implementation (Week 3-4)

| Task | Description | Effort |
|------|-------------|--------|
| P2-001 | Create `KickoffWizard.tsx` shell component | 4h |
| P2-002 | Create `NorthStarStep.tsx` | 4h |
| P2-003 | Create `ProductBriefStep.tsx` | 4h |
| P2-004 | Create `ArchitectureStep.tsx` | 6h |
| P2-005 | Create `QualityBarStep.tsx` | 4h |
| P2-006 | Create `SliceMapStep.tsx` | 4h |
| P2-007 | Create `useKickoffWizard.ts` hook | 4h |
| P2-008 | Integrate wizard into project creation flow | 4h |
| P2-009 | Add "Skip" option for quick start | 2h |
| P2-010 | Add progress indicator and navigation | 2h |

### Phase 3: Agent Integration (Week 5)

| Task | Description | Effort |
|------|-------------|--------|
| P3-001 | Update `contextBuilder.ts` to include kickoff docs | 4h |
| P3-002 | Add agent-brief to agent system prompt | 4h |
| P3-003 | Implement slice-to-Kanban card creation | 4h |
| P3-004 | Add "Create from Slice" button in Kanban | 4h |
| P3-005 | Create ticket generation from slice | 4h |

### Phase 4: Advanced Features (Week 6)

| Task | Description | Effort |
|------|-------------|--------|
| P4-001 | Add `risk-tiers.md` generation | 4h |
| P4-002 | Add `decision-request.md` template | 2h |
| P4-003 | Add `diff-budget.md` configuration | 2h |
| P4-004 | Add `release-safety.md` generation | 2h |
| P4-005 | Create advanced options UI toggle | 2h |
| P4-006 | Add document editor for post-creation edits | 8h |

### Phase 5: Polish & Testing (Week 7-8)

| Task | Description | Effort |
|------|-------------|--------|
| P5-001 | End-to-end testing of wizard flow | 8h |
| P5-002 | Test agent context with kickoff docs | 4h |
| P5-003 | Performance optimization | 4h |
| P5-004 | Documentation and help text | 4h |
| P5-005 | User testing and iteration | 8h |

---

## Part 5: Success Metrics

### 5.1 Adoption Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Wizard completion rate | > 60% | Analytics |
| Skip rate | < 40% | Analytics |
| Time to complete wizard | < 10 min | Analytics |
| Document edit rate | > 20% | Database |

### 5.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Agent task success rate (with kickoff) | > 80% | Execution logs |
| Agent task success rate (without kickoff) | Baseline | Execution logs |
| Rework rate (with kickoff) | < 15% | Git history |
| Rework rate (without kickoff) | Baseline | Git history |

### 5.3 User Satisfaction

| Metric | Target | Measurement |
|--------|--------|-------------|
| NPS for guided setup | > 40 | Survey |
| "Would recommend" | > 70% | Survey |
| Feature usage retention | > 50% | Analytics |

---

## Part 6: Risk Mitigation

### 6.1 Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Wizard too long/complex | Medium | High | Progressive disclosure, skip option |
| Generated docs low quality | Medium | High | Iterative prompt engineering, human review |
| Users don't read docs | High | Medium | Integrate into agent context automatically |
| Docs become stale | High | Medium | Prompt to update on major changes |
| Over-constrains creativity | Low | Medium | Emphasize docs are guidelines, not rules |

### 6.2 Fallback Strategies

If wizard adoption is low, consider:
1. Simplify to 3 steps (North Star, Product, Slices)
2. Add "Generate from description" option (AI fills all fields)
3. Make wizard post-creation (can add docs to existing projects)

---

## Conclusion

The Agent Kickoff Protocol integration transforms Hero IDE from a code editor with AI assistance into a structured development environment where AI agents can work effectively within defined constraints. By making the protocol optional but valuable, we serve both quick experimenters and teams building production applications.

The 8-week implementation timeline balances thoroughness with speed, delivering core functionality early while adding advanced features progressively. Success will be measured by improved agent task completion rates and reduced rework, validating the hypothesis that structured specifications lead to better AI-assisted development outcomes.
