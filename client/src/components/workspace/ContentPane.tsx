import { Suspense, lazy, useState, useCallback } from "react";
import { PaneContent, PaneContentType } from "@/hooks/useWorkspaceState";
import { PaneSelector } from "./PaneSelector";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy components
const BoardContent = lazy(() => import("./panes/BoardPane"));
const GitHubContent = lazy(() => import("./panes/GitHubPane"));
const EditorContent = lazy(() => import("./panes/EditorPane"));
const BrowserContent = lazy(() => import("./panes/BrowserPane"));
const DriveContent = lazy(() => import("./panes/DrivePane"));

interface ContentPaneProps {
  content: PaneContent;
  onContentChange: (content: PaneContent) => void;
  isActive: boolean;
  onActivate: () => void;
  paneIndex: number;
  onMaximize?: () => void;
  isMaximized?: boolean;
  isMobile?: boolean;
}

function PaneLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function EmptyPane({ onTypeChange }: { onTypeChange: (type: PaneContentType) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
      <div className="text-center">
        <p className="text-sm mb-4">Select content to display</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => onTypeChange('board')}>
            Board
          </Button>
          <Button variant="outline" size="sm" onClick={() => onTypeChange('github')}>
            GitHub
          </Button>
          <Button variant="outline" size="sm" onClick={() => onTypeChange('browser')}>
            Browser
          </Button>
          <Button variant="outline" size="sm" onClick={() => onTypeChange('drive')}>
            Drive
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ContentPane({
  content,
  onContentChange,
  isActive,
  onActivate,
  paneIndex,
  onMaximize,
  isMaximized,
  isMobile = false,
}: ContentPaneProps) {
  const handleTypeChange = useCallback((type: PaneContentType) => {
    onContentChange({ ...content, type });
  }, [content, onContentChange]);

  const handleClear = useCallback(() => {
    onContentChange({ type: 'empty' });
  }, [onContentChange]);

  const renderContent = () => {
    switch (content.type) {
      case 'board':
        return (
          <Suspense fallback={<PaneLoading />}>
            <BoardContent boardId={content.boardId} />
          </Suspense>
        );
      case 'github':
        return (
          <Suspense fallback={<PaneLoading />}>
            <GitHubContent
              owner={content.repoOwner}
              repo={content.repoName}
              branch={content.branch}
              onRepoChange={(owner: string, repo: string, branch: string) => {
                onContentChange({ ...content, repoOwner: owner, repoName: repo, branch });
              }}
            />
          </Suspense>
        );
      case 'editor':
        return (
          <Suspense fallback={<PaneLoading />}>
            <EditorContent filePath={content.filePath} />
          </Suspense>
        );
      case 'browser':
        return (
          <Suspense fallback={<PaneLoading />}>
            <BrowserContent
              url={content.browserUrl}
              onUrlChange={(url: string) => onContentChange({ ...content, browserUrl: url })}
            />
          </Suspense>
        );
      case 'drive':
        return (
          <Suspense fallback={<PaneLoading />}>
            <DriveContent />
          </Suspense>
        );
      case 'empty':
      default:
        return <EmptyPane onTypeChange={handleTypeChange} />;
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-background ${
        isActive ? 'ring-1 ring-primary/50' : ''
      }`}
      onClick={onActivate}
    >
      {/* Pane Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Pane {paneIndex + 1}
          </span>
          <PaneSelector
            value={content.type}
            onChange={handleTypeChange}
            className="w-[120px]"
          />
        </div>
        <div className="flex items-center gap-1">
          {onMaximize && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onMaximize();
              }}
            >
              {isMaximized ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          )}
          {content.type !== 'empty' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Pane Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
