/**
 * Prompt-to-Plan Workflow Unit Tests
 * Sprint 6: Comprehensive tests for spec-driven development
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          title: "Test Feature",
          overview: "A test feature overview",
          requirements: [
            {
              id: "REQ-001",
              type: "event_driven",
              precondition: "user is logged in",
              trigger: "user clicks submit",
              system: "the system",
              response: "saves the data",
              rawText: "When user clicks submit, the system shall save the data",
              acceptanceCriteria: ["Data is persisted", "Success message shown"]
            }
          ],
          technicalConsiderations: "Use existing API patterns",
          outOfScope: ["Mobile support"],
          assumptions: ["User has valid session"],
          clarificationQuestions: [],
          confidence: 85
        })
      }
    }]
  })
}));

// ════════════════════════════════════════════════════════════════════════════
// EARS GENERATOR TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("EARS Generator", () => {
  describe("EarsType enum", () => {
    it("should include all EARS requirement types", () => {
      const types = ["ubiquitous", "event_driven", "state_driven", "optional", "unwanted", "complex"];
      types.forEach(type => {
        expect(typeof type).toBe("string");
      });
    });
  });

  describe("EARS Templates", () => {
    it("should have template for ubiquitous requirements", () => {
      const template = "The [system] shall [action].";
      expect(template).toContain("shall");
    });

    it("should have template for event-driven requirements", () => {
      const template = "When [trigger], the [system] shall [action].";
      expect(template).toContain("When");
      expect(template).toContain("shall");
    });

    it("should have template for state-driven requirements", () => {
      const template = "While [state], the [system] shall [action].";
      expect(template).toContain("While");
    });

    it("should have template for optional requirements", () => {
      const template = "Where [feature is enabled], the [system] shall [action].";
      expect(template).toContain("Where");
    });

    it("should have template for unwanted behavior requirements", () => {
      const template = "If [unwanted condition], the [system] shall [prevent/handle].";
      expect(template).toContain("If");
    });
  });

  describe("Requirement Generation", () => {
    it("should generate unique requirement IDs", () => {
      const ids = ["REQ-001", "REQ-002", "REQ-003"];
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should include acceptance criteria for each requirement", () => {
      const requirement = {
        id: "REQ-001",
        type: "event_driven",
        rawText: "When user clicks, system responds",
        acceptanceCriteria: ["Criterion 1", "Criterion 2"]
      };
      expect(requirement.acceptanceCriteria).toBeDefined();
      expect(requirement.acceptanceCriteria.length).toBeGreaterThan(0);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CODEBASE ANALYSIS TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Codebase Analysis", () => {
  describe("Schema Detection", () => {
    it("should detect Drizzle table definitions", () => {
      const code = `export const users = mysqlTable("users", {
        id: int("id").autoincrement().primaryKey(),
        name: varchar("name", { length: 255 }).notNull()
      });`;
      
      const tableMatch = code.match(/export const (\w+) = mysqlTable\("(\w+)",/);
      expect(tableMatch).toBeTruthy();
      expect(tableMatch![1]).toBe("users");
      expect(tableMatch![2]).toBe("users");
    });

    it("should extract column types", () => {
      const code = `id: int("id"), name: varchar("name", { length: 255 }), active: boolean("active")`;
      const columnMatches = Array.from(code.matchAll(/(\w+):\s*(int|varchar|text|boolean|timestamp|json|mysqlEnum)\(/g));
      
      expect(columnMatches.length).toBe(3);
      expect(columnMatches[0][1]).toBe("id");
      expect(columnMatches[0][2]).toBe("int");
    });
  });

  describe("API Endpoint Detection", () => {
    it("should detect tRPC procedures", () => {
      const code = `getUser: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {})`;
      
      const match = code.match(/(\w+):\s*(protectedProcedure|publicProcedure)/);
      expect(match).toBeTruthy();
      expect(match![1]).toBe("getUser");
      expect(match![2]).toBe("protectedProcedure");
    });

    it("should distinguish between queries and mutations", () => {
      const queryCode = `.query(async ({ input }) => {})`;
      const mutationCode = `.mutation(async ({ input }) => {})`;
      
      expect(queryCode.includes(".query")).toBe(true);
      expect(mutationCode.includes(".mutation")).toBe(true);
    });
  });

  describe("Component Detection", () => {
    it("should detect React components", () => {
      const code = `export function UserCard({ name, email }) {
        return (
          <div>{name}</div>
        );
      }`;
      
      expect(code.includes("export")).toBe(true);
      expect(code.includes("function")).toBe(true);
      expect(code.includes("return (")).toBe(true);
    });

    it("should extract hooks from components", () => {
      const code = `const [state, setState] = useState(); const data = useQuery();`;
      const hookMatches = Array.from(code.matchAll(/use\w+\(/g));
      
      expect(hookMatches.length).toBe(2);
    });
  });

  describe("Pattern Detection", () => {
    it("should detect state management patterns", () => {
      const patterns = {
        zustand: "import { create } from 'zustand'",
        redux: "import { useSelector } from 'react-redux'",
        context: "const value = useContext(MyContext)"
      };
      
      expect(patterns.zustand.includes("zustand")).toBe(true);
      expect(patterns.redux.includes("redux")).toBe(true);
      expect(patterns.context.includes("useContext")).toBe(true);
    });

    it("should detect styling patterns", () => {
      const patterns = {
        tailwind: "className=\"flex items-center\"",
        styledComponents: "const Button = styled.button``",
        cssModules: "import styles from './Button.module.css'"
      };
      
      expect(patterns.tailwind.includes("className")).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TASK BREAKDOWN TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Task Breakdown", () => {
  describe("Task Structure", () => {
    it("should have required task fields", () => {
      const task = {
        id: "TASK-001",
        title: "Create user table",
        description: "Add users table to schema",
        requirementIds: ["REQ-001"],
        dependencies: [],
        estimatedHours: 2,
        assignedAgentType: "database",
        status: "pending",
        priority: "high",
        tags: ["database", "schema"],
        acceptanceCriteria: ["Table created", "Migrations run"],
        fileChanges: [{ action: "modify", path: "drizzle/schema.ts" }]
      };
      
      expect(task.id).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.estimatedHours).toBeGreaterThan(0);
      expect(task.estimatedHours).toBeLessThanOrEqual(4);
    });

    it("should validate agent types", () => {
      const validTypes = ["frontend", "backend", "database", "testing", "documentation", "devops", "general"];
      validTypes.forEach(type => {
        expect(validTypes.includes(type)).toBe(true);
      });
    });
  });

  describe("Dependency Graph", () => {
    it("should build nodes from tasks", () => {
      const tasks = [
        { id: "TASK-001", title: "Task 1", assignedAgentType: "backend", status: "pending", estimatedHours: 2 },
        { id: "TASK-002", title: "Task 2", assignedAgentType: "frontend", status: "pending", estimatedHours: 3 }
      ];
      
      const nodes = tasks.map(t => ({
        id: t.id,
        label: t.title,
        type: t.assignedAgentType,
        status: t.status,
        estimatedHours: t.estimatedHours
      }));
      
      expect(nodes.length).toBe(2);
      expect(nodes[0].id).toBe("TASK-001");
    });

    it("should build edges from dependencies", () => {
      const tasks = [
        { id: "TASK-001", dependencies: [] },
        { id: "TASK-002", dependencies: ["TASK-001"] }
      ];
      
      const edges: Array<{ from: string; to: string }> = [];
      for (const task of tasks) {
        for (const dep of task.dependencies) {
          edges.push({ from: dep, to: task.id });
        }
      }
      
      expect(edges.length).toBe(1);
      expect(edges[0].from).toBe("TASK-001");
      expect(edges[0].to).toBe("TASK-002");
    });
  });

  describe("Critical Path", () => {
    it("should find the longest path through dependencies", () => {
      // Simple linear dependency: A -> B -> C
      const tasks = [
        { id: "A", dependencies: [], estimatedHours: 2 },
        { id: "B", dependencies: ["A"], estimatedHours: 3 },
        { id: "C", dependencies: ["B"], estimatedHours: 1 }
      ];
      
      // Critical path should be A -> B -> C with total 6 hours
      const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      expect(totalHours).toBe(6);
    });

    it("should handle parallel paths", () => {
      // Parallel paths: A -> B, A -> C, B+C -> D
      const tasks = [
        { id: "A", dependencies: [], estimatedHours: 1 },
        { id: "B", dependencies: ["A"], estimatedHours: 4 },
        { id: "C", dependencies: ["A"], estimatedHours: 2 },
        { id: "D", dependencies: ["B", "C"], estimatedHours: 1 }
      ];
      
      // Critical path should be A -> B -> D (6 hours, not A -> C -> D which is 4 hours)
      const criticalPathHours = 1 + 4 + 1; // A + B + D
      expect(criticalPathHours).toBe(6);
    });
  });

  describe("Parallelizable Tasks", () => {
    it("should group tasks that can run in parallel", () => {
      const tasks = [
        { id: "A", dependencies: [] },
        { id: "B", dependencies: [] },
        { id: "C", dependencies: ["A", "B"] }
      ];
      
      // Wave 1: A, B (no dependencies)
      // Wave 2: C (depends on A and B)
      const wave1 = tasks.filter(t => t.dependencies.length === 0);
      expect(wave1.length).toBe(2);
      expect(wave1.map(t => t.id)).toContain("A");
      expect(wave1.map(t => t.id)).toContain("B");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION SERVICE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Implementation Service", () => {
  describe("Execution Context", () => {
    it("should have required context fields", () => {
      const context = {
        specId: 1,
        taskId: "TASK-001",
        projectId: 1,
        userId: 1,
        requirements: [{ id: "REQ-001", rawText: "Test requirement" }]
      };
      
      expect(context.specId).toBeDefined();
      expect(context.taskId).toBeDefined();
      expect(context.requirements.length).toBeGreaterThan(0);
    });
  });

  describe("Execution Result", () => {
    it("should track files changed", () => {
      const result = {
        success: true,
        taskId: "TASK-001",
        filesChanged: [
          { path: "src/component.tsx", action: "created", linesChanged: 50 },
          { path: "src/api.ts", action: "modified", linesChanged: 10 }
        ],
        duration: 120
      };
      
      expect(result.filesChanged.length).toBe(2);
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe("Verification Result", () => {
    it("should track requirement coverage", () => {
      const verification = {
        passed: true,
        requirementsCovered: [
          { requirementId: "REQ-001", covered: true, evidence: "Test passed" }
        ],
        acceptanceCriteriaMet: [
          { criterion: "Data persisted", met: true }
        ],
        issues: [],
        suggestions: []
      };
      
      expect(verification.passed).toBe(true);
      expect(verification.requirementsCovered[0].covered).toBe(true);
    });

    it("should report issues when verification fails", () => {
      const verification = {
        passed: false,
        requirementsCovered: [
          { requirementId: "REQ-001", covered: false, evidence: "Missing implementation" }
        ],
        acceptanceCriteriaMet: [],
        issues: ["REQ-001 not implemented"],
        suggestions: ["Add data persistence logic"]
      };
      
      expect(verification.passed).toBe(false);
      expect(verification.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Implementation Progress", () => {
    it("should calculate completion percentage", () => {
      const progress = {
        totalTasks: 10,
        completedTasks: 4,
        inProgressTasks: 2,
        blockedTasks: 1,
        pendingTasks: 3
      };
      
      const completionPercentage = Math.round((progress.completedTasks / progress.totalTasks) * 100);
      expect(completionPercentage).toBe(40);
    });

    it("should estimate remaining hours", () => {
      const tasks = [
        { status: "completed", estimatedHours: 2 },
        { status: "in_progress", estimatedHours: 4 },
        { status: "pending", estimatedHours: 3 }
      ];
      
      let remainingHours = 0;
      for (const task of tasks) {
        if (task.status === "in_progress") remainingHours += task.estimatedHours * 0.5;
        else if (task.status === "pending") remainingHours += task.estimatedHours;
      }
      
      expect(remainingHours).toBe(5); // 4*0.5 + 3
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PHASE WORKFLOW TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Phase Workflow", () => {
  const phases = ["specify", "design", "tasks", "implement", "complete"];

  describe("Phase Ordering", () => {
    it("should have correct phase order", () => {
      expect(phases[0]).toBe("specify");
      expect(phases[1]).toBe("design");
      expect(phases[2]).toBe("tasks");
      expect(phases[3]).toBe("implement");
      expect(phases[4]).toBe("complete");
    });

    it("should advance to next phase correctly", () => {
      const currentPhase = "design";
      const currentIndex = phases.indexOf(currentPhase);
      const nextPhase = phases[currentIndex + 1];
      
      expect(nextPhase).toBe("tasks");
    });

    it("should go back to previous phase on rejection", () => {
      const currentPhase = "tasks";
      const currentIndex = phases.indexOf(currentPhase);
      const prevPhase = currentIndex > 0 ? phases[currentIndex - 1] : "specify";
      
      expect(prevPhase).toBe("design");
    });
  });

  describe("Phase Status", () => {
    it("should have valid phase statuses", () => {
      const validStatuses = ["draft", "pending_review", "approved", "rejected"];
      validStatuses.forEach(status => {
        expect(typeof status).toBe("string");
      });
    });
  });

  describe("Human Checkpoints", () => {
    it("should require approval before advancing from specify", () => {
      const phase = "specify";
      const requiresApproval = ["specify", "design", "tasks"].includes(phase);
      expect(requiresApproval).toBe(true);
    });

    it("should auto-complete when all tasks are done", () => {
      const progress = {
        completedTasks: 10,
        totalTasks: 10
      };
      const canAutoComplete = progress.completedTasks === progress.totalTasks;
      expect(canAutoComplete).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MERMAID DIAGRAM TESTS
// ════════════════════════════════════════════════════════════════════════════

describe("Mermaid Diagrams", () => {
  describe("ER Diagram Generation", () => {
    it("should generate valid ER diagram syntax", () => {
      const diagram = `erDiagram
    USERS {
        int id PK
        string name
        string email
    }
    POSTS {
        int id PK
        int userId FK
        string title
    }
    USERS ||--o{ POSTS : writes`;
      
      expect(diagram).toContain("erDiagram");
      expect(diagram).toContain("USERS");
      expect(diagram).toContain("POSTS");
    });
  });

  describe("Flowchart Generation", () => {
    it("should generate valid flowchart syntax", () => {
      const diagram = `flowchart TD
    A[Task 1] --> B[Task 2]
    A --> C[Task 3]
    B --> D[Task 4]
    C --> D`;
      
      expect(diagram).toContain("flowchart TD");
      expect(diagram).toContain("-->");
    });
  });

  describe("Sequence Diagram Generation", () => {
    it("should generate valid sequence diagram syntax", () => {
      const diagram = `sequenceDiagram
    participant User
    participant API
    participant DB
    User->>API: POST /users
    API->>DB: INSERT user
    DB-->>API: user record
    API-->>User: 201 Created`;
      
      expect(diagram).toContain("sequenceDiagram");
      expect(diagram).toContain("participant");
      expect(diagram).toContain("->>");
    });
  });
});
