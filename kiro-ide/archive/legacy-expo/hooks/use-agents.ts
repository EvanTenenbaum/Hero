import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AGENTS_KEY = "hero_agents";

export type AgentStatus = "idle" | "running" | "paused" | "completed" | "failed";
export type AgentType = "coding" | "review" | "planning" | "documentation" | "testing" | "custom";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentTask: string | null;
  taskId: string | null;
  progress: number;
  tokensUsed: number;
  runtime: number; // seconds
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  logs: AgentLog[];
  config: AgentConfig;
}

export interface AgentLog {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

export interface AgentConfig {
  maxTokens: number;
  temperature: number;
  model: string;
  systemPrompt: string;
  contextRules: ContextRule[];
  autoCommit: boolean;
}

export interface ContextRule {
  type: "current_file" | "related_files" | "project_structure" | "recent_changes" | "roadmap" | "custom";
  enabled: boolean;
  pattern?: string;
  count?: number;
}

const defaultConfig: AgentConfig = {
  maxTokens: 4096,
  temperature: 0.7,
  model: "auto",
  systemPrompt: "",
  contextRules: [
    { type: "current_file", enabled: true },
    { type: "related_files", enabled: true, pattern: "*.ts,*.tsx" },
    { type: "project_structure", enabled: true },
    { type: "recent_changes", enabled: true, count: 10 },
    { type: "roadmap", enabled: false },
  ],
  autoCommit: false,
};

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(AGENTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const agentsWithDates = parsed.map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          startedAt: a.startedAt ? new Date(a.startedAt) : null,
          completedAt: a.completedAt ? new Date(a.completedAt) : null,
          logs: a.logs.map((l: any) => ({
            ...l,
            timestamp: new Date(l.timestamp),
          })),
        }));
        setAgents(agentsWithDates);
      }
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const saveAgents = useCallback(async (newAgents: Agent[]) => {
    try {
      await AsyncStorage.setItem(AGENTS_KEY, JSON.stringify(newAgents));
      setAgents(newAgents);
    } catch (error) {
      console.error("Failed to save agents:", error);
    }
  }, []);

  const spawnAgent = useCallback(
    async (type: AgentType, task: string, taskId?: string): Promise<Agent> => {
      const newAgent: Agent = {
        id: generateId(),
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent ${agents.length + 1}`,
        type,
        status: "running",
        currentTask: task,
        taskId: taskId || null,
        progress: 0,
        tokensUsed: 0,
        runtime: 0,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
        logs: [
          {
            id: generateId(),
            timestamp: new Date(),
            level: "info",
            message: `Agent spawned for task: ${task}`,
          },
        ],
        config: { ...defaultConfig },
      };

      await saveAgents([newAgent, ...agents]);
      
      // Simulate agent progress
      simulateAgentProgress(newAgent.id);
      
      return newAgent;
    },
    [agents, saveAgents]
  );

  const pauseAgent = useCallback(
    async (id: string) => {
      const updated = agents.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "paused" as AgentStatus,
              logs: [
                ...a.logs,
                {
                  id: generateId(),
                  timestamp: new Date(),
                  level: "info" as const,
                  message: "Agent paused by user",
                },
              ],
            }
          : a
      );
      await saveAgents(updated);
    },
    [agents, saveAgents]
  );

  const resumeAgent = useCallback(
    async (id: string) => {
      const updated = agents.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "running" as AgentStatus,
              logs: [
                ...a.logs,
                {
                  id: generateId(),
                  timestamp: new Date(),
                  level: "info" as const,
                  message: "Agent resumed by user",
                },
              ],
            }
          : a
      );
      await saveAgents(updated);
    },
    [agents, saveAgents]
  );

  const killAgent = useCallback(
    async (id: string) => {
      const updated = agents.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "failed" as AgentStatus,
              completedAt: new Date(),
              logs: [
                ...a.logs,
                {
                  id: generateId(),
                  timestamp: new Date(),
                  level: "warn" as const,
                  message: "Agent terminated by user",
                },
              ],
            }
          : a
      );
      await saveAgents(updated);
    },
    [agents, saveAgents]
  );

  const updateAgentProgress = useCallback(
    async (id: string, progress: number, tokensUsed: number) => {
      const updated = agents.map((a) =>
        a.id === id
          ? {
              ...a,
              progress,
              tokensUsed,
              runtime: a.startedAt
                ? Math.floor((Date.now() - a.startedAt.getTime()) / 1000)
                : 0,
            }
          : a
      );
      await saveAgents(updated);
    },
    [agents, saveAgents]
  );

  const completeAgent = useCallback(
    async (id: string, success: boolean) => {
      const updated = agents.map((a) =>
        a.id === id
          ? {
              ...a,
              status: success ? ("completed" as AgentStatus) : ("failed" as AgentStatus),
              progress: success ? 100 : a.progress,
              completedAt: new Date(),
              logs: [
                ...a.logs,
                {
                  id: generateId(),
                  timestamp: new Date(),
                  level: success ? ("info" as const) : ("error" as const),
                  message: success ? "Task completed successfully" : "Task failed",
                },
              ],
            }
          : a
      );
      await saveAgents(updated);
    },
    [agents, saveAgents]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadAgents();
  }, [loadAgents]);

  // Simulated progress for demo
  const simulateAgentProgress = (agentId: string) => {
    let progress = 0;
    let tokens = 0;
    const interval = setInterval(async () => {
      progress += Math.random() * 15;
      tokens += Math.floor(Math.random() * 500);
      
      if (progress >= 100) {
        clearInterval(interval);
        await completeAgent(agentId, true);
      } else {
        await updateAgentProgress(agentId, Math.min(progress, 99), tokens);
      }
    }, 2000);
  };

  return {
    agents,
    loading,
    spawnAgent,
    pauseAgent,
    resumeAgent,
    killAgent,
    updateAgentProgress,
    completeAgent,
    refresh,
  };
}

function generateId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
