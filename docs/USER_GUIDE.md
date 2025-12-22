# Hero IDE User Guide

Welcome to Hero IDE! This guide will help you get started with the AI-powered development environment.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Projects](#projects)
4. [Chat](#chat)
5. [Workspace](#workspace)
6. [Kanban Board](#kanban-board)
7. [Agents](#agents)
8. [GitHub Integration](#github-integration)
9. [Settings](#settings)

---

## Getting Started

### Logging In

1. Click "Sign In" on the home page
2. Complete the OAuth authentication
3. You'll be redirected to your dashboard

### Navigation

Hero IDE uses a sidebar navigation on desktop and bottom tabs on mobile:

| Icon | Page | Description |
|------|------|-------------|
| 🏠 | Dashboard | Overview and quick actions |
| 📁 | Projects | Manage your projects |
| 💬 | Chat | AI assistant conversations |
| 🖥️ | Workspace | Multi-pane IDE |
| 📋 | Board | Kanban task management |
| 🤖 | Agents | AI agent configuration |
| ⚙️ | Settings | Preferences and connections |

---

## Dashboard

The dashboard provides an overview of your recent activity:

- **Recent Projects**: Quick access to your latest projects
- **Activity Timeline**: Recent actions and updates
- **Quick Actions**: Create new project, start chat, etc.

---

## Projects

### Creating a Project

1. Click "New Project" button
2. Choose creation method:
   - **Quick Start**: Skip kickoff wizard
   - **With Kickoff**: 5-step guided setup

### Project Kickoff Wizard

The kickoff wizard helps you define your project properly:

| Step | Purpose |
|------|---------|
| North Star | Define vision, goals, and success metrics |
| Product Brief | Outline features, users, and scope |
| Architecture | Technical design and technology choices |
| Quality Bar | Define quality standards and testing |
| Slice Map | Break down into implementation slices |

Each step generates AI-powered documentation that guides your agents.

### Managing Projects

- **Edit**: Click project name to edit details
- **Archive**: Move to archive (can restore later)
- **Delete**: Permanently remove project

---

## Chat

The chat interface lets you interact with AI assistants.

### Starting a Conversation

1. Go to Chat page
2. Select a project (optional)
3. Type your message and press Enter

### Chat Features

- **Code Blocks**: AI responses include syntax-highlighted code
- **Context Awareness**: AI understands your project files
- **History**: Previous conversations are saved

### Tips for Better Results

- Be specific about what you want
- Provide context when asking questions
- Reference specific files or features

---

## Workspace

The workspace is a multi-pane IDE for coding.

### Layout

| Pane | Purpose |
|------|---------|
| File Tree | Browse and select files |
| Editor | View and edit code |
| AI Assistant | Contextual help and suggestions |

### File Operations

- **Open**: Click file in tree
- **Save**: Ctrl/Cmd + S
- **New File**: Right-click folder → New File
- **Delete**: Right-click file → Delete

### Editor Features

- Syntax highlighting
- Line numbers
- Search and replace (Ctrl/Cmd + F)
- Multiple tabs

---

## Kanban Board

Visual task management with drag-and-drop.

### Board Structure

- **Columns**: Represent workflow stages (To Do, In Progress, Done)
- **Cards**: Individual tasks or items

### Creating Cards

1. Click "+" in any column
2. Enter card title
3. (Optional) Add description, labels, assignees, due date

### Moving Cards

- Drag card to different column
- Drag to reorder within column

### Card Details

Click a card to open detail view:
- Edit title and description
- Add/remove labels
- Assign team members
- Set due date
- Add comments
- Link to GitHub issues

---

## Agents

AI agents automate development tasks.

### Agent Types

| Type | Role |
|------|------|
| PM | Project management, planning, coordination |
| Dev | Code writing, debugging, refactoring |
| QA | Testing, quality assurance, bug finding |
| DevOps | Deployment, infrastructure, CI/CD |
| Research | Information gathering, analysis |

### Creating an Agent

1. Go to Agents page
2. Click "New Agent"
3. Select agent type
4. Configure rules and constraints
5. Save

### Running an Agent

1. Select agent
2. Click "Execute"
3. Provide task description
4. Monitor progress in execution panel

### Execution Controls

- **Pause**: Temporarily stop execution
- **Resume**: Continue paused execution
- **Cancel**: Stop and discard execution
- **Rollback**: Revert to previous checkpoint

---

## GitHub Integration

Connect your GitHub repositories.

### Connecting GitHub

1. Go to Settings → Connections
2. Click "Connect GitHub"
3. Authorize Hero IDE

### Repository Operations

- **Clone**: Import repository to project
- **Sync**: Pull latest changes
- **Push**: Commit and push changes

### Issue Sync

Sync GitHub issues with your Kanban board:
1. Open project settings
2. Enable "Issue Sync"
3. Select repository
4. Issues appear as cards

### Pull Requests

- View PR diffs
- Add comments
- Request reviews
- Merge PRs

---

## Settings

### Preferences

| Setting | Description |
|---------|-------------|
| Theme | Light or Dark mode |
| Font Size | Editor font size |
| Auto-save | Enable/disable auto-save |

### API Connections

Connect external services:
- GitHub (OAuth)
- Custom API keys

### Account

- View profile
- Manage sessions
- Delete account

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + S | Save file |
| Ctrl/Cmd + F | Find in file |
| Ctrl/Cmd + P | Quick file open |
| Ctrl/Cmd + / | Toggle comment |
| Ctrl/Cmd + B | Toggle sidebar |
| Esc | Close modal/panel |

---

## Tips & Best Practices

### For Better AI Results

1. **Be Specific**: "Add a login form with email and password fields" vs "Add login"
2. **Provide Context**: Reference files, features, or previous work
3. **Iterate**: Ask follow-up questions to refine results

### For Project Organization

1. Use the kickoff wizard for complex projects
2. Keep Kanban board updated
3. Use labels consistently
4. Set realistic due dates

### For Team Collaboration

1. Assign cards to team members
2. Use comments for discussions
3. Sync with GitHub for code reviews

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Can't log in | Clear cookies, try again |
| Files not loading | Check GitHub connection |
| Agent stuck | Cancel and retry |
| Slow performance | Reduce open tabs |

### Getting Help

- Check documentation
- Use in-app chat
- Contact support

---

## Glossary

| Term | Definition |
|------|------------|
| Agent | AI-powered assistant for specific tasks |
| Context | Project files and history used by AI |
| Kickoff | Project setup wizard |
| Meta Mode | Self-modifying IDE feature |
| Slice | Small, implementable unit of work |
| Workspace | Multi-pane coding environment |

---

Thank you for using Hero IDE! 🚀
