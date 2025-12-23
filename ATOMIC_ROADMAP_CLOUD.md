# Atomic Roadmap: HERO IDE Cloud-Native Migration

**Status**: Complete ✅  
**Implementation Date**: December 22, 2025  
**E2B API Key**: Configured in environment

This document outlines the atomic steps required to refactor the HERO IDE from a local-filesystem monolith to a cloud-native, GitHub-backed system using ephemeral sandboxes (E2B).

---

## Phase 0: Infrastructure & "Brain Transplant" ✅

**Goal:** Establish the connection to the remote compute layer.

### Ticket 0.1: Dependency & Environment ✅

*   **Action:** Install the E2B SDK.
    ```bash
    pnpm add @e2b/code-interpreter
    ```
    **Status:** Complete - Package installed
    
*   **Action:** Update `server/_core/env.ts` to include `E2B_API_KEY`.
    **Status:** Complete - Added E2B_API_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SECRETS_ENCRYPTION_KEY
    
*   **Action:** Ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are present in `.env` and loaded.
    **Status:** Complete - See `.env.example` for all required variables

### Ticket 0.2: The Sandbox Manager Service ✅

*   **File Created:** `server/services/sandboxManager.ts`
*   **Implementation:**
    *   Singleton service with `SandboxManager` class
    *   `getOrStartSandbox(projectId: string): Promise<Sandbox>` - Gets or creates sandbox
    *   `closeSandbox(projectId: string)` - Explicitly closes a sandbox
    *   `closeAllSandboxes()` - Graceful shutdown support
    *   Automatic health checks and inactivity timeouts (1 hour default)
    *   Max sandbox limit (10 default) with LRU eviction

---

## Phase 1: Database & Hydration ✅

**Goal:** Link internal "Projects" to external "GitHub Repos" and enable cloning.

### Ticket 1.1: Schema Migration ✅

*   **File Modified:** `drizzle/schema.ts`
*   **Fields Added to `projects` table:**
    *   `repoOwner: varchar('repo_owner', { length: 255 })`
    *   `repoName: varchar('repo_name', { length: 255 })`
    *   `githubInstallationId: varchar('github_installation_id', { length: 255 })`
    *   `defaultBranch: varchar('default_branch', { length: 255 }).default('main')`
    *   `useCloudSandbox: boolean('use_cloud_sandbox').default(false)`

*   **New Table Created:** `project_secrets`
    *   `id`, `projectId`, `key`, `encryptedValue`, `description`, `createdAt`, `updatedAt`

### Ticket 1.2: The Project Hydrator ✅

*   **File Created:** `server/services/projectHydrator.ts`
*   **Implementation:**
    *   `hydrate(sandbox: Sandbox, project: Project)` - Clones repo into sandbox
    *   `injectSecrets(sandbox: Sandbox, projectId: number)` - Injects secrets as .env
    *   `installDependencies(sandbox: Sandbox)` - Auto-detects and installs deps
    *   `encryptSecret(value: string)` / `decryptSecret(encryptedValue: string)` - AES-256-GCM encryption
    *   GitHub App JWT authentication for installation tokens
    *   OAuth token fallback for user-connected repos

---

## Phase 2: Core Refactor (The "Remote Switch") ✅

**Goal:** Reroute all Agent file operations from local `fs` to remote `sandbox.filesystem`.

### Ticket 2.1: Tool Registry Injection ✅

*   **File Created:** `server/agents/tools/index.ts`
*   **Implementation:**
    *   `AgentToolContext` interface with sandbox support
    *   `createToolContext()` factory function
    *   Context includes: userId, projectId, agentId, executionId, sandbox, useCloudSandbox, repoPath

### Ticket 2.2: Refactor FileSystem Tools ✅

*   **File Created:** `server/agents/tools/fs.ts`
*   **Implementation:**
    *   `readFile(ctx, filePath, options)` - Routes to sandbox or local fs
    *   `writeFile(ctx, filePath, content)` - Routes to sandbox or local fs
    *   `editFile(ctx, filePath, edits)` - Find/replace operations
    *   `deleteFile(ctx, filePath)` - File deletion
    *   `listFiles(ctx, dirPath, options)` - Directory listing (recursive support)
    *   `fileExists(ctx, filePath)` - Existence check
    *   Path traversal protection built-in

### Ticket 2.3: Refactor Execution Tools ✅

*   **File Created:** `server/agents/tools/terminal.ts`
*   **Implementation:**
    *   `runShellCommand(ctx, command, options)` - Routes to sandbox or local
    *   `runPackageManager(ctx, args, packageManager)` - npm/pnpm/yarn support
    *   `runGitCommand(ctx, args)` - Git operations
    *   60-second default timeout, configurable
    *   Command safety checks (dangerous command blocking)
    *   Output truncation for large results

---

## Phase 3: The "Git Sync" & Safety Layer ✅

**Goal:** Ensure work is saved to GitHub and Agents don't break the repo.

### Ticket 3.1: The "Save" Primitive (Dirty State Sync) ✅

*   **File Created:** `server/routers/gitSync.ts`
*   **Implementation:**
    *   `syncChanges(projectId, options)` - Full git add/commit/push
    *   `getStatus(projectId)` - Git status with staged/unstaged/untracked
    *   `discardChanges(projectId, files)` - Revert changes
    *   `createBranch(projectId, branchName)` - Branch creation
    *   `getCurrentBranch(projectId)` - Get current branch
    *   `pullChanges(projectId, branch)` - Pull from remote

### Ticket 3.2: The "PR-First" Agent Tool ✅

*   **File Created:** `server/agents/tools/github.ts`
*   **Implementation:**
    *   `submitPR(ctx, options)` - Full PR workflow (branch, commit, push, create PR)
    *   `createGitBranch(ctx, branchName, fromBranch)` - Branch creation
    *   `checkoutBranch(ctx, branchName)` - Branch switching
    *   `getGitStatus(ctx)` - Status with change details
    *   `getGitDiff(ctx, options)` - Diff viewing
    *   `commitChanges(ctx, message, options)` - Commit with file selection

### Ticket 3.3: The "Kickoff" Protocol (Manifest) ✅

*   **File Modified:** `server/kickoff/kickoffService.ts`
*   **Implementation:**
    *   `generateManifest(sandbox)` - Creates `.hero/manifest.json`
    *   Manifest includes: version, generatedAt, project info, stack detection
    *   Auto-detects package manager, framework, language
    *   Configurable build and start commands

---

## Phase 4: Secrets Management (Runtime) ✅

**Goal:** Inject `.env` vars so the app can run in the cloud.

### Ticket 4.1: Secrets Backend ✅

*   **Schema:** `project_secrets` table in `drizzle/schema.ts`
*   **File Created:** `server/routers/secrets.ts`
*   **Implementation:**
    *   `addSecret(projectId, key, value, description)` - Create secret
    *   `listSecrets(projectId)` - List metadata (no values)
    *   `getSecret(projectId, key)` - Get with decrypted value
    *   `updateSecret(projectId, key, value, description)` - Update secret
    *   `deleteSecret(projectId, key)` - Delete secret
    *   `getAllSecretsForInjection(projectId)` - Get all as key-value pairs
    *   `bulkImportSecrets(projectId, secrets, overwrite)` - Bulk import
    *   Key validation: Must be uppercase with underscores (e.g., API_KEY)

### Ticket 4.2: Secrets Injection ✅

*   **Integrated into:** `server/services/projectHydrator.ts`
*   **Implementation:**
    *   Secrets fetched and decrypted from database
    *   Written as `.env` file to sandbox
    *   `.gitignore` automatically updated to exclude `.env`

---

## Additional Deliverables ✅

### CLI Tool
*   **File Created:** `scripts/sandbox-cli.ts`
*   Commands: start, stop, stop-all, status, exec, sync, hydrate

### Test Suite
*   **File Created:** `server/services/__tests__/sandboxManager.test.ts`
*   Unit tests for sandbox lifecycle management

### Documentation
*   **File Created:** `docs/CLOUD_SANDBOX_IMPLEMENTATION.md`
*   Comprehensive implementation guide

### Environment Template
*   **File Created:** `.env.example`
*   All required environment variables documented

---

## Redhat QA Summary

### First QA Pass - Issues Fixed:
1. ✅ Implemented `getInstallationToken()` with proper GitHub App JWT signing
2. ✅ Fixed crypto import (changed to `import * as crypto`)
3. ✅ Fixed fs/path imports (changed to `import * as fs/path`)
4. ✅ Removed unused `exec` import from terminal.ts
5. ✅ Removed duplicate REPO_PATH constant (now imported from sandboxManager)
6. ✅ Added path traversal protection to fs.ts
7. ✅ Improved encryption salt handling

### Second QA Pass - Issues Fixed:
1. ✅ Fixed Map iteration issue in sandboxManager.ts (used forEach instead)
2. ✅ All TypeScript compilation errors resolved
3. ✅ Verified all files pass `tsc --noEmit --skipLibCheck`

---

## Next Steps (Post-Implementation)

1. Run database migration: `npx drizzle-kit generate && npx drizzle-kit push`
2. Set environment variables (see `.env.example`)
3. Test sandbox creation with CLI: `npx ts-node scripts/sandbox-cli.ts start <projectId>`
4. Integrate with frontend UI for project settings
5. Add monitoring/logging for sandbox usage
