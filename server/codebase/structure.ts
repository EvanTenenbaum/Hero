/**
 * Codebase Structure Service
 * 
 * Maintains a well-organized, searchable repository structure that:
 * - Mirrors frontend changes automatically
 * - Follows best practices for project organization
 * - Provides search and navigation capabilities
 * - Tracks file relationships and dependencies
 */

import { z } from "zod";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  lastModified?: Date;
  children?: FileNode[];
  // Metadata
  category?: FileCategory;
  layer?: ArchitectureLayer;
  dependencies?: string[];
  exports?: string[];
}

export type FileCategory = 
  | 'component'      // React components
  | 'page'           // Page components
  | 'hook'           // Custom hooks
  | 'context'        // React contexts
  | 'util'           // Utility functions
  | 'type'           // Type definitions
  | 'api'            // API routes/procedures
  | 'service'        // Business logic services
  | 'model'          // Database models/schema
  | 'test'           // Test files
  | 'config'         // Configuration files
  | 'style'          // CSS/style files
  | 'asset'          // Static assets
  | 'documentation'  // Docs and READMEs
  | 'other';

export type ArchitectureLayer =
  | 'presentation'   // UI components, pages
  | 'application'    // Hooks, contexts, state management
  | 'domain'         // Business logic, services
  | 'infrastructure' // API, database, external services
  | 'shared';        // Shared utilities, types

export interface CodebaseStructure {
  projectId: number;
  rootPath: string;
  tree: FileNode;
  summary: CodebaseSummary;
  lastUpdated: Date;
}

export interface CodebaseSummary {
  totalFiles: number;
  totalDirectories: number;
  byCategory: Record<FileCategory, number>;
  byLayer: Record<ArchitectureLayer, number>;
  byExtension: Record<string, number>;
  entryPoints: string[];
  configFiles: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// BEST PRACTICES STRUCTURE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Recommended project structure following best practices
 */
export const RECOMMENDED_STRUCTURE = {
  client: {
    description: 'Frontend React application',
    subdirs: {
      'src/components': 'Reusable UI components',
      'src/components/ui': 'Base UI components (shadcn)',
      'src/pages': 'Page-level components',
      'src/hooks': 'Custom React hooks',
      'src/contexts': 'React context providers',
      'src/lib': 'Utility functions and helpers',
      'src/types': 'TypeScript type definitions',
      'src/styles': 'Global styles and themes',
      'public': 'Static assets',
    },
  },
  server: {
    description: 'Backend Express/tRPC application',
    subdirs: {
      '_core': 'Framework-level code (auth, trpc, env)',
      'routers': 'tRPC router modules',
      'services': 'Business logic services',
      'agents': 'AI agent definitions and prompts',
    },
  },
  drizzle: {
    description: 'Database schema and migrations',
    subdirs: {
      '': 'Schema definitions',
    },
  },
  shared: {
    description: 'Code shared between client and server',
    subdirs: {
      '': 'Shared types, constants, utilities',
    },
  },
  docs: {
    description: 'Project documentation',
    subdirs: {
      '': 'Architecture docs, API docs, guides',
    },
  },
};

// ════════════════════════════════════════════════════════════════════════════
// FILE CATEGORIZATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Categorize a file based on its path and extension
 */
export function categorizeFile(path: string, extension?: string): { category: FileCategory; layer: ArchitectureLayer } {
  const lowerPath = path.toLowerCase();
  
  // Test files
  if (lowerPath.includes('.test.') || lowerPath.includes('.spec.') || lowerPath.includes('__tests__')) {
    return { category: 'test', layer: 'shared' };
  }
  
  // Documentation
  if (extension === 'md' || lowerPath.includes('/docs/') || lowerPath.includes('readme')) {
    return { category: 'documentation', layer: 'shared' };
  }
  
  // Configuration
  if (
    ['json', 'yaml', 'yml', 'toml', 'env'].includes(extension || '') ||
    lowerPath.includes('config') ||
    lowerPath.includes('.config.')
  ) {
    return { category: 'config', layer: 'infrastructure' };
  }
  
  // Styles
  if (['css', 'scss', 'sass', 'less'].includes(extension || '')) {
    return { category: 'style', layer: 'presentation' };
  }
  
  // Assets
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'mp4', 'mp3', 'woff', 'woff2'].includes(extension || '')) {
    return { category: 'asset', layer: 'presentation' };
  }
  
  // Client-side
  if (lowerPath.includes('/client/') || lowerPath.includes('/src/')) {
    if (lowerPath.includes('/pages/')) {
      return { category: 'page', layer: 'presentation' };
    }
    if (lowerPath.includes('/components/')) {
      return { category: 'component', layer: 'presentation' };
    }
    if (lowerPath.includes('/hooks/')) {
      return { category: 'hook', layer: 'application' };
    }
    if (lowerPath.includes('/contexts/') || lowerPath.includes('/context/')) {
      return { category: 'context', layer: 'application' };
    }
    if (lowerPath.includes('/lib/') || lowerPath.includes('/utils/') || lowerPath.includes('/helpers/')) {
      return { category: 'util', layer: 'shared' };
    }
    if (lowerPath.includes('/types/') || extension === 'd.ts') {
      return { category: 'type', layer: 'shared' };
    }
  }
  
  // Server-side
  if (lowerPath.includes('/server/')) {
    if (lowerPath.includes('/routers/') || lowerPath.includes('router.ts')) {
      return { category: 'api', layer: 'infrastructure' };
    }
    if (lowerPath.includes('/services/')) {
      return { category: 'service', layer: 'domain' };
    }
    if (lowerPath.includes('/agents/')) {
      return { category: 'service', layer: 'domain' };
    }
  }
  
  // Database
  if (lowerPath.includes('/drizzle/') || lowerPath.includes('schema')) {
    return { category: 'model', layer: 'infrastructure' };
  }
  
  // Shared
  if (lowerPath.includes('/shared/')) {
    if (extension === 'ts' && !lowerPath.includes('.d.ts')) {
      return { category: 'util', layer: 'shared' };
    }
    return { category: 'type', layer: 'shared' };
  }
  
  return { category: 'other', layer: 'shared' };
}

// ════════════════════════════════════════════════════════════════════════════
// STRUCTURE ANALYSIS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Analyze a file tree and generate summary statistics
 */
export function analyzeStructure(tree: FileNode): CodebaseSummary {
  const summary: CodebaseSummary = {
    totalFiles: 0,
    totalDirectories: 0,
    byCategory: {} as Record<FileCategory, number>,
    byLayer: {} as Record<ArchitectureLayer, number>,
    byExtension: {},
    entryPoints: [],
    configFiles: [],
  };
  
  function traverse(node: FileNode) {
    if (node.type === 'directory') {
      summary.totalDirectories++;
      node.children?.forEach(traverse);
    } else {
      summary.totalFiles++;
      
      // Count by extension
      if (node.extension) {
        summary.byExtension[node.extension] = (summary.byExtension[node.extension] || 0) + 1;
      }
      
      // Categorize
      const { category, layer } = categorizeFile(node.path, node.extension);
      node.category = category;
      node.layer = layer;
      
      summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
      summary.byLayer[layer] = (summary.byLayer[layer] || 0) + 1;
      
      // Identify entry points
      if (
        node.name === 'main.tsx' ||
        node.name === 'index.ts' ||
        node.name === 'App.tsx' ||
        node.path.includes('server/index.ts')
      ) {
        summary.entryPoints.push(node.path);
      }
      
      // Identify config files
      if (category === 'config') {
        summary.configFiles.push(node.path);
      }
    }
  }
  
  traverse(tree);
  return summary;
}

// ════════════════════════════════════════════════════════════════════════════
// SEARCH
// ════════════════════════════════════════════════════════════════════════════

export interface SearchResult {
  path: string;
  name: string;
  type: 'file' | 'directory';
  category?: FileCategory;
  layer?: ArchitectureLayer;
  matchType: 'name' | 'path' | 'category';
  score: number;
}

/**
 * Search the codebase structure
 */
export function searchStructure(
  tree: FileNode,
  query: string,
  options?: {
    category?: FileCategory;
    layer?: ArchitectureLayer;
    extension?: string;
    limit?: number;
  }
): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();
  const limit = options?.limit || 50;
  
  function traverse(node: FileNode) {
    if (results.length >= limit) return;
    
    // Apply filters
    if (options?.category && node.category !== options.category) {
      if (node.type === 'directory') {
        node.children?.forEach(traverse);
      }
      return;
    }
    if (options?.layer && node.layer !== options.layer) {
      if (node.type === 'directory') {
        node.children?.forEach(traverse);
      }
      return;
    }
    if (options?.extension && node.extension !== options.extension) {
      if (node.type === 'directory') {
        node.children?.forEach(traverse);
      }
      return;
    }
    
    // Score matches
    let score = 0;
    let matchType: 'name' | 'path' | 'category' = 'path';
    
    const lowerName = node.name.toLowerCase();
    const lowerPath = node.path.toLowerCase();
    
    if (lowerName === lowerQuery) {
      score = 100;
      matchType = 'name';
    } else if (lowerName.startsWith(lowerQuery)) {
      score = 80;
      matchType = 'name';
    } else if (lowerName.includes(lowerQuery)) {
      score = 60;
      matchType = 'name';
    } else if (lowerPath.includes(lowerQuery)) {
      score = 40;
      matchType = 'path';
    }
    
    if (score > 0) {
      results.push({
        path: node.path,
        name: node.name,
        type: node.type,
        category: node.category,
        layer: node.layer,
        matchType,
        score,
      });
    }
    
    // Traverse children
    if (node.type === 'directory') {
      node.children?.forEach(traverse);
    }
  }
  
  traverse(tree);
  
  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

// ════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ════════════════════════════════════════════════════════════════════════════

export interface StructureIssue {
  type: 'warning' | 'error' | 'suggestion';
  path: string;
  message: string;
  recommendation?: string;
}

/**
 * Validate codebase structure against best practices
 */
export function validateStructure(tree: FileNode): StructureIssue[] {
  const issues: StructureIssue[] = [];
  
  function traverse(node: FileNode, depth: number = 0) {
    // Check for deeply nested files
    if (depth > 6 && node.type === 'file') {
      issues.push({
        type: 'warning',
        path: node.path,
        message: 'File is deeply nested (>6 levels)',
        recommendation: 'Consider flattening the directory structure',
      });
    }
    
    // Check for files in wrong locations
    if (node.type === 'file') {
      const { category, layer } = categorizeFile(node.path, node.extension);
      
      // Components outside components folder
      if (
        category === 'component' &&
        !node.path.includes('/components/') &&
        !node.path.includes('/pages/')
      ) {
        issues.push({
          type: 'suggestion',
          path: node.path,
          message: 'Component file outside components directory',
          recommendation: 'Move to client/src/components/',
        });
      }
      
      // Hooks outside hooks folder
      if (
        node.name.startsWith('use') &&
        node.extension === 'ts' &&
        !node.path.includes('/hooks/')
      ) {
        issues.push({
          type: 'suggestion',
          path: node.path,
          message: 'Hook file outside hooks directory',
          recommendation: 'Move to client/src/hooks/',
        });
      }
      
      // Test files not co-located
      if (category === 'test' && !node.path.includes('__tests__')) {
        // This is actually fine - co-located tests are good
      }
    }
    
    // Check directory naming
    if (node.type === 'directory') {
      // PascalCase directories in src (except for special folders)
      if (
        node.path.includes('/src/') &&
        !['components', 'pages', 'hooks', 'contexts', 'lib', 'types', 'styles', 'ui', '_core'].includes(node.name) &&
        /^[A-Z]/.test(node.name)
      ) {
        issues.push({
          type: 'suggestion',
          path: node.path,
          message: 'Directory uses PascalCase',
          recommendation: 'Use kebab-case or camelCase for directories',
        });
      }
      
      node.children?.forEach(child => traverse(child, depth + 1));
    }
  }
  
  traverse(tree);
  return issues;
}

// ════════════════════════════════════════════════════════════════════════════
// DEPENDENCY ANALYSIS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Extract imports from TypeScript/JavaScript file content
 */
export function extractImports(content: string): string[] {
  const imports: string[] = [];
  
  // Match ES6 imports
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Match require statements
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Extract exports from TypeScript/JavaScript file content
 */
export function extractExports(content: string): string[] {
  const exports: string[] = [];
  
  // Match named exports
  const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // Match export { ... }
  const bracedExportRegex = /export\s*\{([^}]+)\}/g;
  while ((match = bracedExportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
    exports.push(...names.filter(n => n));
  }
  
  // Match default export
  if (/export\s+default/.test(content)) {
    exports.push('default');
  }
  
  return exports;
}
