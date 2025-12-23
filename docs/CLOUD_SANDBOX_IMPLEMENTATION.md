# HERO IDE Cloud-Native Implementation

This document provides comprehensive documentation for the cloud-native migration of HERO IDE using E2B sandboxes.

## Overview

The HERO IDE has been refactored from a local-filesystem monolith to a cloud-native, GitHub-backed system using ephemeral sandboxes (E2B). This architecture enables:

- **Remote Execution**: All file operations and commands run in isolated cloud sandboxes
- **GitHub Integration**: Projects are backed by GitHub repositories as the source of truth
- **Secrets Management**: Secure storage and injection of environment variables
- **PR-First Workflow**: Agent changes are submitted via pull requests for review

## Architecture

### The "Remote Brain" Model

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   HERO Server   │────▶│   E2B Sandbox   │────▶│     GitHub      │
│  (Orchestrator) │     │    (Compute)    │     │    (Storage)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

- **Server**: Orchestrates sandbox operations, manages state, handles API requests
- **Sandbox**: Ephemeral compute environment where code runs
- **GitHub**: Persistent storage and version control

## Implementation Details

### Phase 0: Infrastructure

#### Environment Configuration (`server/_core/env.ts`)

New environment variables added:
- `E2B_API_KEY`: Required for sandbox orchestration
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: For GitHub OAuth
- `SECRETS_ENCRYPTION_KEY`: For encrypting project secrets

#### Sandbox Manager (`server/services/sandboxManager.ts`)

Singleton service managing sandbox lifecycles:

```typescript
// Get or create a sandbox for a project
const sandbox = await sandboxManager.getOrStartSandbox(projectId);

// Close a sandbox
await sandboxManager.closeSandbox(projectId);

// Close all sandboxes (graceful shutdown)
await sandboxManager.closeAllSandboxes();
```

Features:
- Automatic timeout after 1 hour of inactivity
- Maximum 10 concurrent sandboxes
- Health checking for sandbox validity
- LRU eviction when limit reached

### Phase 1: Database & Hydration

#### Schema Changes (`drizzle/schema.ts`)

New fields added to `projects` table:
- `repoOwner`: GitHub repository owner
- `repoName`: GitHub repository name
- `githubInstallationId`: For GitHub App authentication
- `defaultBranch`: Default branch (defaults to 'main')
- `useCloudSandbox`: Feature flag for cloud mode

New table `project_secrets`:
- `id`: Primary key
- `projectId`: Foreign key to projects
- `key`: Secret key (e.g., API_KEY)
- `encryptedValue`: AES-256-GCM encrypted value
- `description`: Optional description

#### Project Hydrator (`server/services/projectHydrator.ts`)

Service for cloning repositories into sandboxes:

```typescript
// Hydrate a sandbox with a project's repository
const result = await projectHydrator.hydrate(sandbox, project);

// Install dependencies
await projectHydrator.installDependencies(sandbox);

// Inject secrets
await projectHydrator.injectSecrets(sandbox, projectId);
```

### Phase 2: Core Refactor

#### Tool Context (`server/agents/tools/index.ts`)

Extended context interface for sandbox-aware tools:

```typescript
interface AgentToolContext {
  userId: number;
  projectId: number;
  agentId: number;
  executionId: number;
  sandbox: Sandbox | null;
  useCloudSandbox: boolean;
  repoPath: string;
}
```

#### Filesystem Tools (`server/agents/tools/fs.ts`)

All file operations route through sandbox when `useCloudSandbox` is true:

```typescript
// Read file (sandbox or local)
await readFile(ctx, 'src/index.ts');

// Write file
await writeFile(ctx, 'src/new-file.ts', content);

// Edit file with find/replace
await editFile(ctx, 'src/index.ts', [
  { find: 'oldText', replace: 'newText' }
]);

// List files
await listFiles(ctx, 'src', { recursive: true });
```

#### Terminal Tools (`server/agents/tools/terminal.ts`)

Shell commands execute in sandbox with safety checks:

```typescript
// Run shell command
await runShellCommand(ctx, 'npm install', { timeout: 300000 });

// Run package manager command
await runPackageManager(ctx, 'install');

// Run git command
await runGitCommand(ctx, 'status');
```

Safety features:
- Dangerous command blocking
- Path traversal prevention
- Output truncation
- Timeout enforcement (60s default)

### Phase 3: Git Sync & Safety

#### Git Sync Service (`server/routers/gitSync.ts`)

Handles synchronization of sandbox changes to GitHub:

```typescript
// Sync all changes (add, commit, push)
await gitSyncService.syncChanges(projectId, {
  message: 'Feature: Add new component',
  branch: 'feature/new-component'
});

// Get current status
const status = await gitSyncService.getStatus(projectId);

// Discard changes
await gitSyncService.discardChanges(projectId);

// Create new branch
await gitSyncService.createBranch(projectId, 'feature/xyz');
```

#### GitHub Tools (`server/agents/tools/github.ts`)

PR-first workflow for agent changes:

```typescript
// Submit a pull request
await submitPR(ctx, {
  title: 'Add new feature',
  body: 'Description of changes',
  branchName: 'feature/new-feature',
  baseBranch: 'main'
});

// Create branch
await createGitBranch(ctx, 'feature/xyz');

// Get git status
await getGitStatus(ctx);

// Commit changes
await commitChanges(ctx, 'Commit message');
```

#### Hero Manifest (`server/kickoff/kickoffService.ts`)

Project configuration for agent behavior:

```json
{
  "version": "1.0.0",
  "buildCommand": "npm run build",
  "testCommand": "npm test",
  "startCommand": "npm run dev",
  "forbiddenFiles": [".env", "*.key"],
  "allowedOperations": ["read", "write", "edit", "delete", "terminal", "git"],
  "techStack": {
    "frontend": "React",
    "backend": "Node.js",
    "database": "PostgreSQL"
  }
}
```

### Phase 4: Secrets Management

#### Secrets Service (`server/routers/secrets.ts`)

CRUD operations for project secrets:

```typescript
// Add a secret
await secretsService.addSecret(projectId, 'API_KEY', 'secret-value');

// List secrets (metadata only)
const secrets = await secretsService.listSecrets(projectId);

// Get secret with value
const secret = await secretsService.getSecret(projectId, 'API_KEY');

// Update secret
await secretsService.updateSecret(projectId, 'API_KEY', 'new-value');

// Delete secret
await secretsService.deleteSecret(projectId, 'API_KEY');

// Bulk import
await secretsService.bulkImportSecrets(projectId, {
  API_KEY: 'value1',
  DATABASE_URL: 'value2'
});
```

Encryption:
- AES-256-GCM encryption
- Unique IV per secret
- Authentication tag for integrity

## Usage Guide

### Enabling Cloud Sandbox for a Project

1. Link project to GitHub repository:
   ```typescript
   await db.update(projects).set({
     repoOwner: 'owner',
     repoName: 'repo',
     defaultBranch: 'main',
     useCloudSandbox: true
   }).where(eq(projects.id, projectId));
   ```

2. Add secrets (optional):
   ```typescript
   await secretsService.addSecret(projectId, 'API_KEY', 'your-api-key');
   ```

3. Start sandbox and hydrate:
   ```typescript
   const sandbox = await sandboxManager.getOrStartSandbox(projectId);
   await projectHydrator.hydrate(sandbox, project);
   ```

### Agent Execution Flow

1. Get or create sandbox
2. Hydrate with repository
3. Inject secrets
4. Execute agent tools
5. Sync changes to GitHub (or submit PR)
6. Close sandbox (or let timeout)

## Environment Variables

Required environment variables:

```env
# E2B Configuration
E2B_API_KEY=your-e2b-api-key

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Secrets Encryption
SECRETS_ENCRYPTION_KEY=your-32-char-encryption-key
```

## File Structure

```
server/
├── _core/
│   └── env.ts                    # Environment configuration
├── agents/
│   └── tools/
│       ├── index.ts              # Tool context and exports
│       ├── fs.ts                 # Filesystem tools
│       ├── terminal.ts           # Terminal tools
│       └── github.ts             # GitHub tools
├── services/
│   ├── sandboxManager.ts         # Sandbox lifecycle management
│   └── projectHydrator.ts        # Repository cloning and secrets
├── routers/
│   ├── gitSync.ts                # Git synchronization
│   └── secrets.ts                # Secrets CRUD
└── kickoff/
    └── kickoffService.ts         # Manifest generation

drizzle/
└── schema.ts                     # Database schema with new fields
```

## Security Considerations

1. **Secrets**: All secrets are encrypted at rest using AES-256-GCM
2. **Sandbox Isolation**: Each project runs in an isolated E2B container
3. **Command Safety**: Dangerous commands are blocked before execution
4. **Token Security**: GitHub tokens are stored encrypted and refreshed
5. **Path Traversal**: File operations are restricted to repository path

## Migration Notes

When migrating existing projects to cloud sandbox:

1. Ensure GitHub repository is linked
2. Add any required secrets
3. Set `useCloudSandbox: true`
4. Test with a simple agent execution
5. Verify Git sync works correctly

## Troubleshooting

### Sandbox Creation Fails
- Check E2B_API_KEY is valid
- Verify E2B account has available quota

### Git Clone Fails
- Verify GitHub token has repo access
- Check repository exists and is accessible

### Secrets Not Injected
- Verify SECRETS_ENCRYPTION_KEY is set
- Check secrets exist in database

### Command Timeout
- Increase timeout for long-running commands
- Check sandbox is still healthy
