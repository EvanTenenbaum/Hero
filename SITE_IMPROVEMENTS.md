# Hero IDE - Comprehensive Site Logic Improvements

## Executive Summary

After reviewing all routers, pages, and components, I've identified significant improvement opportunities across the codebase. This document outlines findings and recommended improvements organized by priority.

---

## Critical Improvements (High Priority)

### 1. Chat Page - Missing Agent Type Selection
**Current State:** Chat sends messages without specifying agent type, defaulting to "pm"
**Problem:** Users can't leverage specialized agents (Developer, QA, DevOps, Research) from chat
**Solution:** Add agent type selector to chat UI

```tsx
// Add to Chat.tsx
const [selectedAgentType, setSelectedAgentType] = useState<"pm" | "developer" | "qa" | "devops" | "research">("pm");

// In sendMessage mutation:
sendMessage.mutate({
  conversationId: targetConversationId,
  content: messageContent,
  agentType: selectedAgentType,  // Pass selected agent
});
```

### 2. Chat Page - Missing Safety Check UI Feedback
**Current State:** Backend returns `blocked`, `safetyReason`, `requiresConfirmation` but UI doesn't handle them
**Problem:** Users don't see when messages are blocked or need confirmation
**Solution:** Add visual feedback for safety states

```tsx
// Handle blocked messages with visual indicator
if (response.blocked) {
  toast.error(`Message blocked: ${response.safetyReason}`);
}

// Handle confirmation required
if (response.requiresConfirmation) {
  // Show confirmation dialog
}
```

### 3. Agents Page - Missing Onboarding for New Users
**Current State:** New users see empty state with just "Create Agent" button
**Problem:** Users don't know what agent types to create or how to configure them
**Solution:** Add AgentOnboarding component with preset templates

### 4. Settings Page - Secrets Stored with Base64 (Not Encrypted)
**Current State:** `createSecret` uses `Buffer.from(input.value).toString("base64")`
**Problem:** Base64 is encoding, not encryption - secrets are readable
**Solution:** Implement proper encryption with AES-256-GCM

---

## Important Improvements (Medium Priority)

### 5. Chat Page - No Optimistic Updates
**Current State:** Messages only appear after server response
**Problem:** Slow perceived performance, user doesn't see their message immediately
**Solution:** Add optimistic update pattern

```tsx
const sendMessage = trpc.chat.sendMessage.useMutation({
  onMutate: async (newMessage) => {
    // Cancel outgoing refetches
    await utils.chat.getMessages.cancel();
    
    // Snapshot previous value
    const previousMessages = utils.chat.getMessages.getData({ conversationId });
    
    // Optimistically add user message
    utils.chat.getMessages.setData({ conversationId }, (old) => [
      ...(old || []),
      { id: Date.now(), role: "user", content: newMessage.content, createdAt: new Date() }
    ]);
    
    return { previousMessages };
  },
  onError: (err, newMessage, context) => {
    // Rollback on error
    utils.chat.getMessages.setData({ conversationId }, context?.previousMessages);
  },
});
```

### 6. Workspace Page - No Auto-Save
**Current State:** Users must manually save with commit message for every change
**Problem:** Risk of losing work, friction in development flow
**Solution:** Add auto-save with debounced commits or local storage backup

### 7. Projects Page - No Search/Filter
**Current State:** Projects displayed in grid without search
**Problem:** Difficult to find projects as list grows
**Solution:** Add search input and filter by status/date

### 8. Agents Page - No Quick Actions
**Current State:** Must click into agent detail to start execution
**Problem:** Extra navigation for common action
**Solution:** Add "Run" button directly on agent cards

### 9. Execution History - No Pagination
**Current State:** Loads all executions at once
**Problem:** Performance degrades with many executions
**Solution:** Add pagination or infinite scroll

### 10. Missing Rate Limiting on Chat
**Current State:** No rate limiting on sendMessage
**Problem:** Users could spam expensive LLM calls
**Solution:** Add rate limiting middleware

---

## UX Improvements (Lower Priority)

### 11. Chat - No Message Timestamps
**Current State:** Messages don't show when they were sent
**Solution:** Add relative timestamps (e.g., "2 min ago")

### 12. Chat - No Message Copy Button
**Current State:** Users must manually select and copy AI responses
**Solution:** Add copy button on hover

### 13. Agents - No Duplicate/Clone Feature
**Current State:** Must create agents from scratch
**Solution:** Add "Duplicate" action to create copy of existing agent

### 14. Settings - No Export/Import
**Current State:** Settings can't be backed up or transferred
**Solution:** Add export/import JSON functionality

### 15. Missing Keyboard Shortcuts
**Current State:** No keyboard navigation
**Solution:** Add shortcuts (Cmd+K for search, Cmd+N for new, etc.)

---

## Code Quality Improvements

### 16. Repeated GitHub Connection Checks
**Current State:** Every GitHub router method checks connection separately
**Solution:** Create middleware or shared procedure

```ts
const githubAuthedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
  if (!conn) throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
  return next({ ctx: { ...ctx, githubToken: conn.accessToken } });
});
```

### 17. Inconsistent Error Handling
**Current State:** Some errors logged to console, some thrown, some silently fail
**Solution:** Standardize error handling with error boundary and logging service

### 18. Missing Loading States
**Current State:** Some pages show nothing while loading
**Solution:** Add skeleton loaders consistently

### 19. No Error Boundaries
**Current State:** Errors crash entire page
**Solution:** Add React error boundaries around major sections

---

## Implementation Priority Order

1. **Chat Agent Type Selection** - Quick win, high value
2. **Chat Safety Check UI** - Critical for safety system to be visible
3. **Chat Optimistic Updates** - Major UX improvement
4. **Secrets Encryption** - Security critical
5. **Agent Onboarding** - Improves new user experience
6. **Rate Limiting** - Prevents abuse
7. **GitHub Middleware** - Code quality
8. **Pagination** - Performance
9. **Search/Filter** - UX
10. **Remaining items** - Polish

---

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/Chat.tsx` | Agent selector, safety UI, optimistic updates, timestamps, copy button |
| `client/src/pages/Agents.tsx` | Onboarding, quick actions, duplicate |
| `client/src/pages/Projects.tsx` | Search/filter |
| `client/src/pages/ExecutionHistory.tsx` | Pagination |
| `client/src/pages/Settings.tsx` | Export/import |
| `server/routers.ts` | GitHub middleware, rate limiting, encryption |
| `client/src/components/ErrorBoundary.tsx` | New file |
| `client/src/components/SkeletonLoaders.tsx` | New file |

---

## Estimated Effort

| Priority | Items | Estimated Time |
|----------|-------|----------------|
| Critical | 4 | 4-6 hours |
| Important | 6 | 6-8 hours |
| UX | 5 | 3-4 hours |
| Code Quality | 4 | 4-5 hours |
| **Total** | **19** | **17-23 hours** |
