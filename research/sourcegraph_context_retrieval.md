# Sourcegraph Context Retrieval Research

## Overview

Sourcegraph's approach to AI coding assistants centers on the **context engine** - a specialized search tool that finds relevant code snippets to provide to the LLM for in-context learning.

## Two-Stage Architecture

The context engine operates in two stages, a pattern used by Spotify, YouTube, and Facebook:

| Stage | Goal | Optimization |
|-------|------|--------------|
| **Retrieval** | Find as many relevant items as possible | Recall (cast wide net) |
| **Ranking** | Filter to most relevant items | Precision (fit token budget) |

## Retrieval Strategies

Sourcegraph uses multiple complementary retrievers:

| Retriever Type | Description | Best For |
|----------------|-------------|----------|
| **Keyword** | Trigram-based search (Zoekt) | Exact matches, function names |
| **Embedding-based** | Semantic vector search | Conceptually similar code |
| **Graph-based** | Static analysis dependency graph | Finding connections, call sites |
| **Local context** | Editor state, cursor position, git history | Immediate relevance |

**Key Insight:** Retrievers are complementary - each surfaces different types of relevant information.

## Ranking Approach

The ranking stage differs from typical search ranking because:
- Users focus on LLM response quality, not individual context items
- Order of items doesn't matter as much (it's a knapsack problem)
- Goal is selecting the right SET of items within token budget

**Implementation:** Transformer encoder model trained to predict relevance (pointwise ranking).

## Context Sources

Potential sources for coding assistants:
- Local and remote code
- Source control history
- Code review tools
- CI results
- Editor state
- Terminal output
- Documentation
- Internal wikis
- Ticketing systems
- Observability dashboards

## Evaluation Challenges

| Challenge | Description |
|-----------|-------------|
| **No ground truth** | Hard to define what "good" context looks like |
| **Indirect feedback** | Users judge responses, not context items |
| **Attribution** | Hard to know if bad response was due to context or LLM |

**Solutions:**
- Small-scale manually annotated datasets
- Open-source benchmarks
- Synthetic dataset generation
- Narrow-scope checks (code compiles, symbols exist)

## Key Insights for Hero IDE

1. **Two-Stage Pipeline**: Separate retrieval (recall) from ranking (precision)
2. **Multiple Retrievers**: Combine keyword, semantic, and graph-based approaches
3. **Token Budget**: Treat ranking as a knapsack problem
4. **Context Sources**: Go beyond code - include docs, issues, wikis
5. **Evaluation**: Use multiple approaches since no perfect ground truth exists
6. **In-Context Learning**: Quality of response depends on quality of context
