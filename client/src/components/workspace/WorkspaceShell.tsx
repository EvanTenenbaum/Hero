import { useState, useCallback } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Columns3,
  Github,
  Globe,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
  LayoutGrid,
  FolderKanban,
  Calendar,
  List,
  GanttChart,
  FileText,
  Search,
} from "lucide-react";
import { ContentPane } from "./ContentPane";
import { AgentPanel } from "./AgentPanel";
import { MobileWorkspace } from "./MobileWorkspace";
import { useWorkspaceState, PaneContent, PaneContentType } from "@/hooks/useWorkspaceState";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useWorkspaceShortcuts } from "@/hooks/useKeyboardShortcuts";

interface SidebarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  action?: () => void;
}

export function WorkspaceShell() {
  const {
    state,
    toggleLeftSidebar,
    toggleRightPanel,
    setPaneSizes,
    setPaneContent,
    setActivePaneIndex,
    setActiveAgentId,
  } = useWorkspaceState();

  const [maximizedPane, setMaximizedPane] = useState<number | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Keyboard shortcuts
  useWorkspaceShortcuts({
    onPaneSwitch: setActivePaneIndex,
    onToggleLeftSidebar: toggleLeftSidebar,
    onToggleRightPanel: toggleRightPanel,
  });

  // Return mobile layout for small screens
  if (isMobile) {
    return <MobileWorkspace />;
  }

  // Sidebar items
  const sidebarItems: SidebarItem[] = [
    {
      id: "board",
      icon: <FolderKanban className="w-5 h-5" />,
      label: "Board",
      action: () => setPaneContent(state.activePaneIndex as 0 | 1 | 2, { type: "board" }),
    },
    {
      id: "github",
      icon: <Github className="w-5 h-5" />,
      label: "GitHub",
      action: () => setPaneContent(state.activePaneIndex as 0 | 1 | 2, { type: "github" }),
    },
    {
      id: "browser",
      icon: <Globe className="w-5 h-5" />,
      label: "Browser",
      action: () => setPaneContent(state.activePaneIndex as 0 | 1 | 2, { type: "browser" }),
    },
    {
      id: "spec",
      icon: <FileText className="w-5 h-5" />,
      label: "Specs",
      action: () => setPaneContent(state.activePaneIndex as 0 | 1 | 2, { type: "spec" }),
    },
    {
      id: "search",
      icon: <Search className="w-5 h-5" />,
      label: "Search",
      action: () => setPaneContent(state.activePaneIndex as 0 | 1 | 2, { type: "search" }),
    },
  ];

  const handlePaneContentChange = useCallback(
    (index: 0 | 1 | 2, content: PaneContent) => {
      setPaneContent(index, content);
    },
    [setPaneContent]
  );

  const handleMaximize = useCallback((index: number) => {
    setMaximizedPane(prev => prev === index ? null : index);
  }, []);

  const renderPanes = () => {
    if (maximizedPane !== null) {
      // Show only the maximized pane
      return (
        <ContentPane
          content={state.panes[maximizedPane]}
          onContentChange={(content) => handlePaneContentChange(maximizedPane as 0 | 1 | 2, content)}
          isActive={true}
          onActivate={() => setActivePaneIndex(maximizedPane)}
          paneIndex={maximizedPane}
          onMaximize={() => handleMaximize(maximizedPane)}
          isMaximized={true}
        />
      );
    }

    return (
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full"
        onLayout={(sizes) => {
          if (sizes.length === 3) {
            setPaneSizes(sizes as [number, number, number]);
          }
        }}
      >
        {/* Pane 1 */}
        <ResizablePanel defaultSize={state.paneSizes[0]} minSize={15}>
          <ContentPane
            content={state.panes[0]}
            onContentChange={(content) => handlePaneContentChange(0, content)}
            isActive={state.activePaneIndex === 0}
            onActivate={() => setActivePaneIndex(0)}
            paneIndex={0}
            onMaximize={() => handleMaximize(0)}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Pane 2 */}
        <ResizablePanel defaultSize={state.paneSizes[1]} minSize={15}>
          <ContentPane
            content={state.panes[1]}
            onContentChange={(content) => handlePaneContentChange(1, content)}
            isActive={state.activePaneIndex === 1}
            onActivate={() => setActivePaneIndex(1)}
            paneIndex={1}
            onMaximize={() => handleMaximize(1)}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Pane 3 */}
        <ResizablePanel defaultSize={state.paneSizes[2]} minSize={15}>
          <ContentPane
            content={state.panes[2]}
            onContentChange={(content) => handlePaneContentChange(2, content)}
            isActive={state.activePaneIndex === 2}
            onActivate={() => setActivePaneIndex(2)}
            paneIndex={2}
            onMaximize={() => handleMaximize(2)}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r bg-muted/30 transition-all duration-200",
          state.leftSidebarCollapsed ? "w-12" : "w-48"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-2 border-b">
          {!state.leftSidebarCollapsed && (
            <span className="text-sm font-semibold px-2">Workspace</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleLeftSidebar}
          >
            {state.leftSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Sidebar Items */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sidebarItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3",
                  state.leftSidebarCollapsed && "justify-center px-2"
                )}
                onClick={item.action}
              >
                {item.icon}
                {!state.leftSidebarCollapsed && (
                  <span className="text-sm">{item.label}</span>
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Settings at bottom */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3",
              state.leftSidebarCollapsed && "justify-center px-2"
            )}
          >
            <Settings className="w-5 h-5" />
            {!state.leftSidebarCollapsed && (
              <span className="text-sm">Settings</span>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderPanes()}
      </div>

      {/* Right Panel - Agent Chat */}
      <div
        className={cn(
          "flex flex-col border-l bg-muted/30 transition-all duration-200",
          state.rightPanelCollapsed ? "w-12" : "w-80"
        )}
      >
        {/* Agent Panel Header */}
        <div className="flex items-center justify-between p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleRightPanel}
          >
            {state.rightPanelCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <PanelRightClose className="h-4 w-4" />
            )}
          </Button>
          {!state.rightPanelCollapsed && (
            <span className="text-sm font-semibold">Agent</span>
          )}
        </div>

        {/* Agent Content */}
        <AgentPanel
          collapsed={state.rightPanelCollapsed}
          onToggleCollapse={toggleRightPanel}
          activeAgentId={(state.activeAgentId as "pm" | "developer" | "qa" | "devops" | "research") || undefined}
          onAgentChange={setActiveAgentId}
        />
      </div>
    </div>
  );
}
