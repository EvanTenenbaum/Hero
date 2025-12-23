import { getDb } from "../db";
import { projectKickoff, projectDocs, KickoffWizardData, InsertProjectKickoff, InsertProjectDoc } from "../../drizzle/kickoff-schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// Save kickoff wizard data
export async function saveKickoffData(
  projectId: number,
  data: Partial<KickoffWizardData>,
  step: number
): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [existing] = await db.select().from(projectKickoff).where(eq(projectKickoff.projectId, projectId)).limit(1);

  const kickoffData: Partial<InsertProjectKickoff> = {
    projectId,
  };

  // Map step data to database fields
  if (step === 1 && data.northStar) {
    kickoffData.purpose = data.northStar.purpose;
    kickoffData.targetUser = data.northStar.targetUser;
    kickoffData.problemSolved = data.northStar.problemSolved;
    kickoffData.successMetrics = data.northStar.successMetrics;
    kickoffData.nonGoals = data.northStar.nonGoals;
  }

  if (step === 2 && data.productBrief) {
    kickoffData.userStories = data.productBrief.userStories;
    kickoffData.mvpIncluded = data.productBrief.mvpIncluded;
    kickoffData.mvpExcluded = data.productBrief.mvpExcluded;
    kickoffData.uxPrinciples = data.productBrief.uxPrinciples;
  }

  if (step === 3 && data.architecture) {
    kickoffData.techStack = data.architecture.techStack;
    kickoffData.entities = data.architecture.entities;
    kickoffData.integrations = data.architecture.integrations;
    kickoffData.constraints = data.architecture.constraints;
  }

  if (step === 4 && data.qualityBar) {
    kickoffData.ciGates = data.qualityBar.ciGates;
    kickoffData.testingStrategy = data.qualityBar.testingStrategy;
    kickoffData.regressionPolicy = data.qualityBar.regressionPolicy;
  }

  if (step === 5 && data.sliceMap) {
    kickoffData.slices = data.sliceMap.slices;
    kickoffData.completedAt = new Date();
  }

  if (existing) {
    await db.update(projectKickoff)
      .set(kickoffData)
      .where(eq(projectKickoff.id, existing.id));
    return { id: existing.id };
  } else {
    const result = await db.insert(projectKickoff).values(kickoffData as InsertProjectKickoff);
    return { id: result[0].insertId };
  }
}

// Get kickoff data for a project
export async function getKickoffData(projectId: number): Promise<KickoffWizardData | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [kickoff] = await db.select().from(projectKickoff).where(eq(projectKickoff.projectId, projectId)).limit(1);

  if (!kickoff) return null;

  return {
    northStar: {
      purpose: kickoff.purpose || "",
      targetUser: kickoff.targetUser || "",
      problemSolved: kickoff.problemSolved || "",
      successMetrics: (kickoff.successMetrics as string[]) || [],
      nonGoals: (kickoff.nonGoals as string[]) || [],
    },
    productBrief: {
      userStories: (kickoff.userStories as { role: string; action: string; value: string }[]) || [],
      mvpIncluded: (kickoff.mvpIncluded as string[]) || [],
      mvpExcluded: (kickoff.mvpExcluded as string[]) || [],
      uxPrinciples: (kickoff.uxPrinciples as string[]) || [],
    },
    architecture: {
      techStack: (kickoff.techStack as { frontend: string; backend: string; database: string; other: string }) || { frontend: "", backend: "", database: "", other: "" },
      entities: (kickoff.entities as { name: string; relationships: string[] }[]) || [],
      integrations: (kickoff.integrations as string[]) || [],
      constraints: (kickoff.constraints as string[]) || [],
    },
    qualityBar: {
      ciGates: (kickoff.ciGates as string[]) || [],
      testingStrategy: (kickoff.testingStrategy as { unit: string; contract: string; e2e: string }) || { unit: "", contract: "", e2e: "" },
      regressionPolicy: (kickoff.regressionPolicy as string[]) || [],
    },
    sliceMap: {
      slices: (kickoff.slices as { name: string; userCan: string; proves?: string }[]) || [],
    },
  };
}

// Generate specification documents from kickoff data
export async function generateSpecDocs(
  projectId: number,
  data: KickoffWizardData
): Promise<{ docs: { type: string; content: string }[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const docs: { type: string; content: string }[] = [];

  // Generate North Star document
  const northStarContent = generateNorthStarDoc(data);
  docs.push({ type: "north-star", content: northStarContent });

  // Generate Product Brief document
  const productBriefContent = generateProductBriefDoc(data);
  docs.push({ type: "product-brief", content: productBriefContent });

  // Generate Architecture document
  const architectureContent = generateArchitectureDoc(data);
  docs.push({ type: "architecture", content: architectureContent });

  // Generate Quality Bar document
  const qualityBarContent = generateQualityBarDoc(data);
  docs.push({ type: "quality-bar", content: qualityBarContent });

  // Generate Slice Map document
  const sliceMapContent = generateSliceMapDoc(data);
  docs.push({ type: "slice-map", content: sliceMapContent });

  // Generate Agent Brief document
  const agentBriefContent = await generateAgentBriefDoc(data);
  docs.push({ type: "agent-brief", content: agentBriefContent });

  // Save all documents to database
  for (const doc of docs) {
    // Check if doc already exists
    const [existing] = await db.select().from(projectDocs)
      .where(and(eq(projectDocs.projectId, projectId), eq(projectDocs.docType, doc.type)))
      .limit(1);

    if (existing) {
      await db.update(projectDocs)
        .set({ content: doc.content, version: (existing.version || 1) + 1 })
        .where(eq(projectDocs.id, existing.id));
    } else {
      await db.insert(projectDocs).values({
        projectId,
        docType: doc.type,
        content: doc.content,
        version: 1,
      });
    }
  }

  return { docs };
}

// Generate North Star document
function generateNorthStarDoc(data: KickoffWizardData): string {
  const { northStar } = data;
  
  return `# North Star

## Purpose
${northStar.purpose}

## Target User
${northStar.targetUser}

## Problem Solved
${northStar.problemSolved}

## Success Metrics
${northStar.successMetrics.map(m => `- ${m}`).join("\n")}

## Non-Goals (What We're NOT Building)
${northStar.nonGoals.map(g => `- ${g}`).join("\n")}

---

*This document defines the hard constraints and invariants for this project. All development decisions should align with these principles.*
`;
}

// Generate Product Brief document
function generateProductBriefDoc(data: KickoffWizardData): string {
  const { productBrief } = data;
  
  const userStoriesText = productBrief.userStories.map((story, i) => 
    `${i + 1}. As a **${story.role}**, I can **${story.action}** so that **${story.value}**`
  ).join("\n");

  return `# Product Brief

## User Stories
${userStoriesText}

## MVP Boundary

### Included in MVP
${productBrief.mvpIncluded.map(item => `- ${item}`).join("\n")}

### Excluded from MVP (Future)
${productBrief.mvpExcluded.map(item => `- ${item}`).join("\n")}

## UX Principles
${productBrief.uxPrinciples.map(p => `- ${p}`).join("\n")}

---

*This document defines the product scope and user experience guidelines.*
`;
}

// Generate Architecture document
function generateArchitectureDoc(data: KickoffWizardData): string {
  const { architecture } = data;
  
  const entitiesText = architecture.entities.map(entity => 
    `- **${entity.name}**: ${entity.relationships.join(", ")}`
  ).join("\n");

  return `# Architecture

## Tech Stack
- **Frontend:** ${architecture.techStack.frontend}
- **Backend:** ${architecture.techStack.backend}
- **Database:** ${architecture.techStack.database}
- **Other:** ${architecture.techStack.other}

## Data Model

### Entities
${entitiesText}

## External Integrations
${architecture.integrations.map(i => `- ${i}`).join("\n")}

## Architectural Constraints
${architecture.constraints.map(c => `- ${c}`).join("\n")}

---

*This document defines the technical architecture and system boundaries.*
`;
}

// Generate Quality Bar document
function generateQualityBarDoc(data: KickoffWizardData): string {
  const { qualityBar } = data;

  return `# Quality Bar

## CI Gates (Required Before Merge)
${qualityBar.ciGates.map(gate => `- [x] ${gate}`).join("\n")}

## Testing Strategy
- **Unit Tests:** ${qualityBar.testingStrategy.unit}
- **Contract Tests:** ${qualityBar.testingStrategy.contract}
- **E2E Tests:** ${qualityBar.testingStrategy.e2e}

## Regression Policy
${qualityBar.regressionPolicy.map(p => `- ${p}`).join("\n")}

---

*This document defines the quality standards and testing requirements.*
`;
}

// Generate Slice Map document
function generateSliceMapDoc(data: KickoffWizardData): string {
  const { sliceMap } = data;

  const slicesText = sliceMap.slices.map((slice, i) => 
    `### Slice ${i + 1}: ${slice.name}
- **User Can:** ${slice.userCan}
${slice.proves ? `- **Proves:** ${slice.proves}` : ""}`
  ).join("\n\n");

  return `# Slice Map

## Vertical Slices (Prioritized)

${slicesText}

---

*Each slice represents a complete vertical feature that can be developed and tested independently.*
`;
}

// Generate Agent Brief document using LLM
async function generateAgentBriefDoc(data: KickoffWizardData): Promise<string> {
  const { northStar, productBrief, architecture, qualityBar, sliceMap } = data;

  // Use LLM to generate a comprehensive agent brief
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert at creating operating instructions for AI coding agents. Generate a concise, actionable agent brief document based on the project specifications provided. The document should include:
1. Project context summary
2. Key constraints and invariants
3. Coding standards to follow
4. Verification requirements
5. Decision-making guidelines
Format as Markdown.`
        },
        {
          role: "user",
          content: `Generate an agent brief for this project:

**Purpose:** ${northStar.purpose}
**Target User:** ${northStar.targetUser}
**Problem:** ${northStar.problemSolved}

**Tech Stack:** ${JSON.stringify(architecture.techStack)}
**Constraints:** ${architecture.constraints.join(", ")}

**CI Gates:** ${qualityBar.ciGates.join(", ")}
**Testing Strategy:** ${JSON.stringify(qualityBar.testingStrategy)}

**MVP Features:** ${productBrief.mvpIncluded.join(", ")}
**Non-Goals:** ${northStar.nonGoals.join(", ")}

**First Slices:** ${sliceMap.slices.slice(0, 3).map(s => s.name).join(", ")}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    return typeof content === 'string' ? content : generateFallbackAgentBrief(data);
  } catch (error) {
    console.error("Failed to generate agent brief with LLM:", error);
    return generateFallbackAgentBrief(data);
  }
}

// Fallback agent brief if LLM fails
function generateFallbackAgentBrief(data: KickoffWizardData): string {
  const { northStar, architecture, qualityBar } = data;

  return `# Agent Brief

## Project Context
${northStar.purpose}

## Target User
${northStar.targetUser}

## Key Constraints
${architecture.constraints.map(c => `- ${c}`).join("\n")}

## Non-Goals (Do NOT Implement)
${northStar.nonGoals.map(g => `- ${g}`).join("\n")}

## Coding Standards
- Follow ${architecture.techStack.frontend} best practices
- Use ${architecture.techStack.backend} patterns
- All code must pass: ${qualityBar.ciGates.join(", ")}

## Verification Requirements
- Unit tests for: ${qualityBar.testingStrategy.unit}
- Contract tests for: ${qualityBar.testingStrategy.contract}
- E2E tests for: ${qualityBar.testingStrategy.e2e}

## Decision Guidelines
1. When in doubt, ask for clarification
2. Prefer simple solutions over complex ones
3. Always verify against success metrics
4. Never implement non-goals

---

*This document provides operating instructions for AI agents working on this project.*
`;
}

// Get all docs for a project
export async function getProjectDocs(projectId: number): Promise<{ type: string; content: string; version: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  const docs = await db.select().from(projectDocs).where(eq(projectDocs.projectId, projectId));

  return docs.map(doc => ({
    type: doc.docType,
    content: doc.content,
    version: doc.version || 1,
  }));
}

// Update a specific document
export async function updateProjectDoc(
  projectId: number,
  docType: string,
  content: string
): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };
  
  const [existing] = await db.select().from(projectDocs)
    .where(and(eq(projectDocs.projectId, projectId), eq(projectDocs.docType, docType)))
    .limit(1);

  if (existing) {
    await db.update(projectDocs)
      .set({
        content,
        version: (existing.version || 1) + 1,
      })
      .where(eq(projectDocs.id, existing.id));
  } else {
    await db.insert(projectDocs).values({
      projectId,
      docType,
      content,
      version: 1,
    });
  }

  return { success: true };
}


// ════════════════════════════════════════════════════════════════════════════
// HERO MANIFEST GENERATION (Cloud Sandbox Protocol)
// ════════════════════════════════════════════════════════════════════════════

interface HeroManifest {
  version: string;
  buildCommand: string;
  testCommand: string;
  startCommand: string;
  forbiddenFiles: string[];
  allowedOperations: string[];
  techStack: {
    frontend?: string;
    backend?: string;
    database?: string;
  };
}

/**
 * Generate a .hero/manifest.json file for the project
 * This manifest guides agent behavior in the cloud sandbox
 */
export async function generateHeroManifest(
  projectId: number,
  data: KickoffWizardData
): Promise<HeroManifest> {
  const { architecture, qualityBar } = data;

  // Detect build/test/start commands based on tech stack
  const commands = detectCommands(architecture.techStack);

  // Generate manifest
  const manifest: HeroManifest = {
    version: "1.0.0",
    buildCommand: commands.build,
    testCommand: commands.test,
    startCommand: commands.start,
    forbiddenFiles: [
      ".env",
      ".env.local",
      ".env.production",
      "package-lock.json", // Prefer pnpm-lock.yaml
      "*.pem",
      "*.key",
      "secrets.json",
    ],
    allowedOperations: [
      "read",
      "write",
      "edit",
      "delete",
      "terminal",
      "git",
    ],
    techStack: {
      frontend: architecture.techStack.frontend || undefined,
      backend: architecture.techStack.backend || undefined,
      database: architecture.techStack.database || undefined,
    },
  };

  // Store manifest in database as a project doc
  const db = await getDb();
  if (db) {
    await updateProjectDoc(projectId, "hero-manifest", JSON.stringify(manifest, null, 2));
  }

  return manifest;
}

/**
 * Write manifest to sandbox filesystem
 */
export async function writeManifestToSandbox(
  sandbox: import('@e2b/code-interpreter').Sandbox,
  manifest: HeroManifest,
  repoPath: string
): Promise<void> {
  const manifestPath = `${repoPath}/.hero/manifest.json`;
  const manifestContent = JSON.stringify(manifest, null, 2);

  // Create .hero directory if it doesn't exist
  await sandbox.commands.run(`mkdir -p ${repoPath}/.hero`, { timeoutMs: 10000 });

  // Write manifest file
  await sandbox.files.write(manifestPath, manifestContent);

  console.debug(`Wrote .hero/manifest.json to sandbox`);
}

/**
 * Detect appropriate commands based on tech stack
 */
function detectCommands(techStack: { frontend?: string; backend?: string; database?: string; other?: string }): {
  build: string;
  test: string;
  start: string;
} {
  const frontend = (techStack.frontend || "").toLowerCase();
  const backend = (techStack.backend || "").toLowerCase();

  // Default commands
  let build = "npm run build";
  let test = "npm test";
  let start = "npm start";

  // Detect based on frontend framework
  if (frontend.includes("next")) {
    build = "npm run build";
    start = "npm run start";
  } else if (frontend.includes("vite") || frontend.includes("react")) {
    build = "npm run build";
    start = "npm run dev";
  } else if (frontend.includes("vue")) {
    build = "npm run build";
    start = "npm run serve";
  }

  // Detect based on backend framework
  if (backend.includes("express") || backend.includes("node")) {
    start = "npm run dev";
  } else if (backend.includes("python") || backend.includes("flask") || backend.includes("django")) {
    build = "pip install -r requirements.txt";
    test = "pytest";
    start = "python app.py";
  } else if (backend.includes("go")) {
    build = "go build";
    test = "go test ./...";
    start = "./main";
  }

  return { build, test, start };
}

/**
 * Load manifest from sandbox or database
 */
export async function loadHeroManifest(
  projectId: number,
  sandbox?: import('@e2b/code-interpreter').Sandbox,
  repoPath?: string
): Promise<HeroManifest | null> {
  // Try to load from sandbox first
  if (sandbox && repoPath) {
    try {
      const content = await sandbox.files.read(`${repoPath}/.hero/manifest.json`);
      return JSON.parse(content) as HeroManifest;
    } catch {
      // Manifest doesn't exist in sandbox, try database
    }
  }

  // Load from database
  const db = await getDb();
  if (!db) return null;

  const [doc] = await db.select().from(projectDocs)
    .where(and(eq(projectDocs.projectId, projectId), eq(projectDocs.docType, "hero-manifest")))
    .limit(1);

  if (doc) {
    try {
      return JSON.parse(doc.content) as HeroManifest;
    } catch {
      return null;
    }
  }

  return null;
}

// Export types
export type { HeroManifest };
