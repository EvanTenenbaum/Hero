# Prompt-to-Plan Research Summary

**Hero IDE - AI Planning Tools Analysis**

**Author:** Manus AI  
**Date:** December 20, 2025

---

## Executive Summary

This document synthesizes research into leading AI-powered development planning tools to inform the design of Hero IDE's Prompt-to-Plan feature. The analysis covers Traycer, Cursor, Sourcegraph, GitHub Spec Kit, and Amazon Kiro, identifying common patterns and best practices for transforming natural language prompts into executable development plans.

---

## Key Findings

### 1. Spec-Driven Development is the Emerging Standard

All analyzed tools converge on a common insight: **specifications should be living, executable artifacts** rather than static documentation. This approach addresses the fundamental challenge of AI coding assistants—maintaining alignment between user intent and generated code across complex, multi-file features.

| Tool | Spec Approach | Key Innovation |
|------|---------------|----------------|
| **Traycer** | Phases workflow (Spec → Implement → Verify) | Iterative refinement with human checkpoints |
| **Cursor** | Plan Mode with structured thinking | Automatic codebase analysis before changes |
| **GitHub Spec Kit** | Open-source spec templates | Standardized EARS format for requirements |
| **Amazon Kiro** | Spec-driven development lifecycle | Hooks for automated verification |

### 2. Context Retrieval is Critical

The quality of AI-generated plans depends entirely on the quality of context provided. All tools implement sophisticated context retrieval systems:

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| **Codebase Indexing** | Understand existing code | Vector embeddings + semantic chunking |
| **Multi-Retriever** | Find different types of relevant code | Keyword + Semantic + Graph-based |
| **Ranking** | Select most relevant context | Transformer models, knapsack optimization |
| **Token Budget** | Manage LLM constraints | Tiered budgets based on task complexity |

### 3. Two-Stage Architecture is Industry Standard

Both Cursor and Sourcegraph implement a two-stage retrieval pipeline:

1. **Retrieval Stage**: Cast wide net, optimize for recall
2. **Ranking Stage**: Filter to best items, optimize for precision

This pattern is also used by Spotify, YouTube, and Facebook for large-scale information retrieval.

### 4. Multiple Retrievers are Complementary

No single retrieval method captures all relevant context:

| Retriever Type | Strengths | Weaknesses |
|----------------|-----------|------------|
| **Keyword** | Exact matches, fast | Misses semantic relationships |
| **Semantic** | Conceptual similarity | May miss exact references |
| **Graph-based** | Dependencies, call sites | Expensive to compute |
| **Local** | Immediate relevance | Limited scope |

The best results come from combining all approaches.

### 5. Evaluation is Challenging

All tools struggle with evaluation because:
- No ground truth for "good" context
- Users judge responses, not context items
- Hard to attribute failures (context vs. LLM)

Solutions include synthetic datasets, narrow-scope checks (code compiles, symbols exist), and human annotation for small-scale validation.

---

## Tool-by-Tool Analysis

### Traycer

**Core Concept:** Phases Workflow

Traycer's approach breaks development into distinct phases with human checkpoints:

1. **Spec Phase**: Generate detailed specifications from prompts
2. **Implement Phase**: Execute code changes based on specs
3. **Verify Phase**: Check implementation against specs

**Key Features:**
- EARS-format requirements generation
- Automatic codebase exploration
- Iterative refinement with user feedback
- Traceability from spec to implementation

**Relevance to Hero IDE:** The phases workflow maps directly to our proposed Specify → Design → Tasks → Implement flow.

### Cursor

**Core Concept:** Codebase Indexing + Plan Mode

Cursor transforms code into searchable vectors through a 7-step process:
1. File sync
2. Semantic chunking
3. AI embedding generation
4. Vector database storage
5. Query embedding
6. Similarity search
7. Result assembly

**Key Features:**
- Automatic incremental indexing
- Hybrid search (grep + semantic)
- Privacy-preserving (code not stored permanently)
- 80% indexing threshold for search availability

**Relevance to Hero IDE:** The indexing architecture provides a proven blueprint for our Context Engine.

### Sourcegraph

**Core Concept:** Context Engine with Multi-Retriever

Sourcegraph's context engine uses multiple complementary retrievers:
- Zoekt (trigram-based keyword search)
- Embedding-based semantic search
- Graph-based static analysis
- Local context (editor state, git history)

**Key Features:**
- Two-stage retrieval + ranking pipeline
- Token budget management (knapsack problem)
- Transformer-based relevance scoring
- Extends beyond code to docs, issues, wikis

**Relevance to Hero IDE:** The multi-retriever architecture and ranking approach are directly applicable.

### GitHub Spec Kit

**Core Concept:** Open-Source Spec Templates

GitHub's Spec Kit provides standardized templates for spec-driven development:
- EARS-format requirements
- Acceptance criteria templates
- Design document structures
- Task breakdown patterns

**Key Features:**
- Community-driven best practices
- Integration with GitHub workflows
- Versioned spec artifacts
- Automated spec validation

**Relevance to Hero IDE:** The EARS format and template structures inform our requirements generation.

### Amazon Kiro

**Core Concept:** Full Lifecycle Spec-Driven Development

Kiro implements specs as first-class citizens throughout the development lifecycle:
- Specs drive code generation
- Specs drive testing
- Specs drive documentation
- Specs enable automated verification

**Key Features:**
- Bi-directional spec-code linking
- Automated drift detection
- Spec versioning and history
- Integration with CI/CD

**Relevance to Hero IDE:** The concept of living specs that stay synchronized with code is central to our approach.

---

## Synthesis: Hero IDE Prompt-to-Plan Architecture

Based on this research, the Hero IDE Prompt-to-Plan feature should implement:

### 1. Four-Phase Workflow

| Phase | Input | Output | Key Activities |
|-------|-------|--------|----------------|
| **Specify** | Natural language prompt | requirements.md | Intent clarification, EARS user stories, acceptance criteria |
| **Design** | requirements.md + codebase | design.md | Architecture analysis, data models, API contracts, diagrams |
| **Tasks** | design.md | tasks.md + Kanban cards | Task breakdown, agent assignment, effort estimation |
| **Implement** | tasks.md | Working code | Agent execution, verification, spec sync |

### 2. Context Engine

| Component | Implementation |
|-----------|----------------|
| **Indexing** | Semantic chunking + vector embeddings |
| **Retrieval** | Keyword + Semantic + Graph-based |
| **Ranking** | Transformer model with knapsack selection |
| **Budget** | Tiered token limits (4K → 128K) |

### 3. Spec Artifacts

| Artifact | Format | Versioning | Linking |
|----------|--------|------------|---------|
| requirements.md | EARS format | Git-based | Links to user stories |
| design.md | Mermaid diagrams + TypeScript | Git-based | Links to requirements |
| tasks.md | Structured task list | Git-based | Links to design sections |
| Kanban cards | Database records | Timestamped | Links to spec artifacts |

### 4. Verification System

| Check Type | Trigger | Action on Failure |
|------------|---------|-------------------|
| Spec compliance | Task completion | Block merge, notify user |
| Code compiles | Code generation | Retry with error context |
| Tests pass | Implementation complete | Iterate on failing tests |
| Symbols exist | Code reference | Flag for review |

---

## Implementation Priorities

Based on research findings, the recommended implementation order is:

### Phase 1: Foundation (Weeks 1-4)
1. Database schema for specs and context
2. Basic keyword search
3. EARS requirements generator
4. Spec panel UI

### Phase 2: Intelligence (Weeks 5-8)
1. Vector embeddings integration
2. Semantic search
3. Multi-retriever architecture
4. Ranking model

### Phase 3: Integration (Weeks 9-12)
1. Full four-phase workflow
2. Kanban card generation
3. Agent execution with spec context
4. Verification system

### Phase 4: Polish (Weeks 13-16)
1. Graph-based retrieval
2. Advanced token budget management
3. Spec drift detection
4. Performance optimization

---

## References

1. Traycer Documentation. "Phases Workflow." https://docs.traycer.ai/tasks/phases
2. Cursor Documentation. "Codebase Indexing." https://cursor.com/docs/context/codebase-indexing
3. Hartman, Jan. "Lessons from Building AI Coding Assistants." Sourcegraph Blog, 2025.
4. GitHub Blog. "Spec-Driven Development with AI." https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/
5. Amazon Kiro. "Introducing Kiro." https://kiro.dev/blog/introducing-kiro/
