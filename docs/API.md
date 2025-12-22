# Hero IDE API Documentation

This document describes the tRPC API endpoints available in Hero IDE.

## Authentication

All protected endpoints require a valid session cookie. Use the OAuth flow to authenticate:

1. Redirect to `/api/oauth/login`
2. Complete OAuth flow
3. Session cookie is set automatically

## API Endpoints

### Auth Router (`trpc.auth.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `me` | Query | Get current authenticated user |
| `logout` | Mutation | End current session |

### Projects Router (`trpc.projects.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `list` | Query | List all projects for current user |
| `get` | Query | Get project by ID |
| `create` | Mutation | Create new project |
| `update` | Mutation | Update project metadata |
| `delete` | Mutation | Soft delete project |

**Create Project Input:**
```typescript
{
  name: string;
  description?: string;
  repoFullName?: string;
}
```

### Chat Router (`trpc.chat.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `listConversations` | Query | List conversations for project |
| `getConversation` | Query | Get conversation with messages |
| `createConversation` | Mutation | Start new conversation |
| `sendMessage` | Mutation | Send message and get AI response |
| `deleteConversation` | Mutation | Delete conversation |

**Send Message Input:**
```typescript
{
  conversationId: string;
  content: string;
  projectId?: string;
}
```

### Agents Router (`trpc.agents.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `list` | Query | List all agents |
| `get` | Query | Get agent by ID |
| `create` | Mutation | Create new agent |
| `update` | Mutation | Update agent configuration |
| `delete` | Mutation | Delete agent |
| `execute` | Mutation | Start agent execution |
| `pause` | Mutation | Pause running execution |
| `resume` | Mutation | Resume paused execution |
| `cancel` | Mutation | Cancel execution |
| `getExecutionHistory` | Query | Get execution history |

**Agent Types:**
- `pm` - Project Manager
- `dev` - Developer
- `qa` - Quality Assurance
- `devops` - DevOps Engineer
- `research` - Research Analyst

### Kanban Router (`trpc.kanban.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `getBoard` | Query | Get board with columns and cards |
| `createBoard` | Mutation | Create new board |
| `createColumn` | Mutation | Add column to board |
| `updateColumn` | Mutation | Update column |
| `deleteColumn` | Mutation | Delete column |
| `createCard` | Mutation | Create new card |
| `updateCard` | Mutation | Update card |
| `moveCard` | Mutation | Move card to different column/position |
| `deleteCard` | Mutation | Delete card |

**Create Card Input:**
```typescript
{
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  labels?: string[];
  assigneeIds?: string[];
  dueDate?: Date;
}
```

### GitHub Router (`trpc.github.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `listRepos` | Query | List user's repositories |
| `getFileTree` | Query | Get repository file tree |
| `getFileContent` | Query | Get file content |
| `writeFile` | Mutation | Write/update file |
| `listBranches` | Query | List branches |
| `listPRs` | Query | List pull requests |
| `getPR` | Query | Get PR details |
| `createPR` | Mutation | Create pull request |
| `mergePR` | Mutation | Merge pull request |
| `listIssues` | Query | List issues |
| `createIssue` | Mutation | Create issue |
| `syncIssues` | Mutation | Sync issues with Kanban |
| `cloneRepo` | Mutation | Clone repository |
| `syncRepo` | Mutation | Sync repository changes |

### Context Router (`trpc.context.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `search` | Query | Search project context |
| `indexProject` | Mutation | Index project files |
| `getIndexStatus` | Query | Get indexing status |

**Search Input:**
```typescript
{
  projectId: string;
  query: string;
  limit?: number;
  includeCode?: boolean;
  includeDocs?: boolean;
}
```

### Kickoff Router (`trpc.kickoff.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `getData` | Query | Get kickoff wizard data |
| `saveStep` | Mutation | Save wizard step data |
| `generateDocs` | Mutation | Generate spec documents |
| `getDocs` | Query | Get generated documents |
| `updateDoc` | Mutation | Update document |

**Wizard Steps:**
1. `northStar` - Vision and goals
2. `productBrief` - Features and scope
3. `architecture` - Technical design
4. `qualityBar` - Quality standards
5. `sliceMap` - Implementation slices

### Meta Router (`trpc.meta.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `getCodebaseStructure` | Query | Get IDE codebase structure |
| `proposeChange` | Mutation | Propose code change |
| `applyChange` | Mutation | Apply proposed change |
| `rollback` | Mutation | Rollback to checkpoint |
| `getHistory` | Query | Get modification history |

**Propose Change Input:**
```typescript
{
  description: string;
  targetFiles?: string[];
}
```

### Settings Router (`trpc.settings.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `get` | Query | Get user settings |
| `update` | Mutation | Update settings |
| `getApiConnections` | Query | Get API connections |
| `saveApiConnection` | Mutation | Save API connection |
| `deleteApiConnection` | Mutation | Delete API connection |

## Error Handling

All endpoints return standard tRPC errors:

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Not authenticated |
| `FORBIDDEN` | Not authorized for action |
| `NOT_FOUND` | Resource not found |
| `BAD_REQUEST` | Invalid input |
| `INTERNAL_SERVER_ERROR` | Server error |

## Rate Limiting

API requests are rate limited per user:
- 100 requests per minute for queries
- 30 requests per minute for mutations
- LLM-powered endpoints have additional token limits

## WebSocket Support

Real-time updates are available via tRPC subscriptions for:
- Chat message streaming
- Agent execution progress
- File change notifications

## Example Usage

```typescript
import { trpc } from '@/lib/trpc';

// Query example
const { data: projects } = trpc.projects.list.useQuery();

// Mutation example
const createProject = trpc.projects.create.useMutation();
await createProject.mutateAsync({
  name: 'My Project',
  description: 'A new project'
});

// With optimistic updates
const updateCard = trpc.kanban.updateCard.useMutation({
  onMutate: async (newData) => {
    // Optimistically update cache
  },
  onError: (err, newData, context) => {
    // Rollback on error
  }
});
```
