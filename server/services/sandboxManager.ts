/**
 * Sandbox Manager Service
 * 
 * Manages E2B sandbox lifecycles for cloud-native project execution.
 * Implements a singleton pattern with automatic timeout management.
 * 
 * @module server/services/sandboxManager
 */

import { Sandbox } from '@e2b/code-interpreter';
import { ENV } from '../_core/env';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface SandboxEntry {
  sandbox: Sandbox;
  projectId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  timeoutId: NodeJS.Timeout;
  lastHealthCheck?: Date;
  isHealthy?: boolean;
}

interface SandboxManagerOptions {
  inactivityTimeoutMs?: number;
  maxSandboxes?: number;
  healthCheckCacheTtlMs?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_SANDBOXES = 10;
const DEFAULT_HEALTH_CHECK_CACHE_TTL_MS = 10000; // 10 seconds
const SANDBOX_TEMPLATE = 'base';
const REPO_PATH = '/home/user/repo';
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ════════════════════════════════════════════════════════════════════════════
// SANDBOX MANAGER CLASS
// ════════════════════════════════════════════════════════════════════════════

class SandboxManager {
  private activeSandboxes: Map<string, SandboxEntry> = new Map();
  private inactivityTimeoutMs: number;
  private maxSandboxes: number;
  private healthCheckCacheTtlMs: number;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(options: SandboxManagerOptions = {}) {
    this.inactivityTimeoutMs = options.inactivityTimeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT_MS;
    this.maxSandboxes = options.maxSandboxes ?? DEFAULT_MAX_SANDBOXES;
    this.healthCheckCacheTtlMs = options.healthCheckCacheTtlMs ?? DEFAULT_HEALTH_CHECK_CACHE_TTL_MS;
    
    // Start periodic cleanup to prevent memory leaks
    this.startPeriodicCleanup();
  }

  /**
   * Start periodic cleanup to remove stale/unhealthy sandboxes
   * MEMORY LEAK PREVENTION: Ensures sandboxes don't accumulate
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    
    this.cleanupIntervalId = setInterval(async () => {
      await this.cleanupStaleSandboxes();
    }, CLEANUP_INTERVAL_MS);
    
    // Don't prevent Node.js from exiting
    this.cleanupIntervalId.unref();
  }

  /**
   * Clean up stale or unhealthy sandboxes
   */
  private async cleanupStaleSandboxes(): Promise<void> {
    const projectIds = Array.from(this.activeSandboxes.keys());
    
    for (const projectId of projectIds) {
      const entry = this.activeSandboxes.get(projectId);
      if (!entry) continue;
      
      try {
        const isHealthy = await this.checkSandboxHealth(entry.sandbox);
        if (!isHealthy) {
          console.debug(`Cleanup: Removing unhealthy sandbox for project ${projectId}`);
          await this.removeSandbox(projectId);
        }
      } catch (error) {
        console.error(`Cleanup: Error checking sandbox ${projectId}, removing:`, error);
        await this.removeSandbox(projectId);
      }
    }
  }

  /**
   * Get or start a sandbox for a given project.
   * If a sandbox already exists and is running, return it.
   * Otherwise, create a new sandbox.
   * 
   * @param projectId - The unique identifier of the project
   * @returns The Sandbox instance
   */
  async getOrStartSandbox(projectId: string): Promise<Sandbox> {
    // Check if we have an existing sandbox for this project
    const existing = this.activeSandboxes.get(projectId);
    
    if (existing) {
      // Use cached health status if recent
      const now = new Date();
      const cacheValid = existing.lastHealthCheck && 
        (now.getTime() - existing.lastHealthCheck.getTime()) < this.healthCheckCacheTtlMs;
      
      if (cacheValid && existing.isHealthy) {
        // Reset the inactivity timeout
        this.resetTimeout(projectId);
        existing.lastAccessedAt = new Date();
        return existing.sandbox;
      }
      
      // Check if sandbox is still running
      try {
        const isRunning = await this.checkSandboxHealth(existing.sandbox);
        existing.lastHealthCheck = new Date();
        existing.isHealthy = isRunning;
        
        if (isRunning) {
          // Reset the inactivity timeout
          this.resetTimeout(projectId);
          existing.lastAccessedAt = new Date();
          return existing.sandbox;
        }
      } catch (error) {
        // Sandbox is no longer valid, remove it
        console.debug(`Sandbox for project ${projectId} is no longer valid, creating new one`);
      }
      
      // Remove the invalid sandbox
      await this.removeSandbox(projectId);
    }

    // Check if we've reached the maximum number of sandboxes
    if (this.activeSandboxes.size >= this.maxSandboxes) {
      // Remove the oldest sandbox
      await this.removeOldestSandbox();
    }

    // Create a new sandbox
    return this.createSandbox(projectId);
  }

  /**
   * Create a new sandbox for a project
   */
  private async createSandbox(projectId: string): Promise<Sandbox> {
    if (!ENV.E2B_API_KEY) {
      throw new Error('E2B_API_KEY is not configured. Please set it in your environment variables.');
    }

    console.debug(`Creating new sandbox for project ${projectId}`);
    
    const sandbox = await Sandbox.create(SANDBOX_TEMPLATE, {
      apiKey: ENV.E2B_API_KEY,
    });

    // Set up the inactivity timeout
    const timeoutId = setTimeout(() => {
      this.handleInactivityTimeout(projectId);
    }, this.inactivityTimeoutMs);

    // Store the sandbox entry
    const entry: SandboxEntry = {
      sandbox,
      projectId,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      timeoutId,
      lastHealthCheck: new Date(),
      isHealthy: true,
    };

    this.activeSandboxes.set(projectId, entry);
    console.debug(`Sandbox created for project ${projectId}. Active sandboxes: ${this.activeSandboxes.size}`);

    return sandbox;
  }

  /**
   * Check if a sandbox is still healthy/running
   */
  private async checkSandboxHealth(sandbox: Sandbox): Promise<boolean> {
    try {
      // Try to execute a simple command to verify the sandbox is responsive
      const result = await sandbox.commands.run('echo "health-check"', { timeoutMs: 5000 });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Reset the inactivity timeout for a sandbox
   */
  private resetTimeout(projectId: string): void {
    const entry = this.activeSandboxes.get(projectId);
    if (entry) {
      clearTimeout(entry.timeoutId);
      entry.timeoutId = setTimeout(() => {
        this.handleInactivityTimeout(projectId);
      }, this.inactivityTimeoutMs);
    }
  }

  /**
   * Handle inactivity timeout - close the sandbox
   */
  private async handleInactivityTimeout(projectId: string): Promise<void> {
    console.debug(`Sandbox for project ${projectId} timed out due to inactivity`);
    await this.removeSandbox(projectId);
  }

  /**
   * Remove a sandbox from the manager
   * MEMORY LEAK PREVENTION: Always clears timeout and removes from map
   */
  private async removeSandbox(projectId: string): Promise<void> {
    const entry = this.activeSandboxes.get(projectId);
    if (entry) {
      // Always clear timeout first
      clearTimeout(entry.timeoutId);
      
      // Remove from map immediately to prevent re-entry
      this.activeSandboxes.delete(projectId);
      
      // Then try to kill the sandbox
      try {
        await entry.sandbox.kill();
        console.debug(`Sandbox killed for project ${projectId}. Active sandboxes: ${this.activeSandboxes.size}`);
      } catch (error) {
        // Log but don't throw - sandbox might already be dead
        console.error(`Error killing sandbox for project ${projectId}:`, error);
        // Note: Entry already removed from map, so no memory leak
      }
    }
  }

  /**
   * Remove the oldest sandbox to make room for new ones
   */
  private async removeOldestSandbox(): Promise<void> {
    let oldestProjectId: string | null = null;
    let oldestTime: Date | null = null;

    this.activeSandboxes.forEach((entry, projectId) => {
      if (!oldestTime || entry.lastAccessedAt < oldestTime) {
        oldestProjectId = projectId;
        oldestTime = entry.lastAccessedAt;
      }
    });

    if (oldestProjectId) {
      console.debug(`Removing oldest sandbox for project ${oldestProjectId} to make room`);
      await this.removeSandbox(oldestProjectId);
    }
  }

  /**
   * Explicitly close a sandbox for a project
   */
  async closeSandbox(projectId: string): Promise<void> {
    await this.removeSandbox(projectId);
  }

  /**
   * Close all active sandboxes (useful for graceful shutdown)
   */
  async closeAllSandboxes(): Promise<void> {
    console.debug(`Closing all ${this.activeSandboxes.size} active sandboxes`);
    
    // Stop the cleanup interval
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    
    const projectIds = Array.from(this.activeSandboxes.keys());
    await Promise.all(projectIds.map(id => this.removeSandbox(id)));
  }

  /**
   * Get the number of active sandboxes
   */
  getActiveSandboxCount(): number {
    return this.activeSandboxes.size;
  }

  /**
   * Check if a project has an active sandbox
   */
  hasSandbox(projectId: string): boolean {
    return this.activeSandboxes.has(projectId);
  }

  /**
   * Get sandbox info for a project (without returning the sandbox itself)
   */
  getSandboxInfo(projectId: string): { createdAt: Date; lastAccessedAt: Date; isHealthy?: boolean } | null {
    const entry = this.activeSandboxes.get(projectId);
    if (entry) {
      return {
        createdAt: entry.createdAt,
        lastAccessedAt: entry.lastAccessedAt,
        isHealthy: entry.isHealthy,
      };
    }
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════

// Export a singleton instance
export const sandboxManager = new SandboxManager();

// Export the class for testing purposes
export { SandboxManager, REPO_PATH, SANDBOX_TEMPLATE };

// Export types
export type { SandboxEntry, SandboxManagerOptions };
