# Hero IDE - Agent Handoff Documentation

> **Last Updated:** December 21, 2025  
> **Current Sprint:** Sprint 10 Complete  
> **Total Tests:** 575 passing  
> **Checkpoint Version:** Latest

This document provides all information needed for any AI agent to continue development on Hero IDE from the current state.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current State Summary](#current-state-summary)
3. [Architecture Overview](#architecture-overview)
4. [Key Files and Directories](#key-files-and-directories)
5. [Database Schema](#database-schema)
6. [Completed Sprints](#completed-sprints)
7. [Remaining Work](#remaining-work)
8. [Known Issues](#known-issues)
9. [Development Workflow](#development-workflow)
10. [Testing Strategy](#testing-strategy)
11. [Environment Variables](#environment-variables)
12. [Quick Start Commands](#quick-start-commands)

---

## Project Overview

Hero IDE is an AI-powered development platform that combines project management, AI agents, and code editing into a unified workflow. The core differentiator is the **Prompt-to-Plan** workflow that transforms natural language requirements into structured specifications, designs, tasks, and implementations.

### Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| User Authentication | Complete | Manus OAuth integration |
| Project Management | Complete | Projects, Kanban boards, sprints |
| AI Chat | Complete | Multi-model chat with streaming |
| AI Agents | Complete | Configurable agents with personas |
| Context Engine | Complete | Semantic search with Gemini embeddings |
| Prompt-to-Plan | Complete | EARS requirements → Design → Tasks → Implement |
| GitHub Integration | Complete | OAuth, repos, files, PRs, webhooks |
| Agent Orchestration | Complete | PM Agent, task assignment, blocker detection |

---

## Current State Summary

### Sprint Progress

```
Sprint 1-4: Foundation, Projects, Agents, Basic GitHub ✓
Sprint 5: Context Engine ✓
Sprint 6: Prompt-to-Plan Workflow ✓
Sprint 7: Enhanced GitHub Integration ✓
Sprint 8: Agent Orchestration ✓
Sprint 9: Sprint Planning & Cost Management ✓
Sprint 10: Polish & UX ✓
```

### Test Coverage

- **Total Tests:** 575 passing
- **Sprint 4 (GitHub):** 30 tests
- **Sprint 5 (Context):** 51 tests
- **Sprint 6 (Prompt-to-Plan):** 38 tests
- **Sprint 7 (Enhanced GitHub):** 45 tests
- **Sprint 8 (Agent Orchestration):** 39 tests

---

## Architecture Overview

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui |
| Backend | Express 4, tRPC 11 |
| Database | MySQL/TiDB via Drizzle ORM |
| AI | Gemini API (embeddings, LLM) |
| Auth | Manus OAuth |
| Storage | S3 via Manus Forge API |

### Directory Structure

```
hero-ide/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── agents/     # Agent orchestration UI
│   │   │   ├── context/    # Context Engine UI
│   │   │   ├── specs/      # Prompt-to-Plan UI
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── pages/          # Page components
│   │   └── lib/            # Utilities, tRPC client
│   └── public/             # Static assets
├── server/                 # Express backend
│   ├── _core/              # Framework (DO NOT EDIT)
│   ├── agents/             # Agent orchestration services
│   ├── context/            # Context Engine services
│   ├── github/             # GitHub integration services
│   ├── kanban/             # Kanban board services
│   ├── specs/              # Prompt-to-Plan services
│   └── routers.ts          # Main tRPC router
├── drizzle/                # Database schema
├── docs/                   # Documentation
│   ├── research/           # Sprint research documents
│   ├── BETA_ROADMAP.md     # Full roadmap
│   └── ATOMIC_ROADMAP_SPRINTS_6_8.md
├── shared/                 # Shared constants/types
└── todo.md                 # Task tracking
```

---

## Key Files and Directories

### Must-Read Files

| File | Purpose |
|------|---------|
| `todo.md` | Current task status, all completed/pending items |
| `docs/BETA_ROADMAP.md` | Full project roadmap with all sprints |
| `drizzle/schema.ts` | Complete database schema |
| `server/routers.ts` | Main tRPC router with all endpoints |
| `AGENT_CONFIGURATION_FRAMEWORK.md` | Agent persona and capability design |

### Key Service Files

| Service | File | Description |
|---------|------|-------------|
| Context Engine | `server/context/hybridSearch.ts` | Hybrid keyword+semantic+graph search |
| Context Engine | `server/context/geminiEmbedding.ts` | Gemini embedding integration |
| Prompt-to-Plan | `server/specs/earsGenerator.ts` | EARS requirements generator |
| Prompt-to-Plan | `server/specs/codebaseAnalysis.ts` | Design phase codebase analysis |
| Prompt-to-Plan | `server/specs/taskBreakdown.ts` | Task breakdown with dependencies |
| Prompt-to-Plan | `server/specs/implementationService.ts` | Implementation execution |
| GitHub | `server/github/gitService.ts` | Repository cloning operations |
| GitHub | `server/github/conflictService.ts` | Merge conflict detection |
| GitHub | `server/github/webhookService.ts` | Webhook handling |
| GitHub | `server/github/prReviewService.ts` | AI PR review |
| Agents | `server/agents/pmAgent.ts` | PM Agent epic breakdown |

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles |
| `projects` | Project metadata |
| `kanbanColumns` | Kanban board columns |
| `kanbanCards` | Kanban cards/tasks |
| `agents` | AI agent configurations |
| `agentExecutions` | Agent execution history |

### Context Engine Tables

| Table | Purpose |
|-------|---------|
| `contextChunks` | Indexed code chunks with embeddings |
| `contextIndexStatus` | Indexing progress per project |

### Prompt-to-Plan Tables

| Table | Purpose |
|-------|---------|
| `specs` | Specifications with phase workflow |
| `specVersions` | Spec version history |

### GitHub Integration Tables

| Table | Purpose |
|-------|---------|
| `githubConnections` | User GitHub OAuth tokens |
| `clonedRepos` | Cloned repository metadata |
| `mergeConflicts` | Detected merge conflicts |
| `pullRequests` | PR tracking with AI review |
| `githubIssues` | Synced GitHub issues |
| `webhookEvents` | Webhook event log |
| `prReviewComments` | PR review comments |

---

## Completed Sprints

### Sprint 5: Context Engine

- **Gemini Embeddings:** 768-dimension vectors with LRU caching
- **Hybrid Search:** Keyword + semantic + graph-based retrieval
- **Context Ranking:** Token budget management with knapsack selection
- **Output Formats:** Markdown, compact, XML

### Sprint 6: Prompt-to-Plan Workflow

- **Specify Phase:** EARS requirements with clarification dialog
- **Design Phase:** Codebase analysis, data models, API contracts, Mermaid diagrams
- **Tasks Phase:** Task breakdown with dependencies, critical path, agent assignment
- **Implement Phase:** Execution engine, verification service, progress tracking

### Sprint 7: Enhanced GitHub Integration

- **Repository Cloning:** Shallow/sparse checkout support
- **Merge Conflicts:** 3-way detection with AI resolution suggestions
- **Webhooks:** Signature verification, idempotency, event routing
- **AI PR Review:** Code quality analysis, security scanning

### Sprint 8: Agent Orchestration

- **PM Agent:** Epic breakdown, story generation, acceptance criteria
- **Task Assignment:** Skill matching, load balancing, success rate weighting
- **Dependency Graph:** SVG visualization with zoom/pan, critical path highlighting
- **Blocker Detection:** Time-based, dependency-based, resource blockers

### Sprint 9: Sprint Planning & Cost Management

- **Sprint CRUD:** Create, read, update, delete sprints with project association
- **Velocity Tracking:** Story points per sprint, rolling averages (3 and 5 sprint)
- **Burndown Charts:** Ideal vs actual burndown, daily metrics, forecasting
- **Budget Management:** Budget CRUD, cost tracking, alerts, breakdown analytics
- **GitHub OAuth:** Configured (Client ID: Ov23liiYaWrtah6iuULr)
- **Prompt-to-Plan Testing:** Verified end-to-end (PM Agent generates EARS clarifying questions)

---

## Remaining Work

### Sprint 9: Sprint Planning & Cost Management ✓ COMPLETE

- [x] Sprint CRUD operations (sprintService.ts)
- [x] Velocity tracking (calculateSprintVelocity, rolling averages)
- [x] Burndown charts (calculateBurndown, sprintMetrics table)
- [x] Budget allocation (budgetService.ts)
- [x] Cost breakdown dashboard (costEntries, dailyCostAggregates tables)
- [x] 41 new unit tests

### Sprint 10: Polish & UX ✓ COMPLETE

- **Sprint Planning UI:** SprintDashboard with velocity charts, burndown graphs, sprint selector
- **Quick Action Buttons:** Desktop horizontal bar + mobile FAB with keyboard shortcuts
- **Actions:** Create Sprint, Execute Sprint, Run QA Protocol, Generate Report
- **Keyboard Shortcuts:** Ctrl+Shift+N (create), Ctrl+Shift+E (execute), Ctrl+Shift+Q (QA)

---

## Known Issues

### Critical

| Issue | Status | Notes |
|-------|--------|-------|
| Vercel deployment shows raw JS | Fixed | Added vercel.json configuration |

### Medium Priority

| Issue | Notes |
|-------|-------|
| GitHub OAuth not configured | Needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET |
| Gemini API key validation | Key provided, validated successfully |

---

## Development Workflow

### Starting Development

```bash
# Clone the repository
gh repo clone EvanTenenbaum/Hero

# Install dependencies
cd Hero && pnpm install

# Start development server
pnpm dev
```

### Making Changes

1. Read `todo.md` to understand current state
2. Add new tasks to `todo.md` before starting
3. Implement changes
4. Write/update unit tests in `*.test.ts` files
5. Run tests: `pnpm test`
6. Mark completed items in `todo.md`
7. Save checkpoint: `webdev_save_checkpoint`
8. Push to GitHub

### Database Changes

```bash
# After editing drizzle/schema.ts
pnpm db:push
```

---

## Testing Strategy

### Test File Locations

| Feature | Test File |
|---------|-----------|
| Auth | `server/auth.logout.test.ts` |
| Features | `server/features.test.ts` |
| Context Engine | `server/context/context-engine.test.ts` |
| Prompt-to-Plan | `server/specs/prompt-to-plan.test.ts` |
| GitHub (Sprint 4) | `server/github/github.test.ts` |
| GitHub (Sprint 7) | `server/github/sprint7.test.ts` |
| Agents | `server/agents/sprint8.test.ts` |

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/context

# Run with coverage
pnpm test --coverage
```

---

## Environment Variables

### Required (Auto-injected by Manus)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Session signing |
| `VITE_APP_ID` | Manus OAuth app ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend |
| `BUILT_IN_FORGE_API_URL` | Manus APIs |
| `BUILT_IN_FORGE_API_KEY` | Manus API key |

### Optional (User-provided)

| Variable | Purpose | Status |
|----------|---------|--------|
| `GEMINI_API_KEY` | Semantic search embeddings | Configured |
| `GITHUB_CLIENT_ID` | GitHub OAuth | Configured (Ov23liiYaWrtah6iuULr) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | Configured |

---

## Quick Start Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm test             # Run all tests
pnpm db:push          # Push schema changes

# TypeScript
npx tsc --noEmit      # Type check

# Git
git add -A && git commit -m "message" && git push origin main
```

---

## Research Documents

The following research documents inform the implementation:

| Document | Location |
|----------|----------|
| Sprint 6 Research | `docs/research/SPRINT_6_RESEARCH.md` |
| Sprint 7 Research | `docs/research/SPRINT_7_RESEARCH.md` |
| Cursor Codebase Indexing | `research/cursor_codebase_indexing.md` |
| Sourcegraph Context Retrieval | `research/sourcegraph_context_retrieval.md` |
| Research Summary | `research/RESEARCH_SUMMARY.md` |

---

## Contact

For questions about this project, refer to the GitHub repository: [EvanTenenbaum/Hero](https://github.com/EvanTenenbaum/Hero)

---

*This document was generated by Manus AI on December 21, 2025.*
