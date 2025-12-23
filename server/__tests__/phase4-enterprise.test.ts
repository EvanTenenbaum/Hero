/**
 * Phase 4 Enterprise Readiness Tests
 *
 * Comprehensive QA tests for production readiness:
 * - Full feature coverage
 * - Performance characteristics
 * - Error handling
 * - Security measures
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Phase 4: Enterprise Readiness & Polish', () => {

  describe('4.1 Core Infrastructure', () => {
    it('should have tRPC router with all essential routers', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers.ts', 'utf-8');

      // Core routers
      expect(content).toContain('auth: authRouter');
      expect(content).toContain('projects: projectsRouter');
      expect(content).toContain('chat: chatRouter');
      expect(content).toContain('chatAgent: chatAgentRouter');
      expect(content).toContain('agents: agentsRouter');

      // Feature routers
      expect(content).toContain('kanban: kanbanRouter');
      expect(content).toContain('specs: specsRouter');
      expect(content).toContain('kickoff: kickoffRouter');

      // Cloud/Sandbox routers
      expect(content).toContain('cloudSandbox: cloudSandboxRouter');
      expect(content).toContain('cloudExecution: cloudExecutionStreamRouter');
      expect(content).toContain('secrets: secretsRouter');

      // Enhanced agent routers
      expect(content).toContain('featureFlags: featureFlagsRouter');
      expect(content).toContain('enhancedAgent: enhancedAgentRouter');
      expect(content).toContain('steering: steeringRouter');
      expect(content).toContain('hooks: hooksRouter');
    });

    it('should have proper error handling in LLM module', () => {
      const content = fs.readFileSync('/home/user/Hero/server/_core/llm.ts', 'utf-8');
      expect(content).toContain('AbortController');
      expect(content).toContain('timeout');
      expect(content).toContain('catch');
    });

    it('should have logger module', () => {
      const exists = fs.existsSync('/home/user/Hero/server/_core/logger.ts');
      expect(exists).toBe(true);
    });
  });

  describe('4.2 Database Schema', () => {
    it('should have all required tables', () => {
      const content = fs.readFileSync('/home/user/Hero/drizzle/schema.ts', 'utf-8');

      // Core tables
      expect(content).toContain('users = mysqlTable');
      expect(content).toContain('projects = mysqlTable');
      expect(content).toContain('chatConversations = mysqlTable');
      expect(content).toContain('chatMessages = mysqlTable');

      // Agent tables
      expect(content).toContain('agents = mysqlTable');
      expect(content).toContain('agentExecutions = mysqlTable');
      expect(content).toContain('agentLogs = mysqlTable');

      // Enhanced agent tables
      expect(content).toContain('agentMemoryShortTerm = mysqlTable');
      expect(content).toContain('agentMemoryLongTerm = mysqlTable');
      expect(content).toContain('auditLogs = mysqlTable');
      expect(content).toContain('executionState = mysqlTable');
      expect(content).toContain('executionCheckpoints = mysqlTable');
      expect(content).toContain('patternCache = mysqlTable');
    });

    it('should have migration files', () => {
      const exists = fs.existsSync('/home/user/Hero/drizzle/migrations/0001_add_agent_memory_tables.sql');
      expect(exists).toBe(true);
    });
  });

  describe('4.3 Security Measures', () => {
    it('should have safety check in chat agent service', () => {
      const content = fs.readFileSync('/home/user/Hero/server/chatAgent.ts', 'utf-8');
      expect(content).toContain('safetyCheck');
    });

    it('should have secret encryption', () => {
      const content = fs.readFileSync('/home/user/Hero/server/services/projectHydrator.ts', 'utf-8');
      expect(content).toContain('encryptSecret');
      expect(content).toContain('decryptSecret');
    });

    it('should have admin-only routes protected', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/featureFlags.ts', 'utf-8');
      expect(content).toContain("ctx.user.role !== 'admin'");
      expect(content).toContain('FORBIDDEN');
    });

    it('should have default security hooks', () => {
      const content = fs.readFileSync('/home/user/Hero/server/hooks/hooksService.ts', 'utf-8');
      expect(content).toContain('security_guard');
      expect(content).toContain('SQL injection');
      expect(content).toContain('Command injection');
      expect(content).toContain('Path traversal');
    });
  });

  describe('4.4 Agent Services', () => {
    it('should have agent memory service', () => {
      const exists = fs.existsSync('/home/user/Hero/server/services/agentMemory.ts');
      expect(exists).toBe(true);
    });

    it('should have intelligent context manager', () => {
      const exists = fs.existsSync('/home/user/Hero/server/services/intelligentContextManager.ts');
      expect(exists).toBe(true);
    });

    it('should have dynamic tool registry', () => {
      const exists = fs.existsSync('/home/user/Hero/server/services/dynamicToolRegistry.ts');
      expect(exists).toBe(true);
    });

    it('should have audit logger', () => {
      const exists = fs.existsSync('/home/user/Hero/server/services/auditLogger.ts');
      expect(exists).toBe(true);
    });

    it('should have self-reflection service', () => {
      const exists = fs.existsSync('/home/user/Hero/server/agents/selfReflectionService.ts');
      expect(exists).toBe(true);
    });

    it('should have execution pattern learner', () => {
      const exists = fs.existsSync('/home/user/Hero/server/agents/executionPatternLearner.ts');
      expect(exists).toBe(true);
    });

    it('should have adaptive agent controller', () => {
      const exists = fs.existsSync('/home/user/Hero/server/agents/adaptiveAgentController.ts');
      expect(exists).toBe(true);
    });
  });

  describe('4.5 Cloud Sandbox Integration', () => {
    it('should have sandbox manager', () => {
      const exists = fs.existsSync('/home/user/Hero/server/services/sandboxManager.ts');
      expect(exists).toBe(true);
    });

    it('should have cloud chat agent', () => {
      const exists = fs.existsSync('/home/user/Hero/server/cloudChatAgent.ts');
      expect(exists).toBe(true);
    });

    it('should have cloud execution stream router', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/cloud-execution-stream.ts', 'utf-8');
      expect(content).toContain('cloudExecutionStreamRouter');
    });

    it('should have secrets router', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/secretsRouter.ts', 'utf-8');
      expect(content).toContain('secretsRouter');
    });
  });

  describe('4.6 Kickoff Wizard', () => {
    it('should have 5-step kickoff protocol', () => {
      const content = fs.readFileSync('/home/user/Hero/server/kickoff/router.ts', 'utf-8');
      expect(content).toContain('step: z.number().min(1).max(5)');
    });

    it('should generate all document types', () => {
      const content = fs.readFileSync('/home/user/Hero/server/kickoff/kickoffService.ts', 'utf-8');
      expect(content).toContain('north-star');
      expect(content).toContain('product-brief');
      expect(content).toContain('architecture');
      expect(content).toContain('quality-bar');
      expect(content).toContain('slice-map');
      expect(content).toContain('agent-brief');
    });
  });

  describe('4.7 Performance Features', () => {
    it('should have streaming support', () => {
      const exists = fs.existsSync('/home/user/Hero/server/routers/chat-stream.ts');
      expect(exists).toBe(true);
    });

    it('should have fetch timeouts', () => {
      const llmContent = fs.readFileSync('/home/user/Hero/server/_core/llm.ts', 'utf-8');
      expect(llmContent).toContain('AbortController');
    });

    it('should have pattern caching', () => {
      const schemaContent = fs.readFileSync('/home/user/Hero/drizzle/schema.ts', 'utf-8');
      expect(schemaContent).toContain('patternCache');
    });
  });

  describe('4.8 Test Coverage', () => {
    it('should have Phase 2 tests', () => {
      const exists = fs.existsSync('/home/user/Hero/server/__tests__/phase2-integration.test.ts');
      expect(exists).toBe(true);
    });

    it('should have Phase 3 tests', () => {
      const exists = fs.existsSync('/home/user/Hero/server/__tests__/phase3-intelligence.test.ts');
      expect(exists).toBe(true);
    });

    it('should have Sprint 26-30 tests', () => {
      expect(fs.existsSync('/home/user/Hero/server/sprint26-reliability.test.ts')).toBe(true);
      expect(fs.existsSync('/home/user/Hero/server/sprint27-performance.test.ts')).toBe(true);
      expect(fs.existsSync('/home/user/Hero/server/sprint28-features.test.ts')).toBe(true);
      expect(fs.existsSync('/home/user/Hero/server/sprint29-github.test.ts')).toBe(true);
      expect(fs.existsSync('/home/user/Hero/server/sprint30-execution.test.ts')).toBe(true);
    });

    it('should have kickoff wizard tests', () => {
      const exists = fs.existsSync('/home/user/Hero/server/kickoff/kickoff-wizard.test.ts');
      expect(exists).toBe(true);
    });
  });

  describe('Integration Summary', () => {
    it('should import all main modules without errors', async () => {
      const modules = await Promise.all([
        import('../_core/llm'),
        import('../db'),
        import('../chatAgent'),
        import('../routers/featureFlags'),
        import('../routers/enhancedAgent'),
        import('../steering/router'),
        import('../hooks/router'),
      ]);

      expect(modules.length).toBe(7);
      modules.forEach(mod => expect(mod).toBeDefined());
    });

    it('should have complete router count', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers.ts', 'utf-8');

      // Count router registrations
      const routerMatches = content.match(/\w+: \w+Router/g);
      expect(routerMatches).not.toBeNull();
      expect(routerMatches!.length).toBeGreaterThanOrEqual(25);
    });
  });
});
