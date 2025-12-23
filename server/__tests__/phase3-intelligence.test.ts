/**
 * Phase 3 Intelligence Tests - KIRO-inspired Features
 *
 * Red Hat QA tests for:
 * - HERO Steering service
 * - HERO Hooks system
 * - Multi-stage specs integration
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Phase 3: Intelligence & Expansion', () => {

  describe('3.1 HERO Steering Service', () => {
    it('should have steering service module', () => {
      const exists = fs.existsSync('/home/user/Hero/server/steering/steeringService.ts');
      expect(exists).toBe(true);
    });

    it('should export SteeringConfig interface', () => {
      const content = fs.readFileSync('/home/user/Hero/server/steering/steeringService.ts', 'utf-8');
      expect(content).toContain('export interface SteeringConfig');
      expect(content).toContain('product: ProductSteering');
      expect(content).toContain('techStack: TechStackSteering');
      expect(content).toContain('requirements: RequirementsSteering');
      expect(content).toContain('agents: AgentsSteering');
    });

    it('should export ProductSteering interface', () => {
      const content = fs.readFileSync('/home/user/Hero/server/steering/steeringService.ts', 'utf-8');
      expect(content).toContain('export interface ProductSteering');
      expect(content).toContain('name: string');
      expect(content).toContain('goals: string[]');
      expect(content).toContain('targetUsers: string[]');
    });

    it('should export TechStackSteering interface', () => {
      const content = fs.readFileSync('/home/user/Hero/server/steering/steeringService.ts', 'utf-8');
      expect(content).toContain('export interface TechStackSteering');
      expect(content).toContain('languages: string[]');
      expect(content).toContain('frameworks: string[]');
      expect(content).toContain('conventions:');
    });

    it('should export readSteeringConfig function', () => {
      const content = fs.readFileSync('/home/user/Hero/server/steering/steeringService.ts', 'utf-8');
      expect(content).toContain('export function readSteeringConfig');
    });

    it('should export generateSteeringContext function', () => {
      const content = fs.readFileSync('/home/user/Hero/server/steering/steeringService.ts', 'utf-8');
      expect(content).toContain('export function generateSteeringContext');
    });

    it('should support .hero/steering directory structure', () => {
      const content = fs.readFileSync('/home/user/Hero/server/steering/steeringService.ts', 'utf-8');
      expect(content).toContain('.hero');
      expect(content).toContain('steering');
      expect(content).toContain('product.md');
      expect(content).toContain('tech-stack.md');
      expect(content).toContain('requirements.md');
      expect(content).toContain('agents.md');
    });

    it('should have steering router', () => {
      const exists = fs.existsSync('/home/user/Hero/server/steering/router.ts');
      expect(exists).toBe(true);
    });

    it('should be registered in main routers', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers.ts', 'utf-8');
      expect(content).toContain("import { steeringRouter } from './steering/router'");
      expect(content).toContain('steering: steeringRouter');
    });
  });

  describe('3.2 HERO Hooks System', () => {
    it('should have hooks service module', () => {
      const exists = fs.existsSync('/home/user/Hero/server/hooks/hooksService.ts');
      expect(exists).toBe(true);
    });

    it('should export HookType type', () => {
      const content = fs.readFileSync('/home/user/Hero/server/hooks/hooksService.ts', 'utf-8');
      expect(content).toContain('export type HookType');
      expect(content).toContain('pre_execution');
      expect(content).toContain('post_execution');
      expect(content).toContain('on_file_change');
      expect(content).toContain('on_error');
      expect(content).toContain('on_approval_required');
    });

    it('should export HookActionType type', () => {
      const content = fs.readFileSync('/home/user/Hero/server/hooks/hooksService.ts', 'utf-8');
      expect(content).toContain('export type HookActionType');
      expect(content).toContain('validate');
      expect(content).toContain('transform');
      expect(content).toContain('notify');
      expect(content).toContain('guard');
    });

    it('should export Hook interface', () => {
      const content = fs.readFileSync('/home/user/Hero/server/hooks/hooksService.ts', 'utf-8');
      expect(content).toContain('export interface Hook');
      expect(content).toContain('name: string');
      expect(content).toContain('type: HookType');
      expect(content).toContain('actionType: HookActionType');
      expect(content).toContain('priority: number');
    });

    it('should have default safety hooks', () => {
      const content = fs.readFileSync('/home/user/Hero/server/hooks/hooksService.ts', 'utf-8');
      expect(content).toContain('security_guard');
      expect(content).toContain('force_push_guard');
      expect(content).toContain('execution_logger');
    });

    it('should export runHooks function', () => {
      const content = fs.readFileSync('/home/user/Hero/server/hooks/hooksService.ts', 'utf-8');
      expect(content).toContain('export async function runHooks');
    });

    it('should export registerHook function', () => {
      const content = fs.readFileSync('/home/user/Hero/server/hooks/hooksService.ts', 'utf-8');
      expect(content).toContain('export function registerHook');
    });

    it('should have hooks router', () => {
      const exists = fs.existsSync('/home/user/Hero/server/hooks/router.ts');
      expect(exists).toBe(true);
    });

    it('should have CRUD operations in hooks router', () => {
      const content = fs.readFileSync('/home/user/Hero/server/hooks/router.ts', 'utf-8');
      expect(content).toContain('list: protectedProcedure');
      expect(content).toContain('get: protectedProcedure');
      expect(content).toContain('create: protectedProcedure');
      expect(content).toContain('update: protectedProcedure');
      expect(content).toContain('delete: protectedProcedure');
    });

    it('should have test endpoint in hooks router', () => {
      const content = fs.readFileSync('/home/user/Hero/server/hooks/router.ts', 'utf-8');
      expect(content).toContain('test: protectedProcedure');
    });

    it('should be registered in main routers', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers.ts', 'utf-8');
      expect(content).toContain("import { hooksRouter } from './hooks/router'");
      expect(content).toContain('hooks: hooksRouter');
    });
  });

  describe('3.3 Feature Flags Integration', () => {
    it('should have KIRO-inspired feature flags', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/featureFlags.ts', 'utf-8');
      expect(content).toContain('enableSteering: boolean');
      expect(content).toContain('enableSpecs: boolean');
      expect(content).toContain('enableHooks: boolean');
    });

    it('should have environment variable overrides for KIRO features', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers/featureFlags.ts', 'utf-8');
      expect(content).toContain('HERO_ENABLE_STEERING');
      expect(content).toContain('HERO_ENABLE_SPECS');
      expect(content).toContain('HERO_ENABLE_HOOKS');
    });
  });

  describe('3.4 Multi-Stage Specs', () => {
    it('should have specs router with phase support', () => {
      const content = fs.readFileSync('/home/user/Hero/server/specs/router.ts', 'utf-8');
      expect(content).toContain('phase:');
      expect(content).toContain('advancePhase');
    });

    it('should have design phase endpoints', () => {
      const content = fs.readFileSync('/home/user/Hero/server/specs/router.ts', 'utf-8');
      expect(content).toContain('analyzeCodebase');
      expect(content).toContain('generateDesign');
      expect(content).toContain('getDesignAsMarkdown');
    });

    it('should have tasks phase endpoints', () => {
      const content = fs.readFileSync('/home/user/Hero/server/specs/router.ts', 'utf-8');
      expect(content).toContain('breakdownIntoTasks');
      expect(content).toContain('getTaskBreakdownAsMarkdown');
      expect(content).toContain('createCardsFromSpec');
    });

    it('should have implementation phase endpoints', () => {
      const content = fs.readFileSync('/home/user/Hero/server/specs/router.ts', 'utf-8');
      expect(content).toContain('getImplementationProgress');
    });
  });

  describe('Integration Tests', () => {
    it('should import steering service without errors', async () => {
      const module = await import('../steering/steeringService');
      expect(module.readSteeringConfig).toBeDefined();
      expect(module.generateSteeringContext).toBeDefined();
    });

    it('should import hooks service without errors', async () => {
      const module = await import('../hooks/hooksService');
      expect(module.runHooks).toBeDefined();
      expect(module.registerHook).toBeDefined();
      expect(module.listHooks).toBeDefined();
    });

    it('should import steering router without errors', async () => {
      const module = await import('../steering/router');
      expect(module.steeringRouter).toBeDefined();
    });

    it('should import hooks router without errors', async () => {
      const module = await import('../hooks/router');
      expect(module.hooksRouter).toBeDefined();
    });

    it('should have all Phase 3 routers registered', () => {
      const content = fs.readFileSync('/home/user/Hero/server/routers.ts', 'utf-8');
      expect(content).toContain('steering: steeringRouter');
      expect(content).toContain('hooks: hooksRouter');
      expect(content).toContain('specs: specsRouter');
      expect(content).toContain('featureFlags: featureFlagsRouter');
    });
  });
});
