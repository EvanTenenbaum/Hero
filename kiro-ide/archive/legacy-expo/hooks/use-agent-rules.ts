import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AGENT_RULES_KEY = "hero_agent_rules";

export type AgentType = "coding" | "review" | "planning" | "documentation" | "testing" | "custom" | string;

export interface ContextRule {
  id: string;
  name: string;
  description: string;
  type?: "current_file" | "related_files" | "project_structure" | "recent_changes" | "roadmap" | "custom";
  enabled: boolean;
  pattern?: string;
  count?: number;
  customSource?: string;
}

export interface AgentTypeConfig {
  type: AgentType;
  name: string;
  description: string;
  systemPrompt: string;
  contextRules: ContextRule[];
  preferredModel?: string;
  maxTokens?: number;
  temperature?: number;
  autoCommit?: boolean;
  allowedActions?: string[];
  projectOverrides?: Record<string, Partial<AgentTypeConfig>>;
}

const defaultContextRules: ContextRule[] = [
  { id: "rule_1", name: "Current File", description: "Include the currently open file", type: "current_file", enabled: true },
  { id: "rule_2", name: "Related Files", description: "Include related files by pattern", type: "related_files", enabled: true, pattern: "*.ts,*.tsx,*.js,*.jsx" },
  { id: "rule_3", name: "Project Structure", description: "Include project file tree", type: "project_structure", enabled: true },
  { id: "rule_4", name: "Recent Changes", description: "Include recent git changes", type: "recent_changes", enabled: true, count: 10 },
  { id: "rule_5", name: "Roadmap", description: "Include roadmap and tasks", type: "roadmap", enabled: false },
];

const defaultAgentTypes: AgentTypeConfig[] = [
  {
    type: "coding",
    name: "Coding Agent",
    description: "Writes and modifies code based on requirements",
    systemPrompt: "You are an expert software developer. Write clean, maintainable code following best practices.",
    contextRules: [...defaultContextRules],
    preferredModel: undefined,
    maxTokens: 4096,
    temperature: 0.3,
    autoCommit: false,
    allowedActions: ["read", "write", "execute"],
    projectOverrides: {},
  },
  {
    type: "review",
    name: "Review Agent",
    description: "Reviews code for bugs, security issues, and improvements",
    systemPrompt: "You are a senior code reviewer. Identify bugs, security vulnerabilities, and suggest improvements.",
    contextRules: [
      { id: "rule_r1", name: "Current File", description: "Include the currently open file", type: "current_file", enabled: true },
      { id: "rule_r2", name: "Related Files", description: "Include related TypeScript files", type: "related_files", enabled: true, pattern: "*.ts,*.tsx" },
      { id: "rule_r3", name: "Recent Changes", description: "Include recent git changes", type: "recent_changes", enabled: true, count: 20 },
    ],
    preferredModel: undefined,
    maxTokens: 2048,
    temperature: 0.2,
    autoCommit: false,
    allowedActions: ["read"],
    projectOverrides: {},
  },
  {
    type: "planning",
    name: "Planning Agent",
    description: "Creates project plans, roadmaps, and task breakdowns",
    systemPrompt: "You are a technical project manager. Create detailed plans with clear tasks and dependencies.",
    contextRules: [
      { id: "rule_p1", name: "Project Structure", description: "Include project file tree", type: "project_structure", enabled: true },
      { id: "rule_p2", name: "Roadmap", description: "Include roadmap and tasks", type: "roadmap", enabled: true },
      { id: "rule_p3", name: "Recent Changes", description: "Include recent git changes", type: "recent_changes", enabled: true, count: 5 },
    ],
    preferredModel: undefined,
    maxTokens: 4096,
    temperature: 0.5,
    autoCommit: false,
    allowedActions: ["read", "write"],
    projectOverrides: {},
  },
  {
    type: "documentation",
    name: "Documentation Agent",
    description: "Writes and updates documentation and comments",
    systemPrompt: "You are a technical writer. Create clear, comprehensive documentation.",
    contextRules: [
      { id: "rule_d1", name: "Current File", description: "Include the currently open file", type: "current_file", enabled: true },
      { id: "rule_d2", name: "Project Structure", description: "Include project file tree", type: "project_structure", enabled: true },
    ],
    preferredModel: undefined,
    maxTokens: 2048,
    temperature: 0.4,
    autoCommit: false,
    allowedActions: ["read", "write"],
    projectOverrides: {},
  },
  {
    type: "testing",
    name: "Testing Agent",
    description: "Writes tests and identifies edge cases",
    systemPrompt: "You are a QA engineer. Write comprehensive tests covering edge cases and error scenarios.",
    contextRules: [
      { id: "rule_t1", name: "Current File", description: "Include the currently open file", type: "current_file", enabled: true },
      { id: "rule_t2", name: "Test Files", description: "Include related test files", type: "related_files", enabled: true, pattern: "*.test.ts,*.spec.ts" },
    ],
    preferredModel: undefined,
    maxTokens: 4096,
    temperature: 0.3,
    autoCommit: false,
    allowedActions: ["read", "write", "execute"],
    projectOverrides: {},
  },
];

export function useAgentRules() {
  const [agentTypes, setAgentTypes] = useState<AgentTypeConfig[]>(defaultAgentTypes);
  const [loading, setLoading] = useState(true);

  const loadAgentRules = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(AGENT_RULES_KEY);
      if (data) {
        setAgentTypes(JSON.parse(data));
      } else {
        // Initialize with defaults
        await AsyncStorage.setItem(AGENT_RULES_KEY, JSON.stringify(defaultAgentTypes));
      }
    } catch (error) {
      console.error("Failed to load agent rules:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgentRules();
  }, [loadAgentRules]);

  const saveAgentTypes = useCallback(async (newTypes: AgentTypeConfig[]) => {
    try {
      await AsyncStorage.setItem(AGENT_RULES_KEY, JSON.stringify(newTypes));
      setAgentTypes(newTypes);
    } catch (error) {
      console.error("Failed to save agent rules:", error);
    }
  }, []);

  const updateAgentType = useCallback(
    async (type: AgentType, updates: Partial<AgentTypeConfig>) => {
      const updated = agentTypes.map((at) =>
        at.type === type ? { ...at, ...updates } : at
      );
      await saveAgentTypes(updated);
    },
    [agentTypes, saveAgentTypes]
  );

  const addAgentType = useCallback(
    async (config: AgentTypeConfig) => {
      await saveAgentTypes([...agentTypes, config]);
    },
    [agentTypes, saveAgentTypes]
  );

  const addCustomAgentType = useCallback(
    async (config: Omit<AgentTypeConfig, "type" | "projectOverrides">) => {
      const newType: AgentTypeConfig = {
        ...config,
        type: "custom",
        projectOverrides: {},
      };
      await saveAgentTypes([...agentTypes, newType]);
    },
    [agentTypes, saveAgentTypes]
  );

  const deleteAgentType = useCallback(
    async (type: string) => {
      const filtered = agentTypes.filter((at) => at.type !== type);
      await saveAgentTypes(filtered);
    },
    [agentTypes, saveAgentTypes]
  );

  const deleteCustomAgentType = useCallback(
    async (name: string) => {
      const filtered = agentTypes.filter(
        (at) => !(at.type === "custom" && at.name === name)
      );
      await saveAgentTypes(filtered);
    },
    [agentTypes, saveAgentTypes]
  );

  const getAgentConfig = useCallback(
    (type: AgentType, projectId?: string): AgentTypeConfig | undefined => {
      const config = agentTypes.find((at) => at.type === type);
      if (!config) return undefined;

      if (projectId && config.projectOverrides?.[projectId]) {
        return { ...config, ...config.projectOverrides[projectId] };
      }
      return config;
    },
    [agentTypes]
  );

  const setProjectOverride = useCallback(
    async (
      type: AgentType,
      projectId: string,
      overrides: Partial<AgentTypeConfig>
    ) => {
      const config = agentTypes.find((at) => at.type === type);
      if (!config) return;

      await updateAgentType(type, {
        projectOverrides: {
          ...config.projectOverrides,
          [projectId]: overrides,
        },
      });
    },
    [agentTypes, updateAgentType]
  );

  return {
    agentTypes,
    loading,
    updateAgentType,
    addAgentType,
    addCustomAgentType,
    deleteAgentType,
    deleteCustomAgentType,
    getAgentConfig,
    setProjectOverride,
    refresh: loadAgentRules,
  };
}
