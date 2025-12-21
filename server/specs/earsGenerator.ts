/**
 * EARS Requirements Generator
 * Sprint 3: Prompt-to-Plan Workflow
 * 
 * Generates EARS-format (Easy Approach to Requirements Syntax) requirements
 * from natural language feature descriptions using LLM.
 */

import { invokeLLM } from "../_core/llm";

// EARS requirement types (including unwanted behavior pattern)
export type EarsType = "ubiquitous" | "event_driven" | "state_driven" | "optional" | "unwanted" | "complex";

export interface EarsRequirement {
  id: string;
  type: EarsType;
  text: string;
  // Structured EARS components
  precondition?: string;
  trigger?: string;
  system?: string;
  response?: string;
  rationale?: string;
  acceptanceCriteria?: string[];
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  context: string;
  options?: string[];
}

export interface GeneratedSpec {
  title: string;
  overview: string;
  requirements: EarsRequirement[];
  technicalConsiderations?: string;
  outOfScope?: string[];
  assumptions?: string[];
  clarificationQuestions?: ClarificationQuestion[];
  confidence?: number; // 0-100 confidence in interpretation
}

// EARS templates for each type (based on Alistair Mavin's original patterns)
const EARS_TEMPLATES = {
  ubiquitous: "The [system] shall [action].",
  event_driven: "When [trigger], the [system] shall [action].",
  state_driven: "While [state], the [system] shall [action].",
  optional: "Where [feature is enabled], the [system] shall [action].",
  unwanted: "If [unwanted condition], then the [system] shall [action].",
  complex: "While [state], when [trigger], the [system] shall [action]."
};

const EARS_SYSTEM_PROMPT = `You are a requirements engineering expert specializing in EARS (Easy Approach to Requirements Syntax) format.

Your task is to transform natural language feature descriptions into precise, testable EARS-format requirements.

## EARS Requirement Types:

1. **Ubiquitous** - Always active requirements
   Template: "The [system] shall [action]."
   Example: "The system shall encrypt all user passwords using bcrypt."

2. **Event-Driven** - Triggered by specific events
   Template: "When [trigger], the [system] shall [action]."
   Example: "When a user submits the login form, the system shall validate credentials within 2 seconds."

3. **State-Driven** - Active during specific states
   Template: "While [state], the [system] shall [action]."
   Example: "While the user is logged in, the system shall display the navigation menu."

4. **Optional** - Conditional on configuration
   Template: "Where [feature is enabled], the [system] shall [action]."
   Example: "Where two-factor authentication is enabled, the system shall require a verification code."

5. **Unwanted** - Error handling and unwanted conditions
   Template: "If [unwanted condition], then the [system] shall [action]."
   Example: "If an invalid credit card number is entered, then the system shall display 'please re-enter credit card details'."

6. **Complex** - Combines state and event triggers
   Template: "While [state], when [trigger], the [system] shall [action]."
   Example: "While the aircraft is on ground, when reverse thrust is commanded, the engine control system shall enable reverse thrust."

## Guidelines:
- Each requirement must be atomic (one testable behavior)
- Use precise, measurable language
- Avoid ambiguous terms like "quickly", "user-friendly", "efficient"
- Include acceptance criteria for each requirement
- Provide rationale explaining why the requirement exists
- Group related requirements logically

## Output Format:
Return a JSON object with:
- title: A concise title for the feature
- overview: 2-3 sentence description
- requirements: Array of EARS requirements with id, type, text, rationale, acceptanceCriteria
- technicalConsiderations: Technical notes for implementation
- outOfScope: What this feature explicitly does NOT include
- assumptions: Assumptions made during requirements analysis`;

/**
 * Generate EARS-format requirements from a natural language prompt
 */
export async function generateEarsRequirements(
  featurePrompt: string,
  context?: {
    projectContext?: string;
    existingFeatures?: string[];
    constraints?: string[];
  }
): Promise<GeneratedSpec> {
  const contextSection = context ? `
## Project Context:
${context.projectContext || "No specific project context provided."}

## Existing Features:
${context.existingFeatures?.join("\n- ") || "None specified."}

## Constraints:
${context.constraints?.join("\n- ") || "None specified."}
` : "";

  const userPrompt = `${contextSection}

## Feature Request:
${featurePrompt}

Generate comprehensive EARS-format requirements for this feature. Return valid JSON only.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: EARS_SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ears_spec",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Feature title" },
            overview: { type: "string", description: "2-3 sentence overview" },
            requirements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Unique requirement ID like REQ-001" },
                  type: { 
                    type: "string", 
                    enum: ["ubiquitous", "event_driven", "state_driven", "optional", "unwanted", "complex"],
                    description: "EARS requirement type"
                  },
                  precondition: { type: "string", description: "State that must be true (for state-driven/complex)" },
                  trigger: { type: "string", description: "Event or condition that triggers the behavior" },
                  system: { type: "string", description: "The system or component name" },
                  response: { type: "string", description: "What the system shall do" },
                  text: { type: "string", description: "The requirement in EARS format" },
                  rationale: { type: "string", description: "Why this requirement exists" },
                  acceptanceCriteria: {
                    type: "array",
                    items: { type: "string" },
                    description: "Testable acceptance criteria"
                  }
                },
                required: ["id", "type", "text", "rationale", "acceptanceCriteria"],
                additionalProperties: false
              }
            },
            technicalConsiderations: { type: "string", description: "Technical implementation notes" },
            outOfScope: {
              type: "array",
              items: { type: "string" },
              description: "What this feature does NOT include"
            },
            assumptions: {
              type: "array",
              items: { type: "string" },
              description: "Assumptions made during analysis"
            },
            clarificationQuestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  question: { type: "string" },
                  context: { type: "string" },
                  options: { type: "array", items: { type: "string" } }
                },
                required: ["id", "question", "context"],
                additionalProperties: false
              },
              description: "Questions to ask if the prompt is ambiguous"
            },
            confidence: { type: "number", description: "0-100 confidence in interpretation" }
          },
          required: ["title", "overview", "requirements", "technicalConsiderations", "outOfScope", "assumptions", "confidence"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No response from LLM");
  }

  try {
    return JSON.parse(content) as GeneratedSpec;
  } catch {
    throw new Error("Failed to parse LLM response as JSON");
  }
}

/**
 * Validate an EARS requirement follows the correct template
 */
export function validateEarsRequirement(requirement: EarsRequirement): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for required fields
  if (!requirement.id) issues.push("Missing requirement ID");
  if (!requirement.type) issues.push("Missing requirement type");
  if (!requirement.text) issues.push("Missing requirement text");

  // Validate text follows EARS pattern
  const text = requirement.text.toLowerCase();
  
  switch (requirement.type) {
    case "ubiquitous":
      if (!text.includes("shall")) {
        issues.push("Ubiquitous requirement should contain 'shall'");
      }
      break;
    case "event_driven":
      if (!text.startsWith("when ")) {
        issues.push("Event-driven requirement should start with 'When'");
      }
      break;
    case "state_driven":
      if (!text.startsWith("while ")) {
        issues.push("State-driven requirement should start with 'While'");
      }
      break;
    case "optional":
      if (!text.startsWith("where ")) {
        issues.push("Optional requirement should start with 'Where'");
      }
      break;
    case "unwanted":
      if (!text.startsWith("if ")) {
        issues.push("Unwanted requirement should start with 'If'");
      }
      if (!text.includes("then ")) {
        issues.push("Unwanted requirement should contain 'then'");
      }
      break;
    case "complex":
      if (!text.startsWith("while ")) {
        issues.push("Complex requirement should start with 'While'");
      }
      if (!text.includes("when ")) {
        issues.push("Complex requirement should contain 'when'");
      }
      break;
  }

  // Check for ambiguous terms
  const ambiguousTerms = ["quickly", "fast", "user-friendly", "efficient", "easy", "simple", "good"];
  for (const term of ambiguousTerms) {
    if (text.includes(term)) {
      issues.push(`Contains ambiguous term: "${term}"`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Format requirements as Markdown for display
 */
export function formatRequirementsAsMarkdown(spec: GeneratedSpec): string {
  let md = `# ${spec.title}\n\n`;
  md += `## Overview\n\n${spec.overview}\n\n`;
  
  md += `## Requirements\n\n`;
  
  // Group by type
  const byType: Record<EarsType, EarsRequirement[]> = {
    ubiquitous: [],
    event_driven: [],
    state_driven: [],
    optional: [],
    unwanted: [],
    complex: []
  };
  
  for (const req of spec.requirements) {
    byType[req.type].push(req);
  }
  
  const typeLabels: Record<EarsType, string> = {
    ubiquitous: "Ubiquitous Requirements",
    event_driven: "Event-Driven Requirements",
    state_driven: "State-Driven Requirements",
    optional: "Optional Requirements",
    unwanted: "Unwanted Behavior Requirements",
    complex: "Complex Requirements"
  };
  
  for (const [type, reqs] of Object.entries(byType)) {
    if (reqs.length > 0) {
      md += `### ${typeLabels[type as EarsType]}\n\n`;
      for (const req of reqs) {
        md += `**${req.id}**: ${req.text}\n\n`;
        if (req.rationale) {
          md += `> *Rationale:* ${req.rationale}\n\n`;
        }
        if (req.acceptanceCriteria && req.acceptanceCriteria.length > 0) {
          md += `*Acceptance Criteria:*\n`;
          for (const ac of req.acceptanceCriteria) {
            md += `- [ ] ${ac}\n`;
          }
          md += "\n";
        }
      }
    }
  }
  
  if (spec.technicalConsiderations) {
    md += `## Technical Considerations\n\n${spec.technicalConsiderations}\n\n`;
  }
  
  if (spec.outOfScope && spec.outOfScope.length > 0) {
    md += `## Out of Scope\n\n`;
    for (const item of spec.outOfScope) {
      md += `- ${item}\n`;
    }
    md += "\n";
  }
  
  if (spec.assumptions && spec.assumptions.length > 0) {
    md += `## Assumptions\n\n`;
    for (const item of spec.assumptions) {
      md += `- ${item}\n`;
    }
  }
  
  return md;
}

/**
 * Get the EARS template for a requirement type
 */
export function getEarsTemplate(type: EarsType): string {
  return EARS_TEMPLATES[type];
}

/**
 * Generate a unique requirement ID
 */
export function generateRequirementId(prefix: string = "REQ"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp.slice(-4)}${random}`;
}
