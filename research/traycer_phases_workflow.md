# Traycer Phases Workflow Research

## Overview

Traycer's Phases Workflow is designed for **structured, multi-phase development for complex projects**. It breaks goals into iterative phases with validation between steps.

## The 7-Step Phases Workflow

### Step 1: User Query
- State your goal, expected outcome, and constraints
- **Context options:**
  - Files: Source files, config files, documentation, test files
  - Folders: Component directories, feature folders, asset directories
  - Images: UI mockups, error screenshots
  - Git diffs: Against uncommitted changes, main branch, specific branch, or commit

### Step 2: Intent Clarification (if needed)
Traycer asks strategic questions to refine scope:
- Business goals and user flows
- Architecture and integration needs
- Performance, security, and scalability requirements

### Step 3: Phase Generation
Traycer structures work into manageable phases:
- **Phase identification**: Clear milestones and outcomes
- **Sequential breakdown**: Logical progression from start to finish
- **Scope definition**: Well-defined boundaries for each phase

### Step 4: Phase Planning
Traycer creates a detailed plan for each phase:
- **Objectives** and deliverables
- **File changes** with exact edits
- **Architecture** and approach

### Step 5: Hand off to Agent
Execute the generated plan with your AI coding assistant (Cursor, Copilot, etc.)

### Step 6: Verification with Traycer
Validate each phase before moving on:
- Compares agent's implementation against original plan
- Categorizes verification review comments by severity:
  - Critical
  - Major
  - Minor
  - Outdated

### Step 7: Next Phase
Advance with preserved context:
- Carry forward decisions and mappings
- Clear progress tracking
- Plans adapt based on learnings

## Phase Management Features

### Phase Selection Mode
- Select multiple phases at once
- Refer to them in chat
- Merge them into a single phase using AI

### Adding More Phases
- Insert new phases between existing ones or at the end
- Address new requirements discovered during development
- Add refinement phases for optimization, testing, or documentation

### Re-arranging Phase Order
- Drag and drop to reorder phases
- Flexible sequencing based on new insights or changing priorities

## YOLO Mode (Automation)
Fully automated workflow:
- Configure once
- Traycer automatically orchestrates planning, coding, and verification
- Works across all phases without manual handoff clicks

## Key Insights for Hero IDE

1. **Context is King**: Traycer allows extensive context input (files, folders, images, git diffs)
2. **Intent Clarification**: Ask strategic questions before planning
3. **Phase-based Structure**: Break complex work into manageable milestones
4. **Verification Loop**: Always validate against original plan
5. **Context Preservation**: Carry forward decisions between phases
6. **Flexibility**: Allow phase reordering and insertion
