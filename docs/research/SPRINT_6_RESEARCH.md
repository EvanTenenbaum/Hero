# Sprint 6 Research: Prompt-to-Plan Workflow

**Date:** December 20, 2025  
**Purpose:** Research findings for implementing the Prompt-to-Plan workflow

---

## 1. EARS Requirements Syntax

### Overview
The **Easy Approach to Requirements Syntax (EARS)** is a mechanism to gently constrain textual requirements. Developed by Alistair Mavin at Rolls-Royce PLC, it provides structured guidance for writing high-quality textual requirements.

### Generic EARS Syntax
```
While <optional pre-condition>, when <optional trigger>, the <system name> shall <system response>
```

### EARS Patterns

| Pattern | Keywords | Template | Example |
|---------|----------|----------|---------|
| **Ubiquitous** | (none) | The `<system>` shall `<response>` | The mobile phone shall have a mass of less than XX grams. |
| **State-driven** | While | While `<precondition>`, the `<system>` shall `<response>` | While there is no card in the ATM, the ATM shall display "insert card to begin". |
| **Event-driven** | When | When `<trigger>`, the `<system>` shall `<response>` | When "mute" is selected, the laptop shall suppress all audio output. |
| **Optional** | Where | Where `<feature>`, the `<system>` shall `<response>` | Where the car has a sunroof, the car shall have a sunroof control panel. |
| **Unwanted** | If/Then | If `<trigger>`, then the `<system>` shall `<response>` | If an invalid credit card number is entered, then the website shall display "please re-enter". |
| **Complex** | While + When | While `<precondition>`, when `<trigger>`, the `<system>` shall `<response>` | While the aircraft is on ground, when reverse thrust is commanded, the engine shall enable reverse thrust. |

### EARS Ruleset
- A requirement MUST have: Zero or many preconditions, Zero or one trigger, One system name, One or many system responses
- Clauses always appear in the same order (temporal logic)
- Keywords closely match common English usage

### Benefits
- Reduces ambiguity, complexity, and vagueness
- Lightweight with little training overhead
- No specialist tool required
- Effective for non-native English speakers

---

## 2. LLM Prompt Engineering for Structured Output

### Key Techniques (from OpenAI)

1. **Use JSON Schema for Structure**
   - Define output schema explicitly
   - Let the schema handle structure, use natural language for content
   - Use `response_format` with `json_schema` type

2. **Message Roles**
   - `developer`: High-level instructions, prioritized over user
   - `user`: End-user inputs and configuration
   - `assistant`: Model-generated responses

3. **Formatting with Markdown and XML**
   - Use XML tags to denote logical boundaries
   - Markdown for structure within content
   - Clear section delimiters

4. **Reusable Prompts**
   - Use templates with placeholders like `{{variable}}`
   - Substitute values at runtime
   - Version prompts for consistency

### Best Practices
- Pin to specific model snapshots for production
- Build evals to measure prompt performance
- Use instructions parameter for high-level behavior
- Provide examples of correct responses

---

## 3. Spec-Driven Development Patterns

### Definition (from Martin Fowler/Thoughtworks)
Spec-driven development means writing a "spec" before writing code with AI. The spec becomes the source of truth for both human and AI.

### Implementation Levels

| Level | Description |
|-------|-------------|
| **Spec-first** | Spec written first, used for current task |
| **Spec-anchored** | Spec kept after task, used for evolution/maintenance |
| **Spec-as-source** | Spec is primary artifact, human never touches code |

### Tool Comparison

| Tool | Workflow | Spec Structure |
|------|----------|----------------|
| **Kiro** | Requirements → Design → Tasks | User Stories with acceptance criteria (GIVEN/WHEN/THEN) |
| **Spec-kit** | Constitution → Specify → Plan → Tasks | Multiple files per spec, heavy use of checklists |
| **Tessl** | Spec → Plan → Implement → Verify | Structured spec with verification hooks |
| **Traycer** | Spec → Implement → Verify | Phases workflow with human checkpoints |

### Common Patterns

1. **Phase-based Workflow**: Break work into distinct phases with checkpoints
2. **Verification**: Check implementation against spec
3. **Traceability**: Link spec items to implementation
4. **Iterative Refinement**: Allow human to edit/approve at each phase

### Traycer Workflow
1. **Spec Phase**: Generate detailed specifications from prompts
2. **Implement Phase**: Execute code changes based on specs
3. **Verify Phase**: Check implementation against specs

---

## 4. Architecture Decisions for Hero IDE

### Spec Versioning Strategy
**Decision:** Immutable versions with history

- Each spec edit creates a new version
- Previous versions are preserved
- Can diff between versions
- Supports rollback

### Human Checkpoint UX
**Decision:** Approve/Edit/Reject at each phase

- **Approve**: Move to next phase
- **Edit**: Modify and re-validate
- **Reject**: Return to previous phase with feedback

### Spec Structure for Hero IDE

```typescript
interface Spec {
  id: string;
  projectId: string;
  title: string;
  phase: 'specify' | 'design' | 'tasks' | 'implement' | 'complete';
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  
  // Specify phase
  requirements: EARSRequirement[];
  
  // Design phase
  dataModels: DataModel[];
  apiContracts: APIContract[];
  diagrams: MermaidDiagram[];
  fileManifest: FileChange[];
  
  // Tasks phase
  tasks: Task[];
  dependencies: Dependency[];
  
  // Metadata
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface EARSRequirement {
  id: string;
  type: 'ubiquitous' | 'state' | 'event' | 'optional' | 'unwanted' | 'complex';
  precondition?: string;
  trigger?: string;
  system: string;
  response: string;
  rawText: string;
}
```

### LLM Prompt Templates

**Specify Phase Prompt:**
```
You are a requirements engineer. Convert the user's feature request into EARS-format requirements.

For each requirement, identify:
1. Type: ubiquitous, state-driven, event-driven, optional, unwanted, or complex
2. Precondition (if any): The state that must be true
3. Trigger (if any): The event that initiates the behavior
4. System: The component responsible
5. Response: What the system shall do

Output as JSON array matching the EARSRequirement schema.
```

**Design Phase Prompt:**
```
You are a software architect. Given the EARS requirements and codebase context, generate:

1. Data models (Drizzle schema format)
2. API contracts (tRPC router stubs)
3. Mermaid diagrams (ER, sequence, flow)
4. File change manifest (create/modify/delete)

Consider existing patterns in the codebase. Output as JSON matching the Design schema.
```

---

## 5. Key Insights for Implementation

1. **Start with EARS**: Use EARS patterns to structure requirements - they're proven effective and map well to LLM output
2. **Phase Checkpoints**: Implement approve/edit/reject at each phase transition
3. **Spec Versioning**: Keep immutable versions for traceability and rollback
4. **Context is Critical**: Use the Context Engine to provide codebase awareness
5. **Structured Output**: Use JSON schema to ensure consistent LLM output
6. **Verification**: Build verification service to check implementation against spec

---

## Sources

1. Alistair Mavin - EARS Official Site: https://alistairmavin.com/ears/
2. OpenAI Prompt Engineering Guide: https://platform.openai.com/docs/guides/prompt-engineering
3. Martin Fowler - Understanding SDD: https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
4. Traycer Documentation: https://docs.traycer.ai/
5. GitHub Spec-kit: https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/
