# Cursor Codebase Indexing Research

## Overview

Cursor's codebase indexing enables **semantic search** across workspace files, building a searchable index for natural language queries to find relevant code.

## The 7-Step Indexing Process

| Step | Description |
|------|-------------|
| 1. File Sync | Workspace files securely synchronized with Cursor's servers |
| 2. Chunking | Files broken into meaningful chunks (functions, classes, logical blocks) |
| 3. Embedding | Each chunk converted to vector representation using AI models |
| 4. Storage | Embeddings stored in specialized vector database |
| 5. Query Embedding | User's search query converted to vector using same AI models |
| 6. Similarity Search | System finds most similar code chunks by comparing vectors |
| 7. Results | Relevant code snippets returned with file locations and context |

## Key Technical Details

### Chunking Strategy
Files are broken into **meaningful chunks** that capture the essence of code:
- Functions
- Classes
- Logical code blocks
- NOT arbitrary text segments

### Embedding Generation
- Each chunk converted to a **mathematical fingerprint** (vector)
- Captures **semantic meaning** of code
- Same AI models used for both indexing and query processing

### Vector Database
- Optimized for fast similarity search
- Handles millions of code chunks
- Supports batch processing for performance

## Automatic Synchronization

| Event | Action |
|-------|--------|
| New files | Automatically added to index |
| Modified files | Old embeddings removed, fresh ones created |
| Deleted files | Promptly removed from index |
| Large/complex files | May be skipped for performance |

- Periodic checks every 5 minutes
- Only changed files are updated
- Batch processing for optimal performance

## Why Semantic Search Beats Grep

Cursor uses **both grep AND semantic search** together:

| Capability | Grep | Semantic Search |
|------------|------|-----------------|
| Exact patterns | ✅ Excellent | ❌ Not designed for |
| Conceptual matching | ❌ Limited | ✅ Excellent |
| Speed | Runtime compute | Pre-computed (faster) |
| Accuracy | String matching only | Custom-trained models |

**Example:** Asking to "update the top navigation" can find `header.tsx` even though "navigation" doesn't appear in the filename - because embeddings understand semantic relationships.

## Privacy & Security

- File paths encrypted before transmission
- Code content never stored in plaintext
- Code only held in memory during indexing, then discarded
- No permanent storage of source code

## Key Insights for Hero IDE

1. **Chunking is Critical**: Break code into semantic units (functions, classes), not arbitrary text
2. **Pre-compute Embeddings**: Do heavy lifting during indexing, not at query time
3. **Hybrid Search**: Combine exact match (grep) with semantic search for best results
4. **Incremental Updates**: Only re-index changed files to minimize overhead
5. **Batch Processing**: Process files in batches for performance
6. **80% Threshold**: Search becomes available at 80% indexing completion
