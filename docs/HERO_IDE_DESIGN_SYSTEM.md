# Hero IDE Design System

**A Comprehensive Redesign Proposal**

*Inspired by Notion and Bear - Clean, Simple, User-Flow Centric*

---

## Executive Summary

This document presents a complete design system for Hero IDE that preserves all existing functionality while applying a refined aesthetic inspired by Notion's clarity and Bear's warmth. The goal is to create an interface that feels crafted rather than assembled, where the UI disappears and the user's work becomes the focus.

---

## Part 1: Feature Inventory

### Complete Page Inventory

| Page | Primary Function | Key Components | User Actions |
|------|-----------------|----------------|--------------|
| Dashboard | Welcome & navigation hub | Quick-action cards, Recent Activity, Quick Start guide | Navigate to features, view activity |
| Projects | Project management | Project grid, Create dialog, Project cards | Create, browse, select projects |
| Board | Kanban task management | Project selector, Board selector, Columns, Cards | Manage tasks, drag-drop, create cards |
| Chat | AI conversation | Conversation sidebar, Message area, Agent selector | Chat with AI, switch agents |
| Agents | Agent configuration | Agent grid, Create dialog, Status badges | Create, configure, enable agents |
| Workspace | Multi-pane IDE | 3-pane layout, Left sidebar, Right agent panel | Code, browse, chat simultaneously |
| Agent Config | Rule management | Rule editor, Agent filter, Preset tabs | Add rules, configure behavior |
| Execution History | Audit trail | Execution list, Detail panel | Review past agent actions |
| Metrics | Analytics dashboard | Stat cards, Charts, Insights | Monitor usage and costs |
| Settings | App configuration | Tab navigation, Form sections | Configure preferences |

### Settings Sub-sections

| Tab | Purpose | Key Fields |
|-----|---------|------------|
| General | App preferences | Notifications toggle, Budget limit, Default model |
| Secrets | API key management | Key-value pairs, Add/delete secrets |
| Governance | Safety controls | Risk thresholds, Approval requirements |
| Agent Rules | Behavior constraints | Rule definitions, Agent assignments |
| Budget | Cost management | Spending limits, Usage tracking |
| GitHub | Repository integration | OAuth connection, Repo settings |

### Agent Types

| Agent | Icon | Purpose |
|-------|------|---------|
| PM Agent | Briefcase | Project planning, requirements, coordination |
| Developer | Code | Code generation, debugging, refactoring |
| QA Agent | TestTube | Testing, quality assurance, bug detection |
| DevOps | Server | Infrastructure, deployment, CI/CD |
| Research | Search | Documentation, learning, exploration |

---

## Part 2: User Journey Maps

### Journey 1: New User Onboarding

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Dashboard  │───▶│  Projects   │───▶│   Agents    │───▶│    Chat     │
│  (Welcome)  │    │  (Create)   │    │ (Configure) │    │  (Start)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
   See Quick         Create first       Set up first      Begin first
   Start guide       project            AI agent          conversation
```

**Touchpoints:**
1. Land on Dashboard → See welcoming message and Quick Start
2. Click "Create Project" → Fill name/description → Project created
3. Navigate to Agents → Create agent with defaults → Agent active
4. Go to Chat → Select agent → Send first message → Receive response

**Pain Points to Address:**
- Dashboard feels generic, lacks personality
- Too many navigation items visible at once
- No guided tour or progressive disclosure

### Journey 2: Daily Development Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Workspace  │───▶│    Board    │───▶│    Chat     │───▶│  Workspace  │
│  (Open)     │    │  (Review)   │    │  (Discuss)  │    │  (Implement)│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
   Select project    Check tasks       Ask AI for         Apply changes
   and context       and priorities    guidance           to codebase
```

**Touchpoints:**
1. Open Workspace → Select project from sidebar → View files
2. Check Board → Review task columns → Pick next task
3. Open Chat → Discuss implementation with AI → Get suggestions
4. Return to Workspace → Implement changes → Commit

**Pain Points to Address:**
- Context switching between pages loses state
- Board and Workspace feel disconnected
- No easy way to reference tasks while coding

### Journey 3: Agent Supervision

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Agents    │───▶│Agent Config │───▶│  Execution  │───▶│   Metrics   │
│  (Select)   │    │  (Rules)    │    │  (Monitor)  │    │  (Review)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
   Choose agent      Set boundaries    Watch agent        Analyze cost
   to configure      and rules         work               and performance
```

**Touchpoints:**
1. Go to Agents → Select agent to configure → View details
2. Navigate to Agent Config → Add rules → Set boundaries
3. Check Execution History → Monitor agent progress → Review steps
4. View Metrics → Analyze token usage → Check budget

**Pain Points to Address:**
- Agent Config and Agents pages have overlapping purposes
- Execution History empty state provides no guidance
- Metrics could be more actionable

---

## Part 3: Design Principles

### Core Philosophy

> "The interface should disappear. The user's work is the hero."

Drawing from Notion and Bear, we establish these guiding principles:

**1. Typography First**
Content is communicated through thoughtful typography, not decorative elements. Headings use a warm serif font for personality; body text uses a clean sans-serif for readability.

**2. Generous Whitespace**
Every element has room to breathe. Padding is generous, margins are consistent, and density is reduced to improve scanability.

**3. Subtle Hierarchy**
Visual hierarchy is established through font weight, size, and subtle color shifts—not through heavy borders, shadows, or background colors.

**4. Warm Neutrals**
The color palette uses warm grays rather than cold slates. The background feels like paper, not a void.

**5. Purposeful Color**
Accent colors are used sparingly and meaningfully. A single warm accent (amber/gold) draws attention to primary actions and active states.

**6. Functional Icons**
Icons are small, monochrome, and functional. They support text labels rather than replacing them.

---

## Part 4: Color System

### Light Theme (Primary)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#FAFAF8` | Page background (warm off-white) |
| `--foreground` | `#1A1A18` | Primary text (warm black) |
| `--muted` | `#F5F5F3` | Card backgrounds, subtle fills |
| `--muted-foreground` | `#6B6B68` | Secondary text, placeholders |
| `--border` | `#E8E8E5` | Subtle borders, dividers |
| `--accent` | `#D97706` | Primary actions, active states (amber) |
| `--accent-foreground` | `#FFFFFF` | Text on accent backgrounds |
| `--success` | `#059669` | Success states, completed |
| `--warning` | `#D97706` | Warning states, attention |
| `--destructive` | `#DC2626` | Error states, destructive actions |

### Dark Theme (Secondary)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#1C1C1A` | Page background (warm dark) |
| `--foreground` | `#FAFAF8` | Primary text |
| `--muted` | `#2A2A28` | Card backgrounds |
| `--muted-foreground` | `#A3A3A0` | Secondary text |
| `--border` | `#3A3A38` | Subtle borders |
| `--accent` | `#F59E0B` | Primary actions (brighter amber) |
| `--accent-foreground` | `#1C1C1A` | Text on accent |

---

## Part 5: Typography System

### Font Stack

```css
--font-heading: "Libre Baskerville", Georgia, serif;
--font-body: "Inter", -apple-system, sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

### Type Scale

| Level | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| Display | Heading | 36px | 600 | 1.2 | Page titles |
| H1 | Heading | 28px | 600 | 1.3 | Section headers |
| H2 | Heading | 22px | 600 | 1.4 | Card titles |
| H3 | Body | 18px | 600 | 1.4 | Subsection headers |
| Body | Body | 15px | 400 | 1.6 | Paragraph text |
| Small | Body | 13px | 400 | 1.5 | Captions, metadata |
| Tiny | Body | 11px | 500 | 1.4 | Labels, badges |

### Text Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--text-primary` | `#1A1A18` | `#FAFAF8` | Main content |
| `--text-secondary` | `#6B6B68` | `#A3A3A0` | Supporting text |
| `--text-tertiary` | `#9CA3AF` | `#6B7280` | Placeholders, hints |
| `--text-link` | `#D97706` | `#F59E0B` | Interactive text |

---

## Part 6: Spacing System

### Base Unit

All spacing derives from a 4px base unit, creating consistent rhythm.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps, icon padding |
| `--space-2` | 8px | Inline spacing, small gaps |
| `--space-3` | 12px | Component padding |
| `--space-4` | 16px | Standard padding |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section spacing |
| `--space-8` | 32px | Large gaps |
| `--space-10` | 40px | Page margins |
| `--space-12` | 48px | Major sections |

### Container Widths

| Token | Value | Usage |
|-------|-------|-------|
| `--max-w-prose` | 65ch | Text content |
| `--max-w-content` | 900px | Main content area |
| `--max-w-wide` | 1200px | Full-width layouts |

---

## Part 7: Component Specifications

### Navigation Sidebar

**Current Issues:**
- 10 items creates cognitive overload
- No grouping or hierarchy
- Toggle button placement inconsistent

**Redesigned Structure:**

```
┌────────────────────────┐
│  Hero IDE              │  ← Logo/brand (collapsible)
├────────────────────────┤
│  ◉ Home                │  ← Dashboard
│  ◉ Projects            │  ← Projects + Board combined
│  ◉ Chat                │  ← Chat interface
│  ◉ Agents              │  ← Agents + Config combined
├────────────────────────┤
│  WORKSPACE             │  ← Section label
│  ◉ Editor              │  ← Workspace (renamed)
├────────────────────────┤
│  INSIGHTS              │  ← Section label
│  ◉ Activity            │  ← Execution History
│  ◉ Metrics             │  ← Metrics dashboard
├────────────────────────┤
│  ◉ Settings            │  ← Settings
├────────────────────────┤
│  👤 Evan T.            │  ← User profile
└────────────────────────┘
```

**Specifications:**
- Width: 220px expanded, 56px collapsed
- Background: `--muted` (subtle fill)
- Border: None (use shadow instead)
- Item height: 40px
- Item padding: 12px horizontal
- Active indicator: Left border accent + subtle background
- Hover: Subtle background shift

### Cards

**Current Issues:**
- Heavy borders and backgrounds
- Inconsistent padding
- Too much visual weight

**Redesigned Specifications:**

```css
.card {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: var(--space-5);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: box-shadow 0.15s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
```

**Card Variants:**

| Variant | Background | Border | Shadow | Usage |
|---------|------------|--------|--------|-------|
| Default | `--background` | `--border` | Subtle | Standard cards |
| Muted | `--muted` | None | None | Nested content |
| Interactive | `--background` | `--border` | Hover lift | Clickable cards |
| Selected | `--background` | `--accent` | Medium | Active selection |

### Buttons

**Current Issues:**
- Heavy violet color dominates
- Inconsistent sizing
- Too many variants

**Redesigned Specifications:**

| Variant | Background | Text | Border | Usage |
|---------|------------|------|--------|-------|
| Primary | `--accent` | `--accent-foreground` | None | Main actions |
| Secondary | `--muted` | `--foreground` | None | Secondary actions |
| Ghost | Transparent | `--foreground` | None | Tertiary actions |
| Outline | Transparent | `--foreground` | `--border` | Alternative actions |
| Destructive | `--destructive` | White | None | Delete, remove |

**Sizes:**

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| sm | 32px | 12px | 13px |
| md | 40px | 16px | 14px |
| lg | 48px | 20px | 15px |

### Form Inputs

**Current Issues:**
- Dark backgrounds feel heavy
- Borders too prominent
- Focus states unclear

**Redesigned Specifications:**

```css
.input {
  height: 40px;
  padding: 0 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 15px;
  color: var(--foreground);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input:hover {
  border-color: var(--muted-foreground);
}

.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1);
}

.input::placeholder {
  color: var(--text-tertiary);
}
```

### Status Badges

**Current Issues:**
- Green "Active" badges too prominent
- Inconsistent sizing

**Redesigned Specifications:**

| Status | Background | Text | Dot |
|--------|------------|------|-----|
| Active | `rgba(5, 150, 105, 0.1)` | `#059669` | Filled green |
| Inactive | `--muted` | `--muted-foreground` | Hollow gray |
| Warning | `rgba(217, 119, 6, 0.1)` | `#D97706` | Filled amber |
| Error | `rgba(220, 38, 38, 0.1)` | `#DC2626` | Filled red |

**Size:** Height 24px, padding 8px 10px, font-size 12px, border-radius 12px

---

## Part 8: Page Redesigns

### Dashboard (Home)

**Current State:** Generic welcome with 4 action cards

**Redesigned Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Good morning, Evan                                         │
│  Pick up where you left off                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RECENT                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ 📁 My Project   │  │ 💬 Chat: API... │  │ 🤖 Dev Agent│  │
│  │ Edited 2h ago   │  │ 5 messages      │  │ 3 tasks done│  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  QUICK ACTIONS                                              │
│                                                             │
│  + New Project    + Start Chat    + Create Agent            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  THIS WEEK                                                  │
│  ────────────────────────────────────────────────           │
│  Mon  │ Created "API Integration" project                   │
│  Tue  │ Completed 5 tasks with Developer Agent              │
│  Wed  │ Reviewed PR #42 with QA Agent                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes:**
- Personalized greeting with time-aware message
- Recent items show actual content, not generic cards
- Quick actions are text links, not heavy buttons
- Activity timeline replaces empty "Recent Activity" card

### Projects Page

**Current State:** Grid of project cards with violet icons

**Redesigned Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Projects                              + New Project        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search projects...                    ▼ Sort: Recent    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  My API Project                                     │    │
│  │  Building a REST API with authentication            │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  📋 12 tasks  •  🔀 main  •  Updated 2 hours ago    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Frontend Redesign                                  │    │
│  │  Updating the UI with new design system             │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  📋 8 tasks  •  🔀 feature/ui  •  Updated yesterday │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes:**
- List view instead of grid (better for scanning)
- Search and sort controls
- Richer metadata inline
- No icons on cards (text is enough)

### Chat Page

**Current State:** Standard chat layout with agent selector

**Redesigned Layout:**

```
┌──────────────┬──────────────────────────────────────────────┐
│              │                                              │
│  CHATS       │  API Integration Discussion                  │
│  ──────────  │  with Developer Agent                        │
│              │  ────────────────────────────────────────    │
│  + New       │                                              │
│              │  You                                         │
│  Today       │  How should I structure the authentication   │
│  • API Int...│  middleware?                                 │
│  • Bug fix   │                                              │
│              │  ────────────────────────────────────────    │
│  Yesterday   │                                              │
│  • Setup     │  Developer                                   │
│  • Planning  │  I recommend using a middleware pattern      │
│              │  with JWT tokens. Here's an example:         │
│              │                                              │
│              │  ```typescript                               │
│              │  export const authMiddleware = ...           │
│              │  ```                                         │
│              │                                              │
├──────────────┼──────────────────────────────────────────────┤
│              │  ┌────────────────────────────────────────┐  │
│              │  │ Type a message...                      │  │
│              │  └────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────┘
```

**Key Changes:**
- Conversation sidebar grouped by date
- Agent shown in header, not dropdown
- Cleaner message bubbles
- Code blocks with proper syntax highlighting

### Workspace Page

**Current State:** Three-pane layout with sidebars

**Redesigned Layout:**

```
┌────────┬────────────────────────────────────┬──────────────┐
│        │                                    │              │
│  FILES │  editor.ts                    ×    │  AGENT       │
│  ────  │  ────────────────────────────────  │  ──────      │
│        │                                    │              │
│  📁 src│  1  import { Router } from 'expr  │  Developer   │
│    📄 a│  2  import { authMiddleware } fr  │  ──────────  │
│    📄 b│  3                                 │              │
│    📄 c│  4  const router = Router();      │  Ready to    │
│  📁 lib│  5                                 │  help with   │
│    📄 d│  6  router.get('/users', async (  │  this file   │
│        │  7    const users = await db.use  │              │
│  ────  │  8    res.json(users);            │  ──────────  │
│        │  9  });                            │              │
│  BOARD │  10                                │  Ask about   │
│  ────  │  11 export default router;        │  this code   │
│        │                                    │              │
│  To Do │                                    │  ┌────────┐  │
│  • Task│                                    │  │ Type...│  │
│  • Task│                                    │  └────────┘  │
│        │                                    │              │
└────────┴────────────────────────────────────┴──────────────┘
```

**Key Changes:**
- Left sidebar combines Files and Board
- Editor takes center stage
- Agent panel is contextual (knows current file)
- Cleaner tab design

---

## Part 9: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| Task | Priority | Effort |
|------|----------|--------|
| Update CSS variables with new color system | High | 2 days |
| Add Google Fonts (Libre Baskerville, Inter) | High | 1 day |
| Update typography scale in index.css | High | 1 day |
| Refactor spacing tokens | Medium | 1 day |
| Update Button component variants | High | 2 days |
| Update Card component styles | High | 1 day |
| Update Input/Form components | High | 2 days |

### Phase 2: Navigation (Week 3)

| Task | Priority | Effort |
|------|----------|--------|
| Redesign DashboardLayout sidebar | High | 3 days |
| Consolidate navigation items | High | 1 day |
| Add section grouping | Medium | 1 day |
| Update mobile navigation | Medium | 2 days |

### Phase 3: Core Pages (Week 4-5)

| Task | Priority | Effort |
|------|----------|--------|
| Redesign Dashboard/Home page | High | 2 days |
| Redesign Projects page | High | 2 days |
| Redesign Chat page | High | 3 days |
| Redesign Agents page | Medium | 2 days |
| Redesign Settings page | Medium | 2 days |

### Phase 4: Workspace (Week 6-7)

| Task | Priority | Effort |
|------|----------|--------|
| Redesign WorkspaceShell layout | High | 3 days |
| Update file tree component | Medium | 2 days |
| Update editor pane styling | Medium | 2 days |
| Update agent panel | Medium | 2 days |

### Phase 5: Polish (Week 8)

| Task | Priority | Effort |
|------|----------|--------|
| Add micro-interactions | Low | 2 days |
| Implement dark theme | Medium | 2 days |
| Accessibility audit | High | 2 days |
| Performance optimization | Medium | 2 days |

---

## Part 10: Success Metrics

### Qualitative Goals

1. **First Impression:** Users describe the interface as "clean" and "professional"
2. **Learnability:** New users can complete onboarding without external help
3. **Efficiency:** Experienced users can navigate without thinking about the UI
4. **Delight:** Users notice and appreciate small details

### Quantitative Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to first project creation | Unknown | < 60 seconds |
| Navigation clicks to reach any feature | 2-3 | 1-2 |
| User-reported "cluttered" feedback | Unknown | 0 |
| Accessibility score (Lighthouse) | Unknown | > 95 |

---

## Appendix: Asset Requirements

### Fonts to Add

1. **Libre Baskerville** (Google Fonts)
   - Weights: 400, 700
   - Usage: Headings

2. **Inter** (Google Fonts)
   - Weights: 400, 500, 600
   - Usage: Body text

3. **JetBrains Mono** (Google Fonts)
   - Weights: 400, 500
   - Usage: Code blocks

### Icons

Continue using Lucide icons, but:
- Reduce icon size from 20px to 16px in most contexts
- Use stroke-width 1.5 instead of 2
- Prefer text labels over icon-only buttons

---

## Part 11: Self-Modifying IDE (Meta-Development)

### The Vision

The most powerful feature in Hero IDE's roadmap is the ability to modify itself through its own chat interface. This transforms Hero IDE from a static tool into a living, evolving environment that adapts to each user's needs.

### How It Works

Hero IDE treats its own codebase as a special "System Project" that's always available. When users enter "Meta Mode," they can chat with a specialized Meta-Agent that understands the IDE's architecture and can make changes on the fly.

| User Says | IDE Does |
|-----------|----------|
| "Add a dark mode toggle" | Creates component, wires to settings, updates CSS |
| "I want bigger fonts in the editor" | Modifies typography variables |
| "Add a pomodoro timer to the sidebar" | Creates full feature with state, UI, persistence |
| "Undo that last change" | Instant rollback to previous checkpoint |

### Safety Guarantees

The system includes multiple safety layers to prevent breaking changes. Protected files require explicit confirmation, all changes are validated before applying, and every modification creates a checkpoint for instant rollback. Users can experiment freely knowing they can always return to a working state.

### Implementation Timeline

This feature is planned for Sprint 21 (8 weeks) with four phases: Foundation (system project setup), Execution Engine (file modification and validation), User Interface (Meta Mode indicators and previews), and Polish (safety features and audit logging).

See `SELF_MODIFYING_IDE_SPEC.md` for the complete technical specification.

---

*Document prepared by Manus AI*
*Version 1.0 - December 2024*
