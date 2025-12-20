# Hero IDE: Parallel Agent Execution Roadmap

**Version:** 1.0  
**Author:** Manus AI  
**Date:** December 2025  
**Purpose:** Enable multiple AI agents to work simultaneously on Hero IDE without conflicts

---

## Executive Summary

This document defines a parallel execution strategy for completing the remaining Hero IDE features. The approach divides work into **isolated workstreams** where multiple agents can operate simultaneously without file conflicts or integration issues. A **Coordinator Agent** (the primary Manus instance) serves as the integration point, performing independent QA on each agent's output before merging into the main codebase.

The strategy prioritizes **code quality over speed**—parallel execution accelerates delivery, but never at the cost of introducing bugs or technical debt.

---

## Architecture: Workstream Isolation

### Core Principle: No Shared Files During Parallel Execution

Each parallel agent works exclusively within a defined file boundary. No two agents should ever modify the same file simultaneously. When integration is required, the Coordinator Agent handles it after QA.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COORDINATOR AGENT                                │
│  • Assigns tasks to parallel agents                                      │
│  • Performs independent QA on each agent's output                        │
│  • Resolves conflicts and integrates code                                │
│  • Runs full test suite before commits                                   │
│  • Makes final commit decisions                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AGENT ALPHA   │     │   AGENT BETA    │     │   AGENT GAMMA   │
│                 │     │                 │     │                 │
│ Workstream A    │     │ Workstream B    │     │ Workstream C    │
│ Files: A1-A5    │     │ Files: B1-B5    │     │ Files: C1-C5    │
│ Tests: A.test   │     │ Tests: B.test   │     │ Tests: C.test   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Workstream Definitions

### Sprint 1: Core Wiring (3 Parallel Agents)

This sprint connects the agent system to the existing application. Each workstream is completely isolated.

| Workstream | Agent | Focus Area | Owned Files | Dependencies |
|------------|-------|------------|-------------|--------------|
| **A: Chat Integration** | Alpha | Wire execution engine to chat | `server/chatAgent.ts`, `server/routers/chat-agent.ts`, `client/src/hooks/useChatAgent.ts` | None |
| **B: Prompt Seeding** | Beta | Seed default prompts + migration | `server/seeds/promptSeeds.ts`, `drizzle/migrations/seed-prompts.ts`, `server/agents/defaultPrompts.ts` | None |
| **C: Metrics Wiring** | Gamma | Connect metrics recording | `server/services/metricsRecorder.ts`, `client/src/hooks/useMetricsRecorder.ts` | None |

**File Boundaries (No Overlap):**

```
Agent Alpha owns:
├── server/chatAgent.ts (NEW)
├── server/routers/chat-agent.ts (NEW)
├── client/src/hooks/useChatAgent.ts (NEW)
└── server/chat-agent.test.ts (NEW)

Agent Beta owns:
├── server/seeds/promptSeeds.ts (NEW)
├── server/agents/defaultPrompts.ts (NEW)
├── drizzle/migrations/seed-prompts.ts (NEW)
└── server/prompt-seeds.test.ts (NEW)

Agent Gamma owns:
├── server/services/metricsRecorder.ts (NEW)
├── client/src/hooks/useMetricsRecorder.ts (NEW)
└── server/metrics-recorder.test.ts (NEW)

SHARED (Coordinator modifies after QA):
├── server/routers.ts (add new routers)
├── client/src/App.tsx (add new hooks)
└── server/db.ts (add new helpers if needed)
```

---

### Sprint 2: UI Enhancements (3 Parallel Agents)

| Workstream | Agent | Focus Area | Owned Files | Dependencies |
|------------|-------|------------|-------------|--------------|
| **D: Confirmation Modal** | Alpha | Build action confirmation UI | `client/src/components/ConfirmationModal.tsx`, `client/src/hooks/useConfirmation.ts` | Sprint 1 complete |
| **E: Real-time Updates** | Beta | WebSocket/SSE for live updates | `server/services/executionBroadcast.ts`, `client/src/hooks/useExecutionStream.ts` | Sprint 1 complete |
| **F: Rule Presets** | Gamma | Pre-built rule templates | `client/src/components/RulePresets.tsx`, `server/data/rulePresets.json` | None |

**File Boundaries:**

```
Agent Alpha owns:
├── client/src/components/ConfirmationModal.tsx (NEW)
├── client/src/hooks/useConfirmation.ts (NEW)
└── client/src/components/confirmation-modal.test.tsx (NEW)

Agent Beta owns:
├── server/services/executionBroadcast.ts (NEW)
├── client/src/hooks/useExecutionStream.ts (NEW)
└── server/execution-broadcast.test.ts (NEW)

Agent Gamma owns:
├── client/src/components/RulePresets.tsx (NEW)
├── server/data/rulePresets.json (NEW)
└── client/src/components/rule-presets.test.tsx (NEW)
```

---

### Sprint 3: Advanced Features (2 Parallel Agents)

| Workstream | Agent | Focus Area | Owned Files | Dependencies |
|------------|-------|------------|-------------|--------------|
| **G: Cost Tracking** | Alpha | Token usage and budget tracking | `server/services/costTracker.ts`, `client/src/pages/CostDashboard.tsx` | Sprint 1-2 complete |
| **H: Agent Rollback** | Beta | Checkpoint rollback from timeline | `server/services/rollbackService.ts`, `client/src/components/RollbackPanel.tsx` | Sprint 1-2 complete |

---

## Task Specifications for Parallel Agents

### Agent Alpha: Chat Integration (Sprint 1A)

**Objective:** Create a service that connects the chat interface to the new agent execution engine.

**Input Context:**
- Existing chat router at `server/routers.ts` (lines 87-197)
- Execution engine at `server/agents/executionEngine.ts`
- Prompt templates at `server/agents/promptTemplates.ts`
- Safety checker at `server/agents/safetyChecker.ts`

**Output Requirements:**

1. **`server/chatAgent.ts`** - Service class that:
   - Takes a user message and conversation context
   - Assembles the appropriate prompt using `assemblePrompt()`
   - Runs safety checks on proposed actions
   - Executes via the execution engine
   - Returns structured response with steps taken

2. **`server/routers/chat-agent.ts`** - tRPC router with:
   - `executeWithAgent` mutation - runs a message through the agent
   - `getAgentStatus` query - returns current execution state
   - `cancelExecution` mutation - stops running execution

3. **`client/src/hooks/useChatAgent.ts`** - React hook that:
   - Wraps the tRPC calls
   - Manages loading/error states
   - Provides `executeMessage()` and `cancel()` functions

4. **`server/chat-agent.test.ts`** - Tests covering:
   - Prompt assembly with different agent types
   - Safety check integration
   - Execution flow (success, failure, cancellation)

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] No modifications to files outside owned boundary
- [ ] Code follows existing patterns in codebase

---

### Agent Beta: Prompt Seeding (Sprint 1B)

**Objective:** Create default prompt templates for all agent types and a migration to seed them.

**Input Context:**
- System prompts defined in `AGENT_SYSTEM_PROMPTS.md`
- Prompt template schema in `drizzle/schema.ts` (prompt_templates table)
- Template structure in `server/agents/promptTemplates.ts`

**Output Requirements:**

1. **`server/agents/defaultPrompts.ts`** - Export default prompts:
   ```typescript
   export const DEFAULT_PROMPTS: Record<AgentType, PromptTemplate> = {
     pm: { identity: "...", communication: "...", tools: "...", safety: "..." },
     developer: { ... },
     qa: { ... },
     devops: { ... },
     research: { ... },
   };
   ```

2. **`server/seeds/promptSeeds.ts`** - Seeding function:
   - Inserts all default prompts into database
   - Handles upsert (update if exists)
   - Logs progress

3. **`drizzle/migrations/seed-prompts.ts`** - Migration script:
   - Can be run via `pnpm db:seed`
   - Idempotent (safe to run multiple times)

4. **`server/prompt-seeds.test.ts`** - Tests covering:
   - All agent types have complete prompts
   - Prompts contain required sections
   - Seeding is idempotent

**Acceptance Criteria:**
- [ ] All 5 agent types have complete prompts
- [ ] Prompts match the specifications in AGENT_SYSTEM_PROMPTS.md
- [ ] Migration runs without errors
- [ ] Tests verify prompt completeness

---

### Agent Gamma: Metrics Wiring (Sprint 1C)

**Objective:** Create a service that records agent usage metrics automatically.

**Input Context:**
- Metrics router at `server/routers.ts` (metricsRouter)
- Metrics schema in `drizzle/schema.ts` (metricsDaily table)
- Execution engine at `server/agents/executionEngine.ts`

**Output Requirements:**

1. **`server/services/metricsRecorder.ts`** - Service that:
   - Records token usage per execution
   - Tracks execution duration
   - Aggregates daily metrics
   - Provides `recordExecution()` function

2. **`client/src/hooks/useMetricsRecorder.ts`** - Hook that:
   - Automatically records client-side metrics
   - Tracks session duration
   - Batches updates to reduce API calls

3. **`server/metrics-recorder.test.ts`** - Tests covering:
   - Metric recording accuracy
   - Daily aggregation logic
   - Edge cases (midnight rollover, etc.)

**Acceptance Criteria:**
- [ ] Metrics are recorded accurately
- [ ] No duplicate counting
- [ ] Tests cover aggregation logic

---

## Integration Protocol

### Step 1: Agent Completion

When a parallel agent completes its workstream:

1. Agent creates all files in its owned boundary
2. Agent runs its own tests and ensures they pass
3. Agent reports completion with:
   - List of files created/modified
   - Test results
   - Any concerns or edge cases noted

### Step 2: Coordinator QA (Independent Review)

The Coordinator Agent performs independent QA:

1. **Code Review:**
   - Read all files created by the agent
   - Verify adherence to coding standards
   - Check for security issues
   - Ensure no files outside boundary were touched

2. **Test Verification:**
   - Run the agent's tests independently
   - Add additional edge case tests if needed
   - Verify test coverage is adequate

3. **Integration Check:**
   - Verify the code will integrate cleanly
   - Identify any conflicts with other workstreams
   - Plan integration order

### Step 3: Integration

The Coordinator integrates approved code:

1. **Merge Order:** Integrate workstreams in dependency order
2. **Shared File Updates:** Coordinator updates shared files (routers.ts, App.tsx, etc.)
3. **Full Test Suite:** Run ALL tests after each integration
4. **Checkpoint:** Save checkpoint after successful integration

### Step 4: Final QA

Before any commit:

1. Run full test suite (must be 100% pass)
2. TypeScript compilation check (0 errors)
3. Manual smoke test of affected features
4. Review git diff for unintended changes

---

## Conflict Resolution

### File Conflicts

If two agents accidentally modify the same file:

1. **Stop both agents immediately**
2. **Coordinator reviews both changes**
3. **Manually merge the changes**
4. **Re-run tests for both workstreams**
5. **Update boundaries to prevent recurrence**

### Logic Conflicts

If two features have incompatible logic:

1. **Identify the conflict source**
2. **Determine which approach is correct**
3. **Modify one workstream to align**
4. **Document the decision**

### Test Conflicts

If tests from different workstreams interfere:

1. **Isolate test environments**
2. **Use unique test data per workstream**
3. **Add cleanup between test suites**

---

## Quality Gates

### Per-Workstream Gates

Before a workstream is considered complete:

| Gate | Requirement |
|------|-------------|
| Tests Pass | 100% of workstream tests pass |
| TypeScript | 0 compilation errors |
| Lint | 0 lint errors |
| Coverage | >80% line coverage for new code |
| Documentation | JSDoc comments on public functions |

### Integration Gates

Before code is committed:

| Gate | Requirement |
|------|-------------|
| Full Test Suite | All 82+ tests pass |
| No Regressions | Existing features still work |
| Performance | No significant slowdowns |
| Security | No new vulnerabilities |

---

## Execution Timeline

### Sprint 1: Core Wiring (Parallel)

```
Day 1-2:
├── Agent Alpha: Chat Integration ──────────────────────▶ QA
├── Agent Beta:  Prompt Seeding ────────────────────────▶ QA
└── Agent Gamma: Metrics Wiring ────────────────────────▶ QA

Day 3:
└── Coordinator: Integration + Full QA ─────────────────▶ Commit
```

### Sprint 2: UI Enhancements (Parallel)

```
Day 4-5:
├── Agent Alpha: Confirmation Modal ────────────────────▶ QA
├── Agent Beta:  Real-time Updates ─────────────────────▶ QA
└── Agent Gamma: Rule Presets ──────────────────────────▶ QA

Day 6:
└── Coordinator: Integration + Full QA ─────────────────▶ Commit
```

### Sprint 3: Advanced Features (Parallel)

```
Day 7-8:
├── Agent Alpha: Cost Tracking ─────────────────────────▶ QA
└── Agent Beta:  Agent Rollback ────────────────────────▶ QA

Day 9:
└── Coordinator: Integration + Full QA ─────────────────▶ Commit
```

---

## Agent Communication Protocol

### Task Assignment Message

When assigning a task to a parallel agent:

```markdown
## Task Assignment: [Workstream ID]

**Agent:** [Alpha/Beta/Gamma]
**Sprint:** [1/2/3]
**Workstream:** [Name]

### Objective
[Clear description of what to build]

### Owned Files
- [List of files this agent can create/modify]

### DO NOT MODIFY
- [List of shared files - Coordinator only]

### Input Context
- [Relevant existing files to read]
- [Documentation to reference]

### Output Requirements
1. [File 1]: [Description]
2. [File 2]: [Description]
...

### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
...

### Report Format
When complete, report:
1. Files created
2. Test results
3. Any concerns
```

### Completion Report Format

When an agent completes a workstream:

```markdown
## Completion Report: [Workstream ID]

**Agent:** [Alpha/Beta/Gamma]
**Status:** Complete

### Files Created
- `path/to/file1.ts` - [Description]
- `path/to/file2.ts` - [Description]

### Test Results
- Total: X tests
- Passed: X
- Failed: 0

### Notes/Concerns
- [Any edge cases or concerns]

### Ready for QA: Yes
```

---

## Appendix: File Ownership Matrix

| File Path | Owner | Sprint | Notes |
|-----------|-------|--------|-------|
| `server/chatAgent.ts` | Alpha | 1 | NEW |
| `server/routers/chat-agent.ts` | Alpha | 1 | NEW |
| `client/src/hooks/useChatAgent.ts` | Alpha | 1 | NEW |
| `server/agents/defaultPrompts.ts` | Beta | 1 | NEW |
| `server/seeds/promptSeeds.ts` | Beta | 1 | NEW |
| `server/services/metricsRecorder.ts` | Gamma | 1 | NEW |
| `client/src/components/ConfirmationModal.tsx` | Alpha | 2 | NEW |
| `client/src/hooks/useConfirmation.ts` | Alpha | 2 | NEW |
| `server/services/executionBroadcast.ts` | Beta | 2 | NEW |
| `client/src/hooks/useExecutionStream.ts` | Beta | 2 | NEW |
| `client/src/components/RulePresets.tsx` | Gamma | 2 | NEW |
| `server/services/costTracker.ts` | Alpha | 3 | NEW |
| `client/src/pages/CostDashboard.tsx` | Alpha | 3 | NEW |
| `server/services/rollbackService.ts` | Beta | 3 | NEW |
| `client/src/components/RollbackPanel.tsx` | Beta | 3 | NEW |
| `server/routers.ts` | **Coordinator** | All | SHARED |
| `client/src/App.tsx` | **Coordinator** | All | SHARED |
| `server/db.ts` | **Coordinator** | All | SHARED |
| `drizzle/schema.ts` | **Coordinator** | All | SHARED |

---

## Summary

This parallel execution roadmap enables 3 agents to work simultaneously on isolated features, with the Coordinator Agent serving as the quality gate and integration point. The key principles are:

1. **Strict file boundaries** - No two agents touch the same file
2. **Independent QA** - Coordinator reviews all code before integration
3. **Full test coverage** - Every workstream includes comprehensive tests
4. **Incremental commits** - Code is committed only after full QA passes

By following this protocol, we can achieve 3x development velocity without sacrificing code quality or introducing integration bugs.
