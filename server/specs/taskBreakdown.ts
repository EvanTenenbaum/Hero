/**
 * Task Breakdown Service
 * Sprint 6: Prompt-to-Plan Workflow - Tasks Phase
 * 
 * Breaks down technical design into executable tasks with dependencies.
 * Generates dependency graphs and assigns tasks to appropriate agent types.
 */

import { invokeLLM } from "../_core/llm";
import type { DesignRecommendation } from "./codebaseAnalysis";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface Task {
  id: string;
  title: string;
  description: string;
  requirementIds: string[];
  dependencies: string[];
  estimatedHours: number;
  assignedAgentType?: AgentType;
  status: "pending" | "in_progress" | "completed" | "blocked";
  priority: "critical" | "high" | "medium" | "low";
  tags: string[];
  acceptanceCriteria: string[];
  fileChanges: Array<{
    action: "create" | "modify" | "delete";
    path: string;
  }>;
}

export type AgentType = 
  | "frontend" 
  | "backend" 
  | "database" 
  | "testing" 
  | "documentation" 
  | "devops"
  | "general";

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: AgentType;
    status: Task["status"];
    estimatedHours: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: "blocks" | "suggests";
  }>;
}

export interface TaskBreakdownResult {
  tasks: Task[];
  dependencyGraph: DependencyGraph;
  criticalPath: string[];
  totalEstimatedHours: number;
  parallelizableTasks: string[][];
  mermaidDiagram: string;
}

// ════════════════════════════════════════════════════════════════════════════
// PROMPTS
// ════════════════════════════════════════════════════════════════════════════

const TASK_BREAKDOWN_SYSTEM_PROMPT = `You are a senior technical project manager specializing in breaking down software features into executable tasks.

Your task is to analyze a technical design and create a detailed task breakdown with dependencies.

## Task Breakdown Principles

1. **Atomic Tasks**: Each task should be completable in 1-4 hours by a single developer
2. **Clear Dependencies**: Identify which tasks must complete before others can start
3. **Parallel Work**: Maximize tasks that can be done in parallel
4. **Agent Assignment**: Assign tasks to the most appropriate agent type:
   - frontend: UI components, styling, client-side logic
   - backend: API endpoints, business logic, server-side code
   - database: Schema changes, migrations, queries
   - testing: Unit tests, integration tests, E2E tests
   - documentation: README, API docs, comments
   - devops: CI/CD, deployment, infrastructure
   - general: Tasks that don't fit other categories

## Dependency Types
- **blocks**: Task A must complete before Task B can start
- **suggests**: Task A should ideally complete before Task B, but not required

## Critical Path
Identify the longest chain of dependent tasks that determines minimum completion time.

## Output Requirements
- Generate unique task IDs (TASK-001, TASK-002, etc.)
- Include acceptance criteria for each task
- Estimate hours realistically (1-4 hours per task)
- Generate a Mermaid flowchart showing dependencies`;

/**
 * Break down a design into executable tasks
 */
export async function breakdownDesign(
  design: DesignRecommendation,
  requirements: Array<{
    id: string;
    rawText: string;
  }>,
  options: {
    maxTaskHours?: number;
    preferredAgentTypes?: AgentType[];
  } = {}
): Promise<TaskBreakdownResult> {
  const { maxTaskHours = 4, preferredAgentTypes = [] } = options;

  const userPrompt = `## Technical Design to Break Down

### Data Model Changes
${design.dataModel.newTables.length > 0 
  ? design.dataModel.newTables.map(t => `- New table: ${t.tableName}`).join("\n")
  : "No new tables"}
${design.dataModel.modifiedTables.length > 0
  ? design.dataModel.modifiedTables.map(t => `- Modify: ${t.tableName} (${t.changes.join(", ")})`).join("\n")
  : ""}

### API Endpoints
${design.apiDesign.newEndpoints.map(e => 
  `- ${e.method} ${e.path}: ${e.description || "No description"}`
).join("\n") || "No new endpoints"}

### Components
${design.componentDesign.newComponents.map(c => 
  `- ${c.name}: ${c.purpose}`
).join("\n") || "No new components"}

### File Manifest
${design.fileManifest.map(f => 
  `- ${f.action} ${f.path}: ${f.description}`
).join("\n")}

## Requirements Being Implemented
${requirements.map(r => `- [${r.id}] ${r.rawText}`).join("\n")}

## Constraints
- Maximum task duration: ${maxTaskHours} hours
${preferredAgentTypes.length > 0 ? `- Preferred agent types: ${preferredAgentTypes.join(", ")}` : ""}

Break this design into atomic, executable tasks with clear dependencies. Generate a Mermaid flowchart showing the task dependency graph.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: TASK_BREAKDOWN_SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "task_breakdown",
        strict: true,
        schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  requirementIds: { type: "array", items: { type: "string" } },
                  dependencies: { type: "array", items: { type: "string" } },
                  estimatedHours: { type: "number" },
                  assignedAgentType: { 
                    type: "string",
                    enum: ["frontend", "backend", "database", "testing", "documentation", "devops", "general"]
                  },
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  tags: { type: "array", items: { type: "string" } },
                  acceptanceCriteria: { type: "array", items: { type: "string" } },
                  fileChanges: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string", enum: ["create", "modify", "delete"] },
                        path: { type: "string" }
                      },
                      required: ["action", "path"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["id", "title", "description", "requirementIds", "dependencies", "estimatedHours", "assignedAgentType", "priority", "tags", "acceptanceCriteria", "fileChanges"],
                additionalProperties: false
              }
            },
            criticalPath: { type: "array", items: { type: "string" } },
            parallelizableTasks: {
              type: "array",
              items: { type: "array", items: { type: "string" } }
            },
            mermaidDiagram: { type: "string" }
          },
          required: ["tasks", "criticalPath", "parallelizableTasks", "mermaidDiagram"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No response from LLM");
  }

  const result = JSON.parse(content) as {
    tasks: Task[];
    criticalPath: string[];
    parallelizableTasks: string[][];
    mermaidDiagram: string;
  };

  // Add status to tasks
  const tasks = result.tasks.map(t => ({
    ...t,
    status: "pending" as const
  }));

  // Build dependency graph
  const dependencyGraph = buildDependencyGraph(tasks);

  // Calculate total hours
  const totalEstimatedHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  return {
    tasks,
    dependencyGraph,
    criticalPath: result.criticalPath,
    totalEstimatedHours,
    parallelizableTasks: result.parallelizableTasks,
    mermaidDiagram: result.mermaidDiagram
  };
}

/**
 * Build a dependency graph from tasks
 */
function buildDependencyGraph(tasks: Task[]): DependencyGraph {
  const nodes = tasks.map(t => ({
    id: t.id,
    label: t.title,
    type: t.assignedAgentType || "general",
    status: t.status,
    estimatedHours: t.estimatedHours
  }));

  const edges: DependencyGraph["edges"] = [];
  for (const task of tasks) {
    for (const dep of task.dependencies) {
      edges.push({
        from: dep,
        to: task.id,
        type: "blocks"
      });
    }
  }

  return { nodes, edges };
}

/**
 * Calculate the critical path through the dependency graph
 */
export function calculateCriticalPath(tasks: Task[]): string[] {
  // Build adjacency list
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const taskMap = new Map<string, Task>();

  for (const task of tasks) {
    taskMap.set(task.id, task);
    graph.set(task.id, []);
    inDegree.set(task.id, 0);
  }

  for (const task of tasks) {
    for (const dep of task.dependencies) {
      const deps = graph.get(dep);
      if (deps) {
        deps.push(task.id);
      }
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
    }
  }

  // Find longest path using dynamic programming
  const longestPath = new Map<string, number>();
  const predecessor = new Map<string, string | null>();

  // Topological sort
  const queue: string[] = [];
  for (const [id, degree] of Array.from(inDegree.entries())) {
    if (degree === 0) {
      queue.push(id);
      longestPath.set(id, taskMap.get(id)?.estimatedHours || 0);
      predecessor.set(id, null);
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      const newPath = (longestPath.get(current) || 0) + (taskMap.get(neighbor)?.estimatedHours || 0);
      if (newPath > (longestPath.get(neighbor) || 0)) {
        longestPath.set(neighbor, newPath);
        predecessor.set(neighbor, current);
      }

      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Find the end of the critical path
  let maxLength = 0;
  let endNode = "";
  for (const [id, length] of Array.from(longestPath.entries())) {
    if (length > maxLength) {
      maxLength = length;
      endNode = id;
    }
  }

  // Reconstruct the path
  const path: string[] = [];
  let current: string | null = endNode;
  while (current) {
    path.unshift(current);
    current = predecessor.get(current) || null;
  }

  return path;
}

/**
 * Find tasks that can be executed in parallel
 */
export function findParallelizableTasks(tasks: Task[]): string[][] {
  const completed = new Set<string>();
  const waves: string[][] = [];

  while (completed.size < tasks.length) {
    const wave: string[] = [];
    
    for (const task of tasks) {
      if (completed.has(task.id)) continue;
      
      // Check if all dependencies are completed
      const allDepsCompleted = task.dependencies.every(d => completed.has(d));
      if (allDepsCompleted) {
        wave.push(task.id);
      }
    }

    if (wave.length === 0) {
      // Circular dependency detected
      break;
    }

    waves.push(wave);
    wave.forEach(id => completed.add(id));
  }

  return waves;
}

/**
 * Generate Mermaid diagram for task dependencies
 */
export function generateMermaidDiagram(tasks: Task[]): string {
  const lines: string[] = ["flowchart TD"];

  // Add nodes with styling based on agent type
  const agentColors: Record<AgentType, string> = {
    frontend: "#61dafb",
    backend: "#68a063",
    database: "#336791",
    testing: "#e535ab",
    documentation: "#f7df1e",
    devops: "#2496ed",
    general: "#808080"
  };

  for (const task of tasks) {
    const color = agentColors[task.assignedAgentType || "general"];
    lines.push(`    ${task.id}["${task.title}"]`);
    lines.push(`    style ${task.id} fill:${color}`);
  }

  // Add edges
  for (const task of tasks) {
    for (const dep of task.dependencies) {
      lines.push(`    ${dep} --> ${task.id}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format task breakdown as Markdown
 */
export function formatTaskBreakdownAsMarkdown(result: TaskBreakdownResult): string {
  let md = "# Task Breakdown\n\n";

  // Summary
  md += "## Summary\n\n";
  md += `- **Total Tasks**: ${result.tasks.length}\n`;
  md += `- **Total Estimated Hours**: ${result.totalEstimatedHours}\n`;
  md += `- **Critical Path Length**: ${result.criticalPath.length} tasks\n`;
  md += `- **Parallel Waves**: ${result.parallelizableTasks.length}\n\n`;

  // Critical Path
  md += "## Critical Path\n\n";
  md += result.criticalPath.map((id, i) => {
    const task = result.tasks.find(t => t.id === id);
    return `${i + 1}. **${id}**: ${task?.title || "Unknown"}`;
  }).join("\n");
  md += "\n\n";

  // Tasks by Agent Type
  const byAgent = new Map<AgentType, Task[]>();
  for (const task of result.tasks) {
    const type = task.assignedAgentType || "general";
    if (!byAgent.has(type)) byAgent.set(type, []);
    byAgent.get(type)!.push(task);
  }

  md += "## Tasks by Agent Type\n\n";
  for (const [type, tasks] of Array.from(byAgent.entries())) {
    md += `### ${type.charAt(0).toUpperCase() + type.slice(1)} (${tasks.length} tasks)\n\n`;
    for (const task of tasks) {
      md += `#### ${task.id}: ${task.title}\n\n`;
      md += `- **Priority**: ${task.priority}\n`;
      md += `- **Estimated Hours**: ${task.estimatedHours}\n`;
      md += `- **Dependencies**: ${task.dependencies.length > 0 ? task.dependencies.join(", ") : "None"}\n`;
      md += `- **Description**: ${task.description}\n\n`;
      
      if (task.acceptanceCriteria.length > 0) {
        md += "**Acceptance Criteria**:\n";
        task.acceptanceCriteria.forEach((ac: string) => {
          md += `- [ ] ${ac}\n`;
        });
        md += "\n";
      }
    }
  }

  // Dependency Diagram
  md += "## Dependency Diagram\n\n";
  md += "```mermaid\n" + result.mermaidDiagram + "\n```\n\n";

  return md;
}
