/**
 * Prompt Seeds Module - Sprint 1 Agent Beta
 * 
 * Seeds the database with default prompt templates.
 * Uses upsert logic to handle existing records.
 */

import { getDb } from '../db';
import { promptTemplates } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getAllDefaultPrompts } from '../agents/defaultPrompts';
import { AgentType, PromptTemplate } from '../agents/promptTemplates';

export interface SeedResult {
  total: number;
  inserted: number;
  updated: number;
  errors: string[];
}

/**
 * Seed all default prompt templates into the database
 */
export async function seedPromptTemplates(): Promise<SeedResult> {
  const result: SeedResult = {
    total: 0,
    inserted: 0,
    updated: 0,
    errors: [],
  };

  const prompts = getAllDefaultPrompts();
  result.total = prompts.length;

  const db = await getDb();
  if (!db) {
    result.errors.push('Database connection failed');
    return result;
  }

  for (const prompt of prompts) {
    try {
      // Check if this prompt already exists
      const existing = await db
        .select()
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.agentType, prompt.agentType),
            eq(promptTemplates.version, prompt.version)
          )
        );

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(promptTemplates)
          .set({
            identitySection: prompt.sections.identity,
            communicationSection: prompt.sections.communication,
            toolsSection: prompt.sections.tools,
            safetySection: prompt.sections.safety,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(promptTemplates.id, existing[0].id));
        
        result.updated++;
        console.debug(`Updated prompt template: ${prompt.agentType} v${prompt.version}`);
      } else {
        // Insert new record
        await db.insert(promptTemplates).values({
          agentType: prompt.agentType,
          version: prompt.version,
          identitySection: prompt.sections.identity,
          communicationSection: prompt.sections.communication,
          toolsSection: prompt.sections.tools,
          safetySection: prompt.sections.safety,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        result.inserted++;
        console.debug(`Inserted prompt template: ${prompt.agentType} v${prompt.version}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to seed ${prompt.agentType}: ${errorMessage}`);
      console.error(`Error seeding ${prompt.agentType}:`, error);
    }
  }

  console.debug(`Seed complete: ${result.inserted} inserted, ${result.updated} updated, ${result.errors.length} errors`);
  return result;
}

/**
 * Seed a single prompt template
 */
export async function seedSinglePrompt(prompt: PromptTemplate): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const existing = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.agentType, prompt.agentType),
          eq(promptTemplates.version, prompt.version)
        )
      );

    if (existing.length > 0) {
      await db
        .update(promptTemplates)
        .set({
          identitySection: prompt.sections.identity,
          communicationSection: prompt.sections.communication,
          toolsSection: prompt.sections.tools,
          safetySection: prompt.sections.safety,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(promptTemplates.id, existing[0].id));
    } else {
      await db.insert(promptTemplates).values({
        agentType: prompt.agentType,
        version: prompt.version,
        identitySection: prompt.sections.identity,
        communicationSection: prompt.sections.communication,
        toolsSection: prompt.sections.tools,
        safetySection: prompt.sections.safety,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return true;
  } catch (error) {
    console.error(`Error seeding prompt ${prompt.agentType}:`, error);
    return false;
  }
}

/**
 * Get the active prompt template for an agent type
 */
export async function getActivePromptTemplate(agentType: AgentType): Promise<PromptTemplate | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.agentType, agentType),
          eq(promptTemplates.isActive, true)
        )
      )
      .orderBy(promptTemplates.createdAt)
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const record = result[0];

    return {
      id: `${record.agentType}-v${record.version}`,
      agentType: record.agentType as AgentType,
      version: record.version,
      sections: {
        identity: record.identitySection,
        communication: record.communicationSection,
        tools: record.toolsSection,
        safety: record.safetySection,
      },
    };
  } catch (error) {
    console.error(`Error getting active prompt for ${agentType}:`, error);
    return null;
  }
}

/**
 * Deactivate all prompts for an agent type except the specified version
 */
export async function setActiveVersion(agentType: AgentType, version: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    // Deactivate all versions
    await db
      .update(promptTemplates)
      .set({ isActive: false })
      .where(eq(promptTemplates.agentType, agentType));

    // Activate the specified version
    await db
      .update(promptTemplates)
      .set({ isActive: true })
      .where(
        and(
          eq(promptTemplates.agentType, agentType),
          eq(promptTemplates.version, version)
        )
      );

    return true;
  } catch (error) {
    console.error(`Error setting active version for ${agentType}:`, error);
    return false;
  }
}
