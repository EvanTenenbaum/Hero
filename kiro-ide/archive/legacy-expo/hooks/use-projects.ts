import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROJECTS_KEY = "hero_projects";

export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  lastModified: Date;
  createdAt: Date;
  filesCount: number;
  activeAgents: number;
  currentBranch: string;
  isPinned: boolean;
  context: ProjectContext;
}

export interface ProjectContext {
  recentFiles: string[];
  recentEdits: EditRecord[];
  openTabs: string[];
  cursorPositions: Record<string, { line: number; column: number }>;
  searchHistory: string[];
  gitStatus: GitStatus;
}

export interface EditRecord {
  file: string;
  timestamp: Date;
  type: "create" | "modify" | "delete";
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
}

const defaultContext: ProjectContext = {
  recentFiles: [],
  recentEdits: [],
  openTabs: [],
  cursorPositions: {},
  searchHistory: [],
  gitStatus: {
    branch: "main",
    ahead: 0,
    behind: 0,
    modified: [],
    staged: [],
    untracked: [],
  },
};

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(PROJECTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Convert date strings back to Date objects
        const projectsWithDates = parsed.map((p: any) => ({
          ...p,
          lastModified: new Date(p.lastModified),
          createdAt: new Date(p.createdAt),
          context: {
            ...p.context,
            recentEdits: p.context.recentEdits.map((e: any) => ({
              ...e,
              timestamp: new Date(e.timestamp),
            })),
          },
        }));
        setProjects(projectsWithDates);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const saveProjects = useCallback(async (newProjects: Project[]) => {
    try {
      await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(newProjects));
      setProjects(newProjects);
    } catch (error) {
      console.error("Failed to save projects:", error);
    }
  }, []);

  const createProject = useCallback(
    async (name: string, description: string = ""): Promise<Project> => {
      const newProject: Project = {
        id: generateId(),
        name,
        description,
        path: `/projects/${name.toLowerCase().replace(/\s+/g, "-")}`,
        lastModified: new Date(),
        createdAt: new Date(),
        filesCount: 0,
        activeAgents: 0,
        currentBranch: "main",
        isPinned: false,
        context: { ...defaultContext },
      };
      await saveProjects([newProject, ...projects]);
      return newProject;
    },
    [projects, saveProjects]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      const updated = projects.map((p) =>
        p.id === id ? { ...p, ...updates, lastModified: new Date() } : p
      );
      await saveProjects(updated);
    },
    [projects, saveProjects]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const filtered = projects.filter((p) => p.id !== id);
      await saveProjects(filtered);
    },
    [projects, saveProjects]
  );

  const getProject = useCallback(
    (id: string): Project | undefined => {
      return projects.find((p) => p.id === id);
    },
    [projects]
  );

  const updateContext = useCallback(
    async (id: string, contextUpdates: Partial<ProjectContext>) => {
      const project = projects.find((p) => p.id === id);
      if (project) {
        await updateProject(id, {
          context: { ...project.context, ...contextUpdates },
        });
      }
    },
    [projects, updateProject]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadProjects();
  }, [loadProjects]);

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    getProject,
    updateContext,
    refresh,
  };
}

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
