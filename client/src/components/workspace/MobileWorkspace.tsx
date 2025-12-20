import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  FolderKanban,
  Github,
  Globe,
  Bot,
  Menu,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ContentPane } from "./ContentPane";
import { AgentPanel } from "./AgentPanel";
import { useWorkspaceState, PaneContent } from "@/hooks/useWorkspaceState";
import { cn } from "@/lib/utils";

export function MobileWorkspace() {
  const {
    state,
    setPaneContent,
    setActivePaneIndex,
    setActiveAgentId,
  } = useWorkspaceState();

  const [activePaneIndex, setLocalActivePaneIndex] = useState(0);
  const [showAgentSheet, setShowAgentSheet] = useState(false);
  const [showSidebarSheet, setShowSidebarSheet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch handling for swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && activePaneIndex < 2) {
        // Swipe left - next pane
        setLocalActivePaneIndex(activePaneIndex + 1);
      } else if (diff < 0 && activePaneIndex > 0) {
        // Swipe right - previous pane
        setLocalActivePaneIndex(activePaneIndex - 1);
      }
    }
  };

  const handlePaneContentChange = useCallback(
    (content: PaneContent) => {
      setPaneContent(activePaneIndex as 0 | 1 | 2, content);
    },
    [activePaneIndex, setPaneContent]
  );

  const paneLabels = ["Pane 1", "Pane 2", "Pane 3"];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
        {/* Left: Menu */}
        <Sheet open={showSidebarSheet} onOpenChange={setShowSidebarSheet}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Hero IDE</h2>
              </div>
              <div className="flex-1 p-2 space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    handlePaneContentChange({ type: "board" });
                    setShowSidebarSheet(false);
                  }}
                >
                  <FolderKanban className="w-5 h-5" />
                  Board
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    handlePaneContentChange({ type: "github" });
                    setShowSidebarSheet(false);
                  }}
                >
                  <Github className="w-5 h-5" />
                  GitHub
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    handlePaneContentChange({ type: "browser" });
                    setShowSidebarSheet(false);
                  }}
                >
                  <Globe className="w-5 h-5" />
                  Browser
                </Button>
              </div>
              <div className="p-2 border-t">
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Settings className="w-5 h-5" />
                  Settings
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Center: Pane indicator */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocalActivePaneIndex(Math.max(0, activePaneIndex - 1))}
            disabled={activePaneIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  activePaneIndex === i ? "bg-primary" : "bg-muted-foreground/30"
                )}
                onClick={() => setLocalActivePaneIndex(i)}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocalActivePaneIndex(Math.min(2, activePaneIndex + 1))}
            disabled={activePaneIndex === 2}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Agent */}
        <Sheet open={showAgentSheet} onOpenChange={setShowAgentSheet}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bot className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <AgentPanel
              activeAgentId={(state.activeAgentId as "pm" | "developer" | "qa" | "devops" | "research") || undefined}
              onAgentChange={setActiveAgentId}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Pane Content - Swipeable */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activePaneIndex * 100}%)` }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-full h-full shrink-0">
              <ContentPane
                content={state.panes[i]}
                onContentChange={(content) => setPaneContent(i as 0 | 1 | 2, content)}
                isActive={activePaneIndex === i}
                onActivate={() => setLocalActivePaneIndex(i)}
                paneIndex={i}
                isMobile={true}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="flex items-center justify-around px-2 py-1 border-t bg-muted/30 shrink-0 safe-area-inset-bottom">
        <Button
          variant={activePaneIndex === 0 ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 flex-col h-14 gap-1"
          onClick={() => setLocalActivePaneIndex(0)}
        >
          <FolderKanban className="h-5 w-5" />
          <span className="text-[10px]">Pane 1</span>
        </Button>
        <Button
          variant={activePaneIndex === 1 ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 flex-col h-14 gap-1"
          onClick={() => setLocalActivePaneIndex(1)}
        >
          <Github className="h-5 w-5" />
          <span className="text-[10px]">Pane 2</span>
        </Button>
        <Button
          variant={activePaneIndex === 2 ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 flex-col h-14 gap-1"
          onClick={() => setLocalActivePaneIndex(2)}
        >
          <Globe className="h-5 w-5" />
          <span className="text-[10px]">Pane 3</span>
        </Button>
      </div>
    </div>
  );
}
