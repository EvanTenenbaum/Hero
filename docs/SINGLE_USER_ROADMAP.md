# Hero IDE - Single-User Roadmap

**Last Updated**: December 22, 2025  
**Context**: Single developer use (no multi-user, no public exposure)  
**Focus**: Reliability, features, and developer experience

---

## Risk Re-Assessment for Single-User Context

The original Risk Assessment Report identified 65+ issues assuming a multi-user production environment with potential malicious actors. For single-user development use, many of these concerns become irrelevant or low priority.

### Issues That Don't Matter for Single User

| Original Issue | Why It Doesn't Matter |
|----------------|----------------------|
| **Command Injection (SEC-001)** | You're not going to inject malicious commands into your own app |
| **No Rate Limiting (SEC-004)** | You won't DDoS yourself or spam LLM calls accidentally |
| **CSRF Disabled (SEC-005)** | No malicious third-party sites targeting your session |
| **Weak OAuth State (SEC-007)** | No attacker to forge OAuth redirects |
| **Missing Authorization/IDOR (SEC-008)** | All data is yours anyway |
| **Brute Force Login (mentioned)** | You know your own password |
| **Cost Exhaustion Attack** | You control your own usage |
| **Monday Morning Crash (50+ users)** | It's just you |

### Issues That Still Matter (Even for Single User)

These issues affect **your daily experience** regardless of user count:

| Issue | Why It Still Matters | Impact on You |
|-------|---------------------|---------------|
| **Race Conditions in Kanban** | If you drag cards quickly, positions can corrupt | Broken board display |
| **No Fetch Timeouts** | LLM/GitHub calls can hang forever | Spinner of death |
| **In-Memory State Loss** | Server restart loses active agent work | Lost progress |
| **Missing DB Indexes** | Slow queries as data grows | Sluggish UI |
| **No LLM Streaming** | Wait 5-15s staring at nothing | Poor experience |
| **N+1 Queries** | Column reorder takes 500ms+ | Laggy interactions |
| **Large Bundle Size** | 3-5s initial load | Annoying on refresh |
| **Silent Promise Failures** | Metrics/costs fail without notice | Inaccurate data |
| **Board Refresh Bug** | New board doesn't appear | Confusing UX |

### Issues to Defer Indefinitely

These can wait until you decide to go multi-user:

| Issue | Defer Until |
|-------|-------------|
| Secrets encryption | Multi-user or public deployment |
| OAuth token encryption | Multi-user or public deployment |
| Rate limiting | Multi-user or public deployment |
| CSRF protection | Multi-user or public deployment |
| Path traversal validation | Multi-user or public deployment |
| Authorization checks | Multi-user or public deployment |
| Connection pooling | 10+ concurrent connections |
| Redis for sessions | Multi-instance deployment |

---

## Revised Priority Tiers (Single User)

| Tier | Criteria | Focus |
|------|----------|-------|
| **P0 - FIX NOW** | Bugs that break your workflow daily | Reliability |
| **P1 - SOON** | Performance issues that slow you down | Speed |
| **P2 - NICE** | Features that would improve your experience | Features |
| **P3 - LATER** | Multi-user prep, nice-to-haves | Backlog |

---

## P0 - Issues That Break Your Workflow

These are bugs you'll hit regularly that make the app frustrating to use:

| ID | Issue | Impact | Effort | Fix |
|----|-------|--------|--------|-----|
| BUG-001 | **No Fetch Timeouts** | LLM/GitHub calls hang forever, must refresh | 2-4h | Add AbortController with 30s timeout |
| BUG-002 | **Board Refresh Bug** | Create board → doesn't appear → confusion | 1h | Add query invalidation |
| BUG-003 | **Silent Metrics Failures** | Cost tracking silently breaks | 2h | Add proper error propagation |
| BUG-004 | **In-Memory State Loss** | Restart = lose agent progress | 4-8h | Persist to DB instead of Map |

---

## P1 - Performance Issues That Slow You Down

These make the app feel sluggish:

| ID | Issue | Impact | Effort | Fix |
|----|-------|--------|--------|-----|
| PERF-001 | **No LLM Streaming** | Wait 5-15s seeing nothing | 4-8h | Implement SSE streaming |
| PERF-002 | **Missing DB Indexes** | Queries slow as data grows | 2h | Add indexes to schema |
| PERF-003 | **N+1 Column Reorder** | 500ms+ lag on reorder | 2h | Batch UPDATE with CASE |
| PERF-004 | **Large Bundle** | 3-5s load on refresh | 1d | Code-split Monaco |
| PERF-005 | **Unbounded Queries** | Memory spikes with history | 2h | Add default limits |

---

## P2 - Features That Would Help You

These would make your daily work better:

| ID | Feature | Benefit | Effort |
|----|---------|---------|--------|
| FEAT-001 | **Wire MetaModeChat** | Use self-modifying IDE from Chat | 4h |
| FEAT-002 | **Syntax Highlighting in Preview** | Better code review in changes | 2h |
| FEAT-003 | **Quick Switcher (Cmd+K)** | Fast navigation | 4h |
| FEAT-004 | **Loading Skeletons** | Less jarring transitions | 4h |
| FEAT-005 | **Keyboard Shortcuts** | Faster workflow | 4h |
| FEAT-006 | **GitHub Cloning UI** | Clone repos from UI | 1d |
| FEAT-007 | **PR Review Workflow** | Full PR support | 1-2d |

---

## P3 - Defer Until Multi-User

Don't spend time on these now:

| Issue | Why Defer |
|-------|-----------|
| Encryption (secrets, tokens) | Only matters if DB is compromised by others |
| Rate limiting | You won't spam yourself |
| CSRF protection | No malicious sites targeting you |
| Authorization checks | All data is yours |
| Redis sessions | Single instance is fine |
| Connection pooling | Single user won't exhaust connections |

---

## Recommended Sprint Plan (Single User Focus)

### Sprint 26: Reliability & Bug Fixes (3-4 days)

**Goal**: Fix the bugs that interrupt your daily workflow.

| Task | Effort | Priority |
|------|--------|----------|
| Add 30s timeout to all fetch calls (llm.ts, github/api.ts) | 2h | P0 |
| Fix board refresh after creation (BoardPane.tsx) | 1h | P0 |
| Fix silent metrics failures with proper error handling | 2h | P0 |
| Persist agent execution state to DB instead of in-memory Map | 4h | P0 |
| Add missing database indexes | 2h | P1 |
| Fix N+1 query in column reorder with batch UPDATE | 2h | P1 |
| Add default limits to unbounded queries | 2h | P1 |

**Total**: ~15 hours (2 days of focused work)

**Deliverables**:
- No more hanging requests
- Boards appear immediately after creation
- Agent progress survives restarts
- Faster queries

---

### Sprint 27: Performance & Streaming (3-4 days)

**Goal**: Make the app feel fast and responsive.

| Task | Effort | Priority |
|------|--------|----------|
| Implement LLM response streaming with SSE | 6h | P1 |
| Code-split Monaco editor (lazy load) | 4h | P1 |
| Lazy-load charts and heavy components | 4h | P1 |
| Add loading skeletons to pane transitions | 4h | P2 |
| Implement basic Cmd+K quick switcher | 4h | P2 |

**Total**: ~22 hours (3 days of focused work)

**Deliverables**:
- LLM responses stream in real-time
- Initial load < 2s
- Smooth transitions with skeletons
- Quick navigation with Cmd+K

---

### Sprint 28: Feature Polish (3-4 days)

**Goal**: Add the features that improve your daily workflow.

| Task | Effort | Priority |
|------|--------|----------|
| Wire MetaModeChat toggle to Chat page | 4h | P2 |
| Add syntax highlighting to ChangePreviewPanel | 2h | P2 |
| Complete keyboard shortcuts implementation | 4h | P2 |
| GitHub cloning UI integration | 6h | P2 |
| PR review workflow (list, view, comment) | 8h | P2 |

**Total**: ~24 hours (3 days of focused work)

**Deliverables**:
- Self-modifying IDE accessible from Chat
- Better code preview
- Full keyboard navigation
- Clone repos from UI
- Basic PR workflow

---

## What You Get After 3 Sprints

| Before | After |
|--------|-------|
| Requests hang forever | 30s timeout, clear feedback |
| New boards don't appear | Instant refresh |
| Agent progress lost on restart | Persisted to database |
| Wait 5-15s for LLM response | Streaming starts immediately |
| 3-5s initial load | < 2s with code splitting |
| No quick navigation | Cmd+K switcher |
| Self-modifying IDE hidden | Toggle in Chat page |
| Manual GitHub cloning | Clone from UI |

---

## Code Quality: Do It As You Go

Instead of a dedicated "code quality sprint", improve code as you touch it:

| When You're In... | Also Do... |
|-------------------|------------|
| routers.ts | Extract related routes to separate files |
| schema.ts | Move tables to domain-specific files |
| Any file with `as any` | Add proper types |
| Any file > 500 lines | Split into modules |

This way you improve quality incrementally without blocking features.

---

## Summary: What Actually Matters for You

**Fix These (They Break Your Workflow)**:
1. Fetch timeouts (hanging requests)
2. Board refresh bug
3. In-memory state loss
4. LLM streaming (waiting is painful)

**Improve These (They Slow You Down)**:
1. Database indexes
2. Bundle size
3. N+1 queries

**Add These (They Help Your Workflow)**:
1. MetaModeChat in Chat page
2. Quick switcher (Cmd+K)
3. GitHub cloning UI

**Ignore These (Multi-User Problems)**:
- All security hardening
- Rate limiting
- Encryption
- Authorization checks

---

## References

1. Risk Assessment Report - `/docs/RISK_ASSESSMENT_REPORT.md`
2. System QA Handoff - `/docs/SYSTEM_QA_HANDOFF.md`
3. Full Prioritized Roadmap - `/docs/PRIORITIZED_ROADMAP.md`

---

*Roadmap tailored for single-user development. Generated December 22, 2025.*
