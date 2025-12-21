import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Zap,
  Plus,
  Play,
  CheckCircle,
  FileText,
  Settings,
  Command,
  Rocket,
  Bug,
  RefreshCw,
  BarChart3,
  GitBranch,
  MessageSquare,
} from "lucide-react";

interface QuickActionsProps {
  projectId?: number;
  currentSprintId?: string;
  variant?: "desktop" | "mobile";
  onActionComplete?: (action: string) => void;
}

export function QuickActions({ 
  projectId, 
  currentSprintId, 
  variant = "desktop",
  onActionComplete 
}: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [executeConfirmOpen, setExecuteConfirmOpen] = useState(false);
  const [qaConfirmOpen, setQaConfirmOpen] = useState(false);

  // Mutations
  const createSprintMutation = trpc.sprints.create.useMutation({
    onSuccess: () => {
      toast.success("Sprint created successfully!");
      setCreateSprintOpen(false);
      setSprintName("");
      setSprintGoal("");
      onActionComplete?.("create-sprint");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to create sprint: ${error.message}`);
    },
  });

  const utils = trpc.useUtils();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + key combinations
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "k":
            e.preventDefault();
            setIsOpen(true);
            break;
          case "n":
            if (e.shiftKey) {
              e.preventDefault();
              setCreateSprintOpen(true);
            }
            break;
          case "e":
            if (e.shiftKey && currentSprintId) {
              e.preventDefault();
              setExecuteConfirmOpen(true);
            }
            break;
          case "q":
            if (e.shiftKey) {
              e.preventDefault();
              setQaConfirmOpen(true);
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSprintId]);

  const handleCreateSprint = useCallback(() => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }
    if (!sprintName.trim()) {
      toast.error("Sprint name is required");
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14); // 2-week sprint

    createSprintMutation.mutate({
      projectId,
      name: sprintName,
      goal: sprintGoal || undefined,
      startDate,
      endDate,
    });
  }, [projectId, sprintName, sprintGoal, createSprintMutation]);

  const handleExecuteSprint = useCallback(() => {
    if (!currentSprintId) {
      toast.error("No active sprint to execute");
      return;
    }
    toast.info("Starting sprint execution...");
    setExecuteConfirmOpen(false);
    onActionComplete?.("execute-sprint");
    // In a real implementation, this would trigger the sprint orchestrator
  }, [currentSprintId, onActionComplete]);

  const handleRunQA = useCallback(() => {
    toast.info("Running QA protocol...");
    setQaConfirmOpen(false);
    onActionComplete?.("run-qa");
    // In a real implementation, this would trigger the QA agent
  }, [onActionComplete]);

  const handleGenerateReport = useCallback(() => {
    toast.info("Generating sprint report...");
    onActionComplete?.("generate-report");
  }, [onActionComplete]);

  // Mobile FAB variant
  if (variant === "mobile") {
    return (
      <>
        <div className="fixed bottom-20 right-4 z-50 md:hidden">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="lg"
                className="h-14 w-14 rounded-full shadow-lg"
              >
                <Zap className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setCreateSprintOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Sprint
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setExecuteConfirmOpen(true)}
                disabled={!currentSprintId}
              >
                <Play className="mr-2 h-4 w-4" />
                Execute Sprint
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setQaConfirmOpen(true)}>
                <Bug className="mr-2 h-4 w-4" />
                Run QA Protocol
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGenerateReport}>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dialogs */}
        <CreateSprintDialog
          open={createSprintOpen}
          onOpenChange={setCreateSprintOpen}
          sprintName={sprintName}
          setSprintName={setSprintName}
          sprintGoal={sprintGoal}
          setSprintGoal={setSprintGoal}
          onSubmit={handleCreateSprint}
          isLoading={createSprintMutation.isPending}
        />
        <ExecuteConfirmDialog
          open={executeConfirmOpen}
          onOpenChange={setExecuteConfirmOpen}
          onConfirm={handleExecuteSprint}
        />
        <QAConfirmDialog
          open={qaConfirmOpen}
          onOpenChange={setQaConfirmOpen}
          onConfirm={handleRunQA}
        />
      </>
    );
  }

  // Desktop variant
  return (
    <>
      <div className="hidden md:flex items-center gap-2">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Command className="h-3 w-3" />
              Quick Actions
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={() => setCreateSprintOpen(true)}>
              <Rocket className="mr-2 h-4 w-4 text-blue-500" />
              Create Next Sprint
              <DropdownMenuShortcut>⇧⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setExecuteConfirmOpen(true)}
              disabled={!currentSprintId}
            >
              <Play className="mr-2 h-4 w-4 text-green-500" />
              Execute Sprint
              <DropdownMenuShortcut>⇧⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setQaConfirmOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4 text-purple-500" />
              Run QA Protocol
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleGenerateReport}>
              <BarChart3 className="mr-2 h-4 w-4 text-amber-500" />
              Generate Report
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("Opening chat...")}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Ask PM Agent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Syncing with GitHub...")}>
              <GitBranch className="mr-2 h-4 w-4" />
              Sync GitHub
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => utils.invalidate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialogs */}
      <CreateSprintDialog
        open={createSprintOpen}
        onOpenChange={setCreateSprintOpen}
        sprintName={sprintName}
        setSprintName={setSprintName}
        sprintGoal={sprintGoal}
        setSprintGoal={setSprintGoal}
        onSubmit={handleCreateSprint}
        isLoading={createSprintMutation.isPending}
      />
      <ExecuteConfirmDialog
        open={executeConfirmOpen}
        onOpenChange={setExecuteConfirmOpen}
        onConfirm={handleExecuteSprint}
      />
      <QAConfirmDialog
        open={qaConfirmOpen}
        onOpenChange={setQaConfirmOpen}
        onConfirm={handleRunQA}
      />
    </>
  );
}

// Create Sprint Dialog
function CreateSprintDialog({
  open,
  onOpenChange,
  sprintName,
  setSprintName,
  sprintGoal,
  setSprintGoal,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprintName: string;
  setSprintName: (name: string) => void;
  sprintGoal: string;
  setSprintGoal: (goal: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-500" />
            Create Next Sprint
          </DialogTitle>
          <DialogDescription>
            Set up a new 2-week sprint with goals and objectives
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sprint-name">Sprint Name</Label>
            <Input
              id="sprint-name"
              placeholder="e.g., Sprint 12 - Authentication"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sprint-goal">Sprint Goal (optional)</Label>
            <Textarea
              id="sprint-goal"
              placeholder="What do you want to achieve in this sprint?"
              value={sprintGoal}
              onChange={(e) => setSprintGoal(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Sprint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Execute Sprint Confirmation Dialog
function ExecuteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-500" />
            Execute Sprint
          </DialogTitle>
          <DialogDescription>
            This will start the AI agents to work on all tasks in the current sprint.
            The PM Agent will coordinate Developer, QA, and DevOps agents.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">What happens next:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• PM Agent analyzes task dependencies</li>
              <li>• Tasks are assigned to appropriate agents</li>
              <li>• Parallel workstreams are identified</li>
              <li>• Agents begin executing tasks</li>
              <li>• Progress is tracked in real-time</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            <Play className="h-4 w-4 mr-2" />
            Start Execution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// QA Protocol Confirmation Dialog
function QAConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-purple-500" />
            Run QA Protocol
          </DialogTitle>
          <DialogDescription>
            Run comprehensive quality assurance checks on recently completed work.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">QA Protocol includes:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Run all unit tests</li>
              <li>• Check TypeScript compilation</li>
              <li>• Verify API endpoints</li>
              <li>• Test UI components</li>
              <li>• Security vulnerability scan</li>
              <li>• Performance benchmarks</li>
              <li>• Generate QA report</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-purple-600 hover:bg-purple-700">
            <Bug className="h-4 w-4 mr-2" />
            Run QA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QuickActions;
