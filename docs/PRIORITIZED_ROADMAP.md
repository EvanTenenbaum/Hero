# Hero IDE - Prioritized Roadmap

**Last Updated**: December 22, 2025  
**Version**: 1.0.0-beta  
**Status**: Production Risk Assessment Complete

---

## Executive Summary

This roadmap consolidates all identified issues from the Risk Assessment Report, System QA Handoff document, and existing todo.md into a prioritized action plan. The application has **16 critical issues**, **24 high-priority issues**, and **17 medium-priority issues** that need to be addressed before safe production deployment.

### Current State

| Metric | Value |
|--------|-------|
| Tests Passing | 794 |
| Test Files | 28 |
| Database Tables | 52 |
| API Endpoints | 100+ |
| Critical Issues | 16 |
| High Issues | 24 |
| Medium Issues | 17 |
| Low Issues | 8 |

---

## Priority Tier System

| Tier | Criteria | Timeline |
|------|----------|----------|
| **P0 - CRITICAL** | Security vulnerabilities, data loss risk, production blockers | Must fix before any production use |
| **P1 - HIGH** | Race conditions, reliability issues, performance blockers | Fix within 2 weeks |
| **P2 - MEDIUM** | Code quality, maintainability, UX improvements | Fix within 1 month |
| **P3 - LOW** | Nice-to-have, future enhancements | Backlog |

---

## P0 - CRITICAL Issues (Must Fix Before Production)

### Security Vulnerabilities

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| SEC-001 | Command Injection RCE | gitService.ts, conflictService.ts, fileModificationService.ts | 4-8h | User input passed directly to shell commands via execAsync() |
| SEC-002 | Secrets Not Encrypted | routers.ts:852 | 2-4h | Secrets stored as base64 (not encryption) |
| SEC-003 | OAuth Tokens Unencrypted | schema.ts, github/oauth.ts | 4-8h | GitHub/Google tokens stored in plaintext |
| SEC-004 | No Rate Limiting | All endpoints | 4-8h | Zero rate limiting on any endpoint including LLM calls |
| SEC-005 | CSRF Disabled | cookies.ts:42-47 | 1-2h | sameSite: "none" disables CSRF protection |

### Data Integrity

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| DATA-001 | Card Move Race Condition | kanban/db.ts:207-251 | 4-8h | Three separate DB updates without transaction |
| DATA-002 | Metrics Race Condition | metricsRecorder.ts, costTracker.ts | 2-4h | Check-then-act pattern causes duplicates/lost data |
| DATA-003 | No Transaction Wrapping | kanban/db.ts:433-491 | 4-8h | Board creation has 15+ INSERTs without transaction |
| DATA-004 | Budget Check After Cost | routers.ts | 2-4h | Budget validation happens after LLM cost incurred |

### Performance Blockers

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| PERF-001 | Missing Database Indexes | schema.ts | 2-4h | Critical indexes missing on frequently queried columns |
| PERF-002 | N+1 Query in Column Reorder | kanban/db.ts:111-122 | 2-4h | One DB query per column during reorder |

---

## P1 - HIGH Issues (Fix Within 2 Weeks)

### Security

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| SEC-006 | Path Traversal | fileModificationService.ts:45-70 | 2-4h | No validation that file path stays within PROJECT_ROOT |
| SEC-007 | Weak OAuth State | sdk.ts:41-44, github/router.ts | 2-4h | OAuth state uses base64 without HMAC verification |
| SEC-008 | Missing Authorization (IDOR) | db.ts:249-253 | 4-8h | Some operations don't verify resource ownership |
| SEC-009 | JWT Token Manipulation | context.ts, cookies.ts | 2-4h | Need to verify JWT tampering detection |
| SEC-010 | Token Refresh Race | github/oauth.ts | 2-4h | Concurrent token refresh can cause issues |

### Reliability

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| REL-001 | Silent Promise Failures | metricsRecorder.ts, costTracker.ts | 2-4h | Errors caught and logged but callers get no notification |
| REL-002 | No Fetch Timeouts | llm.ts, github/api.ts | 2-4h | All fetch() calls have no timeout |
| REL-003 | In-Memory State Loss | agentExecution.ts | 1-2d | Server restart loses all active executions |
| REL-004 | Board Refresh Bug | BoardPane.tsx | 1-2h | New board not shown after creation |
| REL-005 | Duplicate Boards | Database | 1-2h | Test data pollution, need unique constraint |

### Performance

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| PERF-003 | No LLM Streaming | routers.ts:143-276 | 4-8h | User waits 5-15s seeing nothing |
| PERF-004 | Unbounded List Queries | db.ts | 2-4h | No pagination on large lists |
| PERF-005 | Large Bundle Size | package.json | 2-3d | ~700KB gzipped, 3-5s load on mobile |

### Code Quality

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| CODE-001 | Giant Monolithic Files | routers.ts (1485 lines), schema.ts (1793 lines) | 2-3d | Hard to navigate, test, maintain |
| CODE-002 | Unsafe Type Assertions | Multiple files | 1-2d | 15+ instances of `as any` |
| CODE-003 | Inconsistent Error Handling | db.ts | 1d | Sometimes throws, sometimes returns empty |

---

## P2 - MEDIUM Issues (Fix Within 1 Month)

### Features

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| FEAT-001 | Wire MetaModeChat to Chat | Chat.tsx | 4-8h | Add toggle for self-modifying IDE feature |
| FEAT-002 | Kickoff Wizard E2E Test | KickoffWizard.tsx | 4-8h | Validate full spec-driven workflow |
| FEAT-003 | Syntax Highlighting in Preview | ChangePreviewPanel.tsx | 2-4h | Better code readability in change preview |
| FEAT-004 | GitHub Cloning UI | GitHubPane.tsx | 1d | Complete cloning integration |
| FEAT-005 | PR Review Workflow | github/router.ts | 1-2d | Full PR review workflow |
| FEAT-006 | Issue Sync Bidirectional | github/router.ts | 1d | Two-way GitHub issue sync |
| FEAT-007 | Google Drive OAuth | drive/router.ts | 4-8h | Complete Drive integration |
| FEAT-008 | Quick Switcher (Cmd+K) | App.tsx | 4-8h | Global search/navigation |

### UX Improvements

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| UX-001 | Browser Pane Error Detection | BrowserPane.tsx | 2-4h | Timeout-based detection for blocked sites |
| UX-002 | Loading Skeletons | Multiple panes | 1d | Add skeleton loaders for transitions |
| UX-003 | Pane Sync Indicator | useWorkspaceState.ts | 2-4h | Visual indicator for same content in panes |
| UX-004 | Keyboard Shortcuts Testing | useKeyboardShortcuts.ts | 4-8h | Complete shortcut implementation |
| UX-005 | Mobile Layout Testing | MobileWorkspace.tsx | 1d | Manual QA on devices |
| UX-006 | Empty States | Multiple components | 4-8h | Helpful empty state messages |
| UX-007 | Error Messages | Multiple files | 4-8h | User-friendly error descriptions |

### Infrastructure

| ID | Issue | File(s) | Effort | Description |
|----|-------|---------|--------|-------------|
| INFRA-001 | Redis for Sessions | agentExecution.ts | 1-2d | Migrate in-memory state to Redis |
| INFRA-002 | Connection Pooling | db.ts | 4-8h | Configure MySQL connection pool |
| INFRA-003 | Structured Logging | Multiple files | 1d | Consistent logging with levels |
| INFRA-004 | Monitoring Setup | New files | 1-2d | Error tracking (Sentry) |

---

## P3 - LOW Issues (Backlog)

| ID | Issue | Description | Effort |
|----|-------|-------------|--------|
| LOW-001 | Real-time Collaboration | WebSocket for live editing | 2-3w |
| LOW-002 | Offline Support | Service worker for PWA | 1-2w |
| LOW-003 | Export/Import | Board and project export | 3-5d |
| LOW-004 | Email Notifications | In-app and email alerts | 3-5d |
| LOW-005 | Global Search | Search across all content | 1w |
| LOW-006 | Usage Analytics | Analytics dashboard | 3-5d |
| LOW-007 | MCP Integration | Tool discovery and execution | 2-3w |
| LOW-008 | Drag-to-Reschedule | Timeline drag support | 2-3d |

---

## Existing Incomplete Items (From todo.md)

### Phase 4: GitHub Integration
- [ ] Repository cloning/import
- [ ] Pull request creation and viewing
- [ ] Issue tracking integration

### Phase 6: Agent System
- [ ] Rollback capability (full implementation)

### Phase 7: Settings Management
- [ ] API connections management
- [ ] MCP server configuration

### Phase 8: Governance System
- [ ] Risk assessment UI

### Sprint 27: DevOps & Infrastructure
- [ ] All items (deployment strategy, CI/CD, provider research)

### Sprint 28: QA Protocol Development
- [ ] All items (test framework, Red Team protocol, self-healing QA)

---

## Recommended Sprint Plan

### Sprint 26: Security Hardening (CRITICAL - 1 week)

**Goal**: Fix all P0 security vulnerabilities to make the application safe for production.

| Task | ID | Effort | Owner |
|------|-----|--------|-------|
| Fix command injection in git/conflict services | SEC-001 | 4-8h | Backend |
| Implement AES-256-GCM encryption for secrets | SEC-002 | 2-4h | Backend |
| Encrypt OAuth tokens at rest | SEC-003 | 4-8h | Backend |
| Add express-rate-limit middleware | SEC-004 | 4-8h | Backend |
| Change sameSite to "lax" for CSRF protection | SEC-005 | 1-2h | Backend |
| Add path traversal validation | SEC-006 | 2-4h | Backend |
| Add HMAC to OAuth state | SEC-007 | 2-4h | Backend |
| Write security tests | - | 4-8h | QA |

**Deliverables**: 
- All command execution uses spawn with array args
- Secrets encrypted with AES-256-GCM
- Rate limiting on all endpoints (100/min default, 10/min for LLM)
- CSRF protection enabled
- Security test suite (50+ tests)

---

### Sprint 27: Data Integrity & Reliability (HIGH - 1 week)

**Goal**: Fix race conditions and ensure data integrity under concurrent use.

| Task | ID | Effort | Owner |
|------|-----|--------|-------|
| Wrap card movement in transaction | DATA-001 | 4-8h | Backend |
| Use INSERT ON DUPLICATE KEY for metrics | DATA-002 | 2-4h | Backend |
| Add transaction to board creation | DATA-003 | 4-8h | Backend |
| Pre-validate budget before LLM call | DATA-004 | 2-4h | Backend |
| Add missing database indexes | PERF-001 | 2-4h | Backend |
| Fix N+1 query with batch update | PERF-002 | 2-4h | Backend |
| Add fetch timeouts (30s) | REL-002 | 2-4h | Backend |
| Fix board refresh after creation | REL-004 | 1-2h | Frontend |
| Add unique constraint for boards | REL-005 | 1-2h | Backend |
| Write concurrency tests | - | 4-8h | QA |

**Deliverables**:
- All multi-step operations wrapped in transactions
- Database indexes on all frequently queried columns
- Fetch timeouts on all external calls
- Concurrency test suite (30+ tests)

---

### Sprint 28: Performance & Code Quality (HIGH - 1 week)

**Goal**: Improve performance and code maintainability.

| Task | ID | Effort | Owner |
|------|-----|--------|-------|
| Implement LLM response streaming | PERF-003 | 4-8h | Backend |
| Add pagination to list queries | PERF-004 | 2-4h | Backend |
| Code-split Monaco editor | PERF-005 | 4-8h | Frontend |
| Lazy-load charts and heavy components | PERF-005 | 4-8h | Frontend |
| Split routers.ts into modules | CODE-001 | 4-8h | Backend |
| Split schema.ts into domain files | CODE-001 | 4-8h | Backend |
| Replace `as any` with proper types | CODE-002 | 4-8h | Backend |
| Standardize error handling | CODE-003 | 4-8h | Backend |
| Add loading skeletons | UX-002 | 4-8h | Frontend |
| Performance benchmarks | - | 2-4h | QA |

**Deliverables**:
- LLM responses stream to UI in real-time
- Initial bundle size < 500KB gzipped
- Router files < 300 lines each
- Schema split into 5+ domain files
- Performance test suite

---

## Success Metrics

### Sprint 26 (Security)
- [ ] Zero critical security vulnerabilities
- [ ] All secrets encrypted at rest
- [ ] Rate limiting active on all endpoints
- [ ] CSRF protection enabled
- [ ] Security audit passes

### Sprint 27 (Reliability)
- [ ] Zero race conditions under concurrent load
- [ ] All database operations use transactions where needed
- [ ] Query performance < 100ms for indexed queries
- [ ] No data loss during concurrent operations

### Sprint 28 (Performance)
- [ ] Initial page load < 2s on 3G
- [ ] LLM responses start streaming within 500ms
- [ ] Bundle size < 500KB gzipped
- [ ] All files < 500 lines

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Command injection exploit | High | Critical | Sprint 26 priority |
| Data corruption from races | High | High | Sprint 27 priority |
| Cost exhaustion attack | Medium | High | Rate limiting in Sprint 26 |
| Performance degradation | Medium | Medium | Sprint 28 optimization |
| Token theft from DB dump | Medium | Critical | Encryption in Sprint 26 |

---

## Dependencies

```
Sprint 26 (Security) ──┬──> Sprint 27 (Reliability)
                       │
                       └──> Sprint 28 (Performance)
```

Sprint 26 must complete before any production deployment. Sprints 27 and 28 can run in parallel after Sprint 26.

---

## References

1. Risk Assessment Report - `/docs/RISK_ASSESSMENT_REPORT.md`
2. System QA Handoff - `/docs/SYSTEM_QA_HANDOFF.md`
3. QA Report - `/docs/QA_REPORT.md`
4. System Architecture - `/docs/SYSTEM_ARCHITECTURE.md`

---

*Roadmap generated by Manus AI. Last updated: December 22, 2025.*
