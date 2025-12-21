# Sprint 7 Research: Enhanced GitHub Integration

## 1. Git Clone Optimization

### Shallow Clone
- `git clone --depth=1 <url>` creates a shallow clone with only the most recent commit
- Reduces clone size significantly for large repositories
- Limitations: Cannot see full history, some operations may fail

### Partial Clone (Blobless)
- `git clone --filter=blob:none <url>` fetches commits and trees but not blobs
- Blobs are fetched on-demand when needed
- Better for large repos with many large files

### Sparse Checkout
- `git sparse-checkout set <path>` limits working directory to specific paths
- Useful for monorepos where only certain directories are needed
- Can be combined with shallow/partial clone

### isomorphic-git (Browser)
- Pure JavaScript git implementation for browser environments
- Supports clone, commit, push operations
- Uses IndexedDB or in-memory filesystem
- Considerations:
  - Large repos can hang or use excessive memory
  - WebWorker recommended to avoid blocking main thread
  - Shallow clone recommended for browser use

### Recommended Strategy for Hero IDE
1. **Server-side cloning** for full repository operations
2. **Shallow clone by default** (`--depth=1`) for initial import
3. **On-demand history fetch** when user needs commit history
4. **Sparse checkout** for monorepos (user-selectable paths)

---

## 2. Merge Conflict Detection & Resolution

### Git Merge Algorithm
- Uses **Longest Common Subsequence (LCS)** algorithm
- **3-way merge**: compares base, ours, and theirs
- Conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`

### Conflict Types
1. **Content conflicts**: Same lines modified differently
2. **Rename conflicts**: File renamed differently in each branch
3. **Delete/modify conflicts**: File deleted in one, modified in other
4. **Binary conflicts**: Cannot auto-merge binary files

### 3-Way Diff Visualization
- Show three panels: Base | Ours | Theirs
- Highlight differences with color coding:
  - Green: additions
  - Red: deletions
  - Yellow: modifications
- Allow user to choose which version to keep

### AI-Assisted Resolution
- Analyze code context to suggest resolution
- Consider:
  - Code semantics (not just text)
  - Import statements and dependencies
  - Function signatures and types
- Tools: CodeGPT, MergeBERT, JetBrains AI Assistant

### Recommended Strategy for Hero IDE
1. **Detect conflicts before merge** using git merge-tree
2. **3-way diff viewer** with Monaco Editor diff view
3. **AI suggestions** using Gemini for semantic understanding
4. **Manual override** always available
5. **Conflict preview** before commit

---

## 3. GitHub Webhooks

### Security Best Practices (from GitHub Docs)

#### 1. Use Webhook Secret
- Generate high-entropy random string
- Store securely (environment variable)
- Never include in payload URL

#### 2. Signature Verification
```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

#### 3. Use HTTPS
- Always use HTTPS endpoints
- Keep SSL verification enabled

#### 4. IP Allowlist
- GitHub publishes webhook IP ranges via `GET /meta`
- Update allowlist periodically

#### 5. Respond Within 10 Seconds
- Return 2XX immediately
- Process payload asynchronously (queue)

#### 6. Check Event Type
- Use `X-GitHub-Event` header
- Check `action` field in payload

#### 7. Handle Redeliveries
- Use `X-GitHub-Delivery` header for idempotency
- Protect against replay attacks

### Key Webhook Events for Hero IDE

| Event | Description | Use Case |
|-------|-------------|----------|
| `push` | Code pushed to branch | Sync file changes |
| `pull_request` | PR opened/closed/merged | Update PR status |
| `pull_request_review` | Review submitted | Notify of reviews |
| `issues` | Issue created/updated | Sync issues to cards |
| `issue_comment` | Comment on issue/PR | Update card comments |
| `create` | Branch/tag created | Update branch list |
| `delete` | Branch/tag deleted | Clean up branches |

### Webhook Architecture

```
GitHub → Webhook Endpoint → Queue → Processor
                ↓
         Signature Verify
                ↓
         Event Router
                ↓
    ┌───────────┼───────────┐
    ↓           ↓           ↓
  Push      PR Event    Issue Event
Handler     Handler      Handler
    ↓           ↓           ↓
  Sync       Update      Sync to
  Files      PR Card     Kanban
```

---

## 4. Implementation Plan

### Phase 1: Repository Cloning
- [ ] Create `gitService.ts` with clone operations
- [ ] Implement shallow clone with progress tracking
- [ ] Add workspace management (store cloned repos)
- [ ] Create clone UI with progress indicator

### Phase 2: Merge Conflict Detection
- [ ] Create `conflictService.ts` for detection
- [ ] Implement 3-way diff using Monaco diff editor
- [ ] Add conflict resolution UI
- [ ] Integrate AI suggestions for resolution

### Phase 3: PR Workflow
- [ ] Create PR from branch/changes
- [ ] Build PR review interface
- [ ] Add AI-powered code review
- [ ] Implement merge with conflict handling

### Phase 4: Issue Sync & Webhooks
- [ ] Create webhook endpoint with signature verification
- [ ] Implement event handlers for key events
- [ ] Build issue-to-card sync
- [ ] Add bidirectional sync (card → issue)

---

## 5. Database Schema Additions

```sql
-- Cloned repositories
CREATE TABLE cloned_repos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  github_repo_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  clone_path VARCHAR(500),
  clone_status ENUM('pending', 'cloning', 'ready', 'error'),
  clone_depth INT DEFAULT 1,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook events log
CREATE TABLE webhook_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  delivery_id VARCHAR(100) UNIQUE,
  event_type VARCHAR(50) NOT NULL,
  action VARCHAR(50),
  repo_full_name VARCHAR(255),
  payload JSON,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Merge conflicts
CREATE TABLE merge_conflicts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  source_branch VARCHAR(255),
  target_branch VARCHAR(255),
  file_path VARCHAR(500),
  conflict_type ENUM('content', 'rename', 'delete_modify', 'binary'),
  base_content TEXT,
  ours_content TEXT,
  theirs_content TEXT,
  resolution TEXT,
  resolved_by INT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## References

1. [GitHub Blog: Partial Clone and Shallow Clone](https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/)
2. [Atlassian: Handling Big Repositories](https://www.atlassian.com/git/tutorials/big-repositories)
3. [isomorphic-git Documentation](https://isomorphic-git.org/)
4. [GitHub Docs: Webhook Best Practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
5. [GitHub Docs: Validating Webhook Deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
6. [Git Merge Strategies](https://git-scm.com/docs/merge-strategies)
