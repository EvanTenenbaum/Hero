# Hero IDE Beta Roadmap

**Version:** 1.0  
**Author:** Manus AI  
**Date:** December 20, 2025

---

## Executive Summary

This roadmap outlines the path from Hero IDE's current state to a complete beta release. The platform already has a solid foundation including authentication, chat with 5 agent types, Kanban boards, metrics tracking, and governance systems. The beta milestone focuses on completing the **Prompt-to-Plan** workflow, enhancing **GitHub integration**, and building a robust **Context Engine** for codebase-aware AI assistance.

**Estimated Timeline:** 18 weeks  
**Total Major Features:** 9  
**Total Subtasks:** 152

---

## Current State Summary

| Category | Status | Completion |
|----------|--------|------------|
| Authentication & Users | Complete | 100% |
| Chat & LLM Integration | Complete | 100% |
| Agent System (Basic) | Complete | 90% |
| Kanban Board System | Complete | 95% |
| GitHub Integration | Partial | 60% |
| Governance & Safety | Complete | 85% |
| Metrics & Observability | Complete | 90% |
| Prompt-to-Plan | Not Started | 0% |
| Context Engine | Not Started | 0% |
| Calm-Leaning UX Design | Not Started | 0% |

---

## Feature 1: Context Engine

**Priority:** Critical  
**Duration:** 4 weeks  
**Dependencies:** None

The Context Engine enables AI agents to understand and reason about the user's codebase, transforming generic AI responses into project-specific intelligence.

### 1.1 Codebase Indexing (Week 1-2)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 1.1.1 | Create `context_chunks` table schema | 2h | [ ] |
| 1.1.2 | Create `context_queries` table schema | 1h | [ ] |
| 1.1.3 | Implement file watcher service | 4h | [ ] |
| 1.1.4 | Build semantic chunking for TypeScript | 8h | [ ] |
| 1.1.5 | Build semantic chunking for React/JSX | 6h | [ ] |
| 1.1.6 | Implement chunk storage and retrieval | 4h | [ ] |
| 1.1.7 | Add tRPC procedures for indexing | 4h | [ ] |
| 1.1.8 | Build indexing status UI component | 4h | [ ] |
| 1.1.9 | Write unit tests for chunking | 4h | [ ] |

### 1.2 Keyword Search (Week 2)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 1.2.1 | Implement trigram-based search | 6h | [ ] |
| 1.2.2 | Add search result ranking | 4h | [ ] |
| 1.2.3 | Build search API endpoint | 2h | [ ] |
| 1.2.4 | Create search UI component | 4h | [ ] |
| 1.2.5 | Write unit tests for search | 3h | [ ] |

### 1.3 Semantic Search (Week 3)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 1.3.1 | Integrate embedding API (Gemini) | 4h | [ ] |
| 1.3.2 | Implement vector storage | 6h | [ ] |
| 1.3.3 | Build similarity search | 6h | [ ] |
| 1.3.4 | Implement hybrid search (keyword + semantic) | 4h | [ ] |
| 1.3.5 | Add token budget management | 4h | [ ] |
| 1.3.6 | Write unit tests for semantic search | 4h | [ ] |

### 1.4 Context Ranking (Week 4)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 1.4.1 | Implement relevance scoring model | 8h | [ ] |
| 1.4.2 | Build knapsack selection algorithm | 4h | [ ] |
| 1.4.3 | Add context weighting by file type | 3h | [ ] |
| 1.4.4 | Implement incremental index updates | 4h | [ ] |
| 1.4.5 | Write integration tests | 4h | [ ] |

---

## Feature 2: Prompt-to-Plan Workflow

**Priority:** Critical  
**Duration:** 4 weeks  
**Dependencies:** Context Engine (partial)

The Prompt-to-Plan system transforms natural language feature requests into structured, executable development plans.

### 2.1 Specify Phase (Week 5)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 2.1.1 | Create `specs` table schema | 2h | [ ] |
| 2.1.2 | Create `spec_versions` table schema | 2h | [ ] |
| 2.1.3 | Create `spec_card_links` table schema | 1h | [ ] |
| 2.1.4 | Implement EARS requirements generator | 8h | [ ] |
| 2.1.5 | Build intent clarification dialog | 6h | [ ] |
| 2.1.6 | Create spec editor component | 8h | [ ] |
| 2.1.7 | Add spec approval workflow | 4h | [ ] |
| 2.1.8 | Write unit tests for Specify phase | 4h | [ ] |

### 2.2 Design Phase (Week 6)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 2.2.1 | Implement codebase analysis service | 8h | [ ] |
| 2.2.2 | Build data model generator | 6h | [ ] |
| 2.2.3 | Implement API contract generator | 6h | [ ] |
| 2.2.4 | Add Mermaid diagram generation | 4h | [ ] |
| 2.2.5 | Create design document editor | 6h | [ ] |
| 2.2.6 | Build file change manifest generator | 4h | [ ] |
| 2.2.7 | Write unit tests for Design phase | 4h | [ ] |

### 2.3 Tasks Phase (Week 7)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 2.3.1 | Implement task breakdown service | 8h | [ ] |
| 2.3.2 | Build dependency analyzer | 6h | [ ] |
| 2.3.3 | Add agent assignment logic | 4h | [ ] |
| 2.3.4 | Implement effort estimation | 4h | [ ] |
| 2.3.5 | Create Kanban card generator | 4h | [ ] |
| 2.3.6 | Build spec-to-card linking | 3h | [ ] |
| 2.3.7 | Write unit tests for Tasks phase | 4h | [ ] |

### 2.4 Implement Phase (Week 8)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 2.4.1 | Enhance execution engine with spec context | 8h | [ ] |
| 2.4.2 | Build verification service | 6h | [ ] |
| 2.4.3 | Implement spec sync (update on implementation) | 6h | [ ] |
| 2.4.4 | Add progress tracking with spec traceability | 4h | [ ] |
| 2.4.5 | Create implementation dashboard | 6h | [ ] |
| 2.4.6 | Write integration tests | 6h | [ ] |

---

## Feature 3: Enhanced GitHub Integration

**Priority:** High  
**Duration:** 2 weeks  
**Dependencies:** None

Complete the GitHub integration to enable full repository management, pull requests, and issue tracking.

### 3.1 Repository Management (Week 9)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 3.1.1 | Implement repository cloning | 4h | [ ] |
| 3.1.2 | Add commit and push functionality | 6h | [ ] |
| 3.1.3 | Build branch creation and switching | 4h | [ ] |
| 3.1.4 | Implement merge conflict detection | 6h | [ ] |
| 3.1.5 | Add diff viewer component | 6h | [ ] |
| 3.1.6 | Write unit tests | 4h | [ ] |

### 3.2 Pull Requests & Issues (Week 10)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 3.2.1 | Implement PR creation from cards | 6h | [ ] |
| 3.2.2 | Build PR review interface | 8h | [ ] |
| 3.2.3 | Add AI-powered PR review | 6h | [ ] |
| 3.2.4 | Implement issue creation and linking | 4h | [ ] |
| 3.2.5 | Build issue-to-card sync | 4h | [ ] |
| 3.2.6 | Add GitHub webhooks for real-time sync | 6h | [ ] |
| 3.2.7 | Write integration tests | 4h | [ ] |

---

## Feature 4: Advanced Agent Orchestration

**Priority:** High  
**Duration:** 2 weeks  
**Dependencies:** Prompt-to-Plan

Enhance the PM Agent to orchestrate complex multi-agent workflows with dependency management.

### 4.1 PM Agent Orchestration (Week 11)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 4.1.1 | Implement epic breakdown service | 6h | [ ] |
| 4.1.2 | Build intelligent task assignment | 6h | [ ] |
| 4.1.3 | Add progress tracking and reporting | 4h | [ ] |
| 4.1.4 | Implement blocker detection | 4h | [ ] |
| 4.1.5 | Build escalation workflow | 4h | [ ] |
| 4.1.6 | Write unit tests | 4h | [ ] |

### 4.2 Dependency Management (Week 12)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 4.2.1 | Build visual dependency graph | 8h | [ ] |
| 4.2.2 | Implement critical path analysis | 6h | [ ] |
| 4.2.3 | Add blocker badge component | 3h | [ ] |
| 4.2.4 | Build unblock suggestions | 4h | [ ] |
| 4.2.5 | Implement execution order calculation | 4h | [ ] |
| 4.2.6 | Write integration tests | 4h | [ ] |

---

## Feature 5: Sprint Planning & Velocity

**Priority:** Medium  
**Duration:** 1 week  
**Dependencies:** Kanban Board

Add sprint planning capabilities with velocity tracking and burndown charts.

### 5.1 Sprint Management (Week 13)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 5.1.1 | Create `sprints` table schema | 2h | [ ] |
| 5.1.2 | Implement sprint CRUD operations | 4h | [ ] |
| 5.1.3 | Build sprint planning UI | 6h | [ ] |
| 5.1.4 | Add velocity calculation | 4h | [ ] |
| 5.1.5 | Create burndown chart component | 6h | [ ] |
| 5.1.6 | Build sprint retrospective view | 4h | [ ] |
| 5.1.7 | Write unit tests | 3h | [ ] |

---

## Feature 6: Resource & Cost Management

**Priority:** Medium  
**Duration:** 1 week  
**Dependencies:** Agent System

Track AI token usage, estimate costs, and manage budgets per project and sprint.

### 6.1 Cost Tracking (Week 14)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 6.1.1 | Enhance cost estimation per task | 4h | [ ] |
| 6.1.2 | Build budget allocation per sprint | 4h | [ ] |
| 6.1.3 | Create cost breakdown dashboard | 6h | [ ] |
| 6.1.4 | Add budget alerts and notifications | 4h | [ ] |
| 6.1.5 | Implement agent capacity planning | 4h | [ ] |
| 6.1.6 | Build capacity visualization | 4h | [ ] |
| 6.1.7 | Write unit tests | 3h | [ ] |

---

## Feature 7: Code Editor Enhancements

**Priority:** Medium  
**Duration:** 1 week  
**Dependencies:** Context Engine

Enhance the Monaco editor with AI-powered features.

### 7.1 Editor Features (Week 15)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 7.1.1 | Add inline AI suggestions | 8h | [ ] |
| 7.1.2 | Implement context-aware autocomplete | 6h | [ ] |
| 7.1.3 | Build inline diff view | 4h | [ ] |
| 7.1.4 | Add multi-file editing support | 6h | [ ] |
| 7.1.5 | Implement find and replace across files | 4h | [ ] |
| 7.1.6 | Write unit tests | 3h | [ ] |

---

## Feature 8: Calm-Leaning UX Design System

**Priority:** High  
**Duration:** 2 weeks  
**Dependencies:** None (can run in parallel)

Implement a design system that leans toward calm, clarity, and low cognitive noise **without sacrificing speed, usability, or modern workflow efficiency**. The IDE should feel grounded, trustworthy, and visually quiet while remaining fast and capable.

### Design Philosophy

> **Critical Constraint:** Functionality and efficiency always win. Never sacrifice actual features, speed, or discoverability for the sake of visual calm. If calmness conflicts with productivity or flow, **prioritize flow**.

The IDE is a focused work environment, not a dashboard and not a meditation tool. Calm is a bias, not an absolute rule.

**The IDE must feel:**
- Grounded and trustworthy
- Visually quiet
- Comfortable for long sessions

**The IDE must NOT feel:**
- Slow or sluggish
- Overly restrained or friction-heavy
- Ideological or precious
- Missing expected features

Dense information is acceptable when context demands it (debugging, reviewing diffs, inspecting logs). Advanced features must remain discoverable and one step away—never hidden behind excessive friction.

### 8.1 Design Tokens & Color System (Week 15)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 8.1.1 | Define neutral, comfortable base color palette | 4h | [ ] |
| 8.1.2 | Create muted accent color system | 3h | [ ] |
| 8.1.3 | Implement semantic color tokens (error, warning, success) | 3h | [ ] |
| 8.1.4 | Build contrast and saturation guidelines | 2h | [ ] |
| 8.1.5 | Create dark/light theme variants | 6h | [ ] |
| 8.1.6 | Document color usage patterns | 2h | [ ] |

### 8.2 Attention Mode System (Week 15)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 8.2.1 | Define Background mode styling (visible but ignorable) | 4h | [ ] |
| 8.2.2 | Define Working mode styling (active, focused use) | 4h | [ ] |
| 8.2.3 | Define Interruptive mode styling (rare, important) | 3h | [ ] |
| 8.2.4 | Implement notification restraint system | 4h | [ ] |
| 8.2.5 | Build dismissible indicator patterns | 3h | [ ] |
| 8.2.6 | Write attention mode documentation | 2h | [ ] |

### 8.3 Typography & Layout (Week 16)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 8.3.1 | Select highly legible, neutral typefaces | 3h | [ ] |
| 8.3.2 | Define typography scale and hierarchy | 4h | [ ] |
| 8.3.3 | Implement comfortable line heights for long sessions | 2h | [ ] |
| 8.3.4 | Create layout grid with generous whitespace | 4h | [ ] |
| 8.3.5 | Design supportive (not dominant) sidebar patterns | 4h | [ ] |
| 8.3.6 | Prioritize editor/workspace in visual hierarchy | 3h | [ ] |

### 8.4 Motion & Feedback (Week 16)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 8.4.1 | Define fast, subtle transition timing | 3h | [ ] |
| 8.4.2 | Implement state change clarification animations | 4h | [ ] |
| 8.4.3 | Remove playful/elastic motion patterns | 2h | [ ] |
| 8.4.4 | Build orientation-providing transitions | 3h | [ ] |
| 8.4.5 | Ensure experienced users feel responsiveness | 2h | [ ] |
| 8.4.6 | Write motion guidelines documentation | 2h | [ ] |

### 8.5 Component Refactoring (Week 16)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 8.5.1 | Audit and reduce visual flair in existing components | 6h | [ ] |
| 8.5.2 | Minimize competing panels and visual noise | 4h | [ ] |
| 8.5.3 | Reduce overuse of badges, pills, and counters | 3h | [ ] |
| 8.5.4 | Apply calm-by-default, power-on-demand pattern | 4h | [ ] |
| 8.5.5 | Ensure advanced features are discoverable | 3h | [ ] |
| 8.5.6 | Implement design reflection checklist | 2h | [ ] |
| 8.5.7 | Verify no functionality was sacrificed for aesthetics | 4h | [ ] |
| 8.5.8 | User testing: confirm experienced users find it fast | 4h | [ ] |

---

## Feature 9: Polish & Beta Preparation

**Priority:** High  
**Duration:** 1 week  
**Dependencies:** All features

Final polish, documentation, and beta release preparation.

### 9.1 Polish & Documentation (Week 17-18)

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| 9.1.1 | Clean up test data and duplicates | 4h | [ ] |
| 9.1.2 | Add onboarding flow for new users | 6h | [ ] |
| 9.1.3 | Create user documentation | 8h | [ ] |
| 9.1.4 | Build help system and tooltips | 4h | [ ] |
| 9.1.5 | Performance optimization | 6h | [ ] |
| 9.1.6 | Security audit and fixes | 6h | [ ] |
| 9.1.7 | Final QA and bug fixes | 8h | [ ] |
| 9.1.8 | Create release notes | 2h | [ ] |

---

## Timeline Overview

```
Week 1-2:   Context Engine - Codebase Indexing
Week 2:     Context Engine - Keyword Search
Week 3:     Context Engine - Semantic Search
Week 4:     Context Engine - Context Ranking
Week 5:     Prompt-to-Plan - Specify Phase
Week 6:     Prompt-to-Plan - Design Phase
Week 7:     Prompt-to-Plan - Tasks Phase
Week 8:     Prompt-to-Plan - Implement Phase
Week 9:     GitHub - Repository Management
Week 10:    GitHub - Pull Requests & Issues
Week 11:    Agent Orchestration - PM Agent
Week 12:    Agent Orchestration - Dependencies
Week 13:    Sprint Planning & Velocity
Week 14:    Resource & Cost Management
Week 15:    Code Editor Enhancements + UX Design System (Part 1)
Week 16:    UX Design System (Part 2) + Component Refactoring
Week 17-18: Polish & Beta Preparation
```

---

## Success Criteria for Beta

### Core Functionality

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Context Engine indexes codebase | < 60 seconds for 10K LOC | Automated test |
| Prompt-to-Plan generates valid specs | 90% acceptance rate | User feedback |
| GitHub sync works bidirectionally | < 5 second latency | Automated test |
| Agent orchestration completes tasks | 85% success rate | Execution logs |
| All unit tests pass | 100% | CI/CD |

### User Experience

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Page load time | < 2 seconds | Performance monitoring |
| Error rate | < 1% | Error tracking |
| User can complete onboarding | < 5 minutes | User testing |
| Documentation coverage | 100% of features | Manual review |

### Reliability

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Uptime | 99.5% | Monitoring |
| Data loss incidents | 0 | Incident tracking |
| Security vulnerabilities | 0 critical/high | Security scan |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Embedding API rate limits | Medium | High | Implement caching, batch processing |
| Context Engine performance | Medium | High | Optimize chunking, add pagination |
| GitHub API rate limits | Medium | Medium | Implement webhooks, caching |
| Scope creep | High | High | Strict phase boundaries, weekly reviews |
| Agent conflicts | Low | Medium | File ownership rules, locking |

---

## Resource Requirements

| Resource | Quantity | Purpose |
|----------|----------|---------|
| Gemini API | Standard tier | LLM + embeddings |
| Vector Database | 10GB | Context storage |
| GitHub API | Standard tier | Repository integration |
| Development Time | 640 hours | Implementation |
| QA Time | 80 hours | Testing |

---

## Next Immediate Actions

1. **Start Context Engine** - Begin with `context_chunks` table schema and file watcher
2. **Set up embedding pipeline** - Configure Gemini API for vector generation
3. **Create weekly milestones** - Break down Week 1 tasks into daily goals
4. **Establish QA gates** - Define acceptance criteria for each feature

---

## Appendix: Task Count Summary

| Feature | Subtasks | Estimated Hours |
|---------|----------|-----------------|
| Context Engine | 23 | 92h |
| Prompt-to-Plan | 29 | 116h |
| GitHub Integration | 13 | 62h |
| Agent Orchestration | 12 | 58h |
| Sprint Planning | 7 | 29h |
| Cost Management | 7 | 29h |
| Editor Enhancements | 6 | 31h |
| Calm-Leaning UX Design | 32 | 106h |
| Polish & Beta | 8 | 44h |
| **Total** | **137** | **567h** |

*Note: Additional 20% buffer recommended for unforeseen issues = ~113h*

**Total Estimated Effort: 680 hours (~18 weeks at 40h/week)**
