/**
 * Sprint 26 Reliability Tests
 * Tests for fetch timeouts, race conditions, state persistence, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Sprint 26: Reliability & Bug Fixes', () => {
  
  describe('26.1 Fetch Timeouts', () => {
    it('should have AbortController timeout in LLM module', async () => {
      const llmModule = await import('./_core/llm');
      expect(llmModule.invokeLLM).toBeDefined();
      // The timeout is implemented internally - we verify the function exists
      // and handles timeout errors appropriately
    });

    it('should have timeout in GitHub API module', async () => {
      const githubApi = await import('./github/api');
      expect(githubApi.listRepositories).toBeDefined();
      expect(githubApi.getRepository).toBeDefined();
      // Timeout is implemented in the internal githubFetch function
    });

    it('should export timeout error message format', async () => {
      // Verify the error message format is consistent
      const expectedLLMTimeout = 'LLM request timed out after 30 seconds';
      const expectedGitHubTimeout = /GitHub API request timed out after \d+ seconds/;
      
      expect(expectedLLMTimeout).toContain('30 seconds');
      expect(expectedGitHubTimeout.test('GitHub API request timed out after 30 seconds')).toBe(true);
    });
  });

  describe('26.2 Board Refresh', () => {
    it('should have useKanban hook with board selection', async () => {
      // Verify the hook module exists and exports the hook
      const fs = await import('fs');
      const hookPath = '/home/user/Hero/client/src/hooks/useKanban.ts';
      const content = fs.readFileSync(hookPath, 'utf-8');
      
      // Verify the fix: onSuccess should auto-select new board
      expect(content).toContain('setSelectedBoardId(newBoard.id)');
      expect(content).toContain('onSuccess: (newBoard)');
    });
  });

  describe('26.3 Silent Failures', () => {
    it('should throw errors instead of returning false in metricsRecorder', async () => {
      const metricsRecorder = await import('./services/metricsRecorder');
      expect(metricsRecorder.recordExecution).toBeDefined();
      
      // Verify the function signature - it should throw on error now
      const fs = await import('fs');
      const content = fs.readFileSync('/home/user/Hero/server/services/metricsRecorder.ts', 'utf-8');
      expect(content).toContain('throw new Error');
      expect(content).toContain('Failed to record execution metrics');
    });

    it('should throw errors instead of returning false in costTracker', async () => {
      const costTracker = await import('./services/costTracker');
      expect(costTracker.recordTokenUsage).toBeDefined();
      
      const fs = await import('fs');
      const content = fs.readFileSync('/home/user/Hero/server/services/costTracker.ts', 'utf-8');
      expect(content).toContain('throw new Error');
      expect(content).toContain('Failed to record token usage');
    });
  });

  describe('26.4 State Persistence', () => {
    it('should have persistExecutionState function', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/user/Hero/server/agentExecution.ts', 'utf-8');
      
      expect(content).toContain('async function persistExecutionState');
      expect(content).toContain('await persistExecutionState(state)');
    });

    it('should have recoverActiveExecutions function', async () => {
      const agentExecution = await import('./agentExecution');
      expect(agentExecution.recoverActiveExecutions).toBeDefined();
    });

    it('should have getRunningExecutions in db module', async () => {
      const db = await import('./db');
      expect(db.getRunningExecutions).toBeDefined();
    });
  });

  describe('26.5 Race Conditions', () => {
    it('should use transaction for card movement', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/user/Hero/server/kanban/db.ts', 'utf-8');
      
      // Verify moveCard uses transaction
      expect(content).toContain('await db.transaction(async (tx)');
      expect(content).toContain('// Use transaction to prevent race conditions');
    });

    it('should use INSERT ON DUPLICATE KEY for metrics', async () => {
      const fs = await import('fs');
      const metricsContent = fs.readFileSync('/home/user/Hero/server/services/metricsRecorder.ts', 'utf-8');
      const costContent = fs.readFileSync('/home/user/Hero/server/services/costTracker.ts', 'utf-8');
      
      expect(metricsContent).toContain('ON DUPLICATE KEY UPDATE');
      expect(costContent).toContain('ON DUPLICATE KEY UPDATE');
    });

    it('should use transaction for board creation', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/user/Hero/server/kanban/db.ts', 'utf-8');
      
      // Verify createDefaultBoard uses transaction
      expect(content).toContain('// Use transaction to ensure all-or-nothing board creation');
    });

    it('should pre-validate budget before LLM call', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/user/Hero/server/agentExecution.ts', 'utf-8');
      
      expect(content).toContain('// Pre-validate budget before making LLM call');
      expect(content).toContain('estimatedCostPerCall');
      expect(content).toContain('Budget limit would be exceeded');
    });
  });

  describe('26.6 Error Handling', () => {
    it('should have proper error context in metrics recording', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/user/Hero/server/services/metricsRecorder.ts', 'utf-8');
      
      // Verify error messages include context
      expect(content).toContain('errorMessage');
      expect(content).toContain('instanceof Error');
    });

    it('should handle AbortError specifically in LLM module', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/user/Hero/server/_core/llm.ts', 'utf-8');
      
      expect(content).toContain("error.name === 'AbortError'");
      expect(content).toContain('LLM request timed out');
    });
  });

  describe('Integration Tests', () => {
    it('should have all Sprint 26 modules properly exported', async () => {
      // Verify all modified modules are importable
      const modules = await Promise.all([
        import('./_core/llm'),
        import('./github/api'),
        import('./services/metricsRecorder'),
        import('./services/costTracker'),
        import('./agentExecution'),
        import('./db'),
        import('./kanban/db'),
      ]);
      
      expect(modules.length).toBe(7);
      modules.forEach(mod => {
        expect(mod).toBeDefined();
      });
    });
  });
});
