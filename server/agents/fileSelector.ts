/**
 * File Selector Module
 * Intelligently selects relevant files to include in agent context
 * Based on: Project Genesis research on context engineering
 */

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified: Date;
  relevanceScore?: number;
}

export interface FileSelectorConfig {
  maxFiles: number;
  maxTotalSize: number; // in bytes
  priorityExtensions: string[];
  excludePatterns: string[];
  includePatterns: string[];
}

const DEFAULT_CONFIG: FileSelectorConfig = {
  maxFiles: 20,
  maxTotalSize: 100000, // ~100KB
  priorityExtensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'],
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '__pycache__',
    '*.lock',
    '*.log',
    '.env*',
  ],
  includePatterns: [],
};

/**
 * Calculate relevance score for a file based on various factors
 */
export function calculateRelevance(
  file: FileInfo,
  query: string,
  recentFiles: string[],
  config: FileSelectorConfig
): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const pathLower = file.path.toLowerCase();
  const nameLower = file.name.toLowerCase();

  // Direct name match (highest priority)
  if (nameLower.includes(queryLower)) {
    score += 100;
  }

  // Path contains query terms
  const queryTerms = queryLower.split(/\s+/);
  for (const term of queryTerms) {
    if (term.length > 2 && pathLower.includes(term)) {
      score += 30;
    }
  }

  // Priority extension bonus
  if (config.priorityExtensions.includes(file.extension)) {
    score += 20;
  }

  // Recently modified bonus
  const hoursSinceModified = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60);
  if (hoursSinceModified < 1) {
    score += 50;
  } else if (hoursSinceModified < 24) {
    score += 30;
  } else if (hoursSinceModified < 168) { // 1 week
    score += 10;
  }

  // Recently accessed bonus
  if (recentFiles.includes(file.path)) {
    const recencyIndex = recentFiles.indexOf(file.path);
    score += Math.max(0, 40 - recencyIndex * 5);
  }

  // Key file patterns
  const keyPatterns = [
    { pattern: /index\.(ts|js|tsx|jsx)$/, bonus: 15 },
    { pattern: /main\.(ts|js|py|go|rs)$/, bonus: 15 },
    { pattern: /app\.(ts|js|tsx|jsx)$/, bonus: 15 },
    { pattern: /config\.(ts|js|json)$/, bonus: 10 },
    { pattern: /schema\.(ts|prisma|sql)$/, bonus: 10 },
    { pattern: /routes?\.(ts|js)$/, bonus: 10 },
    { pattern: /types?\.(ts|d\.ts)$/, bonus: 10 },
    { pattern: /README\.md$/i, bonus: 5 },
    { pattern: /package\.json$/, bonus: 5 },
  ];

  for (const { pattern, bonus } of keyPatterns) {
    if (pattern.test(file.path)) {
      score += bonus;
    }
  }

  // Penalize very large files
  if (file.size > 50000) {
    score -= 20;
  } else if (file.size > 20000) {
    score -= 10;
  }

  // Penalize deeply nested files
  const depth = file.path.split('/').length;
  if (depth > 5) {
    score -= (depth - 5) * 5;
  }

  return Math.max(0, score);
}

/**
 * Check if a file should be excluded based on patterns
 */
export function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    // Simple glob-like matching
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      if (filePath.endsWith(suffix)) return true;
    } else if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (filePath.includes(prefix)) return true;
    } else {
      if (filePath.includes(pattern)) return true;
    }
  }
  return false;
}

/**
 * Select the most relevant files for context
 */
export function selectFiles(
  files: FileInfo[],
  query: string,
  recentFiles: string[] = [],
  config: Partial<FileSelectorConfig> = {}
): FileInfo[] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Filter excluded files
  const filteredFiles = files.filter(f => !shouldExclude(f.path, mergedConfig.excludePatterns));

  // Calculate relevance scores
  const scoredFiles = filteredFiles.map(file => ({
    ...file,
    relevanceScore: calculateRelevance(file, query, recentFiles, mergedConfig),
  }));

  // Sort by relevance score
  scoredFiles.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // Select files within limits
  const selectedFiles: FileInfo[] = [];
  let totalSize = 0;

  for (const file of scoredFiles) {
    if (selectedFiles.length >= mergedConfig.maxFiles) break;
    if (totalSize + file.size > mergedConfig.maxTotalSize) continue;

    selectedFiles.push(file);
    totalSize += file.size;
  }

  return selectedFiles;
}

/**
 * Group files by directory for better context organization
 */
export function groupFilesByDirectory(files: FileInfo[]): Map<string, FileInfo[]> {
  const groups = new Map<string, FileInfo[]>();

  for (const file of files) {
    const dir = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
    const existing = groups.get(dir) || [];
    existing.push(file);
    groups.set(dir, existing);
  }

  return groups;
}

/**
 * Generate a summary of selected files for context
 */
export function generateFilesSummary(files: FileInfo[]): string {
  if (files.length === 0) {
    return 'No relevant files found.';
  }

  const groups = groupFilesByDirectory(files);
  const lines: string[] = ['## Relevant Files'];

  for (const [dir, dirFiles] of Array.from(groups.entries())) {
    lines.push(`\n### ${dir}/`);
    for (const file of dirFiles) {
      const sizeKB = (file.size / 1024).toFixed(1);
      lines.push(`- ${file.name} (${sizeKB}KB)`);
    }
  }

  return lines.join('\n');
}

/**
 * Smart file selection based on task type
 */
export function selectFilesForTask(
  files: FileInfo[],
  taskType: 'code_generation' | 'bug_fix' | 'refactor' | 'documentation' | 'testing',
  query: string,
  recentFiles: string[] = []
): FileInfo[] {
  const taskConfigs: Record<string, Partial<FileSelectorConfig>> = {
    code_generation: {
      maxFiles: 15,
      priorityExtensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    bug_fix: {
      maxFiles: 25,
      maxTotalSize: 150000,
      priorityExtensions: ['.ts', '.tsx', '.js', '.jsx', '.test.ts', '.spec.ts'],
    },
    refactor: {
      maxFiles: 30,
      maxTotalSize: 200000,
    },
    documentation: {
      maxFiles: 10,
      priorityExtensions: ['.md', '.mdx', '.ts', '.tsx'],
    },
    testing: {
      maxFiles: 20,
      priorityExtensions: ['.test.ts', '.spec.ts', '.test.tsx', '.spec.tsx', '.ts', '.tsx'],
    },
  };

  return selectFiles(files, query, recentFiles, taskConfigs[taskType] || {});
}
