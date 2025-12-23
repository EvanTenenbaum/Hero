/**
 * Phase 2 Integration Tests - Feature Flags & Enhanced Agent
 *
 * Red Hat QA tests for:
 * - Feature flags router integration
 * - Enhanced agent router integration
 * - Safe wrapper functionality
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Phase 2: Integration & Activation', () => {

  describe('2.1 Feature Flags Router', () => {
    it('should have feature flags router module', () => {
      const exists = fs.existsSync('/home/user/Hero/server/routers/featureFlags.ts');
      expect(exists).toBe(true);
    });

    it('should export FeatureFlags interface', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/featureFlags.ts', 'utf-8');
      expect(content).toContain('export interface FeatureFlags');
      expect(content).toContain('enableAgentMemory: boolean');
      expect(content).toContain('enableAgentLearning: boolean');
      expect(content).toContain('enableAgentReflection: boolean');
      expect(content).toContain('enableAgentAdaptive: boolean');
    });

    it('should export getFeatureFlags function', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/featureFlags.ts', 'utf-8');
      expect(content).toContain('export function getFeatureFlags');
    });

    it('should export isFeatureEnabled function', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/featureFlags.ts', 'utf-8');
      expect(content).toContain('export function isFeatureEnabled');
    });

    it('should have KIRO-inspired feature flags', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/featureFlags.ts', 'utf-8');
      expect(content).toContain('enableSteering: boolean');
      expect(content).toContain('enableSpecs: boolean');
      expect(content).toContain('enableHooks: boolean');
    });

    it('should have environment variable overrides', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/featureFlags.ts', 'utf-8');
      expect(content).toContain('process.env.HERO_ENABLE_AGENT_MEMORY');
      expect(content).toContain('process.env.HERO_ENABLE_AGENT_LEARNING');
      expect(content).toContain('process.env.HERO_ENABLE_STEERING');
    });

    it('should have admin-only mutation for setting flags', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/featureFlags.ts', 'utf-8');
      expect(content).toContain("ctx.user.role !== 'admin'");
      expect(content).toContain('Only admins can modify feature flags');
    });

    it('should be registered in main routers', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers.ts', 'utf-8');
      expect(content).toContain("import { featureFlagsRouter } from './routers/featureFlags'");
      expect(content).toContain('featureFlags: featureFlagsRouter');
    });
  });

  describe('2.2 Enhanced Agent Router', () => {
    it('should have enhanced agent router module', () => {
      const exists = fs.existsSync('/home/user/Hero/server/routers/enhancedAgent.ts');
      expect(exists).toBe(true);
    });

    it('should import feature flags', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/enhancedAgent.ts', 'utf-8');
      expect(content).toContain("import { getFeatureFlags, isFeatureEnabled } from './featureFlags'");
    });

    it('should import safe enhanced agent wrapper', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/enhancedAgent.ts', 'utf-8');
      expect(content).toContain('createSafeEnhancedAgent');
      expect(content).toContain('processMessageSafe');
      expect(content).toContain('checkEnhancedAgentHealth');
    });

    it('should have execute mutation', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/enhancedAgent.ts', 'utf-8');
      expect(content).toContain('execute: protectedProcedure');
      expect(content).toContain('.mutation(async');
    });

    it('should check feature flags before execution', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/enhancedAgent.ts', 'utf-8');
      expect(content).toContain('getFeatureFlags(input.projectId)');
      expect(content).toContain('anyEnhancedFeaturesEnabled');
    });

    it('should have status query', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/enhancedAgent.ts', 'utf-8');
      expect(content).toContain('status: protectedProcedure');
      expect(content).toContain('.query(async');
    });

    it('should have isAvailable query', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/enhancedAgent.ts', 'utf-8');
      expect(content).toContain('isAvailable: protectedProcedure');
    });

    it('should have task types query', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/enhancedAgent.ts', 'utf-8');
      expect(content).toContain('getTaskTypes: protectedProcedure');
      expect(content).toContain('CODE_GENERATION');
      expect(content).toContain('CODE_REVIEW');
      expect(content).toContain('DEBUGGING');
    });

    it('should be registered in main routers', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers.ts', 'utf-8');
      expect(content).toContain("import { enhancedAgentRouter } from './routers/enhancedAgent'");
      expect(content).toContain('enhancedAgent: enhancedAgentRouter');
    });
  });

  describe('2.3 Safe Enhanced Agent Wrapper', () => {
    it('should have safe wrapper module', () => {
      const exists = fs.existsSync('/home/user/Hero/server/agents/safeEnhancedAgentWrapper.ts');
      expect(exists).toBe(true);
    });

    it('should export createSafeEnhancedAgent', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/safeEnhancedAgentWrapper.ts', 'utf-8');
      expect(content).toContain('export async function createSafeEnhancedAgent');
    });

    it('should export processMessageSafe', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/safeEnhancedAgentWrapper.ts', 'utf-8');
      expect(content).toContain('export async function processMessageSafe');
    });

    it('should export checkEnhancedAgentHealth', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/safeEnhancedAgentWrapper.ts', 'utf-8');
      expect(content).toContain('export async function checkEnhancedAgentHealth');
    });

    it('should check database readiness', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/safeEnhancedAgentWrapper.ts', 'utf-8');
      expect(content).toContain('checkDatabaseReady');
      expect(content).toContain('agent_memory_short_term');
      expect(content).toContain('audit_logs');
    });

    it('should have graceful fallback', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/safeEnhancedAgentWrapper.ts', 'utf-8');
      expect(content).toContain('fallbackHandler');
      expect(content).toContain('Using fallback handler');
    });
  });

  describe('2.4 Enhanced Cloud Chat Agent', () => {
    it('should have enhanced agent module', () => {
      const exists = fs.existsSync('/home/user/Hero/server/agents/enhancedCloudChatAgent.ts');
      expect(exists).toBe(true);
    });

    it('should have Zod validation schemas', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/enhancedCloudChatAgent.ts', 'utf-8');
      expect(content).toContain('EnhancedAgentConfigSchema');
      expect(content).toContain('ChatContextSchema');
      expect(content).toContain('UserMessageSchema');
    });

    it('should import Phase 1 services', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/enhancedCloudChatAgent.ts', 'utf-8');
      expect(content).toContain('agentMemoryService');
      expect(content).toContain('intelligentContextManager');
      expect(content).toContain('dynamicToolRegistry');
      expect(content).toContain('auditLogger');
    });

    it('should import Phase 2 services', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/enhancedCloudChatAgent.ts', 'utf-8');
      expect(content).toContain('selfReflectionService');
      expect(content).toContain('executionPatternLearner');
      expect(content).toContain('adaptiveAgentController');
    });

    it('should have EnhancedCloudChatAgent class', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/enhancedCloudChatAgent.ts', 'utf-8');
      expect(content).toContain('export class EnhancedCloudChatAgent');
      expect(content).toContain('processMessage');
    });

    it('should export createEnhancedAgent factory', () => {
      const content = fs.readFileSync('/home/user/Hero/server/agents/enhancedCloudChatAgent.ts', 'utf-8');
      expect(content).toContain('export function createEnhancedAgent');
    });
  });

  describe('2.5 Database Schema', () => {
    it('should have agent memory tables in schema', () => {
      const content = fs.readFileSync('/home/user/Hero/drizzle/schema.ts', 'utf-8');
      expect(content).toContain('agentMemoryShortTerm');
      expect(content).toContain('agentMemoryLongTerm');
    });

    it('should have audit logs table in schema', () => {
      const content = fs.readFileSync('/home/user/Hero/drizzle/schema.ts', 'utf-8');
      expect(content).toContain('auditLogs');
    });

    it('should have execution state tables in schema', () => {
      const content = fs.readFileSync('/home/user/Hero/drizzle/schema.ts', 'utf-8');
      expect(content).toContain('executionState');
      expect(content).toContain('executionCheckpoints');
    });

    it('should have pattern cache table in schema', () => {
      const content = fs.readFileSync('/home/user/Hero/drizzle/schema.ts', 'utf-8');
      expect(content).toContain('patternCache');
    });

    it('should have migration file', () => {
      const exists = fs.existsSync('/home/user/Hero/drizzle/migrations/0001_add_agent_memory_tables.sql');
      expect(exists).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should import feature flags router without errors', async () => {
      const module = await import('../routers/featureFlags');
      expect(module.featureFlagsRouter).toBeDefined();
      expect(module.getFeatureFlags).toBeDefined();
      expect(module.isFeatureEnabled).toBeDefined();
    });

    it('should import enhanced agent router without errors', async () => {
      const module = await import('../routers/enhancedAgent');
      expect(module.enhancedAgentRouter).toBeDefined();
    });

    it('should have all routers registered', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers.ts', 'utf-8');
      // Core routers
      expect(content).toContain('chatAgent: chatAgentRouter');
      expect(content).toContain('cloudSandbox: cloudSandboxRouter');
      expect(content).toContain('cloudExecution: cloudExecutionStreamRouter');
      // Phase 2 routers
      expect(content).toContain('featureFlags: featureFlagsRouter');
      expect(content).toContain('enhancedAgent: enhancedAgentRouter');
    });
  });
});
