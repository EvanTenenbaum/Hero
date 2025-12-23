/**
 * Sandbox Manager Tests
 * 
 * Unit tests for the SandboxManager service.
 * These tests verify sandbox lifecycle management.
 * 
 * @module server/services/__tests__/sandboxManager.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the E2B SDK before importing the module
vi.mock('@e2b/code-interpreter', () => ({
  Sandbox: {
    create: vi.fn().mockResolvedValue({
      commands: {
        run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'health-check', stderr: '' }),
      },
      files: {
        read: vi.fn().mockResolvedValue('file content'),
        write: vi.fn().mockResolvedValue(undefined),
      },
      kill: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock environment
vi.mock('../../_core/env', () => ({
  ENV: {
    E2B_API_KEY: 'test-api-key',
  },
}));

describe('SandboxManager', () => {
  let SandboxManager: typeof import('../sandboxManager').SandboxManager;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get fresh instance
    const module = await import('../sandboxManager');
    SandboxManager = module.SandboxManager;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('getOrStartSandbox', () => {
    it('should create a new sandbox for a new project', async () => {
      const manager = new SandboxManager();
      const sandbox = await manager.getOrStartSandbox('project-1');
      
      expect(sandbox).toBeDefined();
      expect(manager.getActiveSandboxCount()).toBe(1);
    });

    it('should return existing sandbox for same project', async () => {
      const manager = new SandboxManager();
      const sandbox1 = await manager.getOrStartSandbox('project-1');
      const sandbox2 = await manager.getOrStartSandbox('project-1');
      
      expect(sandbox1).toBe(sandbox2);
      expect(manager.getActiveSandboxCount()).toBe(1);
    });

    it('should create separate sandboxes for different projects', async () => {
      const manager = new SandboxManager();
      await manager.getOrStartSandbox('project-1');
      await manager.getOrStartSandbox('project-2');
      
      expect(manager.getActiveSandboxCount()).toBe(2);
    });
  });

  describe('closeSandbox', () => {
    it('should close and remove a sandbox', async () => {
      const manager = new SandboxManager();
      await manager.getOrStartSandbox('project-1');
      
      expect(manager.hasSandbox('project-1')).toBe(true);
      
      await manager.closeSandbox('project-1');
      
      expect(manager.hasSandbox('project-1')).toBe(false);
      expect(manager.getActiveSandboxCount()).toBe(0);
    });
  });

  describe('closeAllSandboxes', () => {
    it('should close all active sandboxes', async () => {
      const manager = new SandboxManager();
      await manager.getOrStartSandbox('project-1');
      await manager.getOrStartSandbox('project-2');
      await manager.getOrStartSandbox('project-3');
      
      expect(manager.getActiveSandboxCount()).toBe(3);
      
      await manager.closeAllSandboxes();
      
      expect(manager.getActiveSandboxCount()).toBe(0);
    });
  });

  describe('getSandboxInfo', () => {
    it('should return sandbox info for existing sandbox', async () => {
      const manager = new SandboxManager();
      await manager.getOrStartSandbox('project-1');
      
      const info = manager.getSandboxInfo('project-1');
      
      expect(info).toBeDefined();
      expect(info?.createdAt).toBeInstanceOf(Date);
      expect(info?.lastAccessedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent sandbox', () => {
      const manager = new SandboxManager();
      const info = manager.getSandboxInfo('non-existent');
      
      expect(info).toBeNull();
    });
  });

  describe('max sandboxes limit', () => {
    it('should remove oldest sandbox when limit reached', async () => {
      const manager = new SandboxManager({ maxSandboxes: 2 });
      
      await manager.getOrStartSandbox('project-1');
      await new Promise(r => setTimeout(r, 10)); // Small delay
      await manager.getOrStartSandbox('project-2');
      await new Promise(r => setTimeout(r, 10));
      await manager.getOrStartSandbox('project-3');
      
      expect(manager.getActiveSandboxCount()).toBe(2);
      expect(manager.hasSandbox('project-1')).toBe(false);
      expect(manager.hasSandbox('project-2')).toBe(true);
      expect(manager.hasSandbox('project-3')).toBe(true);
    });
  });
});
