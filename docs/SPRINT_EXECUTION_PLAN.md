# Hero IDE Sprint Execution Plan

**Version:** 1.0  
**Author:** Manus AI  
**Date:** December 20, 2025

---

## Executive Summary

This document reorganizes the Hero IDE Beta Roadmap into strategic 2-week sprints optimized for parallel execution and incremental delivery. Each sprint concludes with a Red Team QA phase for self-healing before proceeding to the next sprint.

**Total Sprints:** 9  
**Sprint Duration:** 2 weeks each  
**QA Protocol:** Red Team audit at end of each sprint  
**Total Timeline:** 18 weeks

---

## Sprint Strategy

The sprints are organized to maximize value delivery while respecting dependencies. Features that can run in parallel are grouped together to optimize development velocity.

| Sprint | Focus Area | Key Deliverables | Dependencies |
|--------|------------|------------------|--------------|
| 1 | Context Engine Foundation | Codebase indexing, file watcher, chunking | None |
| 2 | Context Engine Search | Keyword + semantic search, ranking | Sprint 1 |
| 3 | Prompt-to-Plan: Specify & Design | Specs, requirements, designs | Sprint 2 (partial) |
| 4 | Prompt-to-Plan: Tasks & Implement | Task breakdown, Kanban integration | Sprint 3 |
| 5 | GitHub Integration | Repository management, PRs, issues | None |
| 6 | Agent Orchestration | PM orchestration, dependencies | Sprint 4 |
| 7 | Sprint Planning + Cost Management | Velocity, burndown, budgets | Sprint 6 |
| 8 | Editor + UX Design System | AI suggestions, calm design | Sprint 2 |
| 9 | Polish & Beta Preparation | Documentation, QA, release | All |

---

## Sprint 1: Context Engine Foundation (Weeks 1-2)

**Goal:** Build the foundation for codebase understanding with file watching and semantic chunking.

### Tasks

| ID | Task | Description | Effort | Owner |
|----|------|-------------|--------|-------|
| 1.1.1 | `context_chunks` schema | Create database table for code chunks | 2h | Backend |
| 1.1.2 | `context_queries` schema | Create table for query history | 1h | Backend |
| 1.1.3 | File watcher service | Monitor file changes in repositories | 4h | Backend |
| 1.1.4 | TypeScript chunker | Semantic chunking for TS files | 8h | Backend |
| 1.1.5 | React/JSX chunker | Semantic chunking for React components | 6h | Backend |
| 1.1.6 | Chunk storage service | Store and retrieve chunks from DB | 4h | Backend |
| 1.1.7 | Indexing tRPC procedures | API endpoints for indexing operations | 4h | Backend |
| 1.1.8 | Indexing status UI | Show indexing progress to users | 4h | Frontend |
| 1.1.9 | Unit tests | Test chunking and storage | 4h | QA |

**Total Effort:** 37 hours

### Acceptance Criteria

- [ ] File watcher detects changes within 1 second
- [ ] TypeScript files are chunked by function/class/interface
- [ ] React components are chunked preserving JSX structure
- [ ] Chunks are stored with metadata (file path, line numbers, type)
- [ ] UI shows real-time indexing progress
- [ ] All unit tests pass

### Red Team QA Checklist

- [ ] Test with large codebase (10K+ lines)
- [ ] Test with malformed TypeScript files
- [ ] Test file watcher with rapid file changes
- [ ] Verify no memory leaks during indexing
- [ ] Check database query performance

---

## Sprint 2: Context Engine Search (Weeks 3-4)

**Goal:** Enable intelligent code search with keyword and semantic capabilities.

### Tasks

| ID | Task | Description | Effort | Owner |
|----|------|-------------|--------|-------|
| 1.2.1 | Trigram search | Implement keyword search with trigrams | 6h | Backend |
| 1.2.2 | Search ranking | Rank results by relevance | 4h | Backend |
| 1.2.3 | Search API | tRPC endpoints for search | 2h | Backend |
| 1.2.4 | Search UI | Search interface component | 4h | Frontend |
| 1.2.5 | Search tests | Unit tests for search | 3h | QA |
| 1.3.1 | Embedding integration | Connect to Gemini embedding API | 4h | Backend |
| 1.3.2 | Vector storage | Store embeddings efficiently | 6h | Backend |
| 1.3.3 | Similarity search | Find semantically similar code | 6h | Backend |
| 1.3.4 | Hybrid search | Combine keyword + semantic | 4h | Backend |
| 1.3.5 | Token budget | Manage context window limits | 4h | Backend |
| 1.3.6 | Semantic tests | Unit tests for semantic search | 4h | QA |
| 1.4.1 | Relevance scoring | Score results for ranking | 8h | Backend |
| 1.4.2 | Knapsack selection | Optimize context selection | 4h | Backend |
| 1.4.3 | File type weighting | Weight by file importance | 3h | Backend |
| 1.4.4 | Incremental updates | Update index on file changes | 4h | Backend |
| 1.4.5 | Integration tests | End-to-end search tests | 4h | QA |

**Total Effort:** 70 hours

### Acceptance Criteria

- [ ] Keyword search returns results in < 100ms
- [ ] Semantic search finds conceptually similar code
- [ ] Hybrid search combines both approaches effectively
- [ ] Token budget prevents context overflow
- [ ] Incremental updates work without full re-index
- [ ] All tests pass

### Red Team QA Checklist

- [ ] Test search with ambiguous queries
- [ ] Test embedding API rate limits
- [ ] Verify vector storage performance at scale
- [ ] Test hybrid search ranking quality
- [ ] Check token budget edge cases

---

## Sprint 3: Prompt-to-Plan - Specify & Design (Weeks 5-6)

**Goal:** Transform natural language prompts into structured specifications and designs.

### Tasks

| ID | Task | Description | Effort | Owner |
|----|------|-------------|--------|-------|
| 2.1.1 | `specs` schema | Create specs table | 2h | Backend |
| 2.1.2 | `spec_versions` schema | Version history for specs | 2h | Backend |
| 2.1.3 | `spec_card_links` schema | Link specs to Kanban cards | 1h | Backend |
| 2.1.4 | EARS generator | Generate EARS-format requirements | 8h | Backend |
| 2.1.5 | Intent clarification | Dialog to clarify user intent | 6h | Frontend |
| 2.1.6 | Spec editor | Markdown editor for specs | 8h | Frontend |
| 2.1.7 | Spec approval | Approval workflow UI | 4h | Frontend |
| 2.1.8 | Specify tests | Unit tests for Specify phase | 4h | QA |
| 2.2.1 | Codebase analyzer | Analyze existing code patterns | 8h | Backend |
| 2.2.2 | Data model generator | Generate data models from specs | 6h | Backend |
| 2.2.3 | API contract generator | Generate API contracts | 6h | Backend |
| 2.2.4 | Mermaid diagrams | Auto-generate architecture diagrams | 4h | Backend |
| 2.2.5 | Design editor | Editor for design documents | 6h | Frontend |
| 2.2.6 | File manifest | Generate list of files to change | 4h | Backend |
| 2.2.7 | Design tests | Unit tests for Design phase | 4h | QA |

**Total Effort:** 73 hours

### Acceptance Criteria

- [ ] EARS requirements generated from natural language
- [ ] Specs versioned with full history
- [ ] Codebase analysis identifies relevant patterns
- [ ] Mermaid diagrams render correctly
- [ ] Design documents link to specs
- [ ] All tests pass

### Red Team QA Checklist

- [ ] Test with vague/ambiguous prompts
- [ ] Test spec versioning edge cases
- [ ] Verify codebase analysis accuracy
- [ ] Test diagram generation with complex architectures
- [ ] Check approval workflow permissions

---

## Sprint 4: Prompt-to-Plan - Tasks & Implement (Weeks 7-8)

**Goal:** Break designs into executable tasks and integrate with agent execution.

### Tasks

| ID | Task | Description | Effort | Owner |
|----|------|-------------|--------|-------|
| 2.3.1 | Task breakdown | Break designs into atomic tasks | 8h | Backend |
| 2.3.2 | Dependency analyzer | Identify task dependencies | 6h | Backend |
| 2.3.3 | Agent assignment | Auto-assign tasks to agents | 4h | Backend |
| 2.3.4 | Effort estimation | Estimate task effort | 4h | Backend |
| 2.3.5 | Kanban generator | Create Kanban cards from tasks | 4h | Backend |
| 2.3.6 | Spec-card linking | Link cards back to specs | 3h | Backend |
| 2.3.7 | Tasks tests | Unit tests for Tasks phase | 4h | QA |
| 2.4.1 | Spec-aware execution | Enhance engine with spec context | 8h | Backend |
| 2.4.2 | Verification service | Verify implementation vs spec | 6h | Backend |
| 2.4.3 | Spec sync | Update specs on implementation | 6h | Backend |
| 2.4.4 | Progress tracking | Track progress with traceability | 4h | Backend |
| 2.4.5 | Implementation dashboard | Dashboard for implementation | 6h | Frontend |
| 2.4.6 | Integration tests | End-to-end Prompt-to-Plan tests | 6h | QA |

**Total Effort:** 69 hours

### Acceptance Criteria

- [ ] Designs break into 5-15 atomic tasks
- [ ] Dependencies correctly identified
- [ ] Tasks auto-assigned to appropriate agents
- [ ] Kanban cards created with full metadata
- [ ] Spec traceability maintained through implementation
- [ ] All tests pass

### Red Team QA Checklist

- [ ] Test with complex multi-file features
- [ ] Test circular dependency detection
- [ ] Verify agent assignment logic
- [ ] Test spec sync with conflicting changes
- [ ] Check dashboard performance with many tasks

---

## Sprint 5: GitHub Integration (Weeks 9-10)

**Goal:** Complete GitHub integration with repository management, PRs, and issues.

### Tasks

| ID | Task | Description | Effort | Owner |
|----|------|-------------|--------|-------|
| 3.1.1 | Repository cloning | Clone repos to workspace | 4h | Backend |
| 3.1.2 | Commit and push | Commit changes and push | 6h | Backend |
| 3.1.3 | Branch management | Create/switch branches | 4h | Backend |
| 3.1.4 | Conflict detection | Detect merge conflicts | 6h | Backend |
| 3.1.5 | Diff viewer | Visual diff component | 6h | Frontend |
| 3.1.6 | Repository tests | Unit tests for repo management | 4h | QA |
| 3.2.1 | PR creation | Create PRs from cards | 6h | Backend |
| 3.2.2 | PR review UI | Interface for PR review | 8h | Frontend |
| 3.2.3 | AI PR review | AI-powered code review | 6h | Backend |
| 3.2.4 | Issue creation | Create/link GitHub issues | 4h | Backend |
| 3.2.5 | Issue-card sync | Sync issues with Kanban | 4h | Backend |
| 3.2.6 | GitHub webhooks | Real-time sync via webhooks | 6h | Backend |
| 3.2.7 | Integration tests | End-to-end GitHub tests | 4h | QA |

**Total Effort:** 68 hours

### Acceptance Criteria

- [ ] Repositories clone successfully
- [ ] Commits include proper metadata
- [ ] Branch operations work correctly
- [ ] Merge conflicts detected and reported
- [ ] PRs created with linked cards
- [ ] AI review provides useful feedback
- [ ] All tests pass

### Red Team QA Checklist

- [ ] Test with large repositories
- [ ] Test GitHub API rate limiting
- [ ] Verify webhook reliability
- [ ] Test conflict resolution workflow
- [ ] Check PR review quality

---

## Sprint 6: Agent Orchestration (Weeks 11-12)

**Goal:** Enable PM Agent to orchestrate complex multi-agent workflows.

### Tasks

| ID | Task | Description | Effort | Owner |
|----|------|-------------|--------|-------|
| 4.1.1 | Epic breakdown | Break epics into features/tasks | 6h | Backend |
| 4.1.2 | Intelligent assignment | Smart task-to-agent matching | 6h | Backend |
| 4.1.3 | Progress tracking | Track and report progress | 4h | Backend |
| 4.1.4 | Blocker detection | Detect blocked tasks | 4h | Backend |
| 4.1.5 | Escalation workflow | Escalate blockers to humans | 4h | Backend |
| 4.1.6 | Orchestration tests | Unit tests for orchestration | 4h | QA |
| 4.2.1 | Dependency graph | Visual dependency visualization | 8h | Frontend |
| 4.2.2 | Critical path | Calculate critical path | 6h | Backend |
| 4.2.3 | Blocker badge | Visual blocker indicator | 3h | Frontend |
| 4.2.4 | Unblock suggestions | AI suggestions to unblock | 4h | Backend |
| 4.2.5 | Execution order | Calculate optimal execution order | 4h | Backend |
| 4.2.6 | Integration tests | End-to-end orchestration tests | 4h | QA |

**Total Effort:** 57 hours

### Acceptance Criteria

- [ ] Epics break into logical task hierarchies
- [ ] Tasks assigned to best-fit agents
- [ ] Blockers detected within 1 minute
- [ ] Dependency graph renders correctly
- [ ] Critical path calculated accurately
- [ ] All tests pass

### Red Team QA Checklist

- [ ] Test with complex dependency chains
- [ ] Test circular dependency handling
- [ ] Verify escalation notifications
- [ ] Test unblock suggestion quality
- [ ] Check graph rendering performance

---

## Sprint 7: Sprint Planning + Cost Management (Weeks 13-14)

**Goal:** Add sprint planning with velocity tracking and cost management.

### Tasks

| ID | Task | Description | Effort | Owner |
|----|------|-------------|--------|-------|
| 5.1.1 | `sprints` schema | Create sprints table | 2h | Backend |
| 5.1.2 | Sprint CRUD | Sprint management operations | 4h | Backend |
| 5.1.3 | Sprint planning UI | UI for sprint planning | 6h | Frontend |
| 5.1.4 | Velocity calculation | Calculate team velocity | 4h | Backend |
| 5.1.5 | Burndown chart | Burndown visualization | 6h | Frontend |
| 5.1.6 | Retrospective view | Sprint retrospective UI | 4h | Frontend |
| 5.1.7 | Sprint tests | Unit tests for sprints | 3h | QA |
| 6.1.1 | Cost estimation | Estimate cost per task | 4h | Backend |
| 6.1.2 | Budget allocation | Allocate budget per sprint | 4h | Backend |
| 6.1.3 | Cost dashboard | Cost breakdown visualization | 6h | Frontend |
| 6.1.4 | Budget alerts | Alert on budget thresholds | 4h | Backend |
| 6.1.5 | Capacity planning | Plan agent capacity | 4h | Backend |
| 6.1.6 | Capacity visualization | Visualize agent workload | 4h | Frontend |
| 6.1.7 | Cost tests | Unit tests for cost tracking | 3h | QA |

**Total Effort:** 58 hours

### Acceptance Criteria

- [ ] Sprints created with date ranges
- [ ] Velocity calculated from historical data
- [ ] Burndown chart updates in real-time
- [ ] Cost estimates within 20% accuracy
- [ ] Budget alerts trigger correctly
- [ ] All tests pass

### Red Team QA Checklist

- [ ] Test velocity with inconsistent data
- [ ] Test burndown with scope changes
- [ ] Verify cost estimation accuracy
- [ ] Test budget alert thresholds
- [ ] Check capacity planning edge cases

---

## Sprint 8: Editor + UX Design System (Weeks 15-16)

**Goal:** Enhance code editor and implement calm-leaning design system.

### Tasks

| ID | Task | Description | Effort | Owner |
|----|------|-------------|--------|-------|
| 7.1.1 | Inline AI suggestions | AI suggestions in editor | 8h | Frontend |
| 7.1.2 | Context autocomplete | Context-aware completion | 6h | Frontend |
| 7.1.3 | Inline diff | Show diffs inline | 4h | Frontend |
| 7.1.4 | Multi-file editing | Edit multiple files | 6h | Frontend |
| 7.1.5 | Find/replace | Cross-file find/replace | 4h | Frontend |
| 7.1.6 | Editor tests | Unit tests for editor | 3h | QA |
| 8.1.1-6 | Design tokens | Color palette, tokens | 20h | Design |
| 8.2.1-6 | Attention modes | Background/Working/Interruptive | 20h | Design |
| 8.3.1-6 | Typography/Layout | Fonts, spacing, hierarchy | 20h | Design |
| 8.4.1-6 | Motion/Feedback | Transitions, animations | 16h | Design |
| 8.5.1-8 | Component refactor | Apply design system | 30h | Frontend |

**Total Effort:** 137 hours

### Acceptance Criteria

- [ ] AI suggestions appear within 500ms
- [ ] Autocomplete uses codebase context
- [ ] Multi-file editing works smoothly
- [ ] Design system applied consistently
- [ ] No functionality sacrificed for aesthetics
- [ ] Experienced users find it fast
- [ ] All tests pass

### Red Team QA Checklist

- [ ] Test AI suggestion latency
- [ ] Test autocomplete accuracy
- [ ] Verify design consistency across pages
- [ ] Test with experienced developers
- [ ] Confirm no features were removed

---

## Sprint 9: Polish & Beta Preparation (Weeks 17-18)

**Goal:** Final polish, documentation, and beta release preparation.

### Tasks

| ID | Task | Description | Effort | Owner |
|----|------|-------------|--------|-------|
| 9.1.1 | Data cleanup | Remove test data/duplicates | 4h | Backend |
| 9.1.2 | Onboarding flow | New user onboarding | 6h | Frontend |
| 9.1.3 | User documentation | Create user docs | 8h | Docs |
| 9.1.4 | Help system | Tooltips and help | 4h | Frontend |
| 9.1.5 | Performance optimization | Optimize slow paths | 6h | Backend |
| 9.1.6 | Security audit | Security review and fixes | 6h | Security |
| 9.1.7 | Final QA | Comprehensive QA pass | 8h | QA |
| 9.1.8 | Release notes | Create release notes | 2h | Docs |

**Total Effort:** 44 hours

### Acceptance Criteria

- [ ] No test data in production
- [ ] Onboarding completes in < 5 minutes
- [ ] Documentation covers all features
- [ ] Page load time < 2 seconds
- [ ] No critical security vulnerabilities
- [ ] All features work end-to-end
- [ ] Release notes complete

### Red Team QA Checklist

- [ ] Full regression test
- [ ] Security penetration testing
- [ ] Performance benchmarking
- [ ] Accessibility audit
- [ ] Cross-browser testing

---

## Sprint Execution Protocol

### Before Each Sprint

1. Review sprint tasks and dependencies
2. Verify prerequisite sprints are complete
3. Set up sprint board in Kanban
4. Assign tasks to team members

### During Sprint

1. Daily progress check
2. Update task status in Kanban
3. Flag blockers immediately
4. Document decisions and changes

### End of Sprint: Red Team QA

1. Run full test suite
2. Execute Red Team QA checklist
3. Document all findings
4. Fix critical issues before proceeding
5. Create checkpoint
6. Update roadmap status

### Self-Healing Protocol

If Red Team QA finds issues:

1. **Critical (P0):** Fix immediately, re-run QA
2. **High (P1):** Fix before next sprint starts
3. **Medium (P2):** Add to next sprint backlog
4. **Low (P3):** Add to polish sprint

---

## Current Status

| Sprint | Status | Completion |
|--------|--------|------------|
| Sprint 1 | Not Started | 0% |
| Sprint 2 | Not Started | 0% |
| Sprint 3 | Not Started | 0% |
| Sprint 4 | Not Started | 0% |
| Sprint 5 | Not Started | 0% |
| Sprint 6 | Not Started | 0% |
| Sprint 7 | Not Started | 0% |
| Sprint 8 | Not Started | 0% |
| Sprint 9 | Not Started | 0% |

---

## Next Action

**Begin Sprint 1: Context Engine Foundation**

First task: Create `context_chunks` database schema (Task 1.1.1)
