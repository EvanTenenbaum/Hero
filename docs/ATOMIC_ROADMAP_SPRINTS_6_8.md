# Atomic Roadmap: Sprints 6-8

**Hero IDE - Detailed Execution Plan**

**Version:** 1.0  
**Author:** Manus AI  
**Date:** December 20, 2025

---

## Executive Summary

This document provides an atomic (granular, step-by-step) roadmap for executing Sprints 6-8 of Hero IDE development. Each sprint follows a consistent pattern: Research → Implementation → Testing → Red Team QA. Every task is designed to be independently verifiable with clear acceptance criteria.

**Total Scope:**
- Sprint 6: Prompt-to-Plan Workflow (4 phases, ~35 tasks)
- Sprint 7: Enhanced GitHub Integration (4 features, ~28 tasks)
- Sprint 8: Advanced Agent Orchestration (4 features, ~24 tasks)

---

## Sprint 6: Prompt-to-Plan Workflow

**Duration:** 4 weeks equivalent  
**Priority:** Critical  
**Dependencies:** Context Engine (complete ✓)

### 6.0 Research Phase

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 6.0.1 | Research EARS requirements format | Study Easy Approach to Requirements Syntax | Document with 5 EARS patterns and examples |
| 6.0.2 | Research LLM prompt engineering for specs | Study structured output techniques | Prompt templates for each phase |
| 6.0.3 | Research spec-driven development patterns | Study Traycer, Cursor, Kiro approaches | Comparison matrix with pros/cons |
| 6.0.4 | Design spec versioning strategy | Determine immutable vs mutable approach | Architecture decision record |
| 6.0.5 | Design human checkpoint UX | Mockup approve/reject/edit flow | UI wireframes for each checkpoint |

### 6.1 Specify Phase Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 6.1.1 | Create `specs` table schema | id, project_id, title, content, status, phase | Migration runs, table exists |
| 6.1.2 | Create `spec_versions` table schema | id, spec_id, content, version, created_by | Migration runs, table exists |
| 6.1.3 | Create `spec_card_links` table schema | spec_id, card_id, link_type | Migration runs, table exists |
| 6.1.4 | Implement EARS requirements generator | LLM service to convert prompt to EARS | Unit tests pass for 5 EARS patterns |
| 6.1.5 | Build intent clarification dialog | Multi-turn conversation for ambiguous prompts | UI renders, conversation flows |
| 6.1.6 | Create spec editor component | Rich text editor with EARS highlighting | Editor loads, saves, validates |
| 6.1.7 | Add spec approval workflow | Approve/reject/request-changes buttons | Status transitions work correctly |
| 6.1.8 | Write unit tests for Specify phase | Test EARS generation, validation, storage | 15+ tests passing |

### 6.2 Design Phase Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 6.2.1 | Implement codebase analysis service | Analyze existing schema, routes, components | Returns structured analysis JSON |
| 6.2.2 | Build data model generator | Generate Drizzle schema from spec | Valid TypeScript schema output |
| 6.2.3 | Implement API contract generator | Generate tRPC router stubs from spec | Valid TypeScript router output |
| 6.2.4 | Add Mermaid diagram generation | Generate ER, sequence, flow diagrams | Valid Mermaid syntax renders |
| 6.2.5 | Create design document editor | Markdown editor with diagram preview | Editor loads, previews diagrams |
| 6.2.6 | Build file change manifest generator | List files to create/modify/delete | Manifest matches expected changes |
| 6.2.7 | Write unit tests for Design phase | Test analysis, generation, validation | 12+ tests passing |

### 6.3 Tasks Phase Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 6.3.1 | Implement task breakdown service | Break design into atomic tasks | Tasks are small, independent units |
| 6.3.2 | Build dependency analyzer | Detect task dependencies from design | Dependency graph is acyclic |
| 6.3.3 | Add agent assignment logic | Match tasks to agent capabilities | Each task has assigned agent |
| 6.3.4 | Implement effort estimation | Estimate hours per task | Estimates within reasonable range |
| 6.3.5 | Create Kanban card generator | Generate cards from tasks | Cards appear in Kanban board |
| 6.3.6 | Build spec-to-card linking | Link cards back to spec sections | Bidirectional navigation works |
| 6.3.7 | Write unit tests for Tasks phase | Test breakdown, dependencies, assignment | 10+ tests passing |

### 6.4 Implement Phase Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 6.4.1 | Enhance execution engine with spec context | Pass spec to agent during execution | Agent receives full spec context |
| 6.4.2 | Build verification service | Check implementation against spec | Verification report generated |
| 6.4.3 | Implement spec sync | Update spec when implementation diverges | Spec reflects actual implementation |
| 6.4.4 | Add progress tracking with traceability | Track which spec items are complete | Progress percentage accurate |
| 6.4.5 | Create implementation dashboard | Show spec → tasks → progress | Dashboard renders all data |
| 6.4.6 | Write integration tests | End-to-end prompt → implementation | Full workflow completes |

### 6.5 Testing & Red Team QA

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 6.5.1 | Unit test coverage review | Ensure >80% coverage on new code | Coverage report generated |
| 6.5.2 | Integration test suite | Test full Prompt-to-Plan flow | All integration tests pass |
| 6.5.3 | Edge case testing | Test ambiguous, conflicting, empty prompts | Graceful handling verified |
| 6.5.4 | Performance testing | Test with complex multi-feature specs | Response time <30s |
| 6.5.5 | Red Team QA | Adversarial testing, break the system | Issues documented and fixed |
| 6.5.6 | Save checkpoint | Commit Sprint 6 completion | Checkpoint saved to version control |

---

## Sprint 7: Enhanced GitHub Integration

**Duration:** 2 weeks equivalent  
**Priority:** High  
**Dependencies:** None (builds on existing GitHub OAuth)

### 7.0 Research Phase

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 7.0.1 | Research git clone optimization | Study shallow clone, sparse checkout | Performance benchmarks documented |
| 7.0.2 | Research merge conflict resolution | Study 3-way merge algorithms | Algorithm comparison documented |
| 7.0.3 | Research GitHub webhook security | Study signature verification, rate limiting | Security checklist created |
| 7.0.4 | Design workspace storage strategy | Local clone vs virtual filesystem | Architecture decision record |

### 7.1 Repository Cloning Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 7.1.1 | Implement repository cloning service | Clone repos with progress tracking | Clone completes, files accessible |
| 7.1.2 | Add shallow clone support | Clone with limited history | Shallow clone faster than full |
| 7.1.3 | Build clone progress UI | Show clone progress with cancel option | Progress updates in real-time |
| 7.1.4 | Implement workspace management | Track cloned repos, cleanup old ones | Workspace list accurate |
| 7.1.5 | Write unit tests for cloning | Test clone, cancel, resume, cleanup | 8+ tests passing |

### 7.2 Merge Conflict Detection Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 7.2.1 | Implement conflict detection service | Detect conflicts before merge | Conflicts identified correctly |
| 7.2.2 | Build 3-way diff viewer component | Show base, ours, theirs versions | All three versions visible |
| 7.2.3 | Add conflict resolution UI | Choose ours/theirs/manual for each conflict | Resolution saves correctly |
| 7.2.4 | Implement merge commit creation | Create merge commit after resolution | Merge commit appears in history |
| 7.2.5 | Write unit tests for conflicts | Test detection, resolution, edge cases | 10+ tests passing |

### 7.3 PR Workflow Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 7.3.1 | Implement PR creation from cards | Create PR with card context | PR created on GitHub |
| 7.3.2 | Build PR review interface | Show PR diff, comments, status | Review interface functional |
| 7.3.3 | Add AI-powered PR review | Generate review comments with LLM | AI comments are helpful |
| 7.3.4 | Implement PR merge functionality | Merge PR from Hero IDE | PR merged on GitHub |
| 7.3.5 | Write unit tests for PR workflow | Test create, review, merge | 8+ tests passing |

### 7.4 Issue Sync Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 7.4.1 | Implement issue listing API | Fetch issues from GitHub | Issues displayed correctly |
| 7.4.2 | Build issue-to-card sync | Create cards from issues | Cards created with issue data |
| 7.4.3 | Add bidirectional sync | Update issue when card changes | Changes reflected on GitHub |
| 7.4.4 | Implement GitHub webhooks | Receive real-time updates | Webhook events processed |
| 7.4.5 | Add webhook security | Verify signatures, rate limit | Security tests pass |
| 7.4.6 | Write unit tests for issue sync | Test sync, webhooks, security | 10+ tests passing |

### 7.5 Testing & Red Team QA

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 7.5.1 | Unit test coverage review | Ensure >80% coverage on new code | Coverage report generated |
| 7.5.2 | Integration test suite | Test full GitHub workflow | All integration tests pass |
| 7.5.3 | Large repo testing | Test with repos >1GB | Clone and operations work |
| 7.5.4 | Red Team QA | Adversarial testing | Issues documented and fixed |
| 7.5.5 | Save checkpoint | Commit Sprint 7 completion | Checkpoint saved |

---

## Sprint 8: Advanced Agent Orchestration

**Duration:** 2 weeks equivalent  
**Priority:** High  
**Dependencies:** Prompt-to-Plan (Sprint 6)

### 8.0 Research Phase

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 8.0.1 | Research agent capability modeling | Study skill taxonomies, proficiency scoring | Capability model designed |
| 8.0.2 | Research graph visualization libraries | Compare dagre, elk, vis.js, react-flow | Library selected with rationale |
| 8.0.3 | Research blocker detection algorithms | Study time-based, output-based heuristics | Detection algorithm designed |
| 8.0.4 | Design escalation workflow | Define escalation triggers and actions | Workflow diagram created |

### 8.1 PM Agent Epic Breakdown Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 8.1.1 | Implement epic analysis service | Analyze epic scope and complexity | Analysis report generated |
| 8.1.2 | Build story generation from epic | Break epic into user stories | Stories are right-sized |
| 8.1.3 | Add acceptance criteria generation | Generate AC for each story | AC is testable and clear |
| 8.1.4 | Implement story sizing | Estimate story points | Estimates are consistent |
| 8.1.5 | Write unit tests for epic breakdown | Test analysis, generation, sizing | 8+ tests passing |

### 8.2 Intelligent Task Assignment Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 8.2.1 | Create agent capabilities schema | Store agent skills and proficiency | Schema migration runs |
| 8.2.2 | Implement capability matching | Match task requirements to agent skills | Best-fit agent selected |
| 8.2.3 | Add workload balancing | Distribute tasks evenly | No agent overloaded |
| 8.2.4 | Implement reassignment logic | Reassign when agent is stuck | Reassignment triggers correctly |
| 8.2.5 | Write unit tests for assignment | Test matching, balancing, reassignment | 8+ tests passing |

### 8.3 Dependency Graph Visualization Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 8.3.1 | Install and configure graph library | Set up react-flow or similar | Library renders basic graph |
| 8.3.2 | Build dependency graph component | Render tasks as nodes, deps as edges | Graph displays correctly |
| 8.3.3 | Add critical path highlighting | Highlight longest path | Critical path visible |
| 8.3.4 | Implement interactive features | Zoom, pan, click to view task | Interactions work smoothly |
| 8.3.5 | Add drag-and-drop reordering | Reorder tasks by dragging | Reorder updates dependencies |
| 8.3.6 | Write unit tests for graph | Test rendering, interactions | 6+ tests passing |

### 8.4 Blocker Detection Implementation

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 8.4.1 | Create blockers schema | Store blocker type, status, resolution | Schema migration runs |
| 8.4.2 | Implement time-based detection | Detect tasks stuck >24h | Stuck tasks flagged |
| 8.4.3 | Implement dependency-based detection | Detect unmet dependencies | Blocked tasks flagged |
| 8.4.4 | Build blocker badge component | Show blocker icon on cards | Badge displays correctly |
| 8.4.5 | Add escalation workflow | Notify and suggest unblock actions | Escalation triggers correctly |
| 8.4.6 | Implement unblock suggestions | Generate AI suggestions to unblock | Suggestions are actionable |
| 8.4.7 | Write unit tests for blockers | Test detection, escalation, resolution | 8+ tests passing |

### 8.5 Testing & Red Team QA

| ID | Task | Description | Acceptance Criteria |
|----|------|-------------|---------------------|
| 8.5.1 | Unit test coverage review | Ensure >80% coverage on new code | Coverage report generated |
| 8.5.2 | Integration test suite | Test full orchestration workflow | All integration tests pass |
| 8.5.3 | Scale testing | Test with 100+ tasks, 5+ agents | Performance acceptable |
| 8.5.4 | Red Team QA | Adversarial testing | Issues documented and fixed |
| 8.5.5 | Save checkpoint | Commit Sprint 8 completion | Checkpoint saved |

---

## Success Metrics

### Sprint 6 (Prompt-to-Plan)
- [ ] 40+ unit tests passing
- [ ] Full workflow: prompt → spec → design → tasks → cards
- [ ] Human checkpoints at each phase
- [ ] Spec-to-card traceability maintained

### Sprint 7 (GitHub Integration)
- [ ] 35+ unit tests passing
- [ ] Clone, conflict resolution, PR creation working
- [ ] Issue sync with webhooks
- [ ] Large repo support (>1GB)

### Sprint 8 (Agent Orchestration)
- [ ] 30+ unit tests passing
- [ ] Epic breakdown generates right-sized stories
- [ ] Dependency graph renders with 50+ nodes
- [ ] Blocker detection and escalation working

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM output inconsistency | Use structured output (JSON schema), add validation |
| Large repo performance | Implement shallow clone, lazy loading |
| Webhook reliability | Add retry logic, dead letter queue |
| Graph rendering performance | Virtualize large graphs, limit visible nodes |
| Blocker false positives | Tune detection thresholds, allow manual override |

---

## Execution Order

1. **Sprint 6.0** - Research (EARS, prompts, spec-driven dev)
2. **Sprint 6.1-6.4** - Implementation (Specify, Design, Tasks, Implement)
3. **Sprint 6.5** - Testing & Red Team QA
4. **Sprint 7.0** - Research (git, conflicts, webhooks)
5. **Sprint 7.1-7.4** - Implementation (Clone, Conflicts, PR, Issues)
6. **Sprint 7.5** - Testing & Red Team QA
7. **Sprint 8.0** - Research (capabilities, graphs, blockers)
8. **Sprint 8.1-8.4** - Implementation (Epic, Assignment, Graph, Blockers)
9. **Sprint 8.5** - Testing & Red Team QA
10. **Final Checkpoint** - Push all changes to GitHub

---

*This roadmap will be updated as implementation progresses.*
