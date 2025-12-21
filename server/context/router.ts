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
});

export type ContextRouter = typeof contextRouter;
