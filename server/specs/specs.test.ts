/**
 * Specs Unit Tests
 * Sprint 3: Prompt-to-Plan Workflow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  generateEarsRequirements, 
  formatRequirementsAsMarkdown,
  type EarsRequirement,
  type GeneratedSpec
} from "./earsGenerator";

// Mock the LLM module
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn()
}));

import { invokeLLM } from "../_core/llm";

describe("EARS Requirements Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateEarsRequirements", () => {
    it("should generate requirements from a simple prompt", async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: "User Authentication",
              overview: "Implement secure user authentication",
              requirements: [
                {
                  id: "REQ-001",
                  type: "ubiquitous",
                  text: "The system shall encrypt all passwords using bcrypt",
                  rationale: "Security best practice",
                  acceptanceCriteria: ["Passwords are hashed", "Salt is unique per user"]
                }
              ],
              technicalConsiderations: "Use bcrypt with cost factor 12",
              outOfScope: ["Social login"],
              assumptions: ["Users have valid email addresses"]
            })
          }
        }]
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const result = await generateEarsRequirements("Add user authentication");

      expect(result.title).toBe("User Authentication");
      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].type).toBe("ubiquitous");
      expect(result.requirements[0].id).toBe("REQ-001");
    });

    it("should include project context when provided", async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: "API Rate Limiting",
              overview: "Add rate limiting to protect APIs",
              requirements: [],
              outOfScope: [],
              assumptions: []
            })
          }
        }]
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      await generateEarsRequirements("Add rate limiting", {
        projectContext: "E-commerce platform",
        existingFeatures: ["User auth", "Product catalog"],
        constraints: ["Must support 1000 req/s"]
      });

      expect(invokeLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("E-commerce platform")
            })
          ])
        })
      );
    });

    it("should throw error when LLM returns no content", async () => {
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: null } }]
      } as any);

      await expect(generateEarsRequirements("Test prompt"))
        .rejects.toThrow("No response from LLM");
    });

    it("should throw error when LLM returns invalid JSON", async () => {
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: "not valid json" } }]
      } as any);

      await expect(generateEarsRequirements("Test prompt"))
        .rejects.toThrow("Failed to parse LLM response as JSON");
    });
  });

  describe("formatRequirementsAsMarkdown", () => {
    it("should format a complete spec as markdown", () => {
      const spec: GeneratedSpec = {
        title: "User Authentication",
        overview: "Secure authentication system",
        requirements: [
          {
            id: "REQ-001",
            type: "ubiquitous",
            text: "The system shall hash passwords",
            rationale: "Security",
            acceptanceCriteria: ["Passwords are hashed"]
          },
          {
            id: "REQ-002",
            type: "event_driven",
            text: "When a user logs in, the system shall create a session",
            acceptanceCriteria: ["Session is created", "Token is returned"]
          }
        ],
        technicalConsiderations: "Use JWT tokens",
        outOfScope: ["Social login", "2FA"],
        assumptions: ["Users have email"]
      };

      const markdown = formatRequirementsAsMarkdown(spec);

      expect(markdown).toContain("# User Authentication");
      expect(markdown).toContain("## Overview");
      expect(markdown).toContain("Secure authentication system");
      expect(markdown).toContain("## Requirements");
      expect(markdown).toContain("REQ-001");
      expect(markdown).toContain("### Ubiquitous Requirements");
      expect(markdown).toContain("REQ-002");
      expect(markdown).toContain("### Event-Driven Requirements");
      expect(markdown).toContain("## Technical Considerations");
      expect(markdown).toContain("JWT tokens");
      expect(markdown).toContain("## Out of Scope");
      expect(markdown).toContain("Social login");
      expect(markdown).toContain("## Assumptions");
      expect(markdown).toContain("Users have email");
    });

    it("should handle empty optional fields", () => {
      const spec: GeneratedSpec = {
        title: "Simple Feature",
        overview: "A simple feature",
        requirements: [],
        outOfScope: [],
        assumptions: []
      };

      const markdown = formatRequirementsAsMarkdown(spec);

      expect(markdown).toContain("# Simple Feature");
      expect(markdown).not.toContain("## Technical Considerations");
      expect(markdown).not.toContain("## Out of Scope");
      expect(markdown).not.toContain("## Assumptions");
    });

    it("should format all EARS requirement types correctly", () => {
      const spec: GeneratedSpec = {
        title: "Test",
        overview: "Test",
        requirements: [
          { id: "R1", type: "ubiquitous", text: "Test 1" },
          { id: "R2", type: "event_driven", text: "Test 2" },
          { id: "R3", type: "state_driven", text: "Test 3" },
          { id: "R4", type: "optional", text: "Test 4" },
          { id: "R5", type: "complex", text: "Test 5" }
        ],
        outOfScope: [],
        assumptions: []
      };

      const markdown = formatRequirementsAsMarkdown(spec);

      expect(markdown).toContain("### Ubiquitous Requirements");
      expect(markdown).toContain("### Event-Driven Requirements");
      expect(markdown).toContain("### State-Driven Requirements");
      expect(markdown).toContain("### Optional Requirements");
      expect(markdown).toContain("### Complex Requirements");
    });
  });
});

describe("EARS Requirement Types", () => {
  it("should validate ubiquitous requirements format", () => {
    const req: EarsRequirement = {
      id: "REQ-001",
      type: "ubiquitous",
      text: "The system shall encrypt all data at rest"
    };
    
    expect(req.type).toBe("ubiquitous");
    expect(req.text).toContain("shall");
  });

  it("should validate event-driven requirements format", () => {
    const req: EarsRequirement = {
      id: "REQ-002",
      type: "event_driven",
      text: "When the user clicks submit, the system shall validate the form"
    };
    
    expect(req.type).toBe("event_driven");
    expect(req.text.toLowerCase()).toContain("when");
  });

  it("should validate state-driven requirements format", () => {
    const req: EarsRequirement = {
      id: "REQ-003",
      type: "state_driven",
      text: "While the system is in maintenance mode, the system shall display a maintenance message"
    };
    
    expect(req.type).toBe("state_driven");
    expect(req.text.toLowerCase()).toContain("while");
  });

  it("should validate optional requirements format", () => {
    const req: EarsRequirement = {
      id: "REQ-004",
      type: "optional",
      text: "Where dark mode is enabled, the system shall use dark theme colors"
    };
    
    expect(req.type).toBe("optional");
    expect(req.text.toLowerCase()).toContain("where");
  });

  it("should validate complex requirements format", () => {
    const req: EarsRequirement = {
      id: "REQ-005",
      type: "complex",
      text: "While the user is logged in, when they click logout, the system shall terminate the session"
    };
    
    expect(req.type).toBe("complex");
  });
});

describe("Spec Data Structures", () => {
  it("should create a valid GeneratedSpec object", () => {
    const spec: GeneratedSpec = {
      title: "Feature Title",
      overview: "Feature overview",
      requirements: [
        {
          id: "REQ-001",
          type: "ubiquitous",
          text: "Requirement text",
          rationale: "Why this is needed",
          acceptanceCriteria: ["Criterion 1", "Criterion 2"]
        }
      ],
      technicalConsiderations: "Technical notes",
      outOfScope: ["Not included"],
      assumptions: ["Assumed true"]
    };

    expect(spec.title).toBeDefined();
    expect(spec.overview).toBeDefined();
    expect(spec.requirements).toBeInstanceOf(Array);
    expect(spec.requirements[0].acceptanceCriteria).toHaveLength(2);
  });

  it("should allow optional fields to be undefined", () => {
    const spec: GeneratedSpec = {
      title: "Minimal Spec",
      overview: "Minimal",
      requirements: [],
      outOfScope: [],
      assumptions: []
    };

    expect(spec.technicalConsiderations).toBeUndefined();
    expect(spec.requirements).toHaveLength(0);
  });
});
