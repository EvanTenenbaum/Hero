# Self-Modifying IDE: Feature Specification

**Hero IDE as Its Own Development Environment**

---

## Executive Summary

The Self-Modifying IDE feature transforms Hero IDE into a **meta-development environment** where users can modify, extend, and customize the IDE itself through natural language conversation. Just as you're currently using an AI assistant to develop Hero IDE, users will be able to do the same thing from within the application—making Hero IDE both the product and the development tool.

This creates a powerful feedback loop: users who want new features can simply describe them in chat, and the IDE modifies itself to add them. The IDE becomes a living, evolving tool that adapts to each user's needs.

---

## The Vision

### What This Enables

Imagine opening Hero IDE and saying:

> "Add a dark mode toggle to the settings page"

The IDE would:
1. Understand the request and identify the relevant files
2. Generate the code changes needed
3. Show you a preview of what will change
4. Apply the changes with your approval
5. Hot-reload so you see the result immediately

Or more complex requests:

> "I want a pomodoro timer in the sidebar that tracks my coding sessions"

The IDE would:
1. Design the feature (component structure, state management)
2. Create the necessary files
3. Wire up the routing and navigation
4. Add any needed database tables
5. Deploy the changes to your running instance

### The Key Insight

Hero IDE is already a web application with a well-structured codebase. By treating the IDE's own source code as a "special project," we can leverage all the existing agent infrastructure—chat, code editing, file management, governance—to enable self-modification.

---

## Architecture

### Core Concept: The System Project

Hero IDE will have a special, always-present project called **"Hero IDE System"** that represents the IDE's own codebase. This project is different from user projects in several ways:

| Aspect | User Projects | System Project |
|--------|---------------|----------------|
| Source | External repos, user files | Hero IDE codebase |
| Location | User-defined | `/home/ubuntu/hero-ide` |
| Visibility | User-controlled | Always visible |
| Modifications | Standard workflow | Protected + hot-reload |
| Rollback | Git-based | Checkpoint-based + instant |
| Agents | All agents | Meta-Agent (specialized) |

### The Meta-Agent

A specialized agent called the **Meta-Agent** (or "IDE Developer Agent") has deep knowledge of:

1. **Hero IDE Architecture** - Understands the file structure, routing, components, and patterns
2. **Technology Stack** - React, TypeScript, tRPC, Drizzle, Tailwind, shadcn/ui
3. **Design System** - Knows the color palette, typography, spacing, and component library
4. **Safety Boundaries** - Knows which files are safe to modify and which are protected

The Meta-Agent's system prompt includes:
- Complete file tree of the IDE
- Key architectural decisions and patterns
- Component library documentation
- Database schema reference
- Protected file list

### Hot-Reload Pipeline

When changes are applied to the IDE, they need to take effect immediately without requiring a full restart:

```
User Request → Meta-Agent → Code Generation → Validation → Preview → Apply → Hot-Reload
                                                   ↓
                                            Checkpoint Created
```

**Hot-Reload Mechanism:**
1. **Frontend Changes** - Vite's HMR handles React component updates automatically
2. **Backend Changes** - Server restart triggered via process signal
3. **Schema Changes** - Migration generated and applied, server restarted
4. **Static Assets** - Copied to public directory, cache-busted

---

## User Experience

### Entering Meta Mode

Users can enter "Meta Mode" (self-modification mode) in several ways:

1. **Chat Command**: Type `/meta` or "I want to modify Hero IDE"
2. **Navigation**: Click on "Hero IDE System" in the project list
3. **Quick Action**: Use keyboard shortcut `Cmd+Shift+M`

When in Meta Mode, the UI shows a clear indicator:

```
┌─────────────────────────────────────────────────────────────┐
│  🔧 META MODE                                    Exit Meta  │
│  You're modifying Hero IDE itself                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Chat with the Meta-Agent to customize your IDE             │
│                                                             │
```

### The Modification Flow

**Step 1: Describe the Change**

User types a natural language request:

> "Add a button to the dashboard that shows my GitHub notifications"

**Step 2: Meta-Agent Analysis**

The Meta-Agent responds with:
- Understanding of the request
- Files that will be modified/created
- Estimated complexity
- Any concerns or clarifications needed

```
I understand you want to add GitHub notifications to the dashboard.

Here's my plan:
1. Create `NotificationBell.tsx` component
2. Add tRPC procedure `github.getNotifications`
3. Modify `Home.tsx` to include the component
4. Add notification polling with `useQuery`

This will require:
- 1 new component file
- 1 new API endpoint
- 1 modified page

Estimated time: ~30 seconds

Should I proceed?
```

**Step 3: Preview Changes**

Before applying, the user sees a diff preview:

```diff
// client/src/pages/Home.tsx
+ import { NotificationBell } from '@/components/NotificationBell';

  export function Home() {
    return (
      <div>
        <h1>Good morning, Evan</h1>
+       <NotificationBell />
        ...
      </div>
    );
  }
```

**Step 4: Apply with Approval**

User clicks "Apply Changes" or says "Yes, do it"

**Step 5: Live Update**

The IDE hot-reloads and the change is immediately visible. A checkpoint is automatically created for rollback.

### Rollback Capability

Every Meta Mode change creates a checkpoint. Users can:

1. **Instant Rollback**: "Undo that last change"
2. **Checkpoint Browser**: View history of all Meta Mode changes
3. **Selective Rollback**: Revert specific changes while keeping others

```
┌─────────────────────────────────────────────────────────────┐
│  Meta Mode History                                          │
├─────────────────────────────────────────────────────────────┤
│  ✓ Added notification bell to dashboard        2 min ago   │
│    └─ [Rollback] [View Diff]                               │
│                                                             │
│  ✓ Changed primary color to blue               15 min ago  │
│    └─ [Rollback] [View Diff]                               │
│                                                             │
│  ✓ Added dark mode toggle                      1 hour ago  │
│    └─ [Rollback] [View Diff]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Safety & Governance

### Protected Files

Certain files are protected from modification to prevent breaking the IDE:

| Category | Files | Reason |
|----------|-------|--------|
| Core Auth | `server/_core/auth.ts`, `server/_core/context.ts` | Breaking auth locks users out |
| Database Core | `server/_core/db.ts`, `drizzle/migrations/*` | Data integrity |
| Build Config | `vite.config.ts`, `tsconfig.json`, `package.json` | Build stability |
| Meta System | `server/meta/*` | Self-modification infrastructure |

Protected files can only be modified by:
1. Admin users with explicit override
2. After viewing a warning about risks
3. With automatic backup created first

### Validation Pipeline

Before any change is applied:

1. **Syntax Check** - TypeScript compilation must pass
2. **Import Check** - All imports must resolve
3. **Type Check** - No type errors introduced
4. **Lint Check** - ESLint rules must pass
5. **Test Check** - Existing tests must still pass (optional, can be skipped)

If validation fails, the user sees the errors and can ask the Meta-Agent to fix them.

### Change Categories

Changes are categorized by risk level:

| Level | Examples | Approval |
|-------|----------|----------|
| **Low** | Styling, text changes, new components | Auto-approved |
| **Medium** | New routes, new API endpoints, new tables | Preview required |
| **High** | Auth changes, database migrations, core modifications | Explicit confirmation |
| **Critical** | Protected files, security-related | Admin + warning |

### Audit Trail

All Meta Mode changes are logged:

```typescript
interface MetaChangeLog {
  id: string;
  userId: string;
  timestamp: Date;
  request: string;           // Original user request
  filesModified: string[];   // List of changed files
  diff: string;              // Full diff of changes
  checkpointId: string;      // For rollback
  status: 'applied' | 'rolled_back' | 'failed';
  validationResults: ValidationResult[];
}
```

---

## Technical Implementation

### Phase 1: Foundation (Week 1-2)

**1.1 System Project Setup**

Create the special "Hero IDE System" project that points to the IDE's own codebase:

```typescript
// server/meta/systemProject.ts
export const SYSTEM_PROJECT = {
  id: 'hero-ide-system',
  name: 'Hero IDE System',
  path: '/home/ubuntu/hero-ide',
  isSystem: true,
  protected: true,
};

export async function getSystemProjectFiles(): Promise<FileTree> {
  // Return file tree of IDE codebase
  // Exclude node_modules, .git, dist, etc.
}
```

**1.2 Meta-Agent Definition**

Create the specialized Meta-Agent with IDE knowledge:

```typescript
// server/meta/metaAgent.ts
export const META_AGENT_PROMPT = `
You are the Meta-Agent for Hero IDE. Your role is to help users modify and extend
the IDE itself through natural language requests.

## Your Knowledge

You have deep understanding of:
- Hero IDE's file structure and architecture
- React 19, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- The shadcn/ui component library
- The existing design system (colors, typography, spacing)

## File Structure

${FILE_TREE}

## Key Patterns

- Pages go in client/src/pages/
- Components go in client/src/components/
- API routes go in server/routers.ts
- Database schema in drizzle/schema.ts
- Hooks go in client/src/hooks/

## Protected Files

These files should not be modified without explicit user confirmation:
${PROTECTED_FILES.join('\n')}

## Your Process

1. Understand the user's request
2. Identify which files need to be created/modified
3. Generate the code changes
4. Explain what you're doing and why
5. Wait for user approval before applying
`;
```

**1.3 Change Preview System**

Build the diff preview component:

```typescript
// client/src/components/meta/ChangePreview.tsx
interface ChangePreviewProps {
  changes: FileChange[];
  onApply: () => void;
  onCancel: () => void;
}

export function ChangePreview({ changes, onApply, onCancel }: ChangePreviewProps) {
  return (
    <div className="change-preview">
      <h3>Proposed Changes</h3>
      {changes.map(change => (
        <DiffViewer
          key={change.path}
          path={change.path}
          before={change.before}
          after={change.after}
        />
      ))}
      <div className="actions">
        <Button onClick={onCancel} variant="ghost">Cancel</Button>
        <Button onClick={onApply} variant="primary">Apply Changes</Button>
      </div>
    </div>
  );
}
```

### Phase 2: Execution Engine (Week 3-4)

**2.1 File Modification Service**

```typescript
// server/meta/fileModifier.ts
export async function applyChanges(changes: FileChange[]): Promise<ApplyResult> {
  // 1. Create checkpoint
  const checkpoint = await createMetaCheckpoint();
  
  // 2. Validate all changes
  const validation = await validateChanges(changes);
  if (!validation.success) {
    return { success: false, errors: validation.errors };
  }
  
  // 3. Apply changes atomically
  try {
    for (const change of changes) {
      await applyFileChange(change);
    }
  } catch (error) {
    // Rollback on failure
    await rollbackToCheckpoint(checkpoint.id);
    throw error;
  }
  
  // 4. Trigger hot-reload
  await triggerHotReload(changes);
  
  return { success: true, checkpointId: checkpoint.id };
}
```

**2.2 Validation Pipeline**

```typescript
// server/meta/validator.ts
export async function validateChanges(changes: FileChange[]): Promise<ValidationResult> {
  const results: ValidationCheck[] = [];
  
  // Syntax check
  results.push(await checkSyntax(changes));
  
  // Type check
  results.push(await checkTypes(changes));
  
  // Import resolution
  results.push(await checkImports(changes));
  
  // Lint check
  results.push(await checkLint(changes));
  
  return {
    success: results.every(r => r.passed),
    checks: results,
  };
}
```

**2.3 Hot-Reload Trigger**

```typescript
// server/meta/hotReload.ts
export async function triggerHotReload(changes: FileChange[]): Promise<void> {
  const hasBackendChanges = changes.some(c => c.path.startsWith('server/'));
  const hasFrontendChanges = changes.some(c => c.path.startsWith('client/'));
  
  if (hasBackendChanges) {
    // Signal server to restart
    await restartServer();
  }
  
  if (hasFrontendChanges) {
    // Vite HMR handles this automatically
    // Just need to touch the files
  }
}
```

### Phase 3: User Interface (Week 5-6)

**3.1 Meta Mode Indicator**

```typescript
// client/src/components/meta/MetaModeIndicator.tsx
export function MetaModeIndicator() {
  const { isMetaMode, exitMetaMode } = useMetaMode();
  
  if (!isMetaMode) return null;
  
  return (
    <div className="meta-mode-banner">
      <span className="icon">🔧</span>
      <span className="text">META MODE - Modifying Hero IDE</span>
      <Button onClick={exitMetaMode} size="sm" variant="ghost">
        Exit Meta
      </Button>
    </div>
  );
}
```

**3.2 Meta Chat Integration**

Modify the chat interface to support Meta Mode:

```typescript
// client/src/pages/Chat.tsx
export function Chat() {
  const { isMetaMode } = useMetaMode();
  const agent = isMetaMode ? 'meta-agent' : selectedAgent;
  
  return (
    <div className="chat-page">
      {isMetaMode && <MetaModeIndicator />}
      <ChatInterface
        agent={agent}
        onMessage={handleMessage}
        renderMessage={(msg) => (
          <>
            <MessageBubble message={msg} />
            {msg.pendingChanges && (
              <ChangePreview
                changes={msg.pendingChanges}
                onApply={() => applyChanges(msg.pendingChanges)}
                onCancel={() => cancelChanges(msg.id)}
              />
            )}
          </>
        )}
      />
    </div>
  );
}
```

**3.3 Checkpoint History Panel**

```typescript
// client/src/components/meta/CheckpointHistory.tsx
export function CheckpointHistory() {
  const { data: checkpoints } = trpc.meta.listCheckpoints.useQuery();
  const rollback = trpc.meta.rollback.useMutation();
  
  return (
    <div className="checkpoint-history">
      <h3>Meta Mode History</h3>
      {checkpoints?.map(cp => (
        <div key={cp.id} className="checkpoint-item">
          <span className="description">{cp.description}</span>
          <span className="time">{formatRelative(cp.createdAt)}</span>
          <Button onClick={() => rollback.mutate(cp.id)} size="sm">
            Rollback
          </Button>
        </div>
      ))}
    </div>
  );
}
```

### Phase 4: Polish & Safety (Week 7-8)

**4.1 Protected File Warnings**

**4.2 Validation Error Display**

**4.3 Rollback Confirmation**

**4.4 Audit Log Viewer**

---

## User Journeys

### Journey 1: Simple UI Customization

**Scenario**: User wants to change the sidebar color

1. User types: "Change the sidebar background to a darker gray"
2. Meta-Agent identifies `DashboardLayout.tsx` and `index.css`
3. Shows preview of CSS variable change
4. User approves
5. Sidebar color updates instantly

**Time**: ~10 seconds

### Journey 2: New Feature Addition

**Scenario**: User wants a word count in the editor

1. User types: "Add a word count display at the bottom of the code editor"
2. Meta-Agent plans:
   - Create `WordCount.tsx` component
   - Modify `CodeEditor.tsx` to include it
   - Add word counting logic
3. Shows preview of all changes
4. User approves
5. Word count appears in editor

**Time**: ~30 seconds

### Journey 3: Complex Integration

**Scenario**: User wants Slack notifications when agents complete tasks

1. User types: "Send me a Slack message when any agent finishes a task"
2. Meta-Agent identifies this needs:
   - Slack webhook URL (asks user)
   - New notification service
   - Hook into agent completion event
3. Asks clarifying questions about message format
4. Shows comprehensive plan
5. User provides webhook URL
6. Changes applied with new settings page section

**Time**: ~2 minutes

### Journey 4: Rollback After Mistake

**Scenario**: User's change broke something

1. User made a change that caused an error
2. User types: "Undo that last change"
3. Meta-Agent shows the checkpoint
4. User confirms rollback
5. IDE returns to previous state

**Time**: ~5 seconds

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to simple change | < 15 seconds |
| Time to new component | < 45 seconds |
| Validation catch rate | > 95% of errors |
| Rollback success rate | 100% |
| User satisfaction | > 4.5/5 |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking change locks user out | Critical | Protected files, instant rollback |
| Infinite loop in hot-reload | High | Debounce, change detection |
| Security vulnerability introduced | High | Validation pipeline, code review |
| Data loss from bad migration | Critical | Backup before schema changes |
| Performance degradation | Medium | Monitoring, automatic rollback |

---

## Future Enhancements

### Version 2.0
- **Plugin System**: Package Meta Mode changes as shareable plugins
- **Community Templates**: Browse and install community modifications
- **AI Suggestions**: Proactive suggestions for improvements
- **A/B Testing**: Test changes with subset of users

### Version 3.0
- **Visual Editor**: Drag-and-drop UI modifications
- **Design System Evolution**: AI-assisted design system updates
- **Multi-User Collaboration**: Real-time collaborative modifications

---

## Appendix: Meta-Agent Full System Prompt

```markdown
# Meta-Agent System Prompt

You are the Meta-Agent for Hero IDE. Your purpose is to help users modify and extend
the IDE itself through natural language conversation.

## Your Capabilities

1. **Create new components** - React components with TypeScript
2. **Modify existing files** - Update code while preserving functionality
3. **Add API endpoints** - tRPC procedures with proper typing
4. **Update database schema** - Drizzle schema changes with migrations
5. **Modify styling** - Tailwind classes and CSS variables
6. **Add new pages** - Full page components with routing

## Your Constraints

1. **Never modify protected files** without explicit user confirmation
2. **Always show a preview** before applying changes
3. **Create checkpoints** before every modification
4. **Validate all changes** before applying
5. **Explain your reasoning** so users understand what you're doing

## Code Style

- Use TypeScript with strict types
- Follow existing patterns in the codebase
- Use shadcn/ui components when possible
- Use Tailwind for styling
- Keep components small and focused
- Add proper error handling

## Response Format

When proposing changes, structure your response as:

1. **Understanding**: Restate what the user wants
2. **Plan**: List the files you'll create/modify
3. **Preview**: Show the actual code changes
4. **Confirmation**: Ask for approval

## Example Interaction

User: "Add a dark mode toggle to the settings page"

Response:
"I understand you want to add a dark mode toggle to the settings page.

**Plan:**
1. Add `darkMode` state to settings context
2. Create `DarkModeToggle.tsx` component
3. Add toggle to Settings.tsx General tab
4. Update CSS variables for dark mode

**Files to modify:**
- `client/src/contexts/SettingsContext.tsx`
- `client/src/components/DarkModeToggle.tsx` (new)
- `client/src/pages/Settings.tsx`
- `client/src/index.css`

**Preview:**
[Shows diff for each file]

Would you like me to apply these changes?"
```

---

*Document prepared by Manus AI*
*Version 1.0 - December 2024*
