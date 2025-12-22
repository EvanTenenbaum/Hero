import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Github, Folder, FileCode, ChevronRight, RefreshCw, ExternalLink, Download, GitPullRequest } from "lucide-react";
import { CloneRepoDialog } from "@/components/github/CloneRepoDialog";
import { PRListPanel } from "@/components/github/PRListPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GitHubPaneProps {
  owner?: string;
  repo?: string;
  branch?: string;
  onRepoChange?: (owner: string, repo: string, branch: string) => void;
}

interface FileTreeItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  size?: number;
}

export default function GitHubPane({ owner, repo, branch, onRepoChange }: GitHubPaneProps) {
  const [selectedOwner, setSelectedOwner] = useState(owner || "");
  const [selectedRepo, setSelectedRepo] = useState(repo || "");
  const [selectedBranch, setSelectedBranch] = useState(branch || "main");
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "prs">("files");
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);

  // Check GitHub connection
  const { data: connectionData, isLoading: connectionLoading } = trpc.github.getConnection.useQuery();
  const connection = connectionData?.connected ? connectionData : null;
  
  // Fetch repositories
  const { data: repos, isLoading: reposLoading } = trpc.github.listRepos.useQuery(
    { sort: "updated" },
    { enabled: !!connection }
  );

  // Fetch branches
  const { data: branches } = trpc.github.listBranches.useQuery(
    { owner: selectedOwner, repo: selectedRepo },
    { enabled: !!selectedOwner && !!selectedRepo && !!connection }
  );

  // Fetch directory contents
  const { data: contents, isLoading: contentsLoading, refetch: refetchContents } = trpc.github.getContents.useQuery(
    { owner: selectedOwner, repo: selectedRepo, path: currentPath, ref: selectedBranch },
    { enabled: !!selectedOwner && !!selectedRepo && !!connection }
  );

  // Convert contents to file tree items
  const fileTree: FileTreeItem[] = Array.isArray(contents) 
    ? contents.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type === "dir" ? "dir" : "file",
        sha: item.sha,
        size: item.size,
      }))
    : [];

  // Fetch file content
  const { data: fileContent, isLoading: contentLoading } = trpc.github.getFileContent.useQuery(
    { owner: selectedOwner, repo: selectedRepo, path: selectedFile!, ref: selectedBranch },
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
      setSelectedBranch("main");
      // Find repo ID for cloning
      const selectedRepoData = repos?.find(r => r.full_name === repoFullName);
      setSelectedRepoId(selectedRepoData?.id || null);
    }
  };

  const handleItemClick = (item: FileTreeItem) => {
    if (item.type === "dir") {
      setCurrentPath(item.path);
      setSelectedFile(null);
    } else {
      setSelectedFile(item.path);
    }
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
        <p className="text-xs text-muted-foreground mb-4">GitHub OAuth Coming Soon</p>
        <Button disabled>
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
              <SelectItem key={r.id} value={r.full_name}>
                {r.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {branches && branches.length > 0 && (
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.name} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => refetchContents()}
          disabled={!selectedRepo}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        {selectedRepo && selectedRepoId && (
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setCloneDialogOpen(true)}
          >
            <Download className="h-4 w-4 mr-1" />
            Clone
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="px-3 py-2 border-b">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "files" | "prs")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files" className="text-xs">
              <Folder className="h-3 w-3 mr-1" />
              Files
            </TabsTrigger>
            <TabsTrigger value="prs" className="text-xs">
              <GitPullRequest className="h-3 w-3 mr-1" />
              Pull Requests
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content area */}
      {activeTab === "prs" ? (
        <PRListPanel
          owner={selectedOwner}
          repo={selectedRepo}
          onSelectPR={(prNumber) => {
            window.open(`https://github.com/${selectedOwner}/${selectedRepo}/pull/${prNumber}`, "_blank");
          }}
        />
      ) : (
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
            {contentsLoading ? (
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
                {fileTree
                  .sort((a, b) => {
                    // Directories first, then files
                    if (a.type === "dir" && b.type !== "dir") return -1;
                    if (a.type !== "dir" && b.type === "dir") return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((item) => (
                    <button
                      key={item.path}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted text-left ${
                        selectedFile === item.path ? "bg-muted" : ""
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      {item.type === "dir" ? (
                        <Folder className="w-4 h-4 text-blue-400" />
                      ) : (
                        <FileCode className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="truncate">{item.name}</span>
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
      )}

      {/* Clone dialog */}
      {selectedRepoId && (
        <CloneRepoDialog
          open={cloneDialogOpen}
          onOpenChange={setCloneDialogOpen}
          owner={selectedOwner}
          repo={selectedRepo}
          repoId={selectedRepoId}
        />
      )}
    </div>
  );
}
