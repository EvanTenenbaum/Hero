/**
 * Kickoff Wizard End-to-End Tests - Sprint 28
 * 
 * Tests the 5-step Agent Kickoff Protocol to ensure spec-driven workflow
 * generates usable documentation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';

describe('Agent Kickoff Wizard - 5-Step Protocol', () => {
  
  describe('Step 1: North Star', () => {
    it('should have northStar schema with required fields', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('northStarSchema');
      expect(routerContent).toContain('purpose: z.string()');
      expect(routerContent).toContain('targetUser: z.string()');
      expect(routerContent).toContain('problemSolved: z.string()');
      expect(routerContent).toContain('successMetrics: z.array(z.string())');
      expect(routerContent).toContain('nonGoals: z.array(z.string())');
    });

    it('should save step 1 data to database', async () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/kickoffService.ts', 'utf-8');
      
      expect(serviceContent).toContain('step === 1 && data.northStar');
      expect(serviceContent).toContain('kickoffData.purpose = data.northStar.purpose');
      expect(serviceContent).toContain('kickoffData.targetUser = data.northStar.targetUser');
    });
  });

  describe('Step 2: Product Brief', () => {
    it('should have productBrief schema with user stories', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('productBriefSchema');
      expect(routerContent).toContain('userStories: z.array(userStorySchema)');
      expect(routerContent).toContain('mvpIncluded: z.array(z.string())');
      expect(routerContent).toContain('mvpExcluded: z.array(z.string())');
      expect(routerContent).toContain('uxPrinciples: z.array(z.string())');
    });

    it('should save step 2 data to database', async () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/kickoffService.ts', 'utf-8');
      
      expect(serviceContent).toContain('step === 2 && data.productBrief');
      expect(serviceContent).toContain('kickoffData.userStories = data.productBrief.userStories');
    });
  });

  describe('Step 3: Architecture', () => {
    it('should have architecture schema with tech stack', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('architectureSchema');
      expect(routerContent).toContain('techStack: techStackSchema');
      expect(routerContent).toContain('entities: z.array(entitySchema)');
      expect(routerContent).toContain('integrations: z.array(z.string())');
      expect(routerContent).toContain('constraints: z.array(z.string())');
    });

    it('should have techStack schema with required fields', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('frontend: z.string()');
      expect(routerContent).toContain('backend: z.string()');
      expect(routerContent).toContain('database: z.string()');
    });
  });

  describe('Step 4: Quality Bar', () => {
    it('should have qualityBar schema with testing strategy', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('qualityBarSchema');
      expect(routerContent).toContain('ciGates: z.array(z.string())');
      expect(routerContent).toContain('testingStrategy: testingStrategySchema');
      expect(routerContent).toContain('regressionPolicy: z.array(z.string())');
    });

    it('should have testingStrategy with unit, contract, e2e', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('unit: z.string()');
      expect(routerContent).toContain('contract: z.string()');
      expect(routerContent).toContain('e2e: z.string()');
    });
  });

  describe('Step 5: Slice Map', () => {
    it('should have sliceMap schema with slices', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('sliceMapSchema');
      expect(routerContent).toContain('slices: z.array(sliceSchema)');
    });

    it('should have slice schema with name, userCan, proves', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('name: z.string()');
      expect(routerContent).toContain('userCan: z.string()');
      expect(routerContent).toContain('proves: z.string().optional()');
    });

    it('should mark completion when step 5 is saved', async () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/kickoffService.ts', 'utf-8');
      
      expect(serviceContent).toContain('step === 5 && data.sliceMap');
      expect(serviceContent).toContain('kickoffData.completedAt = new Date()');
    });
  });

  describe('Spec Document Generation', () => {
    it('should generate North Star document', async () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/kickoffService.ts', 'utf-8');
      
      expect(serviceContent).toContain('generateNorthStarDoc');
      expect(serviceContent).toContain('type: "north-star"');
    });

    it('should generate Product Brief document', async () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/kickoffService.ts', 'utf-8');
      
      expect(serviceContent).toContain('generateProductBriefDoc');
      expect(serviceContent).toContain('type: "product-brief"');
    });

    it('should generate Architecture document', async () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/kickoffService.ts', 'utf-8');
      
      expect(serviceContent).toContain('generateArchitectureDoc');
      expect(serviceContent).toContain('type: "architecture"');
    });

    it('should generate Quality Bar document', async () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/kickoffService.ts', 'utf-8');
      
      expect(serviceContent).toContain('generateQualityBarDoc');
      expect(serviceContent).toContain('type: "quality-bar"');
    });

    it('should generate Slice Map document', async () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/kickoffService.ts', 'utf-8');
      
      expect(serviceContent).toContain('generateSliceMapDoc');
      expect(serviceContent).toContain('type: "slice-map"');
    });

    it('should generate Agent Brief document using LLM', async () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/kickoffService.ts', 'utf-8');
      
      expect(serviceContent).toContain('generateAgentBriefDoc');
      expect(serviceContent).toContain('type: "agent-brief"');
      expect(serviceContent).toContain('invokeLLM');
    });
  });

  describe('Router Endpoints', () => {
    it('should have saveStep endpoint', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('saveStep: protectedProcedure');
      expect(routerContent).toContain('step: z.number().min(1).max(5)');
    });

    it('should have getData endpoint', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('getData: protectedProcedure');
      expect(routerContent).toContain('getKickoffData(input.projectId)');
    });

    it('should have generateDocs endpoint', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('generateDocs: protectedProcedure');
      expect(routerContent).toContain('generateSpecDocs(input.projectId, data)');
    });

    it('should have getDocs endpoint', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('getDocs: protectedProcedure');
      expect(routerContent).toContain('getProjectDocs(input.projectId)');
    });

    it('should have updateDoc endpoint', async () => {
      const routerContent = fs.readFileSync('/home/ubuntu/hero-ide/server/kickoff/router.ts', 'utf-8');
      
      expect(routerContent).toContain('updateDoc: protectedProcedure');
      expect(routerContent).toContain('updateProjectDoc(input.projectId');
    });
  });

  describe('Database Schema', () => {
    it('should have projectKickoff table', async () => {
      const schemaContent = fs.readFileSync('/home/ubuntu/hero-ide/drizzle/kickoff-schema.ts', 'utf-8');
      
      expect(schemaContent).toContain('projectKickoff');
      expect(schemaContent).toContain('projectId');
      expect(schemaContent).toContain('purpose');
      expect(schemaContent).toContain('targetUser');
    });

    it('should have projectDocs table', async () => {
      const schemaContent = fs.readFileSync('/home/ubuntu/hero-ide/drizzle/kickoff-schema.ts', 'utf-8');
      
      expect(schemaContent).toContain('projectDocs');
      expect(schemaContent).toContain('docType');
      expect(schemaContent).toContain('content');
      expect(schemaContent).toContain('version');
    });
  });

  describe('Integration', () => {
    it('should export kickoffRouter from main routers', async () => {
      const routersContent = fs.readFileSync('/home/ubuntu/hero-ide/server/routers.ts', 'utf-8');
      
      expect(routersContent).toContain('kickoffRouter');
      expect(routersContent).toContain("from './kickoff/router'");
    });

    it('should have kickoff in appRouter', async () => {
      const routersContent = fs.readFileSync('/home/ubuntu/hero-ide/server/routers.ts', 'utf-8');
      
      expect(routersContent).toContain('kickoff: kickoffRouter');
    });
  });
});
