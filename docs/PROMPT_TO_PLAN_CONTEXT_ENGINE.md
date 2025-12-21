# Prompt-to-Plan Context Engine Specification

**Hero IDE - Codebase Understanding System**

**Version:** 1.0  
**Author:** Manus AI  
**Date:** December 20, 2025

---

## Executive Summary

This document specifies the **Context Engine** component of Hero IDE's Prompt-to-Plan feature. The Context Engine is responsible for gathering, indexing, and retrieving relevant codebase information to enable AI agents to generate accurate, context-aware development plans. Drawing from research into Cursor's codebase indexing [1], Sourcegraph's context retrieval [2], and Traycer's spec-driven approach [3], this specification defines a robust system for transforming user prompts into executable plans grounded in the actual codebase.

The core principle is that **context is the bridge between generic AI capabilities and project-specific intelligence**. Without proper context, an LLM can only provide generic responses; with proper context, it can understand and reason about specific code, architecture, and development practices.

---

## Architecture Overview

The Context Engine operates as a two-stage pipeline, following industry best practices from Spotify, YouTube, and Facebook [2]:

| Stage | Goal | Optimization Target |
|-------|------|---------------------|
| **Retrieval** | Find as many potentially relevant items as possible | Recall (cast wide net) |
| **Ranking** | Filter to most relevant items within token budget | Precision (quality over quantity) |

This separation of concerns allows independent optimization of each stage while respecting the latency and token budget constraints inherent to LLM-based systems.

---

## Codebase Indexing

### The 7-Step Indexing Process

Based on Cursor's approach [1], the Context Engine transforms code into searchable vectors through a systematic process:

| Step | Operation | Description |
|------|-----------|-------------|
| 1 | **File Sync** | Workspace files synchronized with indexing service |
| 2 | **Chunking** | Files broken into semantic units (functions, classes, logical blocks) |
| 3 | **Embedding** | Each chunk converted to vector representation using AI models |
| 4 | **Storage** | Embeddings stored in vector database optimized for similarity search |
| 5 | **Query Embedding** | User query converted to vector using same AI models |
| 6 | **Similarity Search** | System finds most similar code chunks by comparing vectors |
| 7 | **Result Assembly** | Relevant snippets returned with file locations and context |

### Chunking Strategy

The quality of context retrieval depends heavily on how code is chunked. Rather than arbitrary text segments, the system breaks code into **meaningful semantic units**:

| Chunk Type | Description | Example |
|------------|-------------|---------|
| **Function** | Complete function definition with signature and body | `async function createReview(productId, rating, comment) { ... }` |
| **Class** | Class definition with methods and properties | `class ReviewService { ... }` |
| **Interface** | TypeScript interface or type definition | `interface Review { id: string; rating: number; ... }` |
| **Schema** | Database schema definition | `export const reviews = sqliteTable('reviews', { ... })` |
| **Component** | React component with props and render logic | `export function ReviewCard({ review }) { ... }` |
| **Config** | Configuration blocks (routes, middleware, etc.) | `app.use('/api/reviews', reviewRouter)` |

### Incremental Updates

To minimize overhead, the indexing system updates only changed files [1]:

| Event | Action |
|-------|--------|
| New file created | Add to index |
| File modified | Remove old embeddings, create fresh ones |
| File deleted | Remove from index |
| Large/complex file | May be skipped for performance |

The system performs periodic checks every 5 minutes and processes files in batches for optimal performance.

---

## Multi-Retriever Architecture

Following Sourcegraph's approach [2], the Context Engine employs multiple complementary retrievers, each surfacing different types of relevant information:

### Retriever Types

| Retriever | Technology | Best For | Example Query |
|-----------|------------|----------|---------------|
| **Keyword** | Trigram-based search | Exact matches, function names | "createReview function" |
| **Semantic** | Vector embeddings | Conceptually similar code | "how do users submit feedback" |
| **Graph** | Static analysis | Dependencies, call sites | "what calls the ReviewService" |
| **Local** | Editor state | Immediate context | Current file, cursor position |

### Why Multiple Retrievers?

Retrievers are **complementary**, meaning each tends to surface different types of relevant information [2]:

> "Keyword search might find direct references to a function name, while semantic search could surface conceptually related code that uses different terminology. The code graph retriever might identify important dependencies that neither of the other approaches would catch."

For example, when a user asks to "update the top navigation," semantic search can find `header.tsx` even though "navigation" doesn't appear in the filename—because embeddings understand that "header" and "top navigation" are semantically related [1].

---

## Context Sources

The Context Engine can pull from multiple sources beyond just code [2]:

| Source | Type | Update Frequency | Value |
|--------|------|------------------|-------|
| **Source Code** | Primary | Real-time | Core implementation context |
| **Database Schemas** | Primary | On change | Data model understanding |
| **API Routes** | Primary | On change | Interface contracts |
| **Documentation** | Secondary | Periodic | Design intent, usage patterns |
| **Git History** | Secondary | On commit | Change context, authorship |
| **Test Files** | Secondary | On change | Expected behavior, edge cases |
| **Config Files** | Tertiary | On change | Environment, dependencies |
| **Issue Tracker** | Tertiary | Periodic | Requirements, known bugs |

### Context Weighting

Not all context is equally valuable. The system applies weights based on relevance:

| Factor | Weight Modifier | Rationale |
|--------|-----------------|-----------|
| File recency (recently modified) | +20% | More likely to be relevant |
| File proximity (same directory) | +15% | Related functionality |
| Import relationship | +25% | Direct dependency |
| Test file for target | +30% | Defines expected behavior |
| Documentation for target | +20% | Explains intent |

---

## Ranking and Selection

### The Knapsack Problem

Ranking in the Context Engine differs from typical search ranking because [2]:

1. Users focus on LLM response quality, not individual context items
2. Order of items doesn't matter as much
3. Goal is selecting the right **set** of items within token budget

This is essentially a **knapsack problem**: how to select the most valuable items (most relevant context) while staying within the size constraint (token budget).

### Ranking Model

The system uses a transformer encoder model trained to predict whether a given context item is relevant to the user's query (pointwise ranking) [2]. Once scored, items are ranked and the top N that fit within the token budget are selected.

### Token Budget Management

| Budget Tier | Token Limit | Use Case |
|-------------|-------------|----------|
| **Minimal** | 4,000 tokens | Quick questions, simple lookups |
| **Standard** | 16,000 tokens | Feature planning, code generation |
| **Extended** | 64,000 tokens | Complex multi-file features |
| **Maximum** | 128,000 tokens | Full codebase understanding |

---

## Integration with Prompt-to-Plan Phases

The Context Engine serves different roles in each Prompt-to-Plan phase:

### Phase 1: Specify

| Context Need | Retrieval Strategy |
|--------------|-------------------|
| Existing similar features | Semantic search for related functionality |
| Data models | Schema files, TypeScript interfaces |
| API patterns | Route definitions, middleware |
| Test patterns | Existing test files for similar features |

### Phase 2: Design

| Context Need | Retrieval Strategy |
|--------------|-------------------|
| Architecture patterns | Graph-based retrieval of module dependencies |
| Coding conventions | Keyword search for style patterns |
| Component structure | Semantic search for similar components |
| Database patterns | Schema files, migration history |

### Phase 3: Tasks

| Context Need | Retrieval Strategy |
|--------------|-------------------|
| File touchpoints | Graph-based analysis of affected files |
| Complexity estimation | Historical data from similar changes |
| Test requirements | Existing test patterns for similar code |
| Dependency order | Static analysis of import graph |

### Phase 4: Implement

| Context Need | Retrieval Strategy |
|--------------|-------------------|
| Implementation patterns | Semantic search for similar implementations |
| Error handling | Keyword search for error patterns |
| Validation logic | Graph-based retrieval of validators |
| Integration points | Import graph analysis |

---

## Database Schema

### context_chunks Table

```sql
CREATE TABLE context_chunks (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  chunk_type TEXT NOT NULL, -- 'function', 'class', 'interface', 'schema', 'component', 'config'
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB, -- Vector embedding
  symbols TEXT, -- JSON array of symbol names
  imports TEXT, -- JSON array of imported modules
  exports TEXT, -- JSON array of exported symbols
  last_modified TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chunks_file ON context_chunks(file_path);
CREATE INDEX idx_chunks_type ON context_chunks(chunk_type);
CREATE INDEX idx_chunks_modified ON context_chunks(last_modified);
```

### context_queries Table

```sql
CREATE TABLE context_queries (
  id TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_embedding BLOB,
  retrieved_chunks TEXT, -- JSON array of chunk IDs
  token_count INTEGER,
  latency_ms INTEGER,
  phase TEXT, -- 'specify', 'design', 'tasks', 'implement'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Design

### tRPC Procedures

```typescript
// Context Router
export const contextRouter = router({
  // Index a file or directory
  indexFiles: protectedProcedure
    .input(z.object({
      paths: z.array(z.string()),
      force: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Search for relevant context
  search: protectedProcedure
    .input(z.object({
      query: z.string(),
      phase: z.enum(['specify', 'design', 'tasks', 'implement']),
      tokenBudget: z.number().optional(),
      filters: z.object({
        fileTypes: z.array(z.string()).optional(),
        directories: z.array(z.string()).optional(),
        chunkTypes: z.array(z.string()).optional()
      }).optional()
    }))
    .query(async ({ ctx, input }) => { ... }),

  // Get indexing status
  getStatus: protectedProcedure
    .query(async ({ ctx }) => { ... }),

  // Clear index
  clearIndex: protectedProcedure
    .mutation(async ({ ctx }) => { ... })
});
```

---

## Implementation Roadmap

### Week 1-2: Foundation

| Task | Description | Effort |
|------|-------------|--------|
| Database schema | Create context_chunks and context_queries tables | 2 days |
| File watcher | Implement file change detection | 2 days |
| Chunking service | Build semantic chunking for TypeScript/React | 3 days |
| Basic keyword search | Implement trigram-based search | 3 days |

### Week 3-4: Embeddings

| Task | Description | Effort |
|------|-------------|--------|
| Embedding integration | Connect to embedding API (Gemini) | 2 days |
| Vector storage | Implement vector similarity search | 3 days |
| Incremental updates | Build delta indexing system | 3 days |
| Ranking model | Train/integrate relevance scorer | 2 days |

### Week 5-6: Integration

| Task | Description | Effort |
|------|-------------|--------|
| Phase integration | Wire context to each Prompt-to-Plan phase | 4 days |
| Token budget management | Implement knapsack selection | 2 days |
| UI components | Build indexing status and search UI | 3 days |
| Testing | Unit and integration tests | 3 days |

---

## References

[1] Cursor. "Codebase Indexing." Cursor Documentation. https://cursor.com/docs/context/codebase-indexing

[2] Hartman, Jan. "Lessons from Building AI Coding Assistants: Context Retrieval and Evaluation." Sourcegraph Blog, February 20, 2025. https://sourcegraph.com/blog/lessons-from-building-ai-coding-assistants-context-retrieval-and-evaluation

[3] Traycer. "Phases Workflow." Traycer Documentation. https://docs.traycer.ai/tasks/phases
