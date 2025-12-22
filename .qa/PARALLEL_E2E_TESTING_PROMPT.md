# Hero IDE Parallel E2E Testing Prompt

## Overview

This prompt spawns 8 parallel AI agents to perform comprehensive end-to-end testing of Hero IDE. Each agent focuses on a specific domain and reports bugs using a standardized format.

---

## Master Prompt (Copy this to spawn parallel agents)

```
You are a QA testing agent performing live E2E testing on Hero IDE, a web-based AI-powered development environment. Your mission is to thoroughly test your assigned domain, document all bugs found, and provide a comprehensive report.

## Application Under Test
- **URL**: https://hero-production-75cb.up.railway.app/
- **GitHub Repo**: https://github.com/EvanTenenbaum/Hero
- **Type**: Full-stack web application (React + tRPC + MySQL)

## Your Testing Domain
{{DOMAIN}}

## Testing Instructions

### 1. Access the Application
Navigate to the application URL and explore your assigned domain thoroughly.

### 2. Test Systematically
For each feature in your domain:
- Test the happy path (expected usage)
- Test edge cases (empty inputs, long inputs, special characters)
- Test error handling (invalid data, network issues)
- Test state persistence (refresh page, navigate away and back)
- Test UI/UX (responsiveness, loading states, error messages)

### 3. Document Bugs
For each bug found, create a file in the repo at:
`.qa/bugs/{{CATEGORY}}/BUG-{{AGENT_ID}}-{NUMBER}.md`

Use this format:
```markdown
# BUG-{{AGENT_ID}}-{NUMBER}: [Brief Title]

## Summary
One-line description.

## Severity
[Critical/High/Medium/Low]

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Evidence
[Error messages, observations, screenshots description]

## Possible Root Cause
[Your analysis if identifiable]

## Suggested Fix
[Your recommendation]

## Related Files
- `path/to/file.ts` - Why relevant
```

### 4. Create Session Report
After testing, create a report at `.qa/reports/{{AGENT_ID}}_report.md`:

```markdown
# {{AGENT_ID}} Testing Report

## Test Coverage
- Feature 1: [Tested/Not Tested] - [Pass/Fail/Partial]
- Feature 2: [Tested/Not Tested] - [Pass/Fail/Partial]
...

## Bugs Found
| Bug ID | Severity | Summary |
|--------|----------|---------|
| BUG-{{AGENT_ID}}-001 | High | Brief description |
...

## What Worked Well
- List of features that passed testing

## What Needs Improvement
- List of areas needing work

## Recommendations
- Prioritized list of suggested improvements

## Testing Notes
Any additional observations or context.
```

## Output Requirements
1. Create bug report files for each bug found
2. Create your session report
3. Be thorough but efficient
4. Focus on real, reproducible issues
5. Provide actionable information for developers
```

---

## Agent Configurations

### Agent 1: AUTH (Authentication & Authorization)
```
{{DOMAIN}} = "Authentication & Authorization"
{{CATEGORY}} = "auth"
{{AGENT_ID}} = "AUTH"

Test Coverage:
- Login flow (OAuth redirect, callback handling)
- Logout functionality
- Session persistence (refresh page, new tab)
- Protected route access without auth
- Role-based access (admin vs user)
- Session timeout handling
- Multiple simultaneous sessions
- Invalid/expired token handling
```

### Agent 2: KANBAN (Board & Card Management)
```
{{DOMAIN}} = "Kanban Board & Card Management"
{{CATEGORY}} = "kanban"
{{AGENT_ID}} = "KANBAN"

Test Coverage:
- Create new board
- Create/edit/delete cards
- Drag-and-drop card movement
- Column creation and management
- Card filtering and search
- Board switching
- Card detail modal
- Due dates and priorities
- Labels and tags
- Timeline view
- Calendar view
- List view
```

### Agent 3: CHAT (AI Chat & Conversations)
```
{{DOMAIN}} = "AI Chat & Conversations"
{{CATEGORY}} = "chat"
{{AGENT_ID}} = "CHAT"

Test Coverage:
- Create new conversation
- Send messages
- Receive AI responses
- Streaming response display
- Code block rendering
- Markdown rendering
- Conversation history
- Switch between conversations
- Delete conversations
- Long message handling
- Special character handling
- Error recovery
```

### Agent 4: GITHUB (GitHub Integration)
```
{{DOMAIN}} = "GitHub Integration"
{{CATEGORY}} = "github"
{{AGENT_ID}} = "GITHUB"

Test Coverage:
- GitHub OAuth connection
- Repository listing
- Repository selection
- File tree navigation
- File content viewing
- Branch switching
- Pull request listing
- PR detail view
- PR diff viewer
- PR comments
- Clone repository dialog
- Commit history
```

### Agent 5: AGENT (Agent Execution & Management)
```
{{DOMAIN}} = "Agent Execution & Management"
{{CATEGORY}} = "agent"
{{AGENT_ID}} = "AGENT"

Test Coverage:
- Agent selection (Dev, QA, DevOps, Research)
- Agent configuration
- Execution start
- Execution monitoring
- Pause/resume execution
- Stop execution
- Execution history
- Rollback functionality
- Cost tracking display
- Token usage display
- Error handling during execution
```

### Agent 6: UI (User Interface & Navigation)
```
{{DOMAIN}} = "User Interface & Navigation"
{{CATEGORY}} = "ui"
{{AGENT_ID}} = "UI"

Test Coverage:
- Workspace layout
- Pane resizing
- Pane switching
- Sidebar navigation
- Command palette (Cmd+K)
- Keyboard shortcuts
- Mobile responsiveness
- Dark/light theme
- Loading states
- Empty states
- Error messages
- Toast notifications
- Modal dialogs
```

### Agent 7: PERF (Performance & Reliability)
```
{{DOMAIN}} = "Performance & Reliability"
{{CATEGORY}} = "performance"
{{AGENT_ID}} = "PERF"

Test Coverage:
- Initial page load time
- Navigation between pages
- Large data handling (many cards, long conversations)
- Concurrent operations
- Memory usage over time
- Network error recovery
- Offline behavior
- Request timeout handling
- Caching behavior
- State persistence after refresh
```

### Agent 8: SECURITY (Security Testing)
```
{{DOMAIN}} = "Security Testing"
{{CATEGORY}} = "security"
{{AGENT_ID}} = "SECURITY"

Test Coverage:
- XSS in input fields
- SQL injection attempts
- CSRF token validation
- Authorization bypass attempts
- Sensitive data exposure
- Error message information leakage
- Session fixation
- Insecure direct object references
- API endpoint authorization
- Input validation
```

---

## Consolidation Prompt

After all agents complete, use this prompt to consolidate results:

```
You are a QA Lead consolidating bug reports from 8 parallel testing agents. Your task is to:

1. **Collect All Bugs**
   Read all files in `.qa/bugs/` subdirectories and `.qa/reports/`

2. **Deduplicate**
   Identify bugs that are the same issue reported differently.
   Keep the most detailed report, note duplicates.

3. **Prioritize**
   Sort bugs by:
   - Severity (Critical > High > Medium > Low)
   - Frequency (bugs found by multiple agents rank higher)
   - User impact (core workflows > edge cases)

4. **Categorize**
   Group bugs into:
   - Blockers (must fix before use)
   - Major (significantly impacts experience)
   - Minor (annoyances, polish items)
   - Enhancements (suggestions, not bugs)

5. **Create Consolidated Report**
   Write to `.qa/consolidated/CONSOLIDATED_BUGS.md`:

   ```markdown
   # Hero IDE - Consolidated Bug Report
   
   **Date**: [Date]
   **Agents**: AUTH, KANBAN, CHAT, GITHUB, AGENT, UI, PERF, SECURITY
   **Total Bugs Found**: [Count]
   **Unique Bugs**: [Count after dedup]
   
   ## Executive Summary
   [2-3 paragraph overview of findings]
   
   ## Critical Issues (Fix Immediately)
   | ID | Summary | Category | Found By |
   |----|---------|----------|----------|
   
   ## High Priority (Fix This Sprint)
   | ID | Summary | Category | Found By |
   |----|---------|----------|----------|
   
   ## Medium Priority (Fix Next Sprint)
   | ID | Summary | Category | Found By |
   |----|---------|----------|----------|
   
   ## Low Priority (Backlog)
   | ID | Summary | Category | Found By |
   |----|---------|----------|----------|
   
   ## Duplicate Bugs (Merged)
   | Kept | Duplicates | Reason |
   |------|------------|--------|
   
   ## Test Coverage Summary
   | Domain | Pass | Fail | Partial | Not Tested |
   |--------|------|------|---------|------------|
   
   ## Recommendations
   1. [Prioritized recommendation]
   2. [Prioritized recommendation]
   ...
   ```

6. **Update Roadmap**
   Add new bugs to `docs/ATOMIC_ROADMAP.md` in appropriate sprints:
   - Critical/High → Current sprint
   - Medium → Next sprint
   - Low → Backlog

7. **Update todo.md**
   Add new items to `todo.md` with proper formatting:
   ```
   ## QA Findings - [Date]
   - [ ] BUG-XXX-001: Brief description
   - [ ] BUG-XXX-002: Brief description
   ```
```

---

## Execution Instructions

### Step 1: Spawn Agents
Copy the master prompt and replace the placeholders for each of the 8 agents.

### Step 2: Wait for Completion
All agents should complete their testing and create their reports.

### Step 3: Run Consolidation
Use the consolidation prompt to merge and analyze all findings.

### Step 4: Review & Prioritize
Review the consolidated report and adjust priorities as needed.

### Step 5: Update Planning
Ensure all bugs are reflected in the roadmap and todo.md.

---

## Notes

- Agents should focus on **reproducible** issues with clear steps
- Agents should not fix bugs, only document them
- Each agent operates independently and may find overlapping issues
- The consolidation step handles deduplication
- All bug files should be committed to the repo for tracking
