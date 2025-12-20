# Traycer Research Notes

## Overview

Traycer is a **Spec-Driven Development** tool that transforms feature prompts into structured, executable plans for AI coding agents.

**Core Problem Solved:** AI agents are powerful but they drift - they hallucinate APIs, misread intent, and sometimes break what already works. A simple idea or feature request often dissolves into scattered prompts and code churn.

**Solution:** Your intent becomes a working spec — a structured plan broken into phases. Coding agents execute against that guide, and Traycer verifies their work, catching gaps and suggesting fixes before they spread.

## Key Workflows

### 1. Plan Workflow (Single-PR Tasks)
Direct task-to-plan workflow for straightforward development tasks.

**Steps:**
1. **User Query** - State goal, expected outcome, and constraints
2. **Detailed File-Level Plan** - Traycer generates:
   - File analysis & structure
   - Symbol references
   - Implementation steps
3. **Execute in Agent** - Hand off to Cursor, Claude Code, GitHub Copilot, etc.
4. **Verification** - Compare implementation against plan
   - Categorizes by severity: Critical, Major, Minor, Outdated
5. **Complete** - Finalize, commit, ship

### 2. Phases Workflow (Complex Projects)
Structured, multi-phase development with validation between steps.

**Steps:**
1. **User Query** - State goal, expected outcome, constraints
2. **Intent Clarification** - Traycer asks strategic questions:
   - Business goals and user flows
   - Architecture and integration needs
   - Performance, security, scalability requirements
3. **Phase Generation** - Structures work into manageable phases:
   - Phase identification: Clear milestones and outcomes
   - Sequential breakdown: Logical progression
   - Scope definition: Well-defined boundaries
4. **Phase Planning** - Detailed plan for each phase:
   - Objectives and deliverables
   - File changes with exact edits
   - Architecture and approach
5. **Hand off to Agent** - Execute with AI coding assistant
6. **Verification** - Validate each phase before moving on
7. **Next Phase** - Advance with preserved context:
   - Carry forward decisions and mappings
   - Clear progress tracking
   - Plans adapt based on learnings

### 3. YOLO Mode (Fully Automated)
Configure once and let Traycer automatically orchestrate planning, coding, and verification across all phases without manual handoff clicks.

## Context Types Supported

Traycer accepts various context inputs:
- **Files**: Source files, config files, documentation, test files
- **Folders**: Component directories, feature folders, asset directories
- **Images**: UI mockups, error screenshots
- **Git Diffs**:
  - Diff against uncommitted changes
  - Diff against 'main' branch
  - Diff against specific branch
  - Diff against specific commit

## Key Features

### Codebase Exploration
- Traycer explores the codebase to understand structure
- Generates file-level detailed plans with descriptions
- Includes symbol references and mermaid diagrams
- Provides reasoning for each decision

### Plan Iteration
- If plan doesn't align with goal, iterate to refine
- Chat with your plan to make adjustments
- Merge or split phases as needed

### Agent Orchestration
- Supports multiple coding agents:
  - Cursor
  - Claude Code
  - GitHub Copilot
  - Cline
  - Others
- Each agent follows detailed plans consistently

### Verification System
- Compares agent's implementation against original plan
- Categorizes review comments by severity
- Provides targeted fix suggestions
- Ensures requirements are met

### Phase Management
- Select multiple phases at once
- Merge phases using AI
- Insert new phases between existing ones
- Drag and drop to reorder phases
- Add refinement phases for optimization, testing, documentation

## Sources
- https://docs.traycer.ai/
- https://docs.traycer.ai/tasks/plan
- https://docs.traycer.ai/tasks/phases


---

## Cursor Plan Mode

Cursor's Plan Mode provides structured task management for AI coding agents.

**Key Capabilities:**
- Creates detailed implementation plans before writing code
- Researches codebase to gather relevant context
- Asks clarifying questions to understand requirements
- Generates reviewable plans that can be edited
- Plans saved to `.cursor/plans/` for team sharing

**Agent To-Dos:**
- Automatically creates to-do lists for complex tasks
- Each item can have dependencies on other tasks
- List updates in real-time as work progresses
- Completed tasks marked off automatically

**Message Queuing:**
- Queue follow-up messages while agent works
- Messages execute automatically when ready
- Can reorder queued messages
- Override queue for immediate execution

---

## GitHub Spec Kit

GitHub's open-source toolkit for spec-driven development with AI agents.

**Core Philosophy:**
- Specifications become living, executable artifacts
- Specs are the shared source of truth
- AI generates artifacts; humans verify they're right
- Separates stable "what" from flexible "how"

**Four-Phase Process:**

1. **Specify** - High-level description of what and why
   - Focus on user journeys and experiences
   - What success looks like
   - Who will use it, what problem it solves
   - Becomes living artifact that evolves

2. **Plan** - Technical implementation details
   - Stack, architecture, constraints
   - Company standards and technologies
   - Legacy system integration
   - Compliance and performance requirements

3. **Tasks** - Break down into actionable work
   - Small, reviewable chunks
   - Each task testable in isolation
   - Concrete tasks like "create user registration endpoint"
   - Test-driven development approach

4. **Implement** - Execute tasks one by one
   - Focused changes solving specific problems
   - Agent knows what, how, and sequence
   - Review focused changes, not thousand-line dumps

**Commands:**
- `/specify` - Generate detailed specification
- `/plan` - Create technical implementation plan
- `/tasks` - Break down into actionable tasks

**Best Use Cases:**
- Greenfield (zero-to-one) projects
- Feature work in existing systems (N-to-N+1)
- Legacy modernization

---

## Kiro (Amazon)

Amazon's AI IDE focused on spec-driven development for production readiness.

**Core Problem Addressed:**
- "Vibe coding" produces working prototypes but not production-ready code
- Assumptions made by AI aren't documented
- Requirements fuzzy, can't verify if app meets them
- System design unclear

**Key Features:**

1. **Kiro Specs** - Three-step process:
   - **Requirements**: Single prompt → user stories with EARS notation acceptance criteria
   - **Technical Design**: Analyzes codebase, generates data flow diagrams, interfaces, schemas, API endpoints
   - **Tasks**: Auto-generated with dependencies, linked to requirements, includes tests and accessibility

2. **Kiro Hooks** - Event-driven automations:
   - Trigger on file save, create, delete
   - Auto-update tests when components change
   - Refresh README when API endpoints modified
   - Security scans before commit
   - Enforce coding standards across team

**Unique Aspects:**
- EARS (Easy Approach to Requirements Syntax) notation
- Specs stay synced with evolving codebase
- Task interface with progress indicators
- Audit work via code diffs and agent execution history

---

## Common Patterns Across Tools

### 1. Intent Clarification
All tools ask clarifying questions before generating plans:
- Business goals and user flows
- Architecture and integration needs
- Performance, security, scalability requirements

### 2. Codebase Context
Tools analyze existing code to understand:
- File structure and organization
- Symbol references and dependencies
- Existing patterns and conventions
- Integration points

### 3. Phased Approach
Breaking work into manageable phases:
- Clear milestones and outcomes
- Sequential breakdown with dependencies
- Well-defined scope boundaries
- Validation between phases

### 4. File-Level Planning
Detailed plans include:
- Specific files to create/modify
- Exact edits and changes
- Symbol references
- Implementation steps

### 5. Verification Loop
All tools include verification:
- Compare implementation against plan
- Categorize issues by severity
- Suggest fixes
- Iterate until requirements met

### 6. Living Documentation
Specs and plans evolve:
- Update as requirements change
- Sync with codebase changes
- Preserve context across sessions
- Team sharing and collaboration
