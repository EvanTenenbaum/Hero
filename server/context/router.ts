/**
 * Context Engine tRPC Router
 * 
 * Provides API endpoints for codebase indexing and search.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as fs from "fs";
import * as path from "path";

import { SemanticChunker, isTypeScriptFile } from "./chunker";
import { 
  storeChunks, 
  deleteChunksForFile, 
  deleteChunksForProject,
  searchChunksByKeyword,
  searchChunksByName,
  getChunksByType,
  getProjectSymbols,
  getIndexStatus,
  updateIndexStatus,
  getChunkStats,
  getChunksByFile,
  getChunkById,
} from "./chunkStorage";
import { 
  fileWatcherManager, 
  scanDirectory, 
  calculateFileHash,
  DEFAULT_INCLUDE_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
} from "./fileWatcher";
import { hybridSearch, selectWithinBudget } from "./hybridSearch";
import { getContextForQuery, getFileContext, getSymbolContext, formatCompactContext, formatXMLContext } from "./contextService";
import { generateBatchEmbeddings, getEmbeddingCacheStats } from "./geminiEmbedding";

export const contextRouter = router({
  // Get index status for a project
  getStatus: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const status = await getIndexStatus(input.projectId);
      const stats = await getChunkStats(input.projectId);
      
      return {
        status: status?.status || "idle",
        totalFiles: status?.totalFiles || 0,
        indexedFiles: status?.indexedFiles || 0,
        totalChunks: stats.totalChunks,
        chunksByType: stats.chunksByType,
        totalTokens: stats.totalTokens,
        lastFullIndexAt: status?.lastFullIndexAt,
        lastIncrementalAt: status?.lastIncrementalAt,
        lastError: status?.lastError,
      };
    }),

  // Start indexing a project directory
  startIndexing: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      rootPath: z.string(),
      includePatterns: z.array(z.string()).optional(),
      excludePatterns: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { projectId, rootPath, includePatterns, excludePatterns } = input;
      
      // Validate path exists
      if (!fs.existsSync(rootPath)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Path does not exist: ${rootPath}`,
        });
      }
      
      // Update status to indexing
      await updateIndexStatus(projectId, { status: "indexing" });
      
      const startTime = Date.now();
      const chunker = new SemanticChunker();
      let totalChunks = 0;
      let indexedFiles = 0;
      
      try {
        // Scan directory for files
        const files = await scanDirectory(
          rootPath,
          includePatterns || DEFAULT_INCLUDE_PATTERNS,
          excludePatterns || DEFAULT_EXCLUDE_PATTERNS
        );
        
        await updateIndexStatus(projectId, { totalFiles: files.length });
        
        // Process each file
        for (const file of files) {
          if (!isTypeScriptFile(file.path)) {
            indexedFiles++;
            continue;
          }
          
          const fullPath = path.join(rootPath, file.path);
          
          try {
            const content = await fs.promises.readFile(fullPath, "utf-8");
            const fileHash = calculateFileHash(content);
            
            // Delete existing chunks for this file
            await deleteChunksForFile(projectId, file.path);
            
            // Chunk the file
            const chunks = chunker.chunkFile(content, file.path, projectId, fileHash);
            
            // Store chunks
            if (chunks.length > 0) {
              await storeChunks(chunks);
              totalChunks += chunks.length;
            }
            
            indexedFiles++;
            
            // Update progress periodically
            if (indexedFiles % 10 === 0) {
              await updateIndexStatus(projectId, { indexedFiles, totalChunks });
            }
          } catch (err) {
            console.error(`[Context] Failed to index file: ${file.path}`, err);
          }
        }
        
        // Update final status
        await updateIndexStatus(projectId, {
          status: "completed",
          indexedFiles,
          totalChunks,
          lastFullIndexAt: new Date(),
          indexDurationMs: Date.now() - startTime,
          lastError: null,
        });
        
        return {
          success: true,
          indexedFiles,
          totalChunks,
          durationMs: Date.now() - startTime,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await updateIndexStatus(projectId, {
          status: "failed",
          lastError: errorMessage,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Indexing failed: ${errorMessage}`,
        });
      }
    }),

  // Stop indexing (placeholder for future background job support)
  stopIndexing: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      fileWatcherManager.stopWatching(input.projectId);
      await updateIndexStatus(input.projectId, { status: "idle" });
      return { success: true };
    }),

  // Clear all indexed data for a project
  clearIndex: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const deleted = await deleteChunksForProject(input.projectId);
      await updateIndexStatus(input.projectId, {
        status: "idle",
        indexedFiles: 0,
        totalChunks: 0,
        lastError: null,
      });
      return { success: true, deletedChunks: deleted };
    }),

  // Search chunks by keyword
  search: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      query: z.string().min(1),
      chunkTypes: z.array(z.string()).optional(),
      filePath: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return await searchChunksByKeyword(input);
    }),

  // Search by symbol name
  searchByName: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string().min(1),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      return await searchChunksByName(input.projectId, input.name, input.limit);
    }),

  // Get chunks by type
  getByType: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      chunkType: z.enum(["function", "class", "interface", "type", "component", "hook", "constant"]),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      return await getChunksByType(input.projectId, input.chunkType, input.limit);
    }),

  // Get all project symbols (functions, components, hooks, classes, types)
  getSymbols: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getProjectSymbols(input.projectId);
    }),

  // Get chunks for a specific file
  getFileChunks: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      filePath: z.string(),
    }))
    .query(async ({ input }) => {
      return await getChunksByFile(input.projectId, input.filePath);
    }),

  // Get a single chunk by ID
  getChunk: protectedProcedure
    .input(z.object({ chunkId: z.number() }))
    .query(async ({ input }) => {
      return await getChunkById(input.chunkId);
    }),

  // Get chunk statistics
  getStats: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getChunkStats(input.projectId);
    }),

  // ════════════════════════════════════════════════════════════════════════════
  // HYBRID SEARCH & CONTEXT RETRIEVAL (Sprint 5)
  // ════════════════════════════════════════════════════════════════════════════

  // Hybrid search combining keyword + semantic + graph
  hybridSearch: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
      chunkTypes: z.array(z.string()).optional(),
      filePaths: z.array(z.string()).optional(),
      currentFile: z.string().optional(),
      enableSemantic: z.boolean().default(true),
      enableKeyword: z.boolean().default(true),
      enableGraph: z.boolean().default(true),
      semanticWeight: z.number().min(0).max(1).default(0.6),
      keywordWeight: z.number().min(0).max(1).default(0.3),
      graphWeight: z.number().min(0).max(1).default(0.1),
    }))
    .query(async ({ input }) => {
      const result = await hybridSearch(input.query, {
        projectId: input.projectId,
        limit: input.limit,
        chunkTypes: input.chunkTypes,
        filePaths: input.filePaths,
        currentFile: input.currentFile,
        enableSemantic: input.enableSemantic,
        enableKeyword: input.enableKeyword,
        enableGraph: input.enableGraph,
        semanticWeight: input.semanticWeight,
        keywordWeight: input.keywordWeight,
        graphWeight: input.graphWeight,
        proximityBoost: !!input.currentFile,
      });

      return {
        chunks: result.chunks,
        totalTokens: result.totalTokens,
        truncated: result.truncated,
        searchTimeMs: result.searchTimeMs,
      };
    }),

  // Get formatted context for AI prompts
  getContext: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      query: z.string().min(1),
      maxTokens: z.number().min(100).max(32000).default(8000),
      currentFile: z.string().optional(),
      chunkTypes: z.array(z.string()).optional(),
      filePaths: z.array(z.string()).optional(),
      includeImports: z.boolean().default(true),
      includeRelated: z.boolean().default(false),
      format: z.enum(["markdown", "compact", "xml"]).default("markdown"),
    }))
    .query(async ({ input }) => {
      const context = await getContextForQuery({
        projectId: input.projectId,
        query: input.query,
        maxTokens: input.maxTokens,
        currentFile: input.currentFile,
        chunkTypes: input.chunkTypes,
        filePaths: input.filePaths,
        includeImports: input.includeImports,
        includeRelated: input.includeRelated,
      });

      // Format based on requested format
      let formattedContext = context.promptContext;
      if (input.format === "compact") {
        formattedContext = formatCompactContext(context.chunks);
      } else if (input.format === "xml") {
        formattedContext = formatXMLContext(context.chunks);
      }

      return {
        context: formattedContext,
        chunks: context.chunks,
        totalTokens: context.totalTokens,
        truncated: context.truncated,
        searchTimeMs: context.searchTimeMs,
        chunkCount: context.chunkCount,
        fileCount: context.fileCount,
      };
    }),

  // Get context for a specific file
  getFileContext: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      filePath: z.string(),
      maxTokens: z.number().min(100).max(32000).default(8000),
    }))
    .query(async ({ input }) => {
      return await getFileContext(input.projectId, input.filePath, input.maxTokens);
    }),

  // Get context for specific symbols
  getSymbolContext: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      symbolNames: z.array(z.string().min(1)),
      maxTokens: z.number().min(100).max(32000).default(8000),
    }))
    .query(async ({ input }) => {
      return await getSymbolContext(input.projectId, input.symbolNames, input.maxTokens);
    }),

  // Generate embeddings for chunks (for indexing)
  generateEmbeddings: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      chunkIds: z.array(z.number()).max(100),
    }))
    .mutation(async ({ input }) => {
      // Get chunks that need embeddings
      const chunks = await Promise.all(
        input.chunkIds.map(id => getChunkById(id))
      );

      const validChunks = chunks.filter((c): c is NonNullable<typeof c> => c !== null);
      
      if (validChunks.length === 0) {
        return { processed: 0, failed: 0 };
      }

      // Generate embeddings in batch
      const contents = validChunks.map(c => c.content);
      const result = await generateBatchEmbeddings(contents, "RETRIEVAL_DOCUMENT");

      // TODO: Update chunks with embeddings in database
      // This would require adding an updateChunkEmbedding function to chunkStorage

      return {
        processed: validChunks.length - result.failedIndices.length,
        failed: result.failedIndices.length,
        processingTimeMs: result.processingTimeMs,
      };
    }),

  // Get embedding cache stats
  getEmbeddingCacheStats: protectedProcedure
    .query(async () => {
      return getEmbeddingCacheStats();
    }),
});

export type ContextRouter = typeof contextRouter;
