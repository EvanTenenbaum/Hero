/**
 * File Watcher Service
 * 
 * Monitors file changes in project repositories and triggers re-indexing.
 * Uses polling-based approach for cross-platform compatibility.
 */

import { getDb } from "../db";
import { contextIndexStatus } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface FileInfo {
  path: string;
  hash: string;
  size: number;
  modifiedAt: Date;
}

export interface WatcherConfig {
  projectId: number;
  rootPath: string;
  includePatterns: string[];
  excludePatterns: string[];
  pollIntervalMs: number;
}

export interface FileChangeEvent {
  type: "added" | "modified" | "deleted";
  file: FileInfo;
}

type ChangeCallback = (events: FileChangeEvent[]) => Promise<void>;

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT PATTERNS
// ════════════════════════════════════════════════════════════════════════════

export const DEFAULT_INCLUDE_PATTERNS = [
  "**/*.ts",
  "**/*.tsx",
  "**/*.js",
  "**/*.jsx",
  "**/*.json",
  "**/*.md",
  "**/*.css",
  "**/*.scss",
  "**/*.html",
];

export const DEFAULT_EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/*.min.js",
  "**/*.map",
  "**/package-lock.json",
  "**/pnpm-lock.yaml",
  "**/yarn.lock",
];

// ════════════════════════════════════════════════════════════════════════════
// FILE UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calculate SHA-256 hash of file content
 */
export function calculateFileHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Check if a path matches a glob pattern (simplified)
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*")
    .replace(/\./g, "\\.")
    .replace(/\?/g, ".");
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * Check if file should be included based on patterns
 */
export function shouldIncludeFile(
  filePath: string,
  includePatterns: string[],
  excludePatterns: string[]
): boolean {
  // Check exclusions first
  for (const pattern of excludePatterns) {
    if (matchesPattern(filePath, pattern)) {
      return false;
    }
  }
  
  // Check inclusions
  for (const pattern of includePatterns) {
    if (matchesPattern(filePath, pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Recursively scan directory for files
 */
export async function scanDirectory(
  dirPath: string,
  includePatterns: string[],
  excludePatterns: string[],
  basePath: string = dirPath
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      if (entry.isDirectory()) {
        // Check if directory should be excluded
        const dirPattern = relativePath + "/";
        let shouldExclude = false;
        
        for (const pattern of excludePatterns) {
          if (pattern.includes("**") && matchesPattern(dirPattern, pattern)) {
            shouldExclude = true;
            break;
          }
        }
        
        if (!shouldExclude) {
          const subFiles = await scanDirectory(
            fullPath,
            includePatterns,
            excludePatterns,
            basePath
          );
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        if (shouldIncludeFile(relativePath, includePatterns, excludePatterns)) {
          try {
            const stats = await fs.promises.stat(fullPath);
            const content = await fs.promises.readFile(fullPath, "utf-8");
            
            files.push({
              path: relativePath,
              hash: calculateFileHash(content),
              size: stats.size,
              modifiedAt: stats.mtime,
            });
          } catch (err) {
            // Skip files that can't be read
            console.warn(`[FileWatcher] Could not read file: ${fullPath}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`[FileWatcher] Error scanning directory: ${dirPath}`, err);
  }
  
  return files;
}

// ════════════════════════════════════════════════════════════════════════════
// FILE WATCHER CLASS
// ════════════════════════════════════════════════════════════════════════════

export class FileWatcher {
  private config: WatcherConfig;
  private fileCache: Map<string, FileInfo> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private callbacks: ChangeCallback[] = [];
  
  constructor(config: WatcherConfig) {
    this.config = {
      ...config,
      includePatterns: config.includePatterns.length > 0 
        ? config.includePatterns 
        : DEFAULT_INCLUDE_PATTERNS,
      excludePatterns: config.excludePatterns.length > 0 
        ? config.excludePatterns 
        : DEFAULT_EXCLUDE_PATTERNS,
      pollIntervalMs: config.pollIntervalMs || 5000,
    };
  }
  
  /**
   * Register a callback for file changes
   */
  onChange(callback: ChangeCallback): void {
    this.callbacks.push(callback);
  }
  
  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("[FileWatcher] Already running");
      return;
    }
    
    console.log(`[FileWatcher] Starting for project ${this.config.projectId}`);
    this.isRunning = true;
    
    // Initial scan
    await this.performScan(true);
    
    // Start polling
    this.pollInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.performScan(false);
      }
    }, this.config.pollIntervalMs);
  }
  
  /**
   * Stop watching
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    console.log(`[FileWatcher] Stopped for project ${this.config.projectId}`);
  }
  
  /**
   * Perform a directory scan and detect changes
   */
  private async performScan(isInitial: boolean): Promise<void> {
    const startTime = Date.now();
    
    try {
      const currentFiles = await scanDirectory(
        this.config.rootPath,
        this.config.includePatterns,
        this.config.excludePatterns
      );
      
      const changes: FileChangeEvent[] = [];
      const currentPaths = new Set<string>();
      
      // Check for added and modified files
      for (const file of currentFiles) {
        currentPaths.add(file.path);
        const cached = this.fileCache.get(file.path);
        
        if (!cached) {
          if (!isInitial) {
            changes.push({ type: "added", file });
          }
          this.fileCache.set(file.path, file);
        } else if (cached.hash !== file.hash) {
          changes.push({ type: "modified", file });
          this.fileCache.set(file.path, file);
        }
      }
      
      // Check for deleted files
      const cachedPaths = Array.from(this.fileCache.keys());
      for (const cachedPath of cachedPaths) {
        const cachedFile = this.fileCache.get(cachedPath)!;
        if (!currentPaths.has(cachedPath)) {
          changes.push({ type: "deleted", file: cachedFile });
          this.fileCache.delete(cachedPath);
        }
      }
      
      // Notify callbacks
      if (changes.length > 0) {
        console.log(`[FileWatcher] Detected ${changes.length} changes in ${Date.now() - startTime}ms`);
        for (const callback of this.callbacks) {
          try {
            await callback(changes);
          } catch (err) {
            console.error("[FileWatcher] Callback error:", err);
          }
        }
      }
      
      // Update index status
      await this.updateIndexStatus(currentFiles.length, isInitial);
      
    } catch (err) {
      console.error("[FileWatcher] Scan error:", err);
      await this.recordError(err instanceof Error ? err.message : String(err));
    }
  }
  
  /**
   * Update the index status in the database
   */
  private async updateIndexStatus(totalFiles: number, isInitial: boolean): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;
      
      const existing = await db
        .select()
        .from(contextIndexStatus)
        .where(eq(contextIndexStatus.projectId, this.config.projectId))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(contextIndexStatus).values({
          projectId: this.config.projectId,
          status: "idle",
          totalFiles,
          indexedFiles: 0,
          totalChunks: 0,
          excludePatterns: this.config.excludePatterns,
          includePatterns: this.config.includePatterns,
        });
      } else {
        await db
          .update(contextIndexStatus)
          .set({
            totalFiles,
            lastIncrementalAt: isInitial ? undefined : new Date(),
          })
          .where(eq(contextIndexStatus.projectId, this.config.projectId));
      }
    } catch (err) {
      console.error("[FileWatcher] Failed to update index status:", err);
    }
  }
  
  /**
   * Record an error in the index status
   */
  private async recordError(message: string): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;
      
      // Note: Drizzle doesn't support raw SQL in update, so we fetch and increment
      const existing = await db
        .select()
        .from(contextIndexStatus)
        .where(eq(contextIndexStatus.projectId, this.config.projectId))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(contextIndexStatus)
          .set({
            lastError: message,
            errorCount: (existing[0].errorCount || 0) + 1,
          })
          .where(eq(contextIndexStatus.projectId, this.config.projectId));
      }
    } catch (err) {
      console.error("[FileWatcher] Failed to record error:", err);
    }
  }
  
  /**
   * Get current file cache
   */
  getFileCache(): Map<string, FileInfo> {
    return new Map(this.fileCache);
  }
  
  /**
   * Force a full rescan
   */
  async rescan(): Promise<void> {
    this.fileCache.clear();
    await this.performScan(true);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// WATCHER MANAGER
// ════════════════════════════════════════════════════════════════════════════

class FileWatcherManager {
  private watchers: Map<number, FileWatcher> = new Map();
  
  /**
   * Start watching a project
   */
  async startWatching(
    projectId: number,
    rootPath: string,
    options?: Partial<WatcherConfig>
  ): Promise<FileWatcher> {
    // Stop existing watcher if any
    this.stopWatching(projectId);
    
    const watcher = new FileWatcher({
      projectId,
      rootPath,
      includePatterns: options?.includePatterns || DEFAULT_INCLUDE_PATTERNS,
      excludePatterns: options?.excludePatterns || DEFAULT_EXCLUDE_PATTERNS,
      pollIntervalMs: options?.pollIntervalMs || 5000,
    });
    
    this.watchers.set(projectId, watcher);
    await watcher.start();
    
    return watcher;
  }
  
  /**
   * Stop watching a project
   */
  stopWatching(projectId: number): void {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      watcher.stop();
      this.watchers.delete(projectId);
    }
  }
  
  /**
   * Get watcher for a project
   */
  getWatcher(projectId: number): FileWatcher | undefined {
    return this.watchers.get(projectId);
  }
  
  /**
   * Stop all watchers
   */
  stopAll(): void {
    const projectIds = Array.from(this.watchers.keys());
    for (const projectId of projectIds) {
      const watcher = this.watchers.get(projectId);
      if (watcher) watcher.stop();
    }
    this.watchers.clear();
  }
}

// Singleton instance
export const fileWatcherManager = new FileWatcherManager();
