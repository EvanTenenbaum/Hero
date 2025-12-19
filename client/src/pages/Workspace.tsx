import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { FileTree } from "@/components/FileTree";
import { CodeEditor } from "@/components/CodeEditor";
import { RepositoryBrowser } from "@/components/RepositoryBrowser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { toast } from "sonner";
import {
  GitBranch,
  FolderGit2,
  Save,
  Plus,
  X,
  FileCode,
  MessageSquare,
  Bot,
} from "lucide-react";

interface OpenFile {
  path: string;
  sha: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
}

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  owner: string;
  ownerAvatar: string;
}

export default function Workspace() {
  const params = useParams<{ owner?: string; repo?: string }>();
  const [, navigate] = useLocation();
  
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [pendingSave, setPendingSave] = useState<{ path: string; content: string; sha: string } | null>(null);

  // Get owner/repo from URL params or selected repo
  const owner = params.owner || selectedRepo?.owner || "";
  const repo = params.repo || selectedRepo?.name || "";

  // Fetch branches when repo is selected
  const { data: branches } = trpc.github.getBranches.useQuery(
    { owner, repo },
    { enabled: !!owner && !!repo }
  );

  // Fetch file content when a file is selected
  const fileContentQuery = trpc.github.getFileContent.useQuery(
    { owner, repo, path: activeFilePath || "", branch: selectedBranch || undefined },
    { enabled: !!owner && !!repo && !!activeFilePath && !openFiles.find(f => f.path === activeFilePath) }
  );

  // Update file mutation
  const updateFileMutation = trpc.github.updateFile.useMutation({
    onSuccess: (result) => {
      toast.success("File saved successfully");
      setShowCommitDialog(false);
      setCommitMessage("");
      
      // Update the file's SHA and mark as not dirty
      if (pendingSave) {
        setOpenFiles(files => files.map(f => 
          f.path === pendingSave.path 
            ? { ...f, sha: result.sha, originalContent: f.content, isDirty: false }
            : f
        ));
        setPendingSave(null);
      }
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Handle repo selection
  const handleSelectRepository = useCallback((repo: Repository) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.defaultBranch);
    setOpenFiles([]);
    setActiveFilePath(null);
    navigate(`/workspace/${repo.owner}/${repo.name}`);
  }, [navigate]);

  // Handle file selection from tree
  const handleSelectFile = useCallback((path: string, sha: string) => {
    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === path);
    if (existingFile) {
      setActiveFilePath(path);
      return;
    }
    
    // File will be loaded by the query
    setActiveFilePath(path);
  }, [openFiles]);

  // When file content is loaded, add it to open files
  if (fileContentQuery.data && activeFilePath && !openFiles.find(f => f.path === activeFilePath)) {
    const newFile: OpenFile = {
      path: activeFilePath,
      sha: fileContentQuery.data.sha,
      content: fileContentQuery.data.content,
      originalContent: fileContentQuery.data.content,
      isDirty: false,
    };
    setOpenFiles(prev => [...prev, newFile]);
  }

  // Handle file content change
  const handleFileChange = useCallback((path: string, newContent: string) => {
    setOpenFiles(files => files.map(f => 
      f.path === path 
        ? { ...f, content: newContent, isDirty: newContent !== f.originalContent }
        : f
    ));
  }, []);

  // Handle file save
  const handleSave = useCallback((path: string, content: string) => {
    const file = openFiles.find(f => f.path === path);
    if (!file) return;
    
    setPendingSave({ path, content, sha: file.sha });
    setShowCommitDialog(true);
  }, [openFiles]);

  // Confirm save with commit message
  const handleConfirmSave = useCallback(() => {
    if (!pendingSave || !commitMessage.trim()) return;
    
    updateFileMutation.mutate({
      owner,
      repo,
      path: pendingSave.path,
      content: pendingSave.content,
      message: commitMessage,
      sha: pendingSave.sha,
      branch: selectedBranch || undefined,
    });
  }, [pendingSave, commitMessage, owner, repo, selectedBranch, updateFileMutation]);

  // Close file tab
  const handleCloseFile = useCallback((path: string) => {
    const file = openFiles.find(f => f.path === path);
    if (file?.isDirty) {
      if (!confirm("You have unsaved changes. Close anyway?")) {
        return;
      }
    }
    
    setOpenFiles(files => files.filter(f => f.path !== path));
    if (activeFilePath === path) {
      const remaining = openFiles.filter(f => f.path !== path);
      setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  }, [openFiles, activeFilePath]);

  const activeFile = openFiles.find(f => f.path === activeFilePath);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            {selectedRepo ? (
              <>
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selectedRepo.fullName}</span>
                </div>
                {branches && branches.length > 0 && (
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-[180px] h-8">
                      <GitBranch className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.name} value={branch.name}>
                          {branch.name}
                          {branch.protected && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              protected
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Select a repository to start</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/chat")}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/agents")}>
              <Bot className="w-4 h-4 mr-2" />
              Agents
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* Sidebar - Repository browser or File tree */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
              <div className="h-full border-r bg-muted/20">
                <Tabs defaultValue={selectedRepo ? "files" : "repos"} className="h-full flex flex-col">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2">
                    <TabsTrigger value="repos" className="text-xs">Repositories</TabsTrigger>
                    <TabsTrigger value="files" className="text-xs" disabled={!selectedRepo}>
                      Files
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="repos" className="flex-1 m-0 p-2 overflow-auto">
                    <RepositoryBrowser
                      onSelectRepository={handleSelectRepository}
                      selectedRepoId={selectedRepo?.id}
                    />
                  </TabsContent>
                  <TabsContent value="files" className="flex-1 m-0 overflow-hidden">
                    {selectedRepo && (
                      <FileTree
                        owner={owner}
                        repo={repo}
                        branch={selectedBranch}
                        onSelectFile={handleSelectFile}
                        selectedPath={activeFilePath || undefined}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Editor area */}
            <ResizablePanel defaultSize={80}>
              <div className="h-full flex flex-col">
                {/* File tabs */}
                {openFiles.length > 0 && (
                  <div className="flex items-center border-b bg-muted/30 overflow-x-auto">
                    {openFiles.map((file) => (
                      <div
                        key={file.path}
                        className={`flex items-center gap-2 px-3 py-2 border-r cursor-pointer hover:bg-accent/50 ${
                          activeFilePath === file.path ? "bg-background" : ""
                        }`}
                        onClick={() => setActiveFilePath(file.path)}
                      >
                        <FileCode className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[150px]">
                          {file.path.split("/").pop()}
                        </span>
                        {file.isDirty && (
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        )}
                        <button
                          className="p-0.5 hover:bg-muted rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseFile(file.path);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Editor */}
                <div className="flex-1">
                  {activeFile ? (
                    <CodeEditor
                      value={activeFile.content}
                      path={activeFile.path}
                      isDirty={activeFile.isDirty}
                      onChange={(value) => handleFileChange(activeFile.path, value)}
                      onSave={(value) => handleSave(activeFile.path, value)}
                      isLoading={fileContentQuery.isLoading}
                      error={fileContentQuery.error?.message}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center space-y-4">
                        <FileCode className="w-16 h-16 mx-auto opacity-50" />
                        <p>Select a file to start editing</p>
                        {!selectedRepo && (
                          <p className="text-sm">Or select a repository from the sidebar</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Commit dialog */}
        <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Commit Changes</DialogTitle>
              <DialogDescription>
                Enter a commit message to save your changes to {pendingSave?.path}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Update file..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && commitMessage.trim()) {
                    handleConfirmSave();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCommitDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSave}
                disabled={!commitMessage.trim() || updateFileMutation.isPending}
              >
                {updateFileMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Commit
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
