import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Github, Folder, FileCode, ChevronRight, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface GitHubPaneProps {
  owner?: string;
  repo?: string;
  branch?: string;
  onRepoChange?: (owner: string, repo: string, branch: string) => void;
}

interface FileTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export default function GitHubPane({ owner, repo, branch, onRepoChange }: GitHubPaneProps) {
  const [selectedOwner, setSelectedOwner] = useState(owner || "");
  const [selectedRepo, setSelectedRepo] = useState(repo || "");
  const [selectedBranch, setSelectedBranch] = useState(branch || "main");
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Check GitHub connection
  const { data: connection, isLoading: connectionLoading } = trpc.github.connection.useQuery();
  
  // Fetch repositories
  const { data: reposData, isLoading: reposLoading } = trpc.github.repositories.useQuery(
    undefined,
    { enabled: !!connection }
  );
  const repos = reposData?.repositories;

  // Fetch file tree (full tree, filter client-side)
  const { data: fullTree, isLoading: treeLoading, refetch: refetchTree } = trpc.github.getFileTree.useQuery(
    { owner: selectedOwner, repo: selectedRepo, branch: selectedBranch },
    { enabled: !!selectedOwner && !!selectedRepo && !!connection }
  );

  // Filter tree to show only items in current path
  const fileTree = fullTree?.filter(item => {
    if (!currentPath) {
      // Root level: show items without slashes or first level only
      return !item.path.includes("/");
    }
    // Show items that start with currentPath/ but don't have further slashes
    if (!item.path.startsWith(currentPath + "/")) return false;
    const remainder = item.path.slice(currentPath.length + 1);
    return !remainder.includes("/");
  });

  // Fetch file content
  const { data: fileContent, isLoading: contentLoading } = trpc.github.getFileContent.useQuery(
    { owner: selectedOwner, repo: selectedRepo, branch: selectedBranch, path: selectedFile! },
    { enabled: !!selectedFile && !!selectedOwner && !!selectedRepo }
  );

  // Update parent when repo changes
  useEffect(() => {
    if (selectedOwner && selectedRepo && selectedBranch && onRepoChange) {
      onRepoChange(selectedOwner, selectedRepo, selectedBranch);
    }
  }, [selectedOwner, selectedRepo, selectedBranch, onRepoChange]);

  const handleRepoSelect = (repoFullName: string) => {
    const parts = repoFullName.split("/");
    if (parts.length >= 2) {
      setSelectedOwner(parts[0]);
      setSelectedRepo(parts[1]);
      setCurrentPath("");
      setSelectedFile(null);
    }
  };

  const handleItemClick = (item: FileTreeItem) => {
    if (item.type === "tree") {
      setCurrentPath(item.path);
      setSelectedFile(null);
    } else {
      setSelectedFile(item.path);
    }
  };

  const getFileName = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  const handleNavigateUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  if (connectionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Github className="w-12 h-12 mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">Connect GitHub</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Connect your GitHub account to browse repositories
        </p>
        <Button onClick={() => window.open("/api/github/auth", "_blank")}>
          <Github className="w-4 h-4 mr-2" />
          Connect GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with repo selector */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0">
        <Github className="w-4 h-4 text-muted-foreground" />
        <Select
          value={selectedOwner && selectedRepo ? `${selectedOwner}/${selectedRepo}` : ""}
          onValueChange={handleRepoSelect}
        >
          <SelectTrigger className="flex-1 h-8">
            <SelectValue placeholder="Select repository" />
          </SelectTrigger>
          <SelectContent>
            {repos?.map((r) => (
              <SelectItem key={r.id} value={r.fullName}>
                {r.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => refetchTree()}
          disabled={!selectedRepo}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree */}
        <div className="w-64 border-r flex flex-col shrink-0">
          {/* Breadcrumb */}
          {currentPath && (
            <div className="flex items-center gap-1 px-3 py-2 border-b text-xs">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setCurrentPath("")}
              >
                root
              </Button>
              {currentPath.split("/").map((part, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setCurrentPath(arr.slice(0, i + 1).join("/"))}
                  >
                    {part}
                  </Button>
                </span>
              ))}
            </div>
          )}

          {/* File list */}
          <ScrollArea className="flex-1">
            {treeLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : !selectedRepo ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Select a repository
              </div>
            ) : (
              <div className="p-2">
                {currentPath && (
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                    onClick={handleNavigateUp}
                  >
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    <span>..</span>
                  </button>
                )}
                {fileTree?.map((item) => (
                  <button
                    key={item.path}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted text-left ${
                      selectedFile === item.path ? "bg-muted" : ""
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.type === "tree" ? (
                      <Folder className="w-4 h-4 text-blue-400" />
                    ) : (
                      <FileCode className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{getFileName(item.path)}</span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* File content viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <span className="text-sm font-medium truncate">{selectedFile}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(`https://github.com/${selectedOwner}/${selectedRepo}/blob/${selectedBranch}/${selectedFile}`, "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                {contentLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                    {fileContent?.content || "Unable to load file content"}
                  </pre>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">Select a file to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
