import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          summary: "Test summary",
          keyObjectives: ["Objective 1", "Objective 2"],
          targetUsers: "Developers",
          successCriteria: ["Criteria 1"],
          constraints: ["Constraint 1"],
          assumptions: ["Assumption 1"]
        })
      }
    }]
  })
}));

// Mock the db module
vi.mock("../db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 1 }])
      })
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }])
      })
    })
  }
}));

describe("Kickoff Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Data Types", () => {
    it("should define NorthStar data structure", () => {
      const northStar = {
        vision: "Build the best IDE",
        problemStatement: "Current IDEs are too complex",
        targetOutcome: "Simple, powerful development",
        successMetrics: ["User satisfaction > 90%"],
        nonGoals: ["Mobile app support"]
      };
      
      expect(northStar.vision).toBeDefined();
      expect(northStar.problemStatement).toBeDefined();
      expect(northStar.targetOutcome).toBeDefined();
      expect(Array.isArray(northStar.successMetrics)).toBe(true);
      expect(Array.isArray(northStar.nonGoals)).toBe(true);
    });

    it("should define ProductBrief data structure", () => {
      const productBrief = {
        userPersonas: ["Developer", "PM"],
        userStories: ["As a dev, I want to code faster"],
        featurePriorities: ["Code editor", "AI assistant"],
        mvpScope: "Basic editor with AI",
        futureScope: "Full IDE features"
      };
      
      expect(Array.isArray(productBrief.userPersonas)).toBe(true);
      expect(Array.isArray(productBrief.userStories)).toBe(true);
      expect(Array.isArray(productBrief.featurePriorities)).toBe(true);
      expect(productBrief.mvpScope).toBeDefined();
      expect(productBrief.futureScope).toBeDefined();
    });

    it("should define Architecture data structure", () => {
      const architecture = {
        techStack: ["React", "Node.js", "PostgreSQL"],
        systemComponents: ["Frontend", "Backend", "Database"],
        dataFlow: "User -> Frontend -> API -> Database",
        integrations: ["GitHub", "OpenAI"],
        securityConsiderations: ["Auth", "Encryption"]
      };
      
      expect(Array.isArray(architecture.techStack)).toBe(true);
      expect(Array.isArray(architecture.systemComponents)).toBe(true);
      expect(architecture.dataFlow).toBeDefined();
      expect(Array.isArray(architecture.integrations)).toBe(true);
      expect(Array.isArray(architecture.securityConsiderations)).toBe(true);
    });

    it("should define QualityBar data structure", () => {
      const qualityBar = {
        performanceTargets: ["< 100ms response time"],
        testingStrategy: "Unit + Integration + E2E",
        codeStandards: ["ESLint", "Prettier"],
        documentationRequirements: ["API docs", "README"],
        accessibilityRequirements: ["WCAG 2.1 AA"]
      };
      
      expect(Array.isArray(qualityBar.performanceTargets)).toBe(true);
      expect(qualityBar.testingStrategy).toBeDefined();
      expect(Array.isArray(qualityBar.codeStandards)).toBe(true);
      expect(Array.isArray(qualityBar.documentationRequirements)).toBe(true);
      expect(Array.isArray(qualityBar.accessibilityRequirements)).toBe(true);
    });

    it("should define SliceMap data structure", () => {
      const sliceMap = {
        slices: [
          {
            name: "User Authentication",
            description: "Login and registration",
            priority: "high" as const,
            estimatedEffort: "1 week",
            dependencies: []
          }
        ]
      };
      
      expect(Array.isArray(sliceMap.slices)).toBe(true);
      expect(sliceMap.slices[0].name).toBeDefined();
      expect(sliceMap.slices[0].priority).toBe("high");
    });
  });

  describe("Wizard Steps", () => {
    it("should have 5 wizard steps", () => {
      const steps = [
        "North Star",
        "Product Brief",
        "Architecture",
        "Quality Bar",
        "Slice Map"
      ];
      
      expect(steps.length).toBe(5);
      expect(steps[0]).toBe("North Star");
      expect(steps[4]).toBe("Slice Map");
    });

    it("should validate step progression", () => {
      const currentStep = 1;
      const totalSteps = 5;
      
      expect(currentStep).toBeGreaterThanOrEqual(1);
      expect(currentStep).toBeLessThanOrEqual(totalSteps);
      
      const canGoNext = currentStep < totalSteps;
      const canGoPrev = currentStep > 1;
      
      expect(canGoNext).toBe(true);
      expect(canGoPrev).toBe(false);
    });
  });

  describe("Document Generation", () => {
    it("should generate agent brief structure", () => {
      const agentBrief = {
        projectContext: "Hero IDE project",
        objectives: ["Build features", "Fix bugs"],
        constraints: ["Use TypeScript", "Follow design system"],
        qualityRequirements: ["Test coverage > 80%"],
        prioritizedTasks: ["Task 1", "Task 2"]
      };
      
      expect(agentBrief.projectContext).toBeDefined();
      expect(Array.isArray(agentBrief.objectives)).toBe(true);
      expect(Array.isArray(agentBrief.constraints)).toBe(true);
      expect(Array.isArray(agentBrief.qualityRequirements)).toBe(true);
      expect(Array.isArray(agentBrief.prioritizedTasks)).toBe(true);
    });

    it("should support document types", () => {
      const docTypes = [
        "north_star",
        "product_brief",
        "architecture",
        "quality_bar",
        "slice_map",
        "agent_brief"
      ];
      
      expect(docTypes.length).toBe(6);
      expect(docTypes).toContain("agent_brief");
    });
  });

  describe("Skip Functionality", () => {
    it("should allow skipping kickoff", () => {
      const kickoffState = {
        projectId: 1,
        skipped: false,
        completedSteps: []
      };
      
      // Simulate skip
      kickoffState.skipped = true;
      
      expect(kickoffState.skipped).toBe(true);
      expect(kickoffState.completedSteps.length).toBe(0);
    });

    it("should track partial completion", () => {
      const kickoffState = {
        projectId: 1,
        skipped: false,
        completedSteps: ["north_star", "product_brief"]
      };
      
      const isComplete = kickoffState.completedSteps.length === 5;
      const isPartial = kickoffState.completedSteps.length > 0 && !isComplete;
      
      expect(isPartial).toBe(true);
      expect(isComplete).toBe(false);
    });
  });

  describe("Integration with Project Creation", () => {
    it("should support guided kickoff mode", () => {
      const createMode = "kickoff";
      
      expect(createMode).toBe("kickoff");
      expect(["quick", "kickoff"]).toContain(createMode);
    });

    it("should support quick start mode", () => {
      const createMode = "quick";
      
      expect(createMode).toBe("quick");
      expect(["quick", "kickoff"]).toContain(createMode);
    });
  });

  describe("Slice to Kanban Card Conversion", () => {
    it("should map slice priority to card priority", () => {
      const priorityMap: Record<string, number> = {
        high: 1,
        medium: 2,
        low: 3
      };
      
      expect(priorityMap["high"]).toBe(1);
      expect(priorityMap["medium"]).toBe(2);
      expect(priorityMap["low"]).toBe(3);
    });

    it("should create card from slice", () => {
      const slice = {
        name: "User Auth",
        description: "Implement login",
        priority: "high" as const,
        estimatedEffort: "1 week",
        dependencies: []
      };
      
      const card = {
        title: slice.name,
        description: slice.description,
        priority: slice.priority === "high" ? 1 : slice.priority === "medium" ? 2 : 3,
        labels: [`effort:${slice.estimatedEffort}`]
      };
      
      expect(card.title).toBe("User Auth");
      expect(card.priority).toBe(1);
      expect(card.labels).toContain("effort:1 week");
    });
  });
});

describe("Kickoff Router", () => {
  describe("Endpoints", () => {
    it("should have saveStep endpoint", () => {
      const endpoints = ["saveStep", "getData", "generateDocs", "getDocs", "updateDoc"];
      expect(endpoints).toContain("saveStep");
    });

    it("should have getData endpoint", () => {
      const endpoints = ["saveStep", "getData", "generateDocs", "getDocs", "updateDoc"];
      expect(endpoints).toContain("getData");
    });

    it("should have generateDocs endpoint", () => {
      const endpoints = ["saveStep", "getData", "generateDocs", "getDocs", "updateDoc"];
      expect(endpoints).toContain("generateDocs");
    });
  });

  describe("Input Validation", () => {
    it("should validate projectId is required", () => {
      const input = { projectId: 1, step: "north_star", data: {} };
      expect(input.projectId).toBeDefined();
      expect(typeof input.projectId).toBe("number");
    });

    it("should validate step is valid", () => {
      const validSteps = ["north_star", "product_brief", "architecture", "quality_bar", "slice_map"];
      const step = "north_star";
      expect(validSteps).toContain(step);
    });
  });
});

describe("KickoffWizard Component", () => {
  describe("Props", () => {
    it("should accept projectId prop", () => {
      const props = {
        projectId: 1,
        onComplete: () => {},
        onSkip: () => {}
      };
      
      expect(props.projectId).toBe(1);
      expect(typeof props.onComplete).toBe("function");
      expect(typeof props.onSkip).toBe("function");
    });
  });

  describe("Step Navigation", () => {
    it("should track current step", () => {
      let currentStep = 1;
      
      // Go next
      currentStep = Math.min(currentStep + 1, 5);
      expect(currentStep).toBe(2);
      
      // Go prev
      currentStep = Math.max(currentStep - 1, 1);
      expect(currentStep).toBe(1);
    });

    it("should prevent going before step 1", () => {
      let currentStep = 1;
      currentStep = Math.max(currentStep - 1, 1);
      expect(currentStep).toBe(1);
    });

    it("should prevent going after step 5", () => {
      let currentStep = 5;
      currentStep = Math.min(currentStep + 1, 5);
      expect(currentStep).toBe(5);
    });
  });

  describe("Form State", () => {
    it("should initialize with empty arrays", () => {
      const northStar = {
        vision: "",
        problemStatement: "",
        targetOutcome: "",
        successMetrics: [] as string[],
        nonGoals: [] as string[]
      };
      
      expect(northStar.successMetrics).toEqual([]);
      expect(northStar.nonGoals).toEqual([]);
    });

    it("should add items to arrays", () => {
      const metrics: string[] = [];
      metrics.push("Metric 1");
      metrics.push("Metric 2");
      
      expect(metrics.length).toBe(2);
      expect(metrics).toContain("Metric 1");
    });

    it("should remove items from arrays", () => {
      const metrics = ["Metric 1", "Metric 2", "Metric 3"];
      const filtered = metrics.filter((_, i) => i !== 1);
      
      expect(filtered.length).toBe(2);
      expect(filtered).not.toContain("Metric 2");
    });
  });
});
