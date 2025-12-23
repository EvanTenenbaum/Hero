/**
 * HERO Steering Service
 *
 * KIRO-inspired project steering system that reads from .hero/steering/ directory.
 * Provides project-level configuration and agent behavior customization.
 *
 * Steering files format (similar to .kiro/steering/):
 * - product.md: Product context and goals
 * - tech-stack.md: Technology stack and conventions
 * - requirements.md: General requirements and constraints
 * - agents.md: Agent-specific configurations
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { logger } from '../_core/logger';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface SteeringConfig {
  product: ProductSteering;
  techStack: TechStackSteering;
  requirements: RequirementsSteering;
  agents: AgentsSteering;
}

export interface ProductSteering {
  name: string;
  description: string;
  goals: string[];
  targetUsers: string[];
  nonGoals?: string[];
}

export interface TechStackSteering {
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloudServices?: string[];
  conventions: {
    naming: string;
    codeStyle: string;
    testingApproach: string;
    documentation: string;
  };
}

export interface RequirementsSteering {
  functional: string[];
  nonFunctional: string[];
  constraints: string[];
  securityRequirements?: string[];
  performanceTargets?: string[];
}

export interface AgentsSteering {
  globalRules: string[];
  pm?: AgentConfig;
  developer?: AgentConfig;
  qa?: AgentConfig;
  devops?: AgentConfig;
  research?: AgentConfig;
}

export interface AgentConfig {
  enabled: boolean;
  customRules?: string[];
  focusAreas?: string[];
  restrictions?: string[];
}

// Default configuration
const DEFAULT_STEERING: SteeringConfig = {
  product: {
    name: 'Untitled Project',
    description: '',
    goals: [],
    targetUsers: [],
  },
  techStack: {
    languages: ['TypeScript'],
    frameworks: [],
    databases: [],
    conventions: {
      naming: 'camelCase for variables, PascalCase for types',
      codeStyle: 'ESLint/Prettier defaults',
      testingApproach: 'Unit tests with Vitest',
      documentation: 'JSDoc comments for public APIs',
    },
  },
  requirements: {
    functional: [],
    nonFunctional: [],
    constraints: [],
  },
  agents: {
    globalRules: [],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// PARSING UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Parse a markdown file into structured data.
 * Supports headings (#, ##) and bullet points (-).
 */
function parseMarkdownToSections(content: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let currentSection = 'default';
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for heading
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      currentSection = headingMatch[1].toLowerCase().replace(/\s+/g, '_');
      if (!sections.has(currentSection)) {
        sections.set(currentSection, []);
      }
      continue;
    }

    // Check for bullet point
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const value = trimmed.slice(1).trim();
      if (value) {
        const sectionArray = sections.get(currentSection) || [];
        sectionArray.push(value);
        sections.set(currentSection, sectionArray);
      }
      continue;
    }

    // Regular text - add to current section
    if (trimmed) {
      const sectionArray = sections.get(currentSection) || [];
      sectionArray.push(trimmed);
      sections.set(currentSection, sectionArray);
    }
  }

  return sections;
}

/**
 * Parse product.md file.
 */
function parseProductFile(content: string): ProductSteering {
  const sections = parseMarkdownToSections(content);

  return {
    name: sections.get('name')?.[0] || sections.get('project_name')?.[0] || DEFAULT_STEERING.product.name,
    description: sections.get('description')?.join(' ') || sections.get('default')?.join(' ') || '',
    goals: sections.get('goals') || sections.get('objectives') || [],
    targetUsers: sections.get('target_users') || sections.get('users') || [],
    nonGoals: sections.get('non_goals') || sections.get('non-goals') || [],
  };
}

/**
 * Parse tech-stack.md file.
 */
function parseTechStackFile(content: string): TechStackSteering {
  const sections = parseMarkdownToSections(content);

  return {
    languages: sections.get('languages') || sections.get('programming_languages') || DEFAULT_STEERING.techStack.languages,
    frameworks: sections.get('frameworks') || [],
    databases: sections.get('databases') || sections.get('data_stores') || [],
    cloudServices: sections.get('cloud_services') || sections.get('cloud') || [],
    conventions: {
      naming: sections.get('naming')?.[0] || sections.get('naming_conventions')?.[0] || DEFAULT_STEERING.techStack.conventions.naming,
      codeStyle: sections.get('code_style')?.[0] || sections.get('style')?.[0] || DEFAULT_STEERING.techStack.conventions.codeStyle,
      testingApproach: sections.get('testing')?.[0] || sections.get('testing_approach')?.[0] || DEFAULT_STEERING.techStack.conventions.testingApproach,
      documentation: sections.get('documentation')?.[0] || DEFAULT_STEERING.techStack.conventions.documentation,
    },
  };
}

/**
 * Parse requirements.md file.
 */
function parseRequirementsFile(content: string): RequirementsSteering {
  const sections = parseMarkdownToSections(content);

  return {
    functional: sections.get('functional') || sections.get('functional_requirements') || [],
    nonFunctional: sections.get('non_functional') || sections.get('non-functional') || sections.get('nfrs') || [],
    constraints: sections.get('constraints') || [],
    securityRequirements: sections.get('security') || sections.get('security_requirements') || [],
    performanceTargets: sections.get('performance') || sections.get('performance_targets') || [],
  };
}

/**
 * Parse agents.md file.
 */
function parseAgentsFile(content: string): AgentsSteering {
  const sections = parseMarkdownToSections(content);

  const parseAgentConfig = (name: string): AgentConfig | undefined => {
    const enabledSection = sections.get(name);
    if (!enabledSection) return undefined;

    return {
      enabled: true,
      customRules: sections.get(`${name}_rules`) || [],
      focusAreas: sections.get(`${name}_focus`) || [],
      restrictions: sections.get(`${name}_restrictions`) || [],
    };
  };

  return {
    globalRules: sections.get('global_rules') || sections.get('all_agents') || [],
    pm: parseAgentConfig('pm'),
    developer: parseAgentConfig('developer'),
    qa: parseAgentConfig('qa'),
    devops: parseAgentConfig('devops'),
    research: parseAgentConfig('research'),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// STEERING SERVICE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Cache for steering configurations (per project path).
 */
const steeringCache = new Map<string, { config: SteeringConfig; mtime: number }>();

/**
 * Read steering configuration from a project directory.
 */
export function readSteeringConfig(projectPath: string): SteeringConfig {
  const steeringDir = path.join(projectPath, '.hero', 'steering');

  // Check cache
  const cached = steeringCache.get(projectPath);
  if (cached) {
    // Check if files have been modified
    try {
      const stats = fs.statSync(steeringDir);
      if (stats.mtimeMs <= cached.mtime) {
        return cached.config;
      }
    } catch {
      // Directory doesn't exist, use cached or default
    }
  }

  // Check if steering directory exists
  if (!fs.existsSync(steeringDir)) {
    logger.debug({ projectPath }, 'No .hero/steering directory found, using defaults');
    return DEFAULT_STEERING;
  }

  let config: SteeringConfig = { ...DEFAULT_STEERING };

  try {
    // Read product.md
    const productPath = path.join(steeringDir, 'product.md');
    if (fs.existsSync(productPath)) {
      const content = fs.readFileSync(productPath, 'utf-8');
      config.product = parseProductFile(content);
    }

    // Read tech-stack.md
    const techStackPath = path.join(steeringDir, 'tech-stack.md');
    if (fs.existsSync(techStackPath)) {
      const content = fs.readFileSync(techStackPath, 'utf-8');
      config.techStack = parseTechStackFile(content);
    }

    // Read requirements.md
    const requirementsPath = path.join(steeringDir, 'requirements.md');
    if (fs.existsSync(requirementsPath)) {
      const content = fs.readFileSync(requirementsPath, 'utf-8');
      config.requirements = parseRequirementsFile(content);
    }

    // Read agents.md
    const agentsPath = path.join(steeringDir, 'agents.md');
    if (fs.existsSync(agentsPath)) {
      const content = fs.readFileSync(agentsPath, 'utf-8');
      config.agents = parseAgentsFile(content);
    }

    // Cache the config
    const stats = fs.statSync(steeringDir);
    steeringCache.set(projectPath, { config, mtime: stats.mtimeMs });

    logger.info({ projectPath }, 'Loaded steering configuration');

  } catch (error) {
    logger.warn({ error, projectPath }, 'Error reading steering configuration');
  }

  return config;
}

/**
 * Generate steering context for an agent prompt.
 */
export function generateSteeringContext(config: SteeringConfig, agentType: string): string {
  const lines: string[] = [];

  // Product context
  lines.push('## Project Context');
  lines.push(`**Project:** ${config.product.name}`);
  if (config.product.description) {
    lines.push(`**Description:** ${config.product.description}`);
  }
  if (config.product.goals.length > 0) {
    lines.push('\n**Goals:**');
    config.product.goals.forEach(goal => lines.push(`- ${goal}`));
  }
  if (config.product.nonGoals && config.product.nonGoals.length > 0) {
    lines.push('\n**Non-Goals (avoid these):**');
    config.product.nonGoals.forEach(ng => lines.push(`- ${ng}`));
  }

  // Tech stack context
  lines.push('\n## Technical Context');
  lines.push(`**Languages:** ${config.techStack.languages.join(', ')}`);
  if (config.techStack.frameworks.length > 0) {
    lines.push(`**Frameworks:** ${config.techStack.frameworks.join(', ')}`);
  }
  if (config.techStack.databases.length > 0) {
    lines.push(`**Databases:** ${config.techStack.databases.join(', ')}`);
  }

  // Conventions
  lines.push('\n**Coding Conventions:**');
  lines.push(`- Naming: ${config.techStack.conventions.naming}`);
  lines.push(`- Style: ${config.techStack.conventions.codeStyle}`);
  lines.push(`- Testing: ${config.techStack.conventions.testingApproach}`);

  // Requirements/constraints
  if (config.requirements.constraints.length > 0) {
    lines.push('\n## Constraints');
    config.requirements.constraints.forEach(c => lines.push(`- ${c}`));
  }

  // Security requirements
  if (config.requirements.securityRequirements && config.requirements.securityRequirements.length > 0) {
    lines.push('\n## Security Requirements');
    config.requirements.securityRequirements.forEach(s => lines.push(`- ${s}`));
  }

  // Agent-specific rules
  lines.push('\n## Agent Rules');

  // Global rules
  if (config.agents.globalRules.length > 0) {
    lines.push('**All Agents:**');
    config.agents.globalRules.forEach(r => lines.push(`- ${r}`));
  }

  // Agent-specific rules
  const agentConfig = config.agents[agentType as keyof AgentsSteering];
  if (agentConfig && typeof agentConfig === 'object' && 'customRules' in agentConfig) {
    if (agentConfig.customRules && agentConfig.customRules.length > 0) {
      lines.push(`\n**${agentType.toUpperCase()} Agent:**`);
      agentConfig.customRules.forEach(r => lines.push(`- ${r}`));
    }
    if (agentConfig.focusAreas && agentConfig.focusAreas.length > 0) {
      lines.push('\n**Focus Areas:**');
      agentConfig.focusAreas.forEach(f => lines.push(`- ${f}`));
    }
    if (agentConfig.restrictions && agentConfig.restrictions.length > 0) {
      lines.push('\n**Restrictions:**');
      agentConfig.restrictions.forEach(r => lines.push(`- ⚠️ ${r}`));
    }
  }

  return lines.join('\n');
}

/**
 * Initialize steering directory with template files.
 */
export function initializeSteeringDirectory(projectPath: string, projectName: string): void {
  const steeringDir = path.join(projectPath, '.hero', 'steering');

  // Create directories
  fs.mkdirSync(steeringDir, { recursive: true });

  // Create product.md
  fs.writeFileSync(path.join(steeringDir, 'product.md'), `# ${projectName}

## Description
Describe your project here.

## Goals
- Goal 1
- Goal 2

## Target Users
- User type 1
- User type 2

## Non-Goals
- Things explicitly out of scope
`);

  // Create tech-stack.md
  fs.writeFileSync(path.join(steeringDir, 'tech-stack.md'), `# Technology Stack

## Languages
- TypeScript

## Frameworks
- React
- Node.js

## Databases
- PostgreSQL

## Naming
camelCase for variables, PascalCase for types/classes

## Code Style
ESLint with Prettier

## Testing
Unit tests with Vitest, E2E with Playwright

## Documentation
JSDoc comments for public APIs
`);

  // Create requirements.md
  fs.writeFileSync(path.join(steeringDir, 'requirements.md'), `# Requirements

## Functional
- Core feature 1
- Core feature 2

## Non-Functional
- Response time under 200ms
- 99.9% uptime

## Constraints
- Must be compatible with modern browsers
- Must work offline

## Security
- All data must be encrypted at rest
- OWASP top 10 compliance
`);

  // Create agents.md
  fs.writeFileSync(path.join(steeringDir, 'agents.md'), `# Agent Configuration

## Global Rules
- Always write TypeScript, never JavaScript
- Include unit tests for new code
- Follow existing code patterns

## Developer
- Focus on clean, maintainable code
- Use dependency injection patterns

## Developer Rules
- Prefer functional components in React
- Use Zod for runtime validation

## QA
- Focus on edge cases and error handling

## QA Rules
- Test both happy path and error scenarios
- Include integration tests for APIs
`);

  logger.info({ projectPath }, 'Initialized .hero/steering directory');
}

/**
 * Clear steering cache for a project.
 */
export function clearSteeringCache(projectPath?: string): void {
  if (projectPath) {
    steeringCache.delete(projectPath);
  } else {
    steeringCache.clear();
  }
}
