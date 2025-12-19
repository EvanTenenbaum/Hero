# Kiro IDE - Mobile App Interface Design

## Overview
An open-source AI-powered IDE with context awareness, smart LLM routing, API/MCP connections, GitHub integration, autonomous agent spawning, secrets vault, agent rules system, and intelligent roadmap/sprint planning. Mobile-first design optimized for portrait orientation (9:16) and one-handed usage.

---

## Color Palette

### Primary Colors
- **Accent**: `#00D4AA` (Teal/Mint) - Primary actions, active states, AI indicators
- **Secondary Accent**: `#6366F1` (Indigo) - Agent activity, parallel tasks
- **Warning**: `#F59E0B` (Amber) - Pending actions, warnings
- **Error**: `#EF4444` (Red) - Errors, destructive actions
- **Success**: `#10B981` (Emerald) - Completed tasks, success states

### Surface Colors (Dark Mode Default - IDE Standard)
- **Background**: `#0D1117` - Main app background
- **Surface**: `#161B22` - Cards, panels
- **Elevated**: `#21262D` - Modals, dropdowns, elevated surfaces
- **Border**: `#30363D` - Dividers, borders

### Text Colors
- **Primary**: `#F0F6FC` - Headings, important text
- **Secondary**: `#8B949E` - Body text, descriptions
- **Disabled**: `#484F58` - Disabled states, placeholders

### Severity Colors (for Roadmap)
- **Critical**: `#EF4444` (Red)
- **High**: `#F97316` (Orange)
- **Medium**: `#F59E0B` (Amber)
- **Low**: `#22C55E` (Green)
- **Info**: `#3B82F6` (Blue)

### Syntax Highlighting (Code Editor)
- **Keyword**: `#FF7B72` (Pink-Red)
- **String**: `#A5D6FF` (Light Blue)
- **Comment**: `#8B949E` (Gray)
- **Function**: `#D2A8FF` (Purple)
- **Variable**: `#FFA657` (Orange)
- **Type**: `#79C0FF` (Blue)

---

## Typography

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Title | 28pt | Bold | 36pt | Screen titles |
| Subtitle | 20pt | SemiBold | 28pt | Section headers |
| Body | 16pt | Regular | 24pt | Main content |
| Code | 14pt | Mono | 20pt | Code editor, terminal |
| Caption | 12pt | Regular | 16pt | Labels, timestamps |
| Small | 11pt | Medium | 14pt | Badges, tags |

---

## Screen List

### 1. Home / Projects Screen
**Purpose**: Project dashboard and quick access to recent work

**Content**:
- Search bar (top)
- Quick actions row: New Project, Clone from GitHub, Import
- Recent projects list with:
  - Project name and icon
  - Last modified timestamp
  - Context summary (files, branches, active agents)
  - Quick action buttons (Open, Settings, Delete)
- Pinned projects section

### 2. Project Workspace Screen
**Purpose**: Main IDE workspace for active project

**Content**:
- Top bar: Project name, branch selector, sync status
- Tab bar: Files | Roadmap | Chat | Agents
- File tree (collapsible left panel on tablet)
- Code editor area (main content)
- Bottom toolbar: Terminal toggle, Git status, LLM indicator

### 3. Code Editor Screen
**Purpose**: Full-screen code editing with AI assistance

**Content**:
- File tabs (horizontal scroll)
- Line numbers with gutter
- Syntax-highlighted code area
- AI suggestion overlay (inline completions)
- Bottom: File path, cursor position, language mode
- Floating action button: AI Chat, Quick Actions

### 4. AI Chat Screen
**Purpose**: Interact with AI PM for planning, task generation, and roadmap control

**Content**:
- Chat history with message bubbles
- Context indicator (current file, selection, project scope)
- Message input with:
  - Text field
  - Attach context button
  - Model selector dropdown
  - Send button
- Quick actions: Generate Plan, Create Tasks, Explain Code
- Natural language commands for roadmap:
  - "Add task: implement user auth"
  - "Move task X to sprint 2"
  - "What should I work on next?"
  - "Reorder tasks by priority"
  - "Create sprint from high-severity items"

### 5. Roadmap Screen (NEW)
**Purpose**: Visual task management with smart planning

**Content**:
- Sprint selector tabs (Backlog, Sprint 1, Sprint 2, etc.)
- Task list with drag handles for reordering
- Each task card shows:
  - Title and description
  - Severity badge (Critical/High/Medium/Low)
  - Status indicator (Todo/In Progress/Blocked/Done)
  - Dependency links (blocked by, blocks)
  - Parallelizable indicator
  - Assigned agent (if any)
- Floating action buttons:
  - Add Task
  - Smart Order (AI suggests optimal order)
  - Create Sprint (AI proposes sprint based on severity)
- Filter/sort options: By severity, status, dependencies

### 6. Task Detail Sheet (NEW)
**Purpose**: Edit task properties and manage dependencies

**Content**:
- Task title (editable)
- Description (editable, markdown)
- Severity selector (Critical/High/Medium/Low)
- Status selector (Todo/In Progress/Blocked/Done)
- Dependencies section:
  - "Blocked by" task list (add/remove)
  - "Blocks" task list (read-only)
- Parallelizable toggle
- Estimated effort (hours/points)
- Assigned agent selector
- Action buttons: Save, Delete, Assign to Agent

### 7. Smart Sprint Suggestion Sheet (NEW)
**Purpose**: AI-generated sprint proposal

**Content**:
- Suggested sprint name and goal
- Recommended tasks list with reasoning:
  - Why included (severity, dependencies resolved)
  - Suggested order
  - Parallel execution groups
- Estimated total effort
- Dependency graph visualization
- Actions: Accept All, Customize, Reject

### 8. Secrets Vault Screen (NEW)
**Purpose**: Secure storage for API keys and credentials

**Content**:
- Search/filter bar
- Secret categories tabs: All | LLM | GitHub | MCP | Custom
- Secrets list with:
  - Secret name
  - Category badge
  - Last used timestamp
  - Masked value preview (•••••)
  - Edit/Delete buttons
- Add Secret floating button
- Security info banner (encryption status)

### 9. Add/Edit Secret Sheet (NEW)
**Purpose**: Create or modify a secret

**Content**:
- Secret name input
- Category selector dropdown
- Value input (secure text field with show/hide toggle)
- Description/notes field
- Project scope selector (All projects / Specific project)
- Save/Cancel buttons

### 10. Agent Rules Screen (NEW)
**Purpose**: Configure rules and context for agent types

**Content**:
- Agent types list:
  - Coding Agent
  - Review Agent
  - Planning Agent
  - Documentation Agent
  - Testing Agent
  - Custom agents
- Each type card shows:
  - Type name and icon
  - Active rules count
  - Context injection summary
  - Edit button

### 11. Agent Type Configuration Sheet (NEW)
**Purpose**: Define rules and context for a specific agent type

**Content**:
- Agent type name (editable for custom)
- System prompt/instructions (markdown editor)
- Context injection rules:
  - Include current file: toggle
  - Include related files: toggle + pattern
  - Include project structure: toggle
  - Include recent changes: toggle + count
  - Include roadmap context: toggle
  - Custom context sources: list
- Behavior settings:
  - Max tokens per response
  - Temperature slider
  - Preferred LLM model
  - Auto-commit changes: toggle
- Project overrides section (per-project customization)

### 12. Agents Screen
**Purpose**: Monitor and control spawned autonomous agents

**Content**:
- Active agents grid/list:
  - Agent ID and type
  - Current task from roadmap
  - Progress indicator
  - Resource usage (tokens, time)
  - Actions: Pause, Resume, Kill
- Agent logs (expandable)
- Spawn new agent button
- Parallel execution indicator

### 13. File Browser Screen
**Purpose**: Navigate and manage project files

**Content**:
- Breadcrumb navigation
- File/folder list with icons
- File actions: New, Rename, Delete, Move
- Search within files
- Git status indicators per file

### 14. GitHub Integration Screen
**Purpose**: Manage GitHub connections and operations

**Content**:
- Connected account info
- Repository list (owned, starred, recent)
- Clone repository form
- Current repo actions:
  - Pull, Push, Fetch
  - Branch management
  - PR list and creation
  - Commit history

### 15. API Connections Screen
**Purpose**: Configure LLM and external API connections

**Content**:
- LLM Providers section:
  - OpenAI, Anthropic, Google, Local models
  - API key reference (from Secrets Vault)
  - Model selection per provider
  - Usage stats
- Smart routing configuration:
  - Task type → Model mapping
  - Cost optimization settings
  - Fallback chain

### 16. MCP Connections Screen
**Purpose**: Manage Model Context Protocol servers

**Content**:
- Connected MCP servers list
- Add new server form:
  - Server name
  - Connection URL
  - Authentication (from Secrets Vault)
- Server tools browser
- Connection status and health

### 17. Settings Screen
**Purpose**: App and project settings

**Content**:
- Appearance: Theme, font size, editor settings
- Editor: Tab size, auto-save, formatting
- AI: Default model, context window, temperature
- GitHub: Account, default branch settings
- Storage: Cache management, offline mode
- About: Version, licenses, feedback

---

## Key User Flows

### Flow 1: Create New Project with AI Planning
1. Home → Tap "New Project"
2. Enter project name and description
3. AI suggests initial structure
4. Confirm → Project created
5. AI Chat opens → "What would you like to build?"
6. User describes goal
7. AI generates roadmap with tasks
8. User reviews in Roadmap screen
9. AI suggests first sprint based on severity
10. User approves → Agents spawn to execute

### Flow 2: Edit Code with AI Assistance
1. Project Workspace → Tap file in tree
2. Code Editor opens
3. User selects code block
4. Tap floating AI button
5. Choose action: Explain, Refactor, Fix, Document
6. AI processes with context awareness
7. Suggestion appears inline
8. User accepts/rejects/modifies

### Flow 3: Manage Roadmap via Natural Language
1. Open AI Chat
2. User: "Add a high-priority task for user authentication"
3. AI creates task, confirms in chat
4. User: "What's blocking the payment integration?"
5. AI shows dependency chain
6. User: "Move auth task before payment"
7. AI reorders, updates roadmap
8. User: "Create a sprint for this week"
9. AI proposes sprint based on priorities and dependencies

### Flow 4: Configure Agent Rules
1. Settings → Agent Rules
2. Select "Coding Agent"
3. Edit system prompt with project-specific instructions
4. Configure context injection:
   - Enable "Include related files"
   - Set pattern: "*.ts, *.tsx"
5. Set preferred model to Claude
6. Save configuration
7. Future coding agents use these rules

### Flow 5: Add and Use Secrets
1. Settings → Secrets Vault
2. Tap "Add Secret"
3. Enter name: "OPENAI_API_KEY"
4. Select category: "LLM"
5. Enter API key value
6. Save (encrypted storage)
7. In API Connections, select key from vault
8. Key is used securely without exposure

### Flow 6: Smart Sprint Planning
1. Roadmap screen with many tasks
2. Tap "Create Sprint" floating button
3. AI analyzes:
   - Task severities
   - Dependencies and blockers
   - Parallelization opportunities
4. AI presents sprint suggestion:
   - "Sprint 1: Core Auth (5 tasks)"
   - Shows task order with reasoning
   - Highlights parallel groups
5. User reviews, adjusts if needed
6. Accept → Sprint created
7. Tap "Smart Order" to optimize sequence

### Flow 7: Spawn Parallel Agents
1. Roadmap → Select sprint
2. View parallelizable tasks
3. Tap "Spawn Agents"
4. Configure: 3 parallel agents
5. Agents pick non-blocking tasks
6. Monitor in Agents screen
7. Agents complete, update task status
8. Review results in Roadmap

---

## Navigation Structure

```
Tab Bar (Bottom)
├── Projects (house.fill)
│   └── Projects list
│       └── Project Workspace
│           ├── Files tab
│           │   └── Code Editor
│           ├── Roadmap tab
│           │   ├── Task Detail Sheet
│           │   └── Smart Sprint Sheet
│           ├── Chat tab
│           └── Agents tab
├── Chat (bubble.left.fill)
│   └── AI Chat interface
│       └── Natural language roadmap control
├── Agents (cpu.fill)
│   └── Agent management
│       └── Agent logs
└── Settings (gearshape.fill)
    ├── Secrets Vault
    │   └── Add/Edit Secret
    ├── Agent Rules
    │   └── Agent Type Config
    ├── API Connections
    ├── MCP Connections
    ├── GitHub
    └── Preferences
```

---

## Component Specifications

### Project Card
- Height: 88pt
- Padding: 16pt
- Corner radius: 12pt
- Background: Surface color
- Contains: Icon (40pt), Title, Subtitle, Timestamp, Chevron

### Task Card (Roadmap)
- Height: Auto (min 72pt)
- Padding: 12pt
- Corner radius: 8pt
- Background: Surface color
- Left: Drag handle (24pt)
- Contains: Title, Severity badge, Status, Dependency count
- Right: Chevron for detail

### Severity Badge
- Height: 20pt
- Padding: 4pt horizontal
- Corner radius: 4pt
- Font: Small (11pt)
- Colors: Critical=Red, High=Orange, Medium=Amber, Low=Green

### Secret Card
- Height: 64pt
- Padding: 12pt
- Corner radius: 8pt
- Contains: Name, Category badge, Masked value, Actions

### Code Editor Line
- Height: 20pt (matches line height)
- Line number width: 48pt
- Gutter width: 16pt
- Font: Monospace 14pt

### Chat Message Bubble
- Max width: 80% of screen
- Padding: 12pt horizontal, 8pt vertical
- Corner radius: 16pt (8pt on sender corner)
- User messages: Accent background
- AI messages: Elevated background

### Agent Status Card
- Height: 120pt
- Progress bar height: 4pt
- Status badge: 24pt height, 8pt radius

### Bottom Tab Bar
- Height: 49pt + safe area
- Icon size: 24pt
- Label size: 10pt
- Active indicator: Accent color

---

## Gestures & Interactions

- **Drag task card**: Reorder within sprint or move between sprints
- **Swipe right on task**: Quick actions (Delete, Edit, Assign)
- **Swipe right on file**: Quick actions (Delete, Rename)
- **Long press on code**: Selection mode with AI actions
- **Pull down on chat**: Load more history
- **Swipe between tabs**: Navigate project sections
- **Pinch in editor**: Zoom code (accessibility)
- **Double tap line number**: Breakpoint toggle
- **Long press on secret**: Copy to clipboard (with warning)

---

## Accessibility

- Minimum touch target: 44pt × 44pt
- Color contrast ratio: 4.5:1 minimum
- VoiceOver labels on all interactive elements
- Dynamic type support for body text
- Reduced motion option for animations
- Severity badges include text, not just color
