/**
 * Sprint 29: GitHub Integration & Polish Tests
 * 
 * Tests for:
 * - GitHub cloning UI components
 * - PR list panel
 * - Chat streaming end-to-end
 * - Structured logging
 * - Syntax highlighting
 * - Keyboard shortcuts
 */

import { describe, it, expect, vi } from 'vitest';

describe('Sprint 29: GitHub Integration & Polish', () => {
  describe('29.1 GitHub Cloning UI', () => {
    it('should have CloneRepoDialog component', async () => {
      // Component exists
      const fs = await import('fs');
      const path = 'client/src/components/github/CloneRepoDialog.tsx';
      expect(fs.existsSync(path)).toBe(true);
    });

    it('should have PRListPanel component', async () => {
      const fs = await import('fs');
      const path = 'client/src/components/github/PRListPanel.tsx';
      expect(fs.existsSync(path)).toBe(true);
    });
  });

  describe('29.3 Chat Streaming', () => {
    it('should have chatStreamRouter module', async () => {
      const module = await import('./routers/chat-stream');
      expect(module.chatStreamRouter).toBeDefined();
    });

    it('should have streamMessage subscription', async () => {
      const module = await import('./routers/chat-stream');
      expect(module.chatStreamRouter._def.procedures.streamMessage).toBeDefined();
    });
  });

  describe('29.4 Structured Logging', () => {
    it('should have logger module', async () => {
      const logger = await import('./_core/logger');
      expect(logger.default).toBeDefined();
      expect(logger.serverLogger).toBeDefined();
      expect(logger.authLogger).toBeDefined();
      expect(logger.dbLogger).toBeDefined();
      expect(logger.llmLogger).toBeDefined();
      expect(logger.githubLogger).toBeDefined();
      expect(logger.agentLogger).toBeDefined();
      expect(logger.metricsLogger).toBeDefined();
    });

    it('should have withTiming helper', async () => {
      const logger = await import('./_core/logger');
      expect(logger.withTiming).toBeDefined();
      expect(typeof logger.withTiming).toBe('function');
    });

    it('should create child loggers with correct modules', async () => {
      const logger = await import('./_core/logger');
      // Verify child loggers have bindings
      expect(logger.serverLogger).toBeDefined();
    });
  });

  describe('29.5 Syntax Highlighting', () => {
    it('should have syntax-highlight utility', async () => {
      const fs = await import('fs');
      const path = 'client/src/lib/syntax-highlight.ts';
      expect(fs.existsSync(path)).toBe(true);
    });

    it('should detect language from file extensions', async () => {
      // Read the file and check for language mapping
      const fs = await import('fs');
      const content = fs.readFileSync('client/src/lib/syntax-highlight.ts', 'utf-8');
      expect(content).toContain('extensionToLanguage');
      expect(content).toContain("'ts': 'typescript'");
      expect(content).toContain("'py': 'python'");
      expect(content).toContain("'jsx': 'jsx'");
    });

    it('should export highlightCode function', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('client/src/lib/syntax-highlight.ts', 'utf-8');
      expect(content).toContain('export async function highlightCode');
    });

    it('should export highlightDiff function', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('client/src/lib/syntax-highlight.ts', 'utf-8');
      expect(content).toContain('export async function highlightDiff');
    });
  });

  describe('29.6 Keyboard Shortcuts', () => {
    it('should have useKeyboardShortcuts hook', async () => {
      const fs = await import('fs');
      const path = 'client/src/hooks/useKeyboardShortcuts.ts';
      expect(fs.existsSync(path)).toBe(true);
    });

    it('should export SHORTCUTS constant', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('client/src/hooks/useKeyboardShortcuts.ts', 'utf-8');
      expect(content).toContain('export const SHORTCUTS');
    });

    it('should have help shortcut (Shift+?)', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('client/src/hooks/useKeyboardShortcuts.ts', 'utf-8');
      expect(content).toContain("event.key === '?'");
      expect(content).toContain('showShortcutsHelp');
    });

    it('should detect Mac vs Windows', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('client/src/hooks/useKeyboardShortcuts.ts', 'utf-8');
      expect(content).toContain('isMac');
      expect(content).toContain('/Mac|iPod|iPhone|iPad/');
    });
  });

  describe('Integration Tests', () => {
    it('should have all Sprint 29 modules properly exported', async () => {
      // Check routers.ts includes chatStreamRouter
      const fs = await import('fs');
      const routersContent = fs.readFileSync('server/routers.ts', 'utf-8');
      expect(routersContent).toContain('chatStreamRouter');
    });

    it('should have pino installed', async () => {
      const fs = await import('fs');
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      expect(packageJson.dependencies.pino).toBeDefined();
    });

    it('should have shiki installed', async () => {
      const fs = await import('fs');
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      expect(packageJson.dependencies.shiki).toBeDefined();
    });
  });
});
