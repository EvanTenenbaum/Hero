# Hero IDE System Architecture

## Overview

Hero IDE is a multi-pane workspace application for AI-assisted software development, featuring Kanban boards, GitHub integration, multi-agent chat, and embedded browsing.

## System Layers

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
│  LLM Integration (invokeLLM)                                       │
│  GitHub OAuth & API                                                │
│  S3 Storage (storagePut/storageGet)                                │
├─────────────────────────────────────────────────────────────────────┤
│                          DATA LAYER                                 │
│  Drizzle ORM → MySQL/TiDB                                          │
│  Tables: users, kanban_*, conversations, messages, github_*        │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

### Workspace Layout
```
App.tsx
└── WorkspacePage.tsx
    └── WorkspaceShell.tsx
        ├── Sidebar (collapsible)
        │   ├── Board nav
        │   ├── GitHub nav
        │   ├── Browser nav
        │   └── Settings nav
        ├── ResizablePanelGroup (3 panes)
        │   ├── ContentPane (pane 1)
        │   ├── ContentPane (pane 2)
        │   └── ContentPane (pane 3)
        └── AgentPanel (collapsible right)
            ├── Agent tabs (PM, Dev, QA, DevOps, Research)
            └── Chat interface
```

### ContentPane Types
```
ContentPane.tsx
├── type="board" → BoardPane.tsx
│   └── KanbanBoard.tsx
│       ├── KanbanColumn.tsx
│       │   └── KanbanCard.tsx
│       └── CardDetailModal.tsx
├── type="github" → GitHubPane.tsx
│   ├── File tree
│   └── Monaco editor
├── type="browser" → BrowserPane.tsx
│   └── iframe with URL bar
├── type="editor" → EditorPane.tsx
│   └── Monaco editor (standalone)
└── type="empty" → Empty state
```

## Data Flow

### Kanban Operations
```
User Action → useKanban hook → tRPC mutation → kanban/router.ts → kanban/db.ts → Database
                                    ↓
                              Optimistic update
                                    ↓
                              UI re-render
```

### Agent Chat
```
User Message → AgentPanel → tRPC chat.sendMessage → LLM invokeLLM → Stream response
                                                          ↓
                                                   Save to messages table
                                                          ↓
                                                   Update conversation
```

### GitHub Integration
```
OAuth Flow → github/router.ts → Store connection in github_connections table
                                          ↓
File Browse → getFileTree → GitHub API → Display in GitHubPane
                                          ↓
File Edit → getFileContent → Monaco Editor → saveFile → GitHub API
```

## Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| users | User accounts with roles (admin/user) |
| kanban_boards | Board metadata (name, description, settings) |
| kanban_columns | Columns within boards |
| kanban_cards | Tasks/cards with full metadata |
| card_dependencies | Card-to-card dependency links |
| card_labels | Labels for cards |
| card_comments | Comments on cards |
| card_history | Audit trail of card changes |
| conversations | Chat conversation containers |
| messages | Individual chat messages |
| github_connections | GitHub OAuth tokens per user |

### Key Relationships
```
users (1) ←→ (N) kanban_boards
kanban_boards (1) ←→ (N) kanban_columns
kanban_columns (1) ←→ (N) kanban_cards
kanban_cards (N) ←→ (N) card_dependencies
kanban_cards (1) ←→ (N) card_labels
kanban_cards (1) ←→ (N) card_comments
users (1) ←→ (N) conversations
conversations (1) ←→ (N) messages
```

## State Management

### Client State (useWorkspaceState)
```typescript
{
  panes: [
    { id: 'pane-1', type: 'board', data: { boardId: '...' } },
    { id: 'pane-2', type: 'github', data: { repo: '...' } },
    { id: 'pane-3', type: 'browser', data: { url: '...' } }
  ],
  activeAgentId: 'pm' | 'dev' | 'qa' | 'devops' | 'research',
  sidebarCollapsed: boolean,
  agentPanelCollapsed: boolean
}
```

### Server State (tRPC + React Query)
- Automatic caching and invalidation
- Optimistic updates for mutations
- Background refetching

## Agent System

### Agent Types
| Agent | Role | System Prompt Focus |
|-------|------|---------------------|
| PM | Product Manager | Planning, requirements, sprint orchestration |
| Dev | Developer | Code implementation, technical decisions |
| QA | Quality Assurance | Testing, bug tracking, quality gates |
| DevOps | DevOps Engineer | Deployment, infrastructure, CI/CD |
| Research | Research Agent | Investigation, documentation, analysis |

### Agent Conversation Flow
1. User selects agent tab
2. User sends message
3. Message saved with agent context
4. LLM invoked with agent-specific system prompt
5. Response streamed back
6. Response saved to messages table
7. UI updates with new message

## File Structure

```
hero-ide/
├── client/
│   └── src/
│       ├── components/
│       │   ├── workspace/           # Workspace layout components
│       │   │   ├── WorkspaceShell.tsx
│       │   │   ├── ContentPane.tsx
│       │   │   ├── AgentPanel.tsx
│       │   │   ├── MobileWorkspace.tsx
│       │   │   └── panes/
│       │   │       ├── BoardPane.tsx
│       │   │       ├── GitHubPane.tsx
│       │   │       ├── BrowserPane.tsx
│       │   │       └── EditorPane.tsx
│       │   ├── kanban/              # Kanban board components
│       │   │   ├── KanbanBoard.tsx
│       │   │   ├── KanbanColumn.tsx
│       │   │   ├── KanbanCard.tsx
│       │   │   └── CardDetailModal.tsx
│       │   └── ui/                  # shadcn/ui components
│       ├── hooks/
│       │   ├── useWorkspaceState.ts
│       │   ├── useKanban.ts
│       │   ├── useKeyboardShortcuts.ts
│       │   └── useMediaQuery.ts
│       └── pages/
│           ├── WorkspacePage.tsx
│           └── Board.tsx
├── server/
│   ├── routers.ts                   # Main tRPC router
│   ├── kanban/
│   │   ├── router.ts                # Kanban procedures
│   │   └── db.ts                    # Kanban database helpers
│   └── _core/
│       ├── llm.ts                   # LLM integration
│       ├── context.ts               # tRPC context
│       └── env.ts                   # Environment variables
├── drizzle/
│   └── schema.ts                    # Database schema
└── shared/
    └── constants.ts                 # Shared constants
```

## Integration Points

### External Services
1. **Manus OAuth** - User authentication
2. **GitHub API** - Repository access, file operations
3. **LLM API** - AI chat responses
4. **S3 Storage** - File uploads

### Internal Integrations
1. **Board ↔ Cards** - Cards belong to columns on boards
2. **Cards ↔ Dependencies** - Cards can block other cards
3. **Cards ↔ Agents** - Cards assigned to agent types
4. **Chat ↔ Context** - Chat can reference current board/file

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+1 | Focus pane 1 |
| Ctrl+2 | Focus pane 2 |
| Ctrl+3 | Focus pane 3 |
| Ctrl+B | Toggle sidebar |
| Ctrl+J | Toggle agent panel |
| Escape | Close modals |

## Mobile Responsiveness

- **Desktop (>1024px)**: Full 3-pane layout with sidebar and agent panel
- **Tablet (768-1024px)**: 2-pane layout, collapsible panels
- **Mobile (<768px)**: Stacked single-pane view with swipe navigation, bottom sheet for agent chat
