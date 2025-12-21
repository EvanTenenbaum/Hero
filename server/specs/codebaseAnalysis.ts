/**
 * Codebase Analysis Service
 * Sprint 6: Prompt-to-Plan Workflow - Design Phase
 * 
 * Analyzes existing codebase to inform technical design decisions.
 * Detects patterns, schemas, APIs, and components for context-aware design.
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { contextChunks } from "../../drizzle/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface SchemaInfo {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
  }>;
  relations?: Array<{
    type: "one-to-one" | "one-to-many" | "many-to-many";
    targetTable: string;
    foreignKey: string;
  }>;
}

export interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description?: string;
  inputSchema?: string;
  outputSchema?: string;
  isProtected: boolean;
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  props?: string[];
  hooks?: string[];
  dependencies?: string[];
}

export interface CodebaseAnalysis {
  schemas: SchemaInfo[];
  apiEndpoints: APIEndpoint[];
  components: ComponentInfo[];
  patterns: {
    stateManagement?: string;
    styling?: string;
    routing?: string;
    authentication?: string;
    dataFetching?: string;
  };
  technologies: string[];
  fileStructure: {
    directories: string[];
    entryPoints: string[];
  };
}

export interface DesignRecommendation {
  dataModel: {
    newTables: SchemaInfo[];
    modifiedTables: Array<{
      tableName: string;
      changes: string[];
    }>;
    mermaidER: string;
  };
  apiDesign: {
    newEndpoints: APIEndpoint[];
    modifiedEndpoints: Array<{
      path: string;
      changes: string[];
    }>;
  };
  componentDesign: {
    newComponents: Array<{
      name: string;
      purpose: string;
      props: string[];
      location: string;
    }>;
    modifiedComponents: Array<{
      name: string;
      changes: string[];
    }>;
  };
  fileManifest: Array<{
    action: "create" | "modify" | "delete";
    path: string;
    description: string;
    estimatedLines?: number;
  }>;
  diagrams: Array<{
    type: "er" | "sequence" | "flow" | "class";
    title: string;
    mermaidCode: string;
  }>;
}

// ════════════════════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Analyze the codebase to extract schemas, APIs, and patterns
 */
export async function analyzeCodebase(projectId: number): Promise<CodebaseAnalysis> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  // Get indexed code chunks for the project
  const chunks = await db
    .select()
    .from(contextChunks)
    .where(eq(contextChunks.projectId, projectId))
    .orderBy(desc(contextChunks.updatedAt))
    .limit(500);

  // Categorize chunks by type
  const schemaChunks = chunks.filter(c => 
    c.filePath?.includes("schema") || 
    c.filePath?.includes("drizzle") ||
    c.chunkType === "class"
  );
  
  const routerChunks = chunks.filter(c => 
    c.filePath?.includes("router") || 
    c.filePath?.includes("routes") ||
    c.content?.includes("protectedProcedure") ||
    c.content?.includes("publicProcedure")
  );
  
  const componentChunks = chunks.filter(c => 
    c.filePath?.includes("/components/") || 
    c.filePath?.includes("/pages/") ||
    c.chunkType === "function" && c.content?.includes("return (")
  );

  // Extract schemas
  const schemas = extractSchemas(schemaChunks);
  
  // Extract API endpoints
  const apiEndpoints = extractAPIEndpoints(routerChunks);
  
  // Extract components
  const components = extractComponents(componentChunks);
  
  // Detect patterns
  const patterns = detectPatterns(chunks);
  
  // Extract technologies
  const technologies = detectTechnologies(chunks);
  
  // Build file structure
  const fileStructure = buildFileStructure(chunks);

  return {
    schemas,
    apiEndpoints,
    components,
    patterns,
    technologies,
    fileStructure
  };
}

/**
 * Extract schema information from code chunks
 */
function extractSchemas(chunks: typeof contextChunks.$inferSelect[]): SchemaInfo[] {
  const schemas: SchemaInfo[] = [];
  
  for (const chunk of chunks) {
    if (!chunk.content) continue;
    
    // Match Drizzle table definitions
    const tableMatch = chunk.content.match(/export const (\w+) = mysqlTable\("(\w+)",/);
    if (tableMatch) {
      const [, varName, tableName] = tableMatch;
      
      // Extract columns
      const columnMatches = Array.from(chunk.content.matchAll(/(\w+):\s*(int|varchar|text|boolean|timestamp|json|mysqlEnum)\([^)]*\)/g));
      const columns: SchemaInfo["columns"] = [];
      
      for (const match of columnMatches) {
        const [, name, type] = match;
        const isNullable = !chunk.content.includes(`${name}:`) || 
                          !chunk.content.substring(chunk.content.indexOf(`${name}:`)).includes(".notNull()");
        columns.push({
          name,
          type,
          nullable: isNullable
        });
      }
      
      schemas.push({
        tableName,
        columns
      });
    }
  }
  
  return schemas;
}

/**
 * Extract API endpoints from router chunks
 */
function extractAPIEndpoints(chunks: typeof contextChunks.$inferSelect[]): APIEndpoint[] {
  const endpoints: APIEndpoint[] = [];
  
  for (const chunk of chunks) {
    if (!chunk.content) continue;
    
    // Match tRPC procedures
    const procedureMatches = Array.from(chunk.content.matchAll(/(\w+):\s*(protectedProcedure|publicProcedure)\s*\n?\s*\.input\([^)]*\)\s*\n?\s*\.(query|mutation)/g));
    
    for (const match of procedureMatches) {
      const [, name, procedureType, methodType] = match;
      endpoints.push({
        method: methodType === "query" ? "GET" : "POST",
        path: `/api/trpc/${chunk.name || "unknown"}.${name}`,
        isProtected: procedureType === "protectedProcedure"
      });
    }
  }
  
  return endpoints;
}

/**
 * Extract component information from chunks
 */
function extractComponents(chunks: typeof contextChunks.$inferSelect[]): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  
  for (const chunk of chunks) {
    if (!chunk.content || !chunk.name) continue;
    
    // Match React component definitions
    if (chunk.content.includes("export") && 
        (chunk.content.includes("function") || chunk.content.includes("const")) &&
        chunk.content.includes("return (")) {
      
      // Extract hooks
      const hookMatches = Array.from(chunk.content.matchAll(/use\w+\(/g));
      const hooks = hookMatches.map(m => m[0].replace("(", ""));
      
      // Extract props
      const propsMatch = chunk.content.match(/\(\s*\{\s*([^}]+)\s*\}/);
      const props = propsMatch 
        ? propsMatch[1].split(",").map(p => p.trim().split(":")[0].trim())
        : [];
      
      components.push({
        name: chunk.name,
        filePath: chunk.filePath || "",
        props: props.filter(p => p.length > 0),
        hooks: Array.from(new Set(hooks))
      });
    }
  }
  
  return components;
}

/**
 * Detect common patterns in the codebase
 */
function detectPatterns(chunks: typeof contextChunks.$inferSelect[]): CodebaseAnalysis["patterns"] {
  const allContent = chunks.map(c => c.content || "").join("\n");
  
  return {
    stateManagement: allContent.includes("zustand") ? "Zustand" :
                     allContent.includes("redux") ? "Redux" :
                     allContent.includes("useContext") ? "React Context" : undefined,
    styling: allContent.includes("tailwind") ? "Tailwind CSS" :
             allContent.includes("styled-components") ? "Styled Components" :
             allContent.includes(".module.css") ? "CSS Modules" : undefined,
    routing: allContent.includes("wouter") ? "Wouter" :
             allContent.includes("react-router") ? "React Router" : undefined,
    authentication: allContent.includes("protectedProcedure") ? "tRPC Protected Procedures" :
                    allContent.includes("next-auth") ? "NextAuth" : undefined,
    dataFetching: allContent.includes("trpc") ? "tRPC" :
                  allContent.includes("react-query") ? "React Query" :
                  allContent.includes("swr") ? "SWR" : undefined
  };
}

/**
 * Detect technologies used in the codebase
 */
function detectTechnologies(chunks: typeof contextChunks.$inferSelect[]): string[] {
  const technologies = new Set<string>();
  const allContent = chunks.map(c => c.content || "").join("\n");
  
  if (allContent.includes("react")) technologies.add("React");
  if (allContent.includes("typescript") || chunks.some(c => c.filePath?.endsWith(".ts"))) technologies.add("TypeScript");
  if (allContent.includes("drizzle")) technologies.add("Drizzle ORM");
  if (allContent.includes("trpc")) technologies.add("tRPC");
  if (allContent.includes("tailwind")) technologies.add("Tailwind CSS");
  if (allContent.includes("vite")) technologies.add("Vite");
  if (allContent.includes("express")) technologies.add("Express");
  if (allContent.includes("mysql") || allContent.includes("tidb")) technologies.add("MySQL/TiDB");
  
  return Array.from(technologies);
}

/**
 * Build file structure from chunks
 */
function buildFileStructure(chunks: typeof contextChunks.$inferSelect[]): CodebaseAnalysis["fileStructure"] {
  const directories = new Set<string>();
  const entryPoints: string[] = [];
  
  for (const chunk of chunks) {
    if (!chunk.filePath) continue;
    
    // Extract directory
    const dir = chunk.filePath.substring(0, chunk.filePath.lastIndexOf("/"));
    if (dir) directories.add(dir);
    
    // Detect entry points
    if (chunk.filePath.includes("index.") || 
        chunk.filePath.includes("main.") ||
        chunk.filePath.includes("App.")) {
      entryPoints.push(chunk.filePath);
    }
  }
  
  return {
    directories: Array.from(directories).sort(),
    entryPoints: Array.from(new Set(entryPoints))
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DESIGN GENERATION
// ════════════════════════════════════════════════════════════════════════════

const DESIGN_SYSTEM_PROMPT = `You are a senior software architect specializing in full-stack web applications.

Your task is to generate a technical design based on EARS requirements and existing codebase analysis.

## Design Principles
1. **Consistency**: Follow existing patterns and conventions in the codebase
2. **Minimal Changes**: Prefer modifying existing code over creating new files
3. **Separation of Concerns**: Keep data, logic, and presentation separate
4. **Testability**: Design for easy unit and integration testing
5. **Incremental Delivery**: Break work into small, deployable chunks

## Output Requirements
- Generate Mermaid diagrams for data models and flows
- Specify exact file paths following existing structure
- Estimate lines of code for each file change
- Identify dependencies between components

## Mermaid Diagram Guidelines
- Use erDiagram for data models
- Use sequenceDiagram for API flows
- Use flowchart for business logic
- Use classDiagram for component hierarchies`;

/**
 * Generate technical design from requirements and codebase analysis
 */
export async function generateDesign(
  requirements: Array<{
    id: string;
    type: string;
    rawText: string;
    acceptanceCriteria?: string[];
  }>,
  codebaseAnalysis: CodebaseAnalysis,
  options: {
    projectName?: string;
    focusAreas?: string[];
  } = {}
): Promise<DesignRecommendation> {
  const { projectName = "the project", focusAreas = [] } = options;

  const userPrompt = `## Requirements to Implement

${requirements.map(r => `- [${r.id}] ${r.rawText}`).join("\n")}

## Existing Codebase Analysis

### Database Schemas
${codebaseAnalysis.schemas.map(s => 
  `- ${s.tableName}: ${s.columns.map(c => c.name).join(", ")}`
).join("\n") || "No schemas detected"}

### API Endpoints
${codebaseAnalysis.apiEndpoints.map(e => 
  `- ${e.method} ${e.path} (${e.isProtected ? "protected" : "public"})`
).join("\n") || "No endpoints detected"}

### Components
${codebaseAnalysis.components.slice(0, 20).map(c => 
  `- ${c.name} (${c.filePath})`
).join("\n") || "No components detected"}

### Detected Patterns
${Object.entries(codebaseAnalysis.patterns)
  .filter(([, v]) => v)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n") || "No patterns detected"}

### Technologies
${codebaseAnalysis.technologies.join(", ") || "Unknown"}

${focusAreas.length > 0 ? `## Focus Areas\n${focusAreas.join("\n")}` : ""}

Generate a comprehensive technical design including:
1. Data model changes (new tables, modified columns)
2. API endpoint design (new procedures, input/output schemas)
3. Component design (new components, modifications)
4. File manifest (what files to create/modify)
5. Mermaid diagrams (ER diagram, sequence diagrams)`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: DESIGN_SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "design_recommendation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            dataModel: {
              type: "object",
              properties: {
                newTables: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tableName: { type: "string" },
                      columns: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            type: { type: "string" },
                            nullable: { type: "boolean" },
                            defaultValue: { type: "string" }
                          },
                          required: ["name", "type", "nullable"],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ["tableName", "columns"],
                    additionalProperties: false
                  }
                },
                modifiedTables: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tableName: { type: "string" },
                      changes: { type: "array", items: { type: "string" } }
                    },
                    required: ["tableName", "changes"],
                    additionalProperties: false
                  }
                },
                mermaidER: { type: "string" }
              },
              required: ["newTables", "modifiedTables", "mermaidER"],
              additionalProperties: false
            },
            apiDesign: {
              type: "object",
              properties: {
                newEndpoints: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
                      path: { type: "string" },
                      description: { type: "string" },
                      inputSchema: { type: "string" },
                      outputSchema: { type: "string" },
                      isProtected: { type: "boolean" }
                    },
                    required: ["method", "path", "isProtected"],
                    additionalProperties: false
                  }
                },
                modifiedEndpoints: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      path: { type: "string" },
                      changes: { type: "array", items: { type: "string" } }
                    },
                    required: ["path", "changes"],
                    additionalProperties: false
                  }
                }
              },
              required: ["newEndpoints", "modifiedEndpoints"],
              additionalProperties: false
            },
            componentDesign: {
              type: "object",
              properties: {
                newComponents: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      purpose: { type: "string" },
                      props: { type: "array", items: { type: "string" } },
                      location: { type: "string" }
                    },
                    required: ["name", "purpose", "props", "location"],
                    additionalProperties: false
                  }
                },
                modifiedComponents: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      changes: { type: "array", items: { type: "string" } }
                    },
                    required: ["name", "changes"],
                    additionalProperties: false
                  }
                }
              },
              required: ["newComponents", "modifiedComponents"],
              additionalProperties: false
            },
            fileManifest: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["create", "modify", "delete"] },
                  path: { type: "string" },
                  description: { type: "string" },
                  estimatedLines: { type: "number" }
                },
                required: ["action", "path", "description"],
                additionalProperties: false
              }
            },
            diagrams: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["er", "sequence", "flow", "class"] },
                  title: { type: "string" },
                  mermaidCode: { type: "string" }
                },
                required: ["type", "title", "mermaidCode"],
                additionalProperties: false
              }
            }
          },
          required: ["dataModel", "apiDesign", "componentDesign", "fileManifest", "diagrams"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No response from LLM");
  }

  return JSON.parse(content) as DesignRecommendation;
}

/**
 * Format design as Markdown for display
 */
export function formatDesignAsMarkdown(design: DesignRecommendation): string {
  let md = "# Technical Design\n\n";

  // Data Model
  md += "## Data Model\n\n";
  if (design.dataModel.newTables.length > 0) {
    md += "### New Tables\n\n";
    for (const table of design.dataModel.newTables) {
      md += `#### ${table.tableName}\n\n`;
      md += "| Column | Type | Nullable |\n|--------|------|----------|\n";
      for (const col of table.columns) {
        md += `| ${col.name} | ${col.type} | ${col.nullable ? "Yes" : "No"} |\n`;
      }
      md += "\n";
    }
  }
  if (design.dataModel.modifiedTables.length > 0) {
    md += "### Modified Tables\n\n";
    for (const table of design.dataModel.modifiedTables) {
      md += `- **${table.tableName}**: ${table.changes.join(", ")}\n`;
    }
    md += "\n";
  }
  if (design.dataModel.mermaidER) {
    md += "### ER Diagram\n\n```mermaid\n" + design.dataModel.mermaidER + "\n```\n\n";
  }

  // API Design
  md += "## API Design\n\n";
  if (design.apiDesign.newEndpoints.length > 0) {
    md += "### New Endpoints\n\n";
    for (const endpoint of design.apiDesign.newEndpoints) {
      md += `- **${endpoint.method} ${endpoint.path}** (${endpoint.isProtected ? "protected" : "public"})\n`;
      if (endpoint.description) md += `  - ${endpoint.description}\n`;
    }
    md += "\n";
  }

  // Component Design
  md += "## Component Design\n\n";
  if (design.componentDesign.newComponents.length > 0) {
    md += "### New Components\n\n";
    for (const comp of design.componentDesign.newComponents) {
      md += `- **${comp.name}** (${comp.location})\n`;
      md += `  - Purpose: ${comp.purpose}\n`;
      if (comp.props.length > 0) md += `  - Props: ${comp.props.join(", ")}\n`;
    }
    md += "\n";
  }

  // File Manifest
  md += "## File Manifest\n\n";
  md += "| Action | Path | Description | Est. Lines |\n|--------|------|-------------|------------|\n";
  for (const file of design.fileManifest) {
    md += `| ${file.action} | ${file.path} | ${file.description} | ${file.estimatedLines || "-"} |\n`;
  }
  md += "\n";

  // Diagrams
  if (design.diagrams.length > 0) {
    md += "## Diagrams\n\n";
    for (const diagram of design.diagrams) {
      md += `### ${diagram.title}\n\n\`\`\`mermaid\n${diagram.mermaidCode}\n\`\`\`\n\n`;
    }
  }

  return md;
}
