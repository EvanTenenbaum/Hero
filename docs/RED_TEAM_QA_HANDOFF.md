# Hero IDE Red Team QA Handoff Document

**Version**: 1.0.0-beta  
**Date**: December 21, 2025  
**Author**: Manus AI  
**Purpose**: Complete context for AI agent to perform comprehensive QA and system improvements

---

## Executive Summary

Hero IDE is an AI-powered development environment built with React, TypeScript, Express, and tRPC. The application features a multi-pane workspace with Kanban boards, GitHub integration, multi-agent chat, and embedded browsing capabilities. This document provides everything needed for a Red Team QA agent to perform thorough security audits, functional testing, and system improvements.

The system currently has **794 passing tests** across 28 test files, with security-focused tests covering prompt injection, dangerous command detection, and input validation. However, several areas require additional scrutiny including authentication edge cases, API rate limiting, and cross-site scripting prevention.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Authentication & Authorization](#authentication--authorization)
6. [Security Attack Surfaces](#security-attack-surfaces)
7. [Current Test Coverage](#current-test-coverage)
8. [Known Issues & Technical Debt](#known-issues--technical-debt)
9. [Feature Inventory](#feature-inventory)
10. [QA Testing Checklist](#qa-testing-checklist)
11. [Improvement Opportunities](#improvement-opportunities)
12. [File Structure Reference](#file-structure-reference)
13. [Environment & Configuration](#environment--configuration)

---

## System Architecture

Hero IDE follows a layered architecture with clear separation between presentation, state management, API, service, and data layers.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
│  WorkspaceShell → ContentPane → [BoardPane|GitHubPane|BrowserPane] │
│  AgentPanel → AIChatBox                                             │
│  MobileWorkspace (responsive)                                       │
├─────────────────────────────────────────────────────────────────────┤
│                          STATE LAYER                                │
│  useWorkspaceState (pane contents, sizes, collapsed states)        │
│  useKanban (boards, columns, cards, mutations)                     │
│  useAuth (user session)                                            │
│  tRPC QueryClient (server state cache)                             │
├─────────────────────────────────────────────────────────────────────┤
│                           API LAYER                                 │
│  tRPC Router: auth | kanban | github | chat | system               │
│  Procedures: publicProcedure | protectedProcedure                  │
├─────────────────────────────────────────────────────────────────────┤
│                         SERVICE LAYER                               │
│  LLM Integration (invokeLLM) | Safety Checker | Cost Tracker       │
│  GitHub OAuth & API | Context Engine | Execution Engine            │
├─────────────────────────────────────────────────────────────────────┤
│                          DATA LAYER                                 │
│  Drizzle ORM → MySQL/TiDB                                          │
│  52 database tables                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

The workspace layout follows this structure:

```
App.tsx
└── WorkspacePage.tsx
    └── WorkspaceShell.tsx
        ├── Sidebar (collapsible)
        ├── ResizablePanelGroup (3 panes)
        │   ├── ContentPane (pane 1) → BoardPane | GitHubPane | BrowserPane | SpecPane
        │   ├── ContentPane (pane 2)
        │   └── ContentPane (pane 3)
        └── AgentPanel (collapsible right)
            ├── Agent tabs (PM, Dev, QA, DevOps, Research)
            └── Chat interface with MetaModeChat toggle
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui | Latest |
| State Management | tRPC + React Query | 11.x |
| Backend | Express.js | 4.x |
| API Layer | tRPC | 11.x |
| Database ORM | Drizzle | Latest |
| Database | MySQL/TiDB | 8.x compatible |
| Authentication | Manus OAuth + JWT | Custom |
| LLM Integration | Gemini API | 2.5-flash |
| Testing | Vitest | Latest |
| Build Tool | Vite | Latest |
| Language | TypeScript | 5.x |

### Key Dependencies

```json
{
  "@dnd-kit/core": "Drag and drop for Kanban",
  "@monaco-editor/react": "Code editor",
  "streamdown": "Markdown streaming",
  "zod": "Schema validation",
  "superjson": "JSON serialization with types"
}
```

---

## Database Schema

The system uses 52 database tables organized into functional domains:

### Core User & Auth Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, openId, name, email, role (user/admin) |
| `githubConnections` | GitHub OAuth tokens | userId, accessToken, refreshToken |
| `driveConnections` | Google Drive OAuth | userId, accessToken, refreshToken |
| `userSettings` | User preferences | userId, theme, notifications |
| `userAgentRules` | Custom agent rules | userId, agentType, ruleContent |

### Project Management Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `projects` | Project metadata | userId, name, type, githubRepoFullName |
| `projectNotes` | Context notes | projectId, category, content |
| `requirements` | Project requirements | projectId, title, status |
| `technicalDesigns` | Design documents | projectId, content |

### Kanban System Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `kanbanBoards` | Board containers | userId, name, description |
| `kanbanColumns` | Board columns | boardId, name, position |
| `kanbanCards` | Task cards | columnId, title, description, assignedAgent |
| `cardDependencies` | Card relationships | cardId, dependsOnCardId |
| `cardHistory` | Audit trail | cardId, action, previousValue, newValue |
| `cardComments` | Card comments | cardId, userId, content |
| `boardLabels` | Card labels | boardId, name, color |

### Chat & Agent Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `chatConversations` | Conversation containers | userId, projectId, type |
| `chatMessages` | Individual messages | conversationId, role, content, tokensUsed |
| `agents` | Agent configurations | userId, type, systemPrompt, trustLevel |
| `agentExecutions` | Execution tracking | agentId, goal, state, stepsCompleted |
| `agentCheckpoints` | Rollback points | executionId, state, timestamp |
| `agentLogs` | Structured logging | executionId, level, message |
| `executionSteps` | Step-by-step tracking | executionId, action, status |
| `agentSessions` | Session management | userId, agentType, context |
| `promptTemplates` | System prompts | agentType, template, version |

### Context Engine Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `contextChunks` | Code chunks for search | projectId, filePath, content, embedding |
| `contextQueries` | Search history | userId, query, results |
| `contextIndexStatus` | Indexing progress | projectId, status, lastIndexed |

### Spec & Planning Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `specs` | Feature specifications | projectId, title, phase, status |
| `specVersions` | Spec version history | specId, version, content |
| `specCardLinks` | Spec-to-card links | specId, cardId |
| `specComments` | Spec comments | specId, userId, content |

### GitHub Integration Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `clonedRepos` | Cloned repositories | userId, repoFullName, localPath |
| `webhookEvents` | GitHub webhooks | eventType, payload, processed |
| `mergeConflicts` | Conflict tracking | repoId, filePath, status |
| `pullRequests` | PR tracking | repoId, prNumber, state |
| `githubIssues` | Issue sync | repoId, issueNumber, state |
| `prReviewComments` | AI review comments | prId, comment, severity |

### Sprint & Budget Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sprints` | Sprint containers | boardId, name, startDate, endDate |
| `sprintMetrics` | Sprint analytics | sprintId, velocity, burndown |
| `velocityHistory` | Historical velocity | boardId, sprintId, points |
| `budgets` | Budget tracking | userId, limitUsd, usedUsd |
| `costEntries` | Cost records | userId, tokens, costUsd |
| `dailyCostAggregates` | Daily summaries | userId, date, totalCost |
| `budgetUsage` | Usage tracking | userId, agentId, tokensUsed |

### Governance Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `changeRequests` | Change lifecycle | projectId, type, status |
| `violations` | Rule violations | executionId, rule, severity |
| `secrets` | Encrypted secrets | userId, name, encryptedValue |
| `hooks` | Event hooks | projectId, event, action |
| `hookExecutions` | Hook run history | hookId, status, result |
| `metricsDaily` | Daily metrics | userId, date, metrics |

---

## API Endpoints

The API is organized into tRPC routers. All endpoints use either `publicProcedure` (no auth required) or `protectedProcedure` (requires valid JWT session).

### Auth Router (`auth.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `auth.me` | query | public | Get current user or null |
| `auth.logout` | mutation | public | Clear session cookie |

### Projects Router (`projects.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `projects.list` | query | protected | List user's projects |
| `projects.get` | query | protected | Get project by ID |
| `projects.create` | mutation | protected | Create new project |
| `projects.update` | mutation | protected | Update project |
| `projects.delete` | mutation | protected | Delete project |

### Chat Router (`chat.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `chat.conversations` | query | protected | List conversations |
| `chat.getConversation` | query | protected | Get conversation by ID |
| `chat.createConversation` | mutation | protected | Create conversation |
| `chat.getMessages` | query | protected | Get messages in conversation |
| `chat.sendMessage` | mutation | protected | Send message with LLM response |

### Kanban Router (`kanban.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `kanban.getBoards` | query | protected | List user's boards |
| `kanban.getBoard` | query | protected | Get board with columns/cards |
| `kanban.createBoard` | mutation | protected | Create board |
| `kanban.updateBoard` | mutation | protected | Update board |
| `kanban.deleteBoard` | mutation | protected | Delete board |
| `kanban.createColumn` | mutation | protected | Add column to board |
| `kanban.updateColumn` | mutation | protected | Update column |
| `kanban.deleteColumn` | mutation | protected | Delete column |
| `kanban.createCard` | mutation | protected | Create card |
| `kanban.updateCard` | mutation | protected | Update card |
| `kanban.deleteCard` | mutation | protected | Delete card |
| `kanban.moveCard` | mutation | protected | Move card between columns |
| `kanban.addDependency` | mutation | protected | Add card dependency |
| `kanban.removeDependency` | mutation | protected | Remove dependency |
| `kanban.getDependencyGraph` | query | protected | Get dependency visualization |
| `kanban.createBoardFromTemplate` | mutation | protected | Create from template |
| `kanban.linkCardToSpec` | mutation | protected | Link card to spec |
| `kanban.unlinkCardFromSpec` | mutation | protected | Unlink card from spec |

### GitHub Router (`github.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `github.getConnection` | query | protected | Get GitHub connection status |
| `github.disconnect` | mutation | protected | Remove GitHub connection |
| `github.listRepos` | query | protected | List user's repositories |
| `github.searchRepos` | query | protected | Search GitHub repos |
| `github.getFileTree` | query | protected | Get repo file tree |
| `github.getFileContent` | query | protected | Get file content |
| `github.updateFile` | mutation | protected | Update file in repo |
| `github.deleteFile` | mutation | protected | Delete file |
| `github.listBranches` | query | protected | List branches |
| `github.createBranch` | mutation | protected | Create branch |
| `github.listPRs` | query | protected | List pull requests |
| `github.createPR` | mutation | protected | Create pull request |
| `github.getPR` | query | protected | Get PR details |
| `github.getPRFiles` | query | protected | Get PR changed files |
| `github.getPRDiff` | query | protected | Get PR diff |
| `github.mergePR` | mutation | protected | Merge pull request |
| `github.listIssues` | query | protected | List issues |
| `github.createIssue` | mutation | protected | Create issue |
| `github.cloneRepo` | mutation | protected | Clone repository |
| `github.syncRepo` | mutation | protected | Sync cloned repo |

### Specs Router (`specs.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `specs.create` | mutation | protected | Create specification |
| `specs.list` | query | protected | List specifications |
| `specs.get` | query | protected | Get spec by ID |
| `specs.update` | mutation | protected | Update specification |
| `specs.delete` | mutation | protected | Delete specification |
| `specs.generateRequirements` | mutation | protected | Generate EARS requirements |
| `specs.generateDesign` | mutation | protected | Generate design document |
| `specs.generateTasks` | mutation | protected | Break down into tasks |
| `specs.startImplementation` | mutation | protected | Start implementation phase |

### Context Router (`context.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `context.indexProject` | mutation | protected | Index project files |
| `context.getIndexStatus` | query | protected | Get indexing status |
| `context.search` | query | protected | Semantic code search |
| `context.getChunks` | query | protected | Get code chunks |
| `context.retrieveContext` | query | protected | Get context for prompt |

### Sprint Router (`sprints.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `sprints.create` | mutation | protected | Create sprint |
| `sprints.list` | query | protected | List sprints |
| `sprints.get` | query | protected | Get sprint details |
| `sprints.update` | mutation | protected | Update sprint |
| `sprints.delete` | mutation | protected | Delete sprint |
| `sprints.start` | mutation | protected | Start sprint |
| `sprints.complete` | mutation | protected | Complete sprint |
| `sprints.getMetrics` | query | protected | Get sprint metrics |
| `sprints.getBurndown` | query | protected | Get burndown data |

### Kickoff Router (`kickoff.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `kickoff.generateNorthStar` | mutation | protected | Generate north star doc |
| `kickoff.generateProductBrief` | mutation | protected | Generate product brief |
| `kickoff.generateArchitecture` | mutation | protected | Generate architecture |
| `kickoff.generateQualityBar` | mutation | protected | Generate quality bar |
| `kickoff.generateSliceMap` | mutation | protected | Generate slice map |
| `kickoff.saveDocument` | mutation | protected | Save kickoff document |
| `kickoff.getDocuments` | query | protected | Get kickoff documents |

### Meta Router (`meta.*`)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `meta.analyzeRequest` | mutation | protected | Analyze modification request |
| `meta.generateChanges` | mutation | protected | Generate code changes |
| `meta.previewChanges` | query | protected | Preview proposed changes |
| `meta.applyChanges` | mutation | protected | Apply modifications |
| `meta.getAuditLog` | query | protected | Get modification history |
| `meta.rollbackChange` | mutation | protected | Rollback modification |

---

## Authentication & Authorization

### Authentication Flow

1. User clicks "Login" → Redirected to Manus OAuth portal
2. User authenticates → Redirected back with auth code
3. Server exchanges code for tokens → Creates/updates user record
4. Server issues JWT session cookie → User is authenticated
5. All subsequent requests include session cookie
6. Server validates JWT on each `protectedProcedure` call

### Session Management

```typescript
// Cookie configuration
{
  name: "hero_session",
  httpOnly: true,
  secure: true, // in production
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}
```

### Authorization Levels

| Role | Capabilities |
|------|--------------|
| `user` | Standard access to own resources |
| `admin` | Full access, can manage all users |

### Protected Resource Access

All protected procedures verify:
1. Valid JWT in session cookie
2. User exists in database
3. User owns the requested resource (userId match)

---

## Security Attack Surfaces

### High Priority Attack Vectors

#### 1. Prompt Injection (LLM Security)

**Location**: `server/chatAgent.ts`, `server/agents/safetyChecker.ts`

**Current Protections**:
- Pattern matching for "ignore instructions", "system prompt", "jailbreak"
- Dangerous command detection (rm -rf, DROP TABLE, format)
- Risk level classification (low, medium, high, critical)

**Testing Required**:
- Unicode obfuscation attacks
- Multi-language injection attempts
- Encoded payload injection (base64, hex)
- Indirect injection via file content
- Context manipulation attacks

#### 2. SQL Injection

**Location**: All database operations via Drizzle ORM

**Current Protections**:
- Drizzle ORM parameterized queries
- Zod input validation on all procedures

**Testing Required**:
- JSON field injection in settings/rules
- Search query injection
- Order by injection
- LIKE clause injection

#### 3. Cross-Site Scripting (XSS)

**Location**: All user-generated content display

**Current Protections**:
- React's automatic escaping
- Markdown rendering via streamdown

**Testing Required**:
- Markdown XSS vectors
- SVG injection in file uploads
- Event handler injection
- CSS injection

#### 4. Authentication Bypass

**Location**: `server/_core/context.ts`, `server/_core/cookies.ts`

**Testing Required**:
- JWT token manipulation
- Session fixation
- Cookie theft scenarios
- OAuth callback manipulation
- Token refresh race conditions

#### 5. Authorization Bypass

**Location**: All `protectedProcedure` implementations

**Testing Required**:
- IDOR (Insecure Direct Object Reference)
- Resource access across users
- Role escalation
- Bulk enumeration attacks

#### 6. Rate Limiting (Missing)

**Location**: All API endpoints

**Current Status**: No rate limiting implemented

**Testing Required**:
- Brute force login attempts
- API abuse scenarios
- LLM cost exhaustion attacks
- Denial of service vectors

### Medium Priority Attack Vectors

#### 7. GitHub OAuth Token Security

**Location**: `server/github/router.ts`, `drizzle/schema.ts`

**Testing Required**:
- Token storage encryption
- Token refresh handling
- Scope escalation
- Token leakage in logs

#### 8. File Upload Security

**Location**: S3 storage integration

**Testing Required**:
- File type validation
- File size limits
- Malicious file content
- Path traversal

#### 9. WebSocket/SSE Security

**Location**: Real-time execution updates

**Testing Required**:
- Connection hijacking
- Message injection
- Replay attacks

#### 10. Browser Pane Security

**Location**: `client/src/components/workspace/panes/BrowserPane.tsx`

**Current Limitations**:
- iframe sandbox restrictions
- X-Frame-Options blocking

**Testing Required**:
- Clickjacking via iframe
- Data exfiltration
- Cross-origin attacks

---

## Current Test Coverage

### Test Summary

| Metric | Value |
|--------|-------|
| Total Tests | 794 |
| Test Files | 28 |
| Pass Rate | 100% |
| Duration | ~6.6s |

### Test Files by Category

#### Security Tests
| File | Tests | Coverage |
|------|-------|----------|
| `security-edge-cases.test.ts` | 45 | Prompt injection, dangerous commands, input validation |
| `qa-sprint24.test.ts` | 57 | Security audit, performance, accessibility |

#### Feature Tests
| File | Tests | Coverage |
|------|-------|----------|
| `kanban.test.ts` | 21 | Board, column, card CRUD |
| `github.test.ts` | 30 | OAuth, repos, files, PRs |
| `context-engine.test.ts` | 51 | Indexing, search, retrieval |
| `prompt-to-plan.test.ts` | 38 | Spec workflow |
| `kickoff.test.ts` | 27 | Kickoff protocol |
| `meta.test.ts` | 40 | Self-modifying IDE |
| `workspace.test.ts` | 32 | Workspace layout |
| `sprint.test.ts` | 44 | Sprint management |

#### Integration Tests
| File | Tests | Coverage |
|------|-------|----------|
| `agent-system.test.ts` | 29 | Agent execution |
| `sprint7.test.ts` | 45 | GitHub cloning, webhooks |
| `sprint8.test.ts` | 39 | Agent orchestration |
| `sprint20.test.ts` | 80 | Issue sync, PR reviews |

### Coverage Gaps

The following areas lack dedicated test coverage:

1. **Authentication edge cases** - Token expiration, refresh flows
2. **Rate limiting** - Not implemented, not tested
3. **Concurrent operations** - Race conditions in card moves
4. **Large data sets** - Performance with 1000+ cards
5. **Mobile responsiveness** - No automated mobile tests
6. **Keyboard shortcuts** - Not tested
7. **Error recovery** - Network failure scenarios

---

## Known Issues & Technical Debt

### Critical Issues

None currently identified.

### High Priority Issues

| Issue | Location | Description | Suggested Fix |
|-------|----------|-------------|---------------|
| No rate limiting | All endpoints | API abuse possible | Implement express-rate-limit |
| Duplicate boards | Database | Test data pollution | Add unique constraint |
| Board refresh | BoardPane.tsx | New board not shown | Invalidate query cache |

### Medium Priority Issues

| Issue | Location | Description | Suggested Fix |
|-------|----------|-------------|---------------|
| Browser pane blocks | BrowserPane.tsx | Most sites blocked | Proxy or accept limitation |
| iframe error detection | BrowserPane.tsx | No error event fires | Timeout-based detection |
| Loading flash | Pane transitions | Brief empty state | Add skeleton loaders |
| Token storage | GitHub OAuth | Plain text in DB | Encrypt at rest |

### Low Priority Issues

| Issue | Location | Description | Suggested Fix |
|-------|----------|-------------|---------------|
| Pane sync confusion | useWorkspaceState | Same board in 2 panes | Visual indicator |
| Keyboard shortcuts | useKeyboardShortcuts | Not fully tested | Add E2E tests |
| Mobile layout | MobileWorkspace | Not device tested | Manual QA needed |

### Technical Debt

1. **Router file size** - `server/routers.ts` is 1486 lines, should be split
2. **Duplicate route definitions** - Some routes defined twice in todo.md
3. **Commented code** - Some files have commented-out code blocks
4. **Type assertions** - Some `as any` casts need proper typing
5. **Error messages** - Some errors lack user-friendly messages
6. **Logging** - Inconsistent logging across services

---

## Feature Inventory

### Core Features (Implemented)

| Feature | Status | Test Coverage |
|---------|--------|---------------|
| User authentication | ✅ Complete | Partial |
| Project management | ✅ Complete | Good |
| Kanban boards | ✅ Complete | Good |
| Card dependencies | ✅ Complete | Good |
| Board templates | ✅ Complete | Partial |
| Timeline view | ✅ Complete | Partial |
| Calendar view | ✅ Complete | Partial |
| Multi-agent chat | ✅ Complete | Good |
| Safety checker | ✅ Complete | Good |
| Cost tracking | ✅ Complete | Good |
| GitHub OAuth | ✅ Complete | Good |
| File browsing | ✅ Complete | Good |
| Code editor | ✅ Complete | Partial |
| Context engine | ✅ Complete | Good |
| Semantic search | ✅ Complete | Good |
| Spec workflow | ✅ Complete | Good |
| Sprint planning | ✅ Complete | Good |
| Kickoff protocol | ✅ Complete | Good |
| Self-modifying IDE | ✅ Complete | Good |
| Design system | ✅ Complete | Good |
| Mobile layout | ✅ Complete | Not tested |
| Theme toggle | ✅ Complete | Partial |

### Partially Implemented Features

| Feature | Status | Missing |
|---------|--------|---------|
| GitHub cloning | 🔶 Partial | UI integration |
| PR reviews | 🔶 Partial | Full workflow |
| Issue sync | 🔶 Partial | Bidirectional sync |
| Google Drive | 🔶 Partial | OAuth credentials |
| Drag-to-reschedule | 🔶 Partial | Timeline drag |
| Quick switcher | 🔶 Partial | Cmd+K not implemented |

### Not Implemented Features

| Feature | Priority | Notes |
|---------|----------|-------|
| Rate limiting | High | Security requirement |
| MCP integration | Medium | Future roadmap |
| Real-time collaboration | Low | Multi-user editing |
| Offline support | Low | PWA capability |

---

## QA Testing Checklist

### Authentication Testing

- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Session persistence across browser restart
- [ ] Session expiration handling
- [ ] Logout clears all session data
- [ ] Protected routes redirect to login
- [ ] OAuth callback validation
- [ ] JWT token tampering detection
- [ ] Concurrent session handling

### Authorization Testing

- [ ] User can only access own projects
- [ ] User can only access own boards
- [ ] User can only access own conversations
- [ ] Admin can access all resources
- [ ] Role escalation prevention
- [ ] IDOR testing on all endpoints
- [ ] Bulk enumeration prevention

### Input Validation Testing

- [ ] Empty string handling
- [ ] Very long string handling (100k+ chars)
- [ ] Unicode character handling
- [ ] Special character handling
- [ ] Null/undefined handling
- [ ] Negative number handling
- [ ] SQL injection attempts
- [ ] XSS payload attempts
- [ ] JSON injection attempts

### LLM Security Testing

- [ ] "Ignore instructions" injection
- [ ] System prompt extraction
- [ ] Jailbreak attempts
- [ ] DAN mode attempts
- [ ] Encoded payload injection
- [ ] Multi-language injection
- [ ] Indirect injection via context
- [ ] Token exhaustion attacks

### Functional Testing

- [ ] Create/read/update/delete projects
- [ ] Create/read/update/delete boards
- [ ] Create/read/update/delete columns
- [ ] Create/read/update/delete cards
- [ ] Card drag-and-drop between columns
- [ ] Card dependency management
- [ ] Board template creation
- [ ] Timeline view rendering
- [ ] Calendar view rendering
- [ ] Agent chat functionality
- [ ] Agent switching
- [ ] GitHub OAuth connection
- [ ] Repository listing
- [ ] File tree navigation
- [ ] File content viewing
- [ ] File editing and saving
- [ ] Branch management
- [ ] PR creation and viewing
- [ ] Context indexing
- [ ] Semantic search
- [ ] Spec generation
- [ ] Sprint management
- [ ] Kickoff wizard
- [ ] Self-modifying IDE
- [ ] Theme toggle
- [ ] Mobile navigation

### Performance Testing

- [ ] Page load time < 3s
- [ ] API response time < 500ms
- [ ] Board with 100+ cards
- [ ] Search with 1000+ chunks
- [ ] Concurrent user simulation
- [ ] Memory leak detection
- [ ] Bundle size analysis

### Accessibility Testing

- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast ratios
- [ ] Focus indicators
- [ ] ARIA labels
- [ ] Alt text for images
- [ ] Form field labels

### Mobile Testing

- [ ] Responsive layout
- [ ] Touch interactions
- [ ] Bottom navigation
- [ ] Swipe gestures
- [ ] Bottom sheet behavior
- [ ] Viewport scaling

---

## Improvement Opportunities

### Security Improvements

1. **Implement rate limiting** - Add express-rate-limit middleware with tiered limits
2. **Encrypt OAuth tokens** - Use AES-256 encryption for stored tokens
3. **Add CSRF protection** - Implement CSRF tokens for mutations
4. **Content Security Policy** - Add strict CSP headers
5. **Input sanitization** - Add DOMPurify for user content
6. **Audit logging** - Log all security-relevant events

### Performance Improvements

1. **Database indexing** - Add indexes for frequently queried fields
2. **Query optimization** - Use select() to limit returned fields
3. **Caching layer** - Add Redis for session and query caching
4. **Bundle splitting** - Implement route-based code splitting
5. **Image optimization** - Compress and lazy-load images
6. **API pagination** - Add cursor-based pagination

### Code Quality Improvements

1. **Split routers.ts** - Break into domain-specific router files
2. **Remove dead code** - Clean up commented sections
3. **Type safety** - Replace `as any` with proper types
4. **Error handling** - Standardize error responses
5. **Logging** - Implement structured logging with levels
6. **Documentation** - Add JSDoc comments to all functions

### UX Improvements

1. **Loading states** - Add skeleton loaders everywhere
2. **Error messages** - User-friendly error descriptions
3. **Empty states** - Helpful empty state messages
4. **Onboarding** - First-time user tutorial
5. **Keyboard shortcuts** - Complete shortcut implementation
6. **Accessibility** - Full WCAG 2.1 AA compliance

### Feature Improvements

1. **Real-time updates** - WebSocket for live collaboration
2. **Offline support** - Service worker for offline access
3. **Export/import** - Board and project export
4. **Notifications** - In-app and email notifications
5. **Search** - Global search across all content
6. **Analytics** - Usage analytics dashboard

---

## File Structure Reference

```
hero-ide/
├── client/
│   └── src/
│       ├── components/
│       │   ├── workspace/           # Workspace layout
│       │   │   ├── WorkspaceShell.tsx
│       │   │   ├── ContentPane.tsx
│       │   │   ├── AgentPanel.tsx
│       │   │   ├── MobileWorkspace.tsx
│       │   │   └── panes/
│       │   │       ├── BoardPane.tsx
│       │   │       ├── GitHubPane.tsx
│       │   │       ├── BrowserPane.tsx
│       │   │       ├── EditorPane.tsx
│       │   │       ├── DrivePane.tsx
│       │   │       ├── SpecPane.tsx
│       │   │       └── SearchPane.tsx
│       │   ├── kanban/              # Kanban components
│       │   │   ├── KanbanBoard.tsx
│       │   │   ├── KanbanColumn.tsx
│       │   │   ├── KanbanCard.tsx
│       │   │   └── DependencyGraph.tsx
│       │   ├── context/             # Context engine UI
│       │   │   ├── IndexingStatus.tsx
│       │   │   ├── CodeSearch.tsx
│       │   │   ├── ContextSearch.tsx
│       │   │   └── ContextPreview.tsx
│       │   ├── specs/               # Spec workflow UI
│       │   │   ├── SpecPanel.tsx
│       │   │   └── PromptToPlanWorkflow.tsx
│       │   ├── kickoff/             # Kickoff wizard
│       │   │   └── KickoffWizard.tsx
│       │   ├── meta/                # Self-modifying IDE
│       │   │   ├── MetaModeChat.tsx
│       │   │   └── ChangePreviewPanel.tsx
│       │   └── ui/                  # shadcn/ui components
│       ├── hooks/
│       │   ├── useWorkspaceState.ts
│       │   ├── useKanban.ts
│       │   ├── useChatAgent.ts
│       │   ├── useConfirmation.ts
│       │   ├── useExecutionUpdates.ts
│       │   ├── useKeyboardShortcuts.ts
│       │   └── useMobile.tsx
│       ├── contexts/
│       │   └── ThemeContext.tsx
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── Projects.tsx
│       │   ├── ProjectDetail.tsx
│       │   ├── Chat.tsx
│       │   ├── Agents.tsx
│       │   ├── AgentDetail.tsx
│       │   ├── AgentConfig.tsx
│       │   ├── Board.tsx
│       │   ├── Workspace.tsx
│       │   ├── WorkspacePage.tsx
│       │   ├── Settings.tsx
│       │   ├── Metrics.tsx
│       │   ├── ExecutionHistory.tsx
│       │   └── GitHubCallback.tsx
│       └── lib/
│           ├── trpc.ts
│           └── utils.ts
├── server/
│   ├── routers.ts                   # Main tRPC router
│   ├── db.ts                        # Database helpers
│   ├── chatAgent.ts                 # Chat agent service
│   ├── agents/
│   │   ├── safetyChecker.ts
│   │   ├── promptTemplates.ts
│   │   ├── executionEngine.ts
│   │   ├── toolRegistry.ts
│   │   ├── sessionManager.ts
│   │   ├── contextBuilder.ts
│   │   ├── fileSelector.ts
│   │   ├── logger.ts
│   │   └── executionReplay.ts
│   ├── services/
│   │   ├── costTracker.ts
│   │   ├── rollbackService.ts
│   │   └── metricsRecorder.ts
│   ├── kanban/
│   │   ├── router.ts
│   │   └── db.ts
│   ├── github/
│   │   ├── router.ts
│   │   ├── cloneService.ts
│   │   ├── webhookService.ts
│   │   └── prReviewService.ts
│   ├── context/
│   │   ├── router.ts
│   │   ├── chunker.ts
│   │   ├── embeddings.ts
│   │   ├── search.ts
│   │   └── retrieval.ts
│   ├── specs/
│   │   ├── router.ts
│   │   ├── earsGenerator.ts
│   │   ├── codebaseAnalysis.ts
│   │   ├── taskBreakdown.ts
│   │   └── implementationService.ts
│   ├── sprints/
│   │   └── router.ts
│   ├── kickoff/
│   │   └── router.ts
│   ├── meta/
│   │   ├── router.ts
│   │   └── fileModificationService.ts
│   ├── drive/
│   │   └── router.ts
│   ├── codebase/
│   │   └── router.ts
│   └── _core/
│       ├── llm.ts
│       ├── context.ts
│       ├── cookies.ts
│       ├── env.ts
│       ├── trpc.ts
│       └── systemRouter.ts
├── drizzle/
│   ├── schema.ts                    # Database schema (52 tables)
│   └── relations.ts                 # Table relations
├── shared/
│   └── const.ts                     # Shared constants
├── docs/
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── API.md
│   ├── USER_GUIDE.md
│   ├── RELEASE_NOTES.md
│   ├── DEPLOYMENT.md
│   └── [30+ other docs]
└── tests/
    └── [28 test files]
```

---

## Environment & Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MySQL/TiDB connection string | Yes |
| `JWT_SECRET` | Session signing secret | Yes |
| `VITE_APP_ID` | Manus OAuth app ID | Yes |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL | Yes |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL | Yes |
| `BUILT_IN_FORGE_API_URL` | Manus API URL | Yes |
| `BUILT_IN_FORGE_API_KEY` | Manus API key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | For GitHub |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | For GitHub |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Drive |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | For Drive |

### Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Run specific test file
pnpm test server/security-edge-cases.test.ts

# Push database changes
pnpm db:push

# Build for production
pnpm build
```

### Deployment

The application is deployed on Railway with GitHub auto-deploy:
- **Railway Project ID**: 96d15788-1147-4df7-b3b9-e0bfe4b44338
- **GitHub Repository**: EvanTenenbaum/Hero
- **Auto-deploy**: Enabled on push to main branch

---

## Appendix: Key Code Patterns

### tRPC Procedure Pattern

```typescript
// Protected procedure with input validation
export const exampleRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // ctx.user is guaranteed to exist
      return db.create({
        userId: ctx.user.id,
        ...input,
      });
    }),
});
```

### Safety Check Pattern

```typescript
// Before processing user input
const safetyResult = checkSafety(userMessage);
if (!safetyResult.allowed) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: safetyResult.reason,
  });
}
if (safetyResult.requiresConfirmation) {
  // Return confirmation request to user
}
```

### Database Query Pattern

```typescript
// Using Drizzle ORM
export async function getProjectById(id: number, userId: number) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(
      eq(projects.id, id),
      eq(projects.userId, userId)
    ));
  return project;
}
```

---

## References

1. Hero IDE System Architecture - `/home/ubuntu/hero-ide/docs/SYSTEM_ARCHITECTURE.md`
2. Hero IDE API Documentation - `/home/ubuntu/hero-ide/docs/API.md`
3. Hero IDE User Guide - `/home/ubuntu/hero-ide/docs/USER_GUIDE.md`
4. Hero IDE Release Notes - `/home/ubuntu/hero-ide/docs/RELEASE_NOTES.md`
5. Hero IDE QA Report - `/home/ubuntu/hero-ide/docs/QA_REPORT.md`
6. Hero IDE Design System - `/home/ubuntu/hero-ide/docs/HERO_IDE_UNIFIED_DESIGN_SYSTEM.md`
7. Hero IDE Self-Modifying IDE Spec - `/home/ubuntu/hero-ide/docs/SELF_MODIFYING_IDE_SPEC.md`
8. Hero IDE Agent Kickoff Protocol - `/home/ubuntu/hero-ide/docs/AGENT_KICKOFF_PROTOCOL_ROADMAP.md`
9. Hero IDE Deployment Guide - `/home/ubuntu/hero-ide/docs/DEPLOYMENT.md`
10. Drizzle ORM Documentation - https://orm.drizzle.team/docs/overview
11. tRPC Documentation - https://trpc.io/docs
12. Vitest Documentation - https://vitest.dev/guide/

---

*Document generated by Manus AI for Red Team QA handoff. Last updated: December 21, 2025.*
