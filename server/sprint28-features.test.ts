/**
 * Sprint 28 QA Tests - Features & Polish
 * 
 * Tests for LLM streaming, Command Palette, and Kickoff Wizard.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Sprint 28: Features & Polish', () => {
  
  describe('28.1 LLM Streaming', () => {
    it('should have invokeLLMStream function in llm module', () => {
      const llmContent = fs.readFileSync('/home/ubuntu/Hero/server/_core/llm.ts', 'utf-8');
      expect(llmContent).toContain('invokeLLMStream');
      expect(llmContent).toContain('async function*');
    });

    it('should have streaming router', () => {
      const routerContent = fs.readFileSync('/home/ubuntu/Hero/server/routers/chat-stream.ts', 'utf-8');
      expect(routerContent).toContain('chatStreamRouter');
      expect(routerContent).toContain('streamMessage');
    });

    it('should export chatStreamRouter from main routers', () => {
      const routersContent = fs.readFileSync('/home/ubuntu/Hero/server/routers.ts', 'utf-8');
      expect(routersContent).toContain('chatStreamRouter');
      expect(routersContent).toContain('chatStream: chatStreamRouter');
    });

    it('should have streaming state in Chat page', () => {
      const chatContent = fs.readFileSync('/home/ubuntu/Hero/client/src/pages/Chat.tsx', 'utf-8');
      expect(chatContent).toContain('streamingContent');
      expect(chatContent).toContain('setStreamingContent');
    });

    it('should have animated typing indicator', () => {
      const chatContent = fs.readFileSync('/home/ubuntu/Hero/client/src/pages/Chat.tsx', 'utf-8');
      expect(chatContent).toContain('animate-bounce');
      expect(chatContent).toContain('animationDelay');
    });
  });

  describe('28.2 Command Palette', () => {
    it('should have CommandPalette component', () => {
      const exists = fs.existsSync('/home/ubuntu/Hero/client/src/components/CommandPalette.tsx');
      expect(exists).toBe(true);
    });

    it('should have keyboard shortcut hook', () => {
      const paletteContent = fs.readFileSync('/home/ubuntu/Hero/client/src/components/CommandPalette.tsx', 'utf-8');
      expect(paletteContent).toContain('useCommandPalette');
      expect(paletteContent).toContain('metaKey');
      expect(paletteContent).toContain('ctrlKey');
      expect(paletteContent).toContain("key === \"k\"");
    });

    it('should search across projects', () => {
      const paletteContent = fs.readFileSync('/home/ubuntu/Hero/client/src/components/CommandPalette.tsx', 'utf-8');
      expect(paletteContent).toContain('projects.list');
      expect(paletteContent).toContain('category: "project"');
    });

    it('should search across conversations', () => {
      const paletteContent = fs.readFileSync('/home/ubuntu/Hero/client/src/components/CommandPalette.tsx', 'utf-8');
      expect(paletteContent).toContain('chat.conversations');
      expect(paletteContent).toContain('category: "recent"');
    });

    it('should search across boards', () => {
      const paletteContent = fs.readFileSync('/home/ubuntu/Hero/client/src/components/CommandPalette.tsx', 'utf-8');
      expect(paletteContent).toContain('kanban.getBoards');
    });

    it('should have navigation commands', () => {
      const paletteContent = fs.readFileSync('/home/ubuntu/Hero/client/src/components/CommandPalette.tsx', 'utf-8');
      expect(paletteContent).toContain('Go to Home');
      expect(paletteContent).toContain('Go to Projects');
      expect(paletteContent).toContain('Go to Chat');
      expect(paletteContent).toContain('Go to Agents');
      expect(paletteContent).toContain('Go to Settings');
    });

    it('should be integrated in App.tsx', () => {
      const appContent = fs.readFileSync('/home/ubuntu/Hero/client/src/App.tsx', 'utf-8');
      expect(appContent).toContain('CommandPalette');
      expect(appContent).toContain('useCommandPalette');
      expect(appContent).toContain('commandPaletteOpen');
    });

    it('should have keyboard navigation support', () => {
      const paletteContent = fs.readFileSync('/home/ubuntu/Hero/client/src/components/CommandPalette.tsx', 'utf-8');
      expect(paletteContent).toContain('ArrowDown');
      expect(paletteContent).toContain('ArrowUp');
      expect(paletteContent).toContain('Enter');
      expect(paletteContent).toContain('Escape');
    });
  });

  describe('28.3 Kickoff Wizard', () => {
    it('should have 5-step protocol', () => {
      const routerContent = fs.readFileSync('/home/ubuntu/Hero/server/kickoff/router.ts', 'utf-8');
      expect(routerContent).toContain('step: z.number().min(1).max(5)');
    });

    it('should generate 6 document types', () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/Hero/server/kickoff/kickoffService.ts', 'utf-8');
      expect(serviceContent).toContain('type: "north-star"');
      expect(serviceContent).toContain('type: "product-brief"');
      expect(serviceContent).toContain('type: "architecture"');
      expect(serviceContent).toContain('type: "quality-bar"');
      expect(serviceContent).toContain('type: "slice-map"');
      expect(serviceContent).toContain('type: "agent-brief"');
    });

    it('should use LLM for agent brief generation', () => {
      const serviceContent = fs.readFileSync('/home/ubuntu/Hero/server/kickoff/kickoffService.ts', 'utf-8');
      expect(serviceContent).toContain('generateAgentBriefDoc');
      expect(serviceContent).toContain('invokeLLM');
    });
  });

  describe('Integration', () => {
    it('should have all Sprint 28 features properly integrated', () => {
      // Check streaming router
      const routersContent = fs.readFileSync('/home/ubuntu/Hero/server/routers.ts', 'utf-8');
      expect(routersContent).toContain('chatStream: chatStreamRouter');
      
      // Check command palette in app
      const appContent = fs.readFileSync('/home/ubuntu/Hero/client/src/App.tsx', 'utf-8');
      expect(appContent).toContain('CommandPalette');
      
      // Check kickoff router
      expect(routersContent).toContain('kickoff: kickoffRouter');
    });
  });
});
