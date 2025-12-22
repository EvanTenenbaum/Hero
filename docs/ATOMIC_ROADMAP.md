# Hero IDE - Atomic Roadmap

**Last Updated**: December 22, 2025  
**Current Version**: 1.0.0-beta  
**Tests Passing**: 953  
**Sprints Completed**: 26, 27, 28, 29, 30, 31

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 1,130 |
| **Completed** | 786 (70%) |
| **Remaining** | 344 (30%) |
| **Estimated Effort** | 15-20 sprints |

### Remaining Tasks by Category

| Category | Count | Priority |
|----------|-------|----------|
| QA/Testing Checklists | 131 | P2-P3 |
| Infrastructure/DevOps | 45 | P3-P4 |
| Feature Completion | 40 | P1-P2 |
| Code Quality | 25 | P2 |
| Documentation | 20 | P2 |
| UX Polish | 15 | P2 |
| Security (Multi-user) | 22 | P3 |
| Future Enhancements | 46 | P4 |

---

## Sprint Structure

Each sprint is 1 week (5 working days) with:
- **Goal**: Clear objective
- **Tasks**: Atomic, testable items
- **Deliverables**: Measurable outcomes
- **QA**: Test requirements

---

## Phase 1: Core Functionality (Sprints 32-35)

### Sprint 32: Agent Execution Polish
**Goal**: Make agent execution production-ready

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 32.1.1 | Wire ExecutionMonitor to AgentPane | 4h | P1 |
| 32.1.2 | Add execution progress persistence | 4h | P1 |
| 32.1.3 | Implement execution replay from history | 8h | P1 |
| 32.1.4 | Add execution cancellation with cleanup | 4h | P1 |
| 32.2.1 | Test pause/resume execution flow | 2h | P1 |
| 32.2.2 | Test rollback mechanism end-to-end | 4h | P1 |
| 32.2.3 | Test execution history retrieval | 2h | P1 |
| 32.3.1 | Write vitest for execution streaming | 4h | P1 |
| 32.3.2 | Write vitest for rollback service | 4h | P1 |

**Deliverables**: Fully functional agent execution with monitoring, history, and rollback

---

### Sprint 33: Chat & LLM Streaming
**Goal**: Real-time streaming chat experience

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 33.1.1 | Wire invokeLLMStream to Chat page | 4h | P1 |
| 33.1.2 | Display tokens as they arrive | 4h | P1 |
| 33.1.3 | Add streaming error recovery | 4h | P1 |
| 33.1.4 | Implement stream cancellation | 2h | P1 |
| 33.2.1 | Add typing indicator animation | 2h | P2 |
| 33.2.2 | Add code block syntax highlighting | 4h | P2 |
| 33.2.3 | Add message copy button | 2h | P2 |
| 33.3.1 | Test streaming with long responses | 2h | P1 |
| 33.3.2 | Test streaming interruption | 2h | P1 |
| 33.3.3 | Write vitest for chat streaming | 4h | P1 |

**Deliverables**: Real-time streaming chat with syntax highlighting

---

### Sprint 34: GitHub Deep Integration
**Goal**: Complete GitHub workflow from Hero IDE

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 34.1.1 | Test PRDetailPanel with real PR | 2h | P1 |
| 34.1.2 | Add inline diff comments | 8h | P2 |
| 34.1.3 | Add PR approval workflow | 4h | P2 |
| 34.1.4 | Add PR merge confirmation | 2h | P2 |
| 34.2.1 | Add commit UI with message input | 4h | P2 |
| 34.2.2 | Add branch creation dialog | 4h | P2 |
| 34.2.3 | Add branch switching in GitHubPane | 4h | P2 |
| 34.2.4 | Show uncommitted changes indicator | 4h | P2 |
| 34.3.1 | Test full PR review workflow | 4h | P1 |
| 34.3.2 | Write vitest for GitHub operations | 4h | P1 |

**Deliverables**: Full PR review and git workflow from UI

---

### Sprint 35: Kanban & Views Polish
**Goal**: Complete all Kanban view functionality

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 35.1.1 | Test Timeline view week zoom | 2h | P2 |
| 35.1.2 | Test Timeline view month zoom | 2h | P2 |
| 35.1.3 | Test Timeline view quarter zoom | 2h | P2 |
| 35.1.4 | Test card bar positioning | 2h | P2 |
| 35.2.1 | Test Calendar month navigation | 2h | P2 |
| 35.2.2 | Test Calendar week view | 2h | P2 |
| 35.2.3 | Test card rendering on dates | 2h | P2 |
| 35.3.1 | Add drag-to-reschedule in Timeline | 8h | P3 |
| 35.3.2 | Add click-to-create in Calendar | 4h | P3 |
| 35.3.3 | Add drag-to-move in Calendar | 4h | P3 |
| 35.4.1 | Write vitest for view components | 4h | P2 |

**Deliverables**: All Kanban views fully functional and tested

---

## Phase 2: Quality & Testing (Sprints 36-38)

### Sprint 36: Comprehensive QA - Part 1
**Goal**: Complete authentication and project management testing

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 36.1.1 | Test login flow with valid credentials | 2h | P2 |
| 36.1.2 | Test protected routes without auth | 2h | P2 |
| 36.1.3 | Test role-based access control | 2h | P2 |
| 36.1.4 | Test session hijacking prevention | 2h | P2 |
| 36.1.5 | Test logout and session invalidation | 2h | P2 |
| 36.2.1 | Test board creation edge cases | 2h | P2 |
| 36.2.2 | Test card CRUD operations | 2h | P2 |
| 36.2.3 | Test drag-and-drop card movement | 2h | P2 |
| 36.2.4 | Test column management | 2h | P2 |
| 36.3.1 | Write vitest for auth flows | 4h | P2 |
| 36.3.2 | Write vitest for board operations | 4h | P2 |

**Deliverables**: Auth and project management fully tested

---

### Sprint 37: Comprehensive QA - Part 2
**Goal**: Complete AI and GitHub testing

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 37.1.1 | Test Dev Agent chat | 2h | P2 |
| 37.1.2 | Test QA Agent chat | 2h | P2 |
| 37.1.3 | Test DevOps Agent chat | 2h | P2 |
| 37.1.4 | Test Research Agent chat | 2h | P2 |
| 37.1.5 | Test agent execution loop | 4h | P2 |
| 37.2.1 | Test GitHub OAuth connection | 2h | P2 |
| 37.2.2 | Test repository listing | 2h | P2 |
| 37.2.3 | Test file tree navigation | 2h | P2 |
| 37.2.4 | Test file content viewing | 2h | P2 |
| 37.2.5 | Test PR operations | 4h | P2 |
| 37.3.1 | Write vitest for agent operations | 4h | P2 |
| 37.3.2 | Write vitest for GitHub integration | 4h | P2 |

**Deliverables**: AI agents and GitHub integration fully tested

---

### Sprint 38: Security & Performance Audit
**Goal**: Complete security and performance testing

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 38.1.1 | SQL injection audit | 4h | P2 |
| 38.1.2 | XSS vulnerability audit | 4h | P2 |
| 38.1.3 | CSRF protection audit | 2h | P2 |
| 38.1.4 | Authorization (IDOR) audit | 4h | P2 |
| 38.2.1 | Load time benchmarking | 2h | P2 |
| 38.2.2 | Memory usage profiling | 2h | P2 |
| 38.2.3 | Database query analysis | 4h | P2 |
| 38.3.1 | WCAG accessibility audit | 4h | P2 |
| 38.3.2 | Keyboard navigation testing | 2h | P2 |
| 38.3.3 | Screen reader testing | 2h | P2 |
| 38.4.1 | Fix all identified issues | 8h | P1 |

**Deliverables**: Security, performance, and accessibility audits complete

---

## Phase 3: Code Quality (Sprints 39-40)

### Sprint 39: Code Cleanup
**Goal**: Remove technical debt and improve maintainability

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 39.1.1 | Remove duplicate/obsolete code | 4h | P2 |
| 39.1.2 | Consolidate redundant router endpoints | 4h | P2 |
| 39.1.3 | Clean up unused database tables | 2h | P2 |
| 39.1.4 | Remove deprecated components | 4h | P2 |
| 39.2.1 | Split routers.ts into domain modules | 8h | P2 |
| 39.2.2 | Split schema.ts into domain modules | 4h | P2 |
| 39.2.3 | Extract common patterns to utilities | 4h | P2 |
| 39.3.1 | Replace `as any` with proper types | 8h | P2 |
| 39.3.2 | Standardize error handling | 4h | P2 |
| 39.3.3 | Remove commented dead code | 2h | P2 |

**Deliverables**: Cleaner, more maintainable codebase

---

### Sprint 40: Documentation
**Goal**: Complete all documentation

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 40.1.1 | Update README.md with current features | 4h | P2 |
| 40.1.2 | Create comprehensive user guide | 8h | P2 |
| 40.1.3 | Create API documentation | 8h | P2 |
| 40.1.4 | Create deployment guide | 4h | P2 |
| 40.2.1 | Document all tRPC procedures | 4h | P2 |
| 40.2.2 | Document database schema | 4h | P2 |
| 40.2.3 | Document environment variables | 2h | P2 |
| 40.3.1 | Create architecture diagrams | 4h | P2 |
| 40.3.2 | Create data flow diagrams | 4h | P2 |
| 40.3.3 | Create component hierarchy docs | 4h | P2 |

**Deliverables**: Complete documentation suite

---

## Phase 4: UX Polish (Sprints 41-42)

### Sprint 41: UI/UX Improvements
**Goal**: Polish the user experience

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 41.1.1 | Add loading skeletons to all panes | 8h | P2 |
| 41.1.2 | Add empty states to all lists | 4h | P2 |
| 41.1.3 | Improve error messages | 4h | P2 |
| 41.1.4 | Add success/error toasts consistently | 4h | P2 |
| 41.2.1 | Add more keyboard shortcuts | 4h | P2 |
| 41.2.2 | Improve shortcuts help modal | 2h | P2 |
| 41.2.3 | Add focus management | 4h | P2 |
| 41.3.1 | Test mobile layout | 4h | P2 |
| 41.3.2 | Fix mobile responsiveness issues | 8h | P2 |
| 41.3.3 | Test touch interactions | 4h | P2 |

**Deliverables**: Polished, accessible UI

---

### Sprint 42: Onboarding & Help
**Goal**: Create onboarding experience

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 42.1.1 | Create onboarding flow for new users | 8h | P2 |
| 42.1.2 | Add feature discovery tooltips | 4h | P2 |
| 42.1.3 | Create welcome modal | 4h | P2 |
| 42.2.1 | Add contextual help buttons | 4h | P2 |
| 42.2.2 | Create help documentation pages | 8h | P2 |
| 42.2.3 | Add FAQ section | 4h | P2 |
| 42.3.1 | Create video tutorials (scripts) | 8h | P3 |
| 42.3.2 | Add interactive walkthrough | 8h | P3 |

**Deliverables**: Complete onboarding and help system

---

## Phase 5: Infrastructure (Sprints 43-45) - P3 Deferred

### Sprint 43: Multi-User Security
**Goal**: Prepare for multi-user deployment

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 43.1.1 | Add command injection protection | 4h | P3 |
| 43.1.2 | Encrypt secrets at rest | 4h | P3 |
| 43.1.3 | Encrypt OAuth tokens | 4h | P3 |
| 43.1.4 | Add rate limiting | 4h | P3 |
| 43.1.5 | Enable CSRF protection | 2h | P3 |
| 43.1.6 | Add path traversal protection | 4h | P3 |
| 43.2.1 | Strengthen OAuth state validation | 4h | P3 |
| 43.2.2 | Add authorization checks (IDOR) | 8h | P3 |
| 43.2.3 | Secure JWT handling | 4h | P3 |
| 43.2.4 | Fix token refresh race | 4h | P3 |

**Deliverables**: Production-ready security

---

### Sprint 44: Infrastructure & DevOps
**Goal**: Production infrastructure setup

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 44.1.1 | Set up Redis for sessions | 8h | P3 |
| 44.1.2 | Configure connection pooling | 4h | P3 |
| 44.1.3 | Set up structured logging | 8h | P3 |
| 44.1.4 | Set up monitoring (Sentry/Datadog) | 8h | P3 |
| 44.2.1 | Create CI/CD pipeline | 8h | P3 |
| 44.2.2 | Set up preview deployments | 4h | P3 |
| 44.2.3 | Configure canary deployments | 4h | P3 |
| 44.2.4 | Set up auto-rollback | 4h | P3 |

**Deliverables**: Production-ready infrastructure

---

### Sprint 45: Provider Abstraction
**Goal**: Make infrastructure swappable

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 45.1.1 | Design provider abstraction interfaces | 8h | P3 |
| 45.1.2 | Create provider configuration schema | 4h | P3 |
| 45.1.3 | Implement provider adapter pattern | 8h | P3 |
| 45.2.1 | Create compute provider adapters | 8h | P3 |
| 45.2.2 | Create database provider adapters | 8h | P3 |
| 45.2.3 | Create storage provider adapters | 4h | P3 |
| 45.2.4 | Create LLM provider adapters | 4h | P3 |
| 45.3.1 | Document provider comparison matrix | 4h | P3 |
| 45.3.2 | Create migration playbook | 4h | P3 |

**Deliverables**: Swappable infrastructure providers

---

## Phase 6: Future Enhancements (Sprints 46+) - P4 Backlog

### Sprint 46: MCP Integration
**Goal**: Add Model Context Protocol support

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 46.1.1 | MCP server connection management | 8h | P4 |
| 46.1.2 | Tool discovery and registration | 8h | P4 |
| 46.1.3 | Tool execution from agents | 8h | P4 |
| 46.1.4 | MCP configuration UI | 8h | P4 |

---

### Sprint 47: Advanced Features
**Goal**: Add advanced capabilities

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| 47.1.1 | Real-time collaboration (WebSocket) | 40h | P4 |
| 47.1.2 | Offline support (Service Worker) | 24h | P4 |
| 47.1.3 | Export/Import functionality | 16h | P4 |
| 47.1.4 | Email notifications | 16h | P4 |
| 47.1.5 | Global search | 24h | P4 |

---

## Summary

### Immediate Priority (Sprints 32-35)
- Agent execution polish
- Chat streaming
- GitHub deep integration
- Kanban views completion

### Medium Priority (Sprints 36-42)
- Comprehensive QA
- Code cleanup
- Documentation
- UX polish

### Deferred (Sprints 43-45)
- Multi-user security
- Infrastructure
- Provider abstraction

### Backlog (Sprints 46+)
- MCP integration
- Advanced features

---

## Effort Estimates

| Phase | Sprints | Weeks | Tasks |
|-------|---------|-------|-------|
| Core Functionality | 32-35 | 4 | 40 |
| Quality & Testing | 36-38 | 3 | 35 |
| Code Quality | 39-40 | 2 | 20 |
| UX Polish | 41-42 | 2 | 20 |
| Infrastructure | 43-45 | 3 | 30 |
| Future | 46+ | 2+ | 10+ |

**Total**: ~16 sprints (~4 months) for P1-P2 items

---

## Quick Reference

### What to Work On Now (P1)
1. Sprint 32: Agent Execution Polish
2. Sprint 33: Chat & LLM Streaming
3. Sprint 34: GitHub Deep Integration

### What to Work On Soon (P2)
4. Sprint 35: Kanban Views Polish
5. Sprints 36-38: Comprehensive QA
6. Sprints 39-40: Code Quality & Docs
7. Sprints 41-42: UX Polish

### What to Defer (P3-P4)
8. Sprints 43-45: Multi-user Security & Infrastructure
9. Sprints 46+: MCP & Advanced Features
