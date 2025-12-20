/**
 * Codebase Router
 * 
 * tRPC procedures for codebase structure analysis and navigation
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  FileNode,
  FileCategory,
  ArchitectureLayer,
  categorizeFile,
  analyzeStructure,
  searchStructure,
  validateStructure,
  extractImports,
  extractExports,
  RECOMMENDED_STRUCTURE,
} from "./structure";
import * as db from "../db";

export const codebaseRouter = router({
  // ══════════════════════════════════════════════════════════════════════════
  // STRUCTURE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get the recommended project structure
   */
  getRecommendedStructure: protectedProcedure.query(() => {
    return RECOMMENDED_STRUCTURE;
  }),

  /**
   * Analyze a project's codebase structure from GitHub
   */
  analyzeFromGitHub: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) {
        throw new Error("GitHub not connected");
      }

      const github = await import("../github");
      
      // Get repository tree
      const tree = await github.getRepositoryTree(
        conn.accessToken,
        input.owner,
        input.repo,
        input.branch
      );

      // Convert to FileNode structure
      const rootNode = buildFileTree(tree, `${input.owner}/${input.repo}`);
      
      // Analyze structure
      const summary = analyzeStructure(rootNode);
      
      // Validate against best practices
      const issues = validateStructure(rootNode);

      return {
        tree: rootNode,
        summary,
        issues,
        analyzedAt: new Date(),
      };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Search the codebase structure
   */
  search: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      query: z.string(),
      category: z.enum([
        'component', 'page', 'hook', 'context', 'util', 'type',
        'api', 'service', 'model', 'test', 'config', 'style',
        'asset', 'documentation', 'other'
      ]).optional(),
      layer: z.enum([
        'presentation', 'application', 'domain', 'infrastructure', 'shared'
      ]).optional(),
      extension: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) {
        throw new Error("GitHub not connected");
      }

      const github = await import("../github");
      
      // Get repository tree
      const tree = await github.getRepositoryTree(
        conn.accessToken,
        input.owner,
        input.repo
      );

      // Convert to FileNode structure
      const rootNode = buildFileTree(tree, `${input.owner}/${input.repo}`);
      
      // Analyze to populate categories
      analyzeStructure(rootNode);

      // Search
      return searchStructure(rootNode, input.query, {
        category: input.category as FileCategory | undefined,
        layer: input.layer as ArchitectureLayer | undefined,
        extension: input.extension,
        limit: input.limit,
      });
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // FILE ANALYSIS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze a specific file's dependencies and exports
   */
  analyzeFile: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      branch: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) {
        throw new Error("GitHub not connected");
      }

      const github = await import("../github");
      
      // Get file content
      const file = await github.getFileContent(
        conn.accessToken,
        input.owner,
        input.repo,
        input.path,
        input.branch
      );

      if (!file.content) {
        throw new Error("File content not available");
      }

      const content = Buffer.from(file.content, 'base64').toString('utf-8');
      const extension = input.path.split('.').pop() || '';
      
      // Categorize
      const { category, layer } = categorizeFile(input.path, extension);
      
      // Extract dependencies and exports
      const imports = extractImports(content);
      const exports = extractExports(content);

      return {
        path: input.path,
        name: input.path.split('/').pop() || '',
        extension,
        category,
        layer,
        imports,
        exports,
        size: content.length,
        lines: content.split('\n').length,
      };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get files by category
   */
  getByCategory: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      category: z.enum([
        'component', 'page', 'hook', 'context', 'util', 'type',
        'api', 'service', 'model', 'test', 'config', 'style',
        'asset', 'documentation', 'other'
      ]),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) {
        throw new Error("GitHub not connected");
      }

      const github = await import("../github");
      
      // Get repository tree
      const tree = await github.getRepositoryTree(
        conn.accessToken,
        input.owner,
        input.repo
      );

      // Convert to FileNode structure
      const rootNode = buildFileTree(tree, `${input.owner}/${input.repo}`);
      
      // Analyze to populate categories
      analyzeStructure(rootNode);

      // Collect files of the specified category
      const files: FileNode[] = [];
      
      function traverse(node: FileNode) {
        if (node.type === 'file' && node.category === input.category) {
          files.push(node);
        }
        node.children?.forEach(traverse);
      }
      
      traverse(rootNode);
      
      return files;
    }),

  /**
   * Get files by architecture layer
   */
  getByLayer: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      layer: z.enum([
        'presentation', 'application', 'domain', 'infrastructure', 'shared'
      ]),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) {
        throw new Error("GitHub not connected");
      }

      const github = await import("../github");
      
      // Get repository tree
      const tree = await github.getRepositoryTree(
        conn.accessToken,
        input.owner,
        input.repo
      );

      // Convert to FileNode structure
      const rootNode = buildFileTree(tree, `${input.owner}/${input.repo}`);
      
      // Analyze to populate layers
      analyzeStructure(rootNode);

      // Collect files of the specified layer
      const files: FileNode[] = [];
      
      function traverse(node: FileNode) {
        if (node.type === 'file' && node.layer === input.layer) {
          files.push(node);
        }
        node.children?.forEach(traverse);
      }
      
      traverse(rootNode);
      
      return files;
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

function buildFileTree(items: GitHubTreeItem[], rootPath: string): FileNode {
  const root: FileNode = {
    path: rootPath,
    name: rootPath.split('/').pop() || rootPath,
    type: 'directory',
    children: [],
  };

  // Build a map of directories
  const dirMap = new Map<string, FileNode>();
  dirMap.set('', root);

  // Sort items to ensure directories come before their contents
  const sortedItems = [...items].sort((a, b) => {
    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    return aDepth - bDepth;
  });

  for (const item of sortedItems) {
    const parts = item.path.split('/');
    const name = parts.pop() || '';
    const parentPath = parts.join('/');

    // Ensure parent directory exists
    let parent = dirMap.get(parentPath);
    if (!parent) {
      // Create missing parent directories
      let currentPath = '';
      let currentParent = root;
      
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        let dir = dirMap.get(currentPath);
        
        if (!dir) {
          dir = {
            path: `${rootPath}/${currentPath}`,
            name: part,
            type: 'directory',
            children: [],
          };
          dirMap.set(currentPath, dir);
          currentParent.children = currentParent.children || [];
          currentParent.children.push(dir);
        }
        
        currentParent = dir;
      }
      
      parent = currentParent;
    }

    // Create the node
    const node: FileNode = {
      path: `${rootPath}/${item.path}`,
      name,
      type: item.type === 'tree' ? 'directory' : 'file',
      size: item.size,
    };

    if (item.type === 'blob') {
      const extMatch = name.match(/\.([^.]+)$/);
      node.extension = extMatch ? extMatch[1] : undefined;
    } else {
      node.children = [];
      dirMap.set(item.path, node);
    }

    parent.children = parent.children || [];
    parent.children.push(node);
  }

  return root;
}
