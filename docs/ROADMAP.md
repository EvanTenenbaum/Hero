# Hero IDE - Master Roadmap

**Last Updated**: December 22, 2025  
**Version**: 1.0.0-beta  
**Current Context**: Single-user development (owner only)  
**Future Context**: Multi-user production (when ready)

---

## Executive Summary

This roadmap consolidates all identified issues from the Risk Assessment Report, System QA Handoff document, and existing todo.md. Issues are prioritized based on the current single-user context, with multi-user concerns tracked but deferred.

### Current State

| Metric | Value |
|--------|-------|
| Tests Passing | 794 |
| Test Files | 28 |
| Database Tables | 52 |
| API Endpoints | 100+ |
| Total Issues Identified | 65 |

### Issue Distribution by Current Priority

| Priority | Count | Focus |
|----------|-------|-------|
| **P0 - Fix Now** | 9 | Bugs breaking daily workflow |
| **P1 - Soon** | 11 | Performance & reliability |
| **P2 - Next** | 17 | Features & UX improvements |
| **P3 - Deferred** | 20 | Multi-user security & scale |
| **P4 - Backlog** | 8 | Future enhancements |

---

## Priority Tier Definitions

| Tier | Criteria | Timeline |
|------|----------|----------|
| **P0 - Fix Now** | Bugs that break your daily workflow | This sprint |
| **P1 - Soon** | Performance issues that slow you down | Next 2 sprints |
| **P2 - Next** | Features that improve your experience | Next month |
| **P3 - Deferred** | Multi-user/security (defer until needed) | Before public launch |
| **P4 - Backlog** | Nice-to-have future enhancements | Someday |

---

## P0 - Fix Now (Workflow Blockers)

These bugs interrupt your daily work and should be fixed immediately.

| ID | Issue | File(s) | Impact | Effort | Fix |
|----|-------|---------|--------|--------|-----|
| BUG-001 | No Fetch Timeouts | llm.ts, github/api.ts | Requests hang forever, must refresh | 2-4h | Add AbortController with 30s timeout |
| BUG-002 | Board Refresh Bug | BoardPane.tsx | Create board → doesn't appear | 1h | Add query invalidation after mutation |
| BUG-003 | Silent Metrics Failures | metricsRecorder.ts, costTracker.ts | Cost tracking breaks silently | 2-4h | Add proper error propagation |
| BUG-004 | In-Memory State Loss | agentExecution.ts | Server restart = lose agent progress | 4-8h | Persist execution state to DB |
| BUG-005 | Card Move Race Condition | kanban/db.ts:207-251 | Fast card drags corrupt positions | 4-8h | Wrap in database transaction |
| BUG-006 | Metrics Race Condition | metricsRecorder.ts | Duplicate/lost metrics data | 2-4h | Use INSERT ON DUPLICATE KEY |
| BUG-007 | No Transaction Wrapping | kanban/db.ts:433-491 | Board creation can partially fail | 4-8h | Add transaction to multi-INSERT |
| BUG-008 | Budget Check After Cost | routers.ts | Budget exceeded before validation | 2-4h | Pre-validate before LLM call |
| BUG-009 | Duplicate Boards | Database | Test data pollution | 1-2h | Add unique constraint (userId, name) |

**Total Effort**: ~25-40 hours

---

## P1 - Soon (Performance & Reliability)

These issues make the app feel sluggish or unreliable.

| ID | Issue | File(s) | Impact | Effort | Fix |
|----|-------|---------|--------|--------|-----|
| PERF-001 | No LLM Streaming | routers.ts:143-276 | Wait 5-15s seeing nothing | 4-8h | Implement SSE streaming |
| PERF-002 | Missing DB Indexes | schema.ts | Queries slow as data grows | 2-4h | Add indexes to frequently queried columns |
| PERF-003 | N+1 Column Reorder | kanban/db.ts:111-122 | 500ms+ lag on reorder | 2-4h | Batch UPDATE with CASE statement |
| PERF-004 | Large Bundle Size | package.json | 3-5s initial load | 1-2d | Code-split Monaco, lazy-load charts |
| PERF-005 | Unbounded Queries | db.ts | Memory spikes with large history | 2-4h | Add default limits/pagination |
| REL-001 | Silent Promise Failures | Multiple services | Errors swallowed silently | 2-4h | Standardize error propagation |
| REL-002 | Inconsistent Error Handling | db.ts | Sometimes throws, sometimes returns empty | 1d | Standardize to always throw |
| CODE-001 | Giant Monolithic Files | routers.ts, schema.ts | Hard to navigate/maintain | 2-3d | Split into domain modules |
| CODE-002 | Unsafe Type Assertions | Multiple files | Runtime errors not caught | 1-2d | Replace `as any` with proper types |
| CODE-003 | Inconsistent Null Checks | db.ts | 40+ repetitive patterns | 4-8h | Extract to middleware |
| CODE-004 | Commented Dead Code | Multiple files | Clutters codebase | 2-4h | Remove or restore |

**Total Effort**: ~10-15 days

---

## P2 - Next (Features & UX)

Features that would improve your daily workflow.

### New Features

| ID | Feature | File(s) | Benefit | Effort |
|----|---------|---------|---------|--------|
| FEAT-001 | Wire MetaModeChat to Chat | Chat.tsx | Use self-modifying IDE from Chat page | 4h |
| FEAT-002 | Syntax Highlighting in Preview | ChangePreviewPanel.tsx | Better code review in change preview | 2-4h |
| FEAT-003 | Quick Switcher (Cmd+K) | App.tsx | Fast global navigation | 4-8h |
| FEAT-004 | GitHub Cloning UI | GitHubPane.tsx | Clone repos from UI instead of CLI | 1d |
| FEAT-005 | PR Review Workflow | github/router.ts | Full PR list, view, comment support | 1-2d |
| FEAT-006 | Issue Sync Bidirectional | github/router.ts | Two-way GitHub issue sync | 1d |
| FEAT-007 | Google Drive OAuth | drive/router.ts | Complete Drive integration | 4-8h |
| FEAT-008 | Kickoff Wizard E2E Test | KickoffWizard.tsx | Validate full spec-driven workflow | 4-8h |

### UX Improvements

| ID | Issue | File(s) | Benefit | Effort |
|----|-------|---------|---------|--------|
| UX-001 | Loading Skeletons | Multiple panes | Less jarring transitions | 1d |
| UX-002 | Keyboard Shortcuts | useKeyboardShortcuts.ts | Faster workflow | 4-8h |
| UX-003 | Browser Pane Error Detection | BrowserPane.tsx | Clear feedback when sites blocked | 2-4h |
| UX-004 | Pane Sync Indicator | useWorkspaceState.ts | Visual indicator for same content | 2-4h |
| UX-005 | Empty States | Multiple components | Helpful messages when no data | 4-8h |
| UX-006 | Error Messages | Multiple files | User-friendly error descriptions | 4-8h |
| UX-007 | Mobile Layout Testing | MobileWorkspace.tsx | Verify mobile experience | 1d |

### Incomplete Features (from todo.md)

| ID | Feature | Status | Effort |
|----|---------|--------|--------|
| TODO-001 | Repository cloning/import | Partial | 1d |
| TODO-002 | Pull request creation and viewing | Partial | 1-2d |
| TODO-003 | Issue tracking integration | Partial | 1d |
| TODO-004 | Agent rollback capability | Partial | 1d |
| TODO-005 | API connections management | Not started | 4-8h |
| TODO-006 | Risk assessment UI | Not started | 1d |

**Total Effort**: ~15-20 days

---

## P3 - Deferred (Multi-User Security & Scale)

These issues matter when you go multi-user or public. Track them but don't spend time now.

### Security (Defer Until Multi-User)

| ID | Issue | File(s) | Why Deferred | Effort When Needed |
|----|-------|---------|--------------|-------------------|
| SEC-001 | Command Injection RCE | gitService.ts, conflictService.ts | You won't inject commands into your own app | 4-8h |
| SEC-002 | Secrets Not Encrypted | routers.ts:852 | Only matters if DB compromised by others | 2-4h |
| SEC-003 | OAuth Tokens Unencrypted | schema.ts | Only matters if DB compromised by others | 4-8h |
| SEC-004 | No Rate Limiting | All endpoints | You won't DDoS yourself | 4-8h |
| SEC-005 | CSRF Disabled | cookies.ts:42-47 | No malicious sites targeting you | 1-2h |
| SEC-006 | Path Traversal | fileModificationService.ts | You control all inputs | 2-4h |
| SEC-007 | Weak OAuth State | sdk.ts, github/router.ts | No attacker to forge redirects | 2-4h |
| SEC-008 | Missing Authorization (IDOR) | db.ts:249-253 | All data is yours anyway | 4-8h |
| SEC-009 | JWT Token Manipulation | context.ts, cookies.ts | You're the only user | 2-4h |
| SEC-010 | Token Refresh Race | github/oauth.ts | Single user won't hit this | 2-4h |

### Infrastructure (Defer Until Scale)

| ID | Issue | File(s) | Why Deferred | Effort When Needed |
|----|-------|---------|--------------|-------------------|
| INFRA-001 | Redis for Sessions | agentExecution.ts | Single instance is fine | 1-2d |
| INFRA-002 | Connection Pooling | db.ts | Single user won't exhaust connections | 4-8h |
| INFRA-003 | Structured Logging | Multiple files | Nice-to-have for debugging | 1d |
| INFRA-004 | Monitoring Setup | New files | Overkill for single user | 1-2d |

### DevOps (Defer Until Production)

| ID | Issue | Description | Effort When Needed |
|----|-------|-------------|-------------------|
| DEVOPS-001 | Staging Environment | Preview deployments | 1-2d |
| DEVOPS-002 | CI/CD Pipeline | Automated testing/deploy | 1-2d |
| DEVOPS-003 | Canary Deployments | Safe rollouts | 1d |
| DEVOPS-004 | Auto-Rollback | Revert on error spike | 1d |

**Total Effort When Needed**: ~15-20 days

---

## P4 - Backlog (Future Enhancements)

Nice-to-have features for someday.

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| FUTURE-001 | Real-time Collaboration | WebSocket for live editing | 2-3w |
| FUTURE-002 | Offline Support | Service worker for PWA | 1-2w |
| FUTURE-003 | Export/Import | Board and project export | 3-5d |
| FUTURE-004 | Email Notifications | In-app and email alerts | 3-5d |
| FUTURE-005 | Global Search | Search across all content | 1w |
| FUTURE-006 | Usage Analytics | Analytics dashboard | 3-5d |
| FUTURE-007 | MCP Integration | Tool discovery and execution | 2-3w |
| FUTURE-008 | Drag-to-Reschedule | Timeline drag support | 2-3d |

---

## Recommended Sprint Plan

### Sprint 26: Reliability & Bug Fixes (1 week)

**Goal**: Fix the bugs that interrupt your daily workflow.

| Task | ID | Effort |
|------|-----|--------|
| Add 30s timeout to all fetch calls | BUG-001 | 2-4h |
| Fix board refresh after creation | BUG-002 | 1h |
| Fix silent metrics failures | BUG-003 | 2-4h |
| Persist agent execution state to DB | BUG-004 | 4-8h |
| Wrap card movement in transaction | BUG-005 | 4-8h |
| Use INSERT ON DUPLICATE KEY for metrics | BUG-006 | 2-4h |
| Add transaction to board creation | BUG-007 | 4-8h |
| Pre-validate budget before LLM call | BUG-008 | 2-4h |
| Add unique constraint for boards | BUG-009 | 1-2h |

**Deliverables**:
- No more hanging requests (30s timeout)
- Boards appear immediately after creation
- Agent progress survives server restarts
- No data corruption from race conditions
- Accurate budget tracking

---

### Sprint 27: Performance & Streaming (1 week)

**Goal**: Make the app feel fast and responsive.

| Task | ID | Effort |
|------|-----|--------|
| Implement LLM response streaming with SSE | PERF-001 | 4-8h |
| Add missing database indexes | PERF-002 | 2-4h |
| Fix N+1 query with batch UPDATE | PERF-003 | 2-4h |
| Code-split Monaco editor (lazy load) | PERF-004 | 4-8h |
| Lazy-load charts and heavy components | PERF-004 | 4-8h |
| Add default limits to unbounded queries | PERF-005 | 2-4h |
| Add loading skeletons to pane transitions | UX-001 | 4-8h |

**Deliverables**:
- LLM responses stream in real-time
- Initial load < 2s (down from 3-5s)
- Faster queries with proper indexes
- Smooth transitions with skeletons

---

### Sprint 28: Features & Polish (1 week)

**Goal**: Add features that improve your daily workflow.

| Task | ID | Effort |
|------|-----|--------|
| Wire MetaModeChat toggle to Chat page | FEAT-001 | 4h |
| Add syntax highlighting to ChangePreviewPanel | FEAT-002 | 2-4h |
| Implement Cmd+K quick switcher | FEAT-003 | 4-8h |
| Complete keyboard shortcuts | UX-002 | 4-8h |
| GitHub cloning UI integration | FEAT-004 | 6-8h |
| Basic PR review workflow | FEAT-005 | 8h |

**Deliverables**:
- Self-modifying IDE accessible from Chat
- Better code preview with syntax highlighting
- Quick navigation with Cmd+K
- Full keyboard navigation
- Clone repos from UI
- View and comment on PRs

---

## What You Get After 3 Sprints

| Before | After |
|--------|-------|
| Requests hang forever | 30s timeout with clear feedback |
| New boards don't appear | Instant refresh after creation |
| Agent progress lost on restart | Persisted to database |
| Race conditions corrupt data | Transactions prevent corruption |
| Wait 5-15s for LLM response | Streaming starts immediately |
| 3-5s initial load | < 2s with code splitting |
| No quick navigation | Cmd+K global switcher |
| Self-modifying IDE hidden | Toggle in Chat page |
| Manual GitHub cloning | Clone from UI |
| No PR support | View and comment on PRs |

---

## Code Quality: Incremental Improvement

Instead of a dedicated refactoring sprint, improve code as you touch files:

| When You're In... | Also Do... |
|-------------------|------------|
| routers.ts | Extract related routes to separate files |
| schema.ts | Move tables to domain-specific files |
| Any file with `as any` | Add proper types |
| Any file > 500 lines | Split into modules |
| Any file with commented code | Remove or restore it |

---

## Trigger Points for P3 Issues

Move P3 (deferred) issues to active when:

| Trigger | Issues to Activate |
|---------|-------------------|
| Adding second user | SEC-001 through SEC-010 (all security) |
| Public beta launch | SEC-*, INFRA-001, INFRA-004 |
| 10+ concurrent users | INFRA-002 (connection pooling) |
| Multi-instance deploy | INFRA-001 (Redis sessions) |
| Production launch | DEVOPS-001 through DEVOPS-004 |

---

## Success Metrics

### Sprint 26 (Reliability)
- [ ] Zero hanging requests (all have 30s timeout)
- [ ] Board creation shows immediately
- [ ] Agent state persists across restarts
- [ ] No race condition data corruption
- [ ] Budget tracking accurate

### Sprint 27 (Performance)
- [ ] LLM responses start streaming within 500ms
- [ ] Initial page load < 2s
- [ ] Query response time < 100ms for indexed queries
- [ ] Bundle size < 500KB gzipped

### Sprint 28 (Features)
- [ ] MetaModeChat accessible from Chat page
- [ ] Cmd+K switcher functional
- [ ] GitHub clone from UI works
- [ ] PR list and view functional
- [ ] All keyboard shortcuts working

---

## References

1. Risk Assessment Report - `/docs/RISK_ASSESSMENT_REPORT.md`
2. System QA Handoff - `/docs/SYSTEM_QA_HANDOFF.md`
3. QA Report - `/docs/QA_REPORT.md`
4. System Architecture - `/docs/SYSTEM_ARCHITECTURE.md`

---

*Master roadmap for Hero IDE. Single-user context with multi-user issues tracked for future activation. Generated December 22, 2025.*
