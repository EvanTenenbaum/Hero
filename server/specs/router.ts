/**
 * Specs tRPC Router
 * Sprint 3: Prompt-to-Plan Workflow
 * 
 * CRUD operations for feature specifications with EARS format requirements.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { specs, specVersions, specCardLinks, specComments } from "../../drizzle/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { generateEarsRequirements, formatRequirementsAsMarkdown, type GeneratedSpec } from "./earsGenerator";

// Zod schemas for validation
const requirementSchema = z.object({
  id: z.string(),
  type: z.enum(["ubiquitous", "event_driven", "state_driven", "optional", "complex"]),
  text: z.string(),
  rationale: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional()
});

const uiMockupSchema = z.object({
  name: z.string(),
  description: z.string(),
  imageUrl: z.string().optional()
});

const createSpecInput = z.object({
  projectId: z.number(),
  title: z.string().min(1).max(500),
  overview: z.string().optional(),
  requirements: z.array(requirementSchema).optional(),
  technicalDesign: z.string().optional(),
  dataModel: z.string().optional(),
  apiDesign: z.string().optional(),
  uiMockups: z.array(uiMockupSchema).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  estimatedHours: z.number().optional(),
  parentSpecId: z.number().optional()
});

const updateSpecInput = z.object({
  id: z.number(),
  title: z.string().min(1).max(500).optional(),
  overview: z.string().optional(),
  requirements: z.array(requirementSchema).optional(),
  technicalDesign: z.string().optional(),
  dataModel: z.string().optional(),
  apiDesign: z.string().optional(),
  uiMockups: z.array(uiMockupSchema).optional(),
  status: z.enum(["draft", "review", "approved", "implemented", "archived"]).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  completionPercentage: z.number().min(0).max(100).optional()
});

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 255);
}

export const specsRouter = router({
  // Create a new spec
  create: protectedProcedure
    .input(createSpecInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const slug = generateSlug(input.title);
      
      const [result] = await db.insert(specs).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        title: input.title,
        slug,
        overview: input.overview,
        requirements: input.requirements,
        technicalDesign: input.technicalDesign,
        dataModel: input.dataModel,
        apiDesign: input.apiDesign,
        uiMockups: input.uiMockups,
        priority: input.priority || "medium",
        estimatedHours: input.estimatedHours,
        parentSpecId: input.parentSpecId,
        status: "draft",
        currentVersion: 1
      });
      
      const specId = result.insertId;
      
      // Create initial version
      await db.insert(specVersions).values({
        specId,
        version: 1,
        title: input.title,
        overview: input.overview,
        requirements: input.requirements,
        technicalDesign: input.technicalDesign,
        dataModel: input.dataModel,
        apiDesign: input.apiDesign,
        changeType: "created",
        changeSummary: "Initial creation",
        changedBy: ctx.user.id
      });
      
      return { id: specId, slug };
    }),

  // Get a spec by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [spec] = await db.select().from(specs).where(eq(specs.id, input.id));
      
      if (!spec) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Spec not found" });
      }
      
      return spec;
    }),

  // List specs for a project
  list: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      status: z.enum(["draft", "review", "approved", "implemented", "archived"]).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      let conditions = [eq(specs.projectId, input.projectId)];
      
      if (input.status) {
        conditions.push(eq(specs.status, input.status));
      }
      
      if (input.search) {
        conditions.push(
          or(
            like(specs.title, `%${input.search}%`),
            like(specs.overview, `%${input.search}%`)
          )!
        );
      }
      
      const results = await db
        .select()
        .from(specs)
        .where(and(...conditions))
        .orderBy(desc(specs.updatedAt))
        .limit(input.limit)
        .offset(input.offset);
      
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(specs)
        .where(and(...conditions));
      
      return {
        specs: results,
        total: countResult?.count || 0
      };
    }),

  // Update a spec
  update: protectedProcedure
    .input(updateSpecInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { id, ...updates } = input;
      
      // Get current spec
      const [currentSpec] = await db.select().from(specs).where(eq(specs.id, id));
      if (!currentSpec) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Spec not found" });
      }
      
      // Increment version if content changed
      const contentChanged = 
        updates.title !== undefined ||
        updates.overview !== undefined ||
        updates.requirements !== undefined ||
        updates.technicalDesign !== undefined ||
        updates.dataModel !== undefined ||
        updates.apiDesign !== undefined;
      
      const newVersion = contentChanged ? currentSpec.currentVersion + 1 : currentSpec.currentVersion;
      
      // Update spec
      await db.update(specs)
        .set({
          ...updates,
          currentVersion: newVersion
        })
        .where(eq(specs.id, id));
      
      // Create version record if content changed
      if (contentChanged) {
        const changeType = updates.status !== currentSpec.status ? "status_change" : "updated";
        await db.insert(specVersions).values({
          specId: id,
          version: newVersion,
          title: updates.title || currentSpec.title,
          overview: updates.overview ?? currentSpec.overview,
          requirements: updates.requirements ?? currentSpec.requirements,
          technicalDesign: updates.technicalDesign ?? currentSpec.technicalDesign,
          dataModel: updates.dataModel ?? currentSpec.dataModel,
          apiDesign: updates.apiDesign ?? currentSpec.apiDesign,
          changeType,
          changeSummary: `Updated to version ${newVersion}`,
          changedBy: ctx.user.id
        });
      }
      
      return { success: true, version: newVersion };
    }),

  // Delete a spec (soft delete by archiving)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(specs)
        .set({ status: "archived" })
        .where(eq(specs.id, input.id));
      
      return { success: true };
    }),

  // Generate spec from prompt using EARS
  generateFromPrompt: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      prompt: z.string().min(10),
      projectContext: z.string().optional(),
      existingFeatures: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      autoSave: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      const generated = await generateEarsRequirements(input.prompt, {
        projectContext: input.projectContext,
        existingFeatures: input.existingFeatures,
        constraints: input.constraints
      });
      
      // Auto-save if requested
      if (input.autoSave) {
        const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const slug = generateSlug(generated.title);
        
        const [result] = await db.insert(specs).values({
          projectId: input.projectId,
          userId: ctx.user.id,
          title: generated.title,
          slug,
          overview: generated.overview,
          requirements: generated.requirements,
          technicalDesign: generated.technicalConsiderations,
          status: "draft",
          currentVersion: 1
        });
        
        await db.insert(specVersions).values({
          specId: result.insertId,
          version: 1,
          title: generated.title,
          overview: generated.overview,
          requirements: generated.requirements,
          technicalDesign: generated.technicalConsiderations,
          changeType: "created",
          changeSummary: "Generated from prompt",
          changedBy: ctx.user.id
        });
        
        return {
          ...generated,
          saved: true,
          specId: result.insertId
        };
      }
      
      return { ...generated, saved: false };
    }),

  // Get spec as Markdown
  getAsMarkdown: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [spec] = await db.select().from(specs).where(eq(specs.id, input.id));
      
      if (!spec) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Spec not found" });
      }
      
      const generatedSpec: GeneratedSpec = {
        title: spec.title,
        overview: spec.overview || "",
        requirements: (spec.requirements as any) || [],
        technicalConsiderations: spec.technicalDesign || undefined,
        outOfScope: [],
        assumptions: []
      };
      
      return formatRequirementsAsMarkdown(generatedSpec);
    }),

  // Get version history
  getVersionHistory: protectedProcedure
    .input(z.object({ specId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const versions = await db
        .select()
        .from(specVersions)
        .where(eq(specVersions.specId, input.specId))
        .orderBy(desc(specVersions.version));
      
      return versions;
    }),

  // Get specific version
  getVersion: protectedProcedure
    .input(z.object({ specId: z.number(), version: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [version] = await db
        .select()
        .from(specVersions)
        .where(
          and(
            eq(specVersions.specId, input.specId),
            eq(specVersions.version, input.version)
          )
        );
      
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      }
      
      return version;
    }),

  // Link spec to kanban card
  linkToCard: protectedProcedure
    .input(z.object({
      specId: z.number(),
      cardId: z.number(),
      linkType: z.enum(["implements", "blocks", "related"]).default("implements")
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      // Check if link already exists
      const [existing] = await db
        .select()
        .from(specCardLinks)
        .where(
          and(
            eq(specCardLinks.specId, input.specId),
            eq(specCardLinks.cardId, input.cardId)
          )
        );
      
      if (existing) {
        // Update link type
        await db.update(specCardLinks)
          .set({ linkType: input.linkType })
          .where(eq(specCardLinks.id, existing.id));
        return { id: existing.id, updated: true };
      }
      
      const [result] = await db.insert(specCardLinks).values({
        specId: input.specId,
        cardId: input.cardId,
        linkType: input.linkType
      });
      
      return { id: result.insertId, updated: false };
    }),

  // Unlink spec from card
  unlinkFromCard: protectedProcedure
    .input(z.object({ specId: z.number(), cardId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(specCardLinks)
        .where(
          and(
            eq(specCardLinks.specId, input.specId),
            eq(specCardLinks.cardId, input.cardId)
          )
        );
      
      return { success: true };
    }),

  // Get linked cards for a spec
  getLinkedCards: protectedProcedure
    .input(z.object({ specId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const links = await db
        .select()
        .from(specCardLinks)
        .where(eq(specCardLinks.specId, input.specId));
      
      return links;
    }),

  // Add comment to spec
  addComment: protectedProcedure
    .input(z.object({
      specId: z.number(),
      content: z.string().min(1),
      parentCommentId: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [result] = await db.insert(specComments).values({
        specId: input.specId,
        userId: ctx.user.id,
        content: input.content,
        parentCommentId: input.parentCommentId
      });
      
      return { id: result.insertId };
    }),

  // Get comments for a spec
  getComments: protectedProcedure
    .input(z.object({ specId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const comments = await db
        .select()
        .from(specComments)
        .where(eq(specComments.specId, input.specId))
        .orderBy(specComments.createdAt);
      
      return comments;
    }),

  // Resolve/unresolve comment
  toggleCommentResolved: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [comment] = await db
        .select()
        .from(specComments)
        .where(eq(specComments.id, input.commentId));
      
      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }
      
      await db.update(specComments)
        .set({ resolved: !comment.resolved })
        .where(eq(specComments.id, input.commentId));
      
      return { resolved: !comment.resolved };
    })
});
