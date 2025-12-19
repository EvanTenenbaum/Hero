import { useState, useMemo } from "react";
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

interface TreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

interface FileTreeProps {
  owner: string;
  repo: string;
  branch?: string;
  onSelectFile?: (path: string, sha: string) => void;
  selectedPath?: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  children: TreeNode[];
}

function buildTree(items: TreeItem[]): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort items so directories come first, then alphabetically
  const sortedItems = [...items].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "tree" ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  for (const item of sortedItems) {
    const parts = item.path.split("/");
    const name = parts[parts.length - 1];
    
    const node: TreeNode = {
      name,
      path: item.path,
      type: item.type,
      sha: item.sha,
      size: item.size,
      children: [],
    };

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      }
    }

    nodeMap.set(item.path, node);
  }

  return root;
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

interface TreeNodeComponentProps {
  node: TreeNode;
  depth: number;
  onSelectFile?: (path: string, sha: string) => void;
  selectedPath?: string;
  expandedPaths: Set<string>;
  toggleExpanded: (path: string) => void;
}

function TreeNodeComponent({
  node,
  depth,
  onSelectFile,
  selectedPath,
  expandedPaths,
  toggleExpanded,
}: TreeNodeComponentProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isDirectory = node.type === "tree";

  const handleClick = () => {
    if (isDirectory) {
      toggleExpanded(node.path);
    } else {
      onSelectFile?.(node.path, node.sha);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 cursor-pointer rounded-sm hover:bg-accent/50 transition-colors",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
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
          </>
        ) : (
          <>
            <span className="w-4" />
            {getFileIcon(node.name)}
          </>
        )}
        <span className="text-sm truncate">{node.name}</span>
        {node.size !== undefined && !isDirectory && (
          <span className="text-xs text-muted-foreground ml-auto">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
      {isDirectory && isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileTree({ owner, repo, branch = "main", onSelectFile, selectedPath }: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const { data: treeData, isLoading, refetch } = trpc.github.getFileTree.useQuery(
    { owner, repo, branch },
    { enabled: !!owner && !!repo }
  );

  const tree = useMemo(() => {
    if (!treeData) return [];
    return buildTree(treeData);
  }, [treeData]);

  const toggleExpanded = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

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

  if (!treeData || tree.length === 0) {
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
          {tree.map((node) => (
            <TreeNodeComponent
              key={node.path}
              node={node}
              depth={0}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default FileTree;
