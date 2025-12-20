/**
 * Context Builder Module
 * 
 * Assembles context for agent prompts from various sources.
 * Manages token budgets and prioritizes relevant information.
 */

import { PromptContext } from './promptTemplates';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface ContextSource {
  type: 'project' | 'file' | 'conversation' | 'note' | 'user_rule' | 'session';
  priority: number; // Higher = more important
  content: string;
  tokens: number;
  metadata?: Record<string, unknown>;
}

export interface ContextBudget {
  maxTokens: number;
  reservedForResponse: number;
  reservedForTools: number;
  availableForContext: number;
}

export interface BuiltContext {
  prompt: PromptContext;
  sources: ContextSource[];
  totalTokens: number;
  truncated: boolean;
  truncatedSources: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER CLASS
// ════════════════════════════════════════════════════════════════════════════

export class ContextBuilder {
  private sources: ContextSource[] = [];
  private budget: ContextBudget;
  
  constructor(maxTokens: number = 8000) {
    this.budget = {
      maxTokens,
      reservedForResponse: 2000,
      reservedForTools: 1000,
      availableForContext: maxTokens - 3000,
    };
  }
  
  /**
   * Set the token budget
   */
  setBudget(budget: Partial<ContextBudget>): void {
    this.budget = { ...this.budget, ...budget };
    this.budget.availableForContext = 
      this.budget.maxTokens - this.budget.reservedForResponse - this.budget.reservedForTools;
  }
  
  /**
   * Add a context source
   */
  addSource(source: Omit<ContextSource, 'tokens'>): void {
    const tokens = this.estimateTokens(source.content);
    this.sources.push({ ...source, tokens });
  }
  
  /**
   * Add project context
   */
  addProjectContext(project: {
    name: string;
    description?: string;
    techStack?: string[];
    conventions?: string;
  }): void {
    const content = [
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : null,
      project.techStack?.length ? `Tech Stack: ${project.techStack.join(', ')}` : null,
      project.conventions ? `Conventions: ${project.conventions}` : null,
    ].filter(Boolean).join('\n');
    
    this.addSource({
      type: 'project',
      priority: 100, // High priority
      content,
      metadata: project,
    });
  }
  
  /**
   * Add file context
   */
  addFileContext(path: string, content: string, relevance: number = 50): void {
    this.addSource({
      type: 'file',
      priority: relevance,
      content: `File: ${path}\n\`\`\`\n${content}\n\`\`\``,
      metadata: { path },
    });
  }
  
  /**
   * Add multiple files by path (without content, just for reference)
   */
  addFiles(paths: string[]): void {
    if (paths.length === 0) return;
    
    this.addSource({
      type: 'file',
      priority: 40, // Lower priority than file content
      content: `Referenced Files:\n${paths.map(p => `- ${p}`).join('\n')}`,
      metadata: { paths },
    });
  }
  
  /**
   * Add conversation context
   */
  addConversationContext(messages: Array<{ role: string; content: string }>, summary?: string): void {
    if (summary) {
      this.addSource({
        type: 'conversation',
        priority: 80,
        content: `Conversation Summary: ${summary}`,
      });
    }
    
    // Add recent messages (last 5)
    const recentMessages = messages.slice(-5);
    if (recentMessages.length > 0) {
      const content = recentMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n');
      
      this.addSource({
        type: 'conversation',
        priority: 90,
        content: `Recent Messages:\n${content}`,
      });
    }
  }
  
  /**
   * Add project notes
   */
  addNotes(notes: Array<{ title: string; content: string; category: string }>): void {
    for (const note of notes) {
      this.addSource({
        type: 'note',
        priority: 60,
        content: `[${note.category}] ${note.title}: ${note.content}`,
        metadata: note,
      });
    }
  }
  
  /**
   * Add user rules
   */
  addUserRules(rules: string[]): void {
    if (rules.length === 0) return;
    
    this.addSource({
      type: 'user_rule',
      priority: 95, // Very high priority - user rules are important
      content: `User Rules:\n${rules.map(r => `- ${r}`).join('\n')}`,
    });
  }
  
  /**
   * Add session context
   */
  addSessionContext(session: {
    recentActions?: string[];
    openFiles?: string[];
    currentTask?: string;
  }): void {
    const parts: string[] = [];
    
    if (session.currentTask) {
      parts.push(`Current Task: ${session.currentTask}`);
    }
    
    if (session.recentActions?.length) {
      parts.push(`Recent Actions:\n${session.recentActions.map(a => `- ${a}`).join('\n')}`);
    }
    
    if (session.openFiles?.length) {
      parts.push(`Open Files:\n${session.openFiles.map(f => `- ${f}`).join('\n')}`);
    }
    
    if (parts.length > 0) {
      this.addSource({
        type: 'session',
        priority: 85,
        content: parts.join('\n\n'),
      });
    }
  }
  
  /**
   * Build the final context within token budget
   */
  build(): BuiltContext {
    // Sort sources by priority (highest first)
    const sortedSources = [...this.sources].sort((a, b) => b.priority - a.priority);
    
    const includedSources: ContextSource[] = [];
    const truncatedSources: string[] = [];
    let totalTokens = 0;
    
    // Include sources until budget is exhausted
    for (const source of sortedSources) {
      if (totalTokens + source.tokens <= this.budget.availableForContext) {
        includedSources.push(source);
        totalTokens += source.tokens;
      } else {
        truncatedSources.push(source.type);
      }
    }
    
    // Build the prompt context
    const prompt = this.buildPromptContext(includedSources);
    
    return {
      prompt,
      sources: includedSources,
      totalTokens,
      truncated: truncatedSources.length > 0,
      truncatedSources,
    };
  }
  
  /**
   * Build PromptContext from included sources
   */
  private buildPromptContext(sources: ContextSource[]): PromptContext {
    const context: PromptContext = {};
    
    // Extract project context
    const projectSource = sources.find(s => s.type === 'project');
    if (projectSource?.metadata) {
      context.project = projectSource.metadata as PromptContext['project'];
    }
    
    // Extract user rules
    const rulesSource = sources.find(s => s.type === 'user_rule');
    if (rulesSource) {
      const rules = rulesSource.content
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2));
      
      context.user = { preferences: '', customRules: rules };
    }
    
    // Extract session context
    const sessionSource = sources.find(s => s.type === 'session');
    if (sessionSource) {
      context.session = {
        recentActions: [],
        openFiles: [],
      };
      
      // Parse recent actions
      const actionsMatch = sessionSource.content.match(/Recent Actions:\n([\s\S]*?)(?=\n\n|$)/);
      if (actionsMatch) {
        context.session.recentActions = actionsMatch[1]
          .split('\n')
          .filter(line => line.startsWith('- '))
          .map(line => line.substring(2));
      }
      
      // Parse open files
      const filesMatch = sessionSource.content.match(/Open Files:\n([\s\S]*?)(?=\n\n|$)/);
      if (filesMatch) {
        context.session.openFiles = filesMatch[1]
          .split('\n')
          .filter(line => line.startsWith('- '))
          .map(line => line.substring(2));
      }
    }
    
    // Extract conversation summary
    const conversationSource = sources.find(s => s.type === 'conversation' && s.content.startsWith('Conversation Summary:'));
    if (conversationSource && context.session) {
      context.session.conversationSummary = conversationSource.content.replace('Conversation Summary: ', '');
    }
    
    return context;
  }
  
  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Clear all sources
   */
  clear(): void {
    this.sources = [];
  }
  
  /**
   * Get current token usage
   */
  getTokenUsage(): { used: number; available: number; percentage: number } {
    const used = this.sources.reduce((sum, s) => sum + s.tokens, 0);
    return {
      used,
      available: this.budget.availableForContext,
      percentage: Math.round((used / this.budget.availableForContext) * 100),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create a new context builder
 */
export function createContextBuilder(maxTokens?: number): ContextBuilder {
  return new ContextBuilder(maxTokens);
}

/**
 * Quick context build for simple cases
 */
export function buildQuickContext(options: {
  project?: { name: string; description?: string; techStack?: string[] };
  userRules?: string[];
  currentTask?: string;
  maxTokens?: number;
}): BuiltContext {
  const builder = new ContextBuilder(options.maxTokens);
  
  if (options.project) {
    builder.addProjectContext(options.project);
  }
  
  if (options.userRules) {
    builder.addUserRules(options.userRules);
  }
  
  if (options.currentTask) {
    builder.addSessionContext({ currentTask: options.currentTask });
  }
  
  return builder.build();
}
