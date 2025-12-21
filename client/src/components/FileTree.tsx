import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
  FileCode,
  FileJson,
  FileText,
  Image,
  FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  owner: string;
  repo: string;
  branch?: string;
  onSelectFile?: (path: string, sha: string) => void;
  selectedPath?: string;
}

interface ContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir" | "symlink" | "submodule";
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  
  switch (ext) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "py":
    case "rb":
    case "go":
    case "rs":
    case "java":
    case "c":
    case "cpp":
    case "h":
    case "cs":
    case "php":
    case "swift":
    case "kt":
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case "json":
    case "yaml":
    case "yml":
    case "toml":
    case "xml":
      return <FileJson className="w-4 h-4 text-yellow-400" />;
    case "md":
    case "txt":
    case "rst":
      return <FileText className="w-4 h-4 text-gray-400" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
    case "ico":
      return <Image className="w-4 h-4 text-green-400" />;
    case "css":
    case "scss":
    case "less":
      return <FileType className="w-4 h-4 text-purple-400" />;
    case "html":
      return <FileCode className="w-4 h-4 text-orange-400" />;
    default:
      return <File className="w-4 h-4 text-muted-foreground" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DirectoryNodeProps {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  name: string;
  depth: number;
  onSelectFile?: (path: string, sha: string) => void;
  selectedPath?: string;
  expandedPaths: Set<string>;
  toggleExpanded: (path: string) => void;
}

function DirectoryNode({
  owner,
  repo,
  branch,
  path,
  name,
  depth,
  onSelectFile,
  selectedPath,
  expandedPaths,
  toggleExpanded,
}: DirectoryNodeProps) {
  const isExpanded = expandedPaths.has(path);
  
  // Only fetch contents when expanded
  const { data: contents, isLoading } = trpc.github.getContents.useQuery(
    { owner, repo, path, ref: branch },
    { enabled: isExpanded }
  );

  const handleClick = () => {
    toggleExpanded(path);
  };

  const items: ContentItem[] = Array.isArray(contents) ? contents : [];
  
  // Sort: directories first, then alphabetically
  const sortedItems = [...items].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 cursor-pointer rounded-sm hover:bg-accent/50 transition-colors"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        )}
        <span className="text-sm truncate">{name}</span>
      </div>
      {isExpanded && (
        <div>
          {isLoading ? (
            <div className="space-y-1 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          ) : (
            sortedItems.map((item) =>
              item.type === "dir" ? (
                <DirectoryNode
                  key={item.path}
                  owner={owner}
                  repo={repo}
                  branch={branch}
                  path={item.path}
                  name={item.name}
                  depth={depth + 1}
                  onSelectFile={onSelectFile}
                  selectedPath={selectedPath}
                  expandedPaths={expandedPaths}
                  toggleExpanded={toggleExpanded}
                />
              ) : (
                <FileNode
                  key={item.path}
                  item={item}
                  depth={depth + 1}
                  onSelectFile={onSelectFile}
                  selectedPath={selectedPath}
                />
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

interface FileNodeProps {
  item: ContentItem;
  depth: number;
  onSelectFile?: (path: string, sha: string) => void;
  selectedPath?: string;
}

function FileNode({ item, depth, onSelectFile, selectedPath }: FileNodeProps) {
  const isSelected = selectedPath === item.path;

  return (
    <div
      className={cn(
        "flex items-center gap-1 py-1 px-2 cursor-pointer rounded-sm hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent text-accent-foreground"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onSelectFile?.(item.path, item.sha)}
    >
      <span className="w-4" />
      {getFileIcon(item.name)}
      <span className="text-sm truncate">{item.name}</span>
      {item.size !== undefined && (
        <span className="text-xs text-muted-foreground ml-auto">
          {formatFileSize(item.size)}
        </span>
      )}
    </div>
  );
}

export function FileTree({ owner, repo, branch = "main", onSelectFile, selectedPath }: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Fetch root contents
  const { data: rootContents, isLoading, refetch } = trpc.github.getContents.useQuery(
    { owner, repo, path: "", ref: branch },
    { enabled: !!owner && !!repo }
  );

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const items: ContentItem[] = Array.isArray(rootContents) ? rootContents : [];
  
  // Sort: directories first, then alphabetically
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "dir" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4 ml-4" />
        <Skeleton className="h-6 w-3/4 ml-4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4 ml-4" />
      </div>
    );
  }

  if (sortedItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No files found in this repository
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-2 py-1 border-b">
        <span className="text-xs font-medium text-muted-foreground uppercase">Files</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {sortedItems.map((item) =>
            item.type === "dir" ? (
              <DirectoryNode
                key={item.path}
                owner={owner}
                repo={repo}
                branch={branch}
                path={item.path}
                name={item.name}
                depth={0}
                onSelectFile={onSelectFile}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                toggleExpanded={toggleExpanded}
              />
            ) : (
              <FileNode
                key={item.path}
                item={item}
                depth={0}
                onSelectFile={onSelectFile}
                selectedPath={selectedPath}
              />
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default FileTree;
