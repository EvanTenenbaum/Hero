import { useState, useCallback, useEffect } from 'react';

export type PaneContentType = 'board' | 'github' | 'editor' | 'browser' | 'drive' | 'spec' | 'search' | 'empty';

export interface PaneContent {
  type: PaneContentType;
  // Type-specific state
  boardId?: number;
  filePath?: string;
  browserUrl?: string;
  repoOwner?: string;
  repoName?: string;
  branch?: string;
  specId?: number;
  searchQuery?: string;
}

export interface WorkspaceState {
  // Layout
  leftSidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  paneSizes: [number, number, number];
  
  // Pane contents
  panes: [PaneContent, PaneContent, PaneContent];
  
  // Active pane for keyboard navigation
  activePaneIndex: number;
  
  // Agent panel
  activeAgentId: string | null;
}

const STORAGE_KEY = 'hero-ide-workspace-state';

const DEFAULT_STATE: WorkspaceState = {
  leftSidebarCollapsed: false,
  rightPanelCollapsed: false,
  paneSizes: [33, 34, 33],
  panes: [
    { type: 'board' },
    { type: 'github' },
    { type: 'empty' },
  ],
  activePaneIndex: 0,
  activeAgentId: null,
};

function loadState(): WorkspaceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load workspace state:', e);
  }
  return DEFAULT_STATE;
}

function saveState(state: WorkspaceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save workspace state:', e);
  }
}

export function useWorkspaceState() {
  const [state, setState] = useState<WorkspaceState>(loadState);

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Layout actions
  const toggleLeftSidebar = useCallback(() => {
    setState(prev => ({ ...prev, leftSidebarCollapsed: !prev.leftSidebarCollapsed }));
  }, []);

  const toggleRightPanel = useCallback(() => {
    setState(prev => ({ ...prev, rightPanelCollapsed: !prev.rightPanelCollapsed }));
  }, []);

  const setPaneSizes = useCallback((sizes: [number, number, number]) => {
    setState(prev => ({ ...prev, paneSizes: sizes }));
  }, []);

  // Pane content actions
  const setPaneContent = useCallback((index: 0 | 1 | 2, content: PaneContent) => {
    setState(prev => {
      const newPanes = [...prev.panes] as [PaneContent, PaneContent, PaneContent];
      newPanes[index] = content;
      return { ...prev, panes: newPanes };
    });
  }, []);

  const setActivePaneIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, activePaneIndex: index }));
  }, []);

  // Agent panel actions
  const setActiveAgentId = useCallback((agentId: string | null) => {
    setState(prev => ({ ...prev, activeAgentId: agentId }));
  }, []);

  // Reset to defaults
  const resetWorkspace = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return {
    state,
    // Layout
    toggleLeftSidebar,
    toggleRightPanel,
    setPaneSizes,
    // Panes
    setPaneContent,
    setActivePaneIndex,
    // Agents
    setActiveAgentId,
    // Utils
    resetWorkspace,
  };
}
