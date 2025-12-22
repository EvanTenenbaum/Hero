import { mysqlTable, varchar, text, int, timestamp, json } from "drizzle-orm/mysql-core";
import { projects } from "./schema";

// Store kickoff wizard responses
export const projectKickoff = mysqlTable("project_kickoff", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  
  // Step 1: North Star
  purpose: text("purpose"),
  targetUser: text("target_user"),
  problemSolved: text("problem_solved"),
  successMetrics: json("success_metrics"), // Array of strings
  nonGoals: json("non_goals"), // Array of strings
  
  // Step 2: Product Brief
  userStories: json("user_stories"), // Array of {role, action, value}
  mvpIncluded: json("mvp_included"), // Array of strings
  mvpExcluded: json("mvp_excluded"), // Array of strings
  uxPrinciples: json("ux_principles"), // Array of strings
  
  // Step 3: Architecture
  techStack: json("tech_stack"), // {frontend, backend, database, other}
  entities: json("entities"), // Array of {name, relationships}
  integrations: json("integrations"), // Array of strings
  constraints: json("constraints"), // Array of strings
  
  // Step 4: Quality Bar
  ciGates: json("ci_gates"), // Array of strings
  testingStrategy: json("testing_strategy"), // {unit, contract, e2e}
  regressionPolicy: json("regression_policy"), // Array of strings
  
  // Step 5: Slice Map
  slices: json("slices"), // Array of {name, userCan, proves}
  
  // Metadata
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Store generated specification documents
export const projectDocs = mysqlTable("project_docs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  docType: varchar("doc_type", { length: 64 }).notNull(), // 'north-star', 'product-brief', 'architecture', 'quality-bar', 'slice-map', 'agent-brief'
  content: text("content").notNull(), // Markdown content
  version: int("version").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Types for kickoff wizard data
export interface KickoffWizardData {
  northStar: {
    purpose: string;
    targetUser: string;
    problemSolved: string;
    successMetrics: string[];
    nonGoals: string[];
  };
  productBrief: {
    userStories: { role: string; action: string; value: string }[];
    mvpIncluded: string[];
    mvpExcluded: string[];
    uxPrinciples: string[];
  };
  architecture: {
    techStack: { frontend: string; backend: string; database: string; other: string };
    entities: { name: string; relationships: string[] }[];
    integrations: string[];
    constraints: string[];
  };
  qualityBar: {
    ciGates: string[];
    testingStrategy: { unit: string; contract: string; e2e: string };
    regressionPolicy: string[];
  };
  sliceMap: {
    slices: { name: string; userCan: string; proves?: string }[];
  };
}

export type ProjectKickoff = typeof projectKickoff.$inferSelect;
export type InsertProjectKickoff = typeof projectKickoff.$inferInsert;
export type ProjectDoc = typeof projectDocs.$inferSelect;
export type InsertProjectDoc = typeof projectDocs.$inferInsert;
