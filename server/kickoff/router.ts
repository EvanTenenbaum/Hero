import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  saveKickoffData,
  getKickoffData,
  generateSpecDocs,
  getProjectDocs,
  updateProjectDoc,
} from "./kickoffService";
import { KickoffWizardData } from "../../drizzle/kickoff-schema";

// Zod schemas for validation
const northStarSchema = z.object({
  purpose: z.string(),
  targetUser: z.string(),
  problemSolved: z.string(),
  successMetrics: z.array(z.string()),
  nonGoals: z.array(z.string()),
});

const userStorySchema = z.object({
  role: z.string(),
  action: z.string(),
  value: z.string(),
});

const productBriefSchema = z.object({
  userStories: z.array(userStorySchema),
  mvpIncluded: z.array(z.string()),
  mvpExcluded: z.array(z.string()),
  uxPrinciples: z.array(z.string()),
});

const techStackSchema = z.object({
  frontend: z.string(),
  backend: z.string(),
  database: z.string(),
  other: z.string(),
});

const entitySchema = z.object({
  name: z.string(),
  relationships: z.array(z.string()),
});

const architectureSchema = z.object({
  techStack: techStackSchema,
  entities: z.array(entitySchema),
  integrations: z.array(z.string()),
  constraints: z.array(z.string()),
});

const testingStrategySchema = z.object({
  unit: z.string(),
  contract: z.string(),
  e2e: z.string(),
});

const qualityBarSchema = z.object({
  ciGates: z.array(z.string()),
  testingStrategy: testingStrategySchema,
  regressionPolicy: z.array(z.string()),
});

const sliceSchema = z.object({
  name: z.string(),
  userCan: z.string(),
  proves: z.string().optional(),
});

const sliceMapSchema = z.object({
  slices: z.array(sliceSchema),
});

const kickoffWizardDataSchema = z.object({
  northStar: northStarSchema.optional(),
  productBrief: productBriefSchema.optional(),
  architecture: architectureSchema.optional(),
  qualityBar: qualityBarSchema.optional(),
  sliceMap: sliceMapSchema.optional(),
});

export const kickoffRouter = router({
  // Save wizard step data
  saveStep: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      step: z.number().min(1).max(5),
      data: kickoffWizardDataSchema,
    }))
    .mutation(async ({ input }) => {
      const { projectId, step, data } = input;
      return await saveKickoffData(projectId, data as Partial<KickoffWizardData>, step);
    }),

  // Get kickoff data for a project
  getData: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      return await getKickoffData(input.projectId);
    }),

  // Generate all specification documents
  generateDocs: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const data = await getKickoffData(input.projectId);
      if (!data) {
        throw new Error("No kickoff data found for this project");
      }
      return await generateSpecDocs(input.projectId, data);
    }),

  // Get all docs for a project
  getDocs: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      return await getProjectDocs(input.projectId);
    }),

  // Update a specific document
  updateDoc: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      docType: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await updateProjectDoc(input.projectId, input.docType, input.content);
    }),
});
