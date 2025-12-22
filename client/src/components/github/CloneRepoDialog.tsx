/**
 * CloneRepoDialog - Sprint 29
 * 
 * Dialog for cloning a GitHub repository to a local project.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Github, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CloneRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner: string;
  repo: string;
  repoId: number;
  onSuccess?: () => void;
}

type CloneStatus = "idle" | "selecting" | "cloning" | "success" | "error";

export function CloneRepoDialog({
  open,
  onOpenChange,
  owner,
  repo,
  repoId,
  onSuccess,
}: CloneRepoDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [status, setStatus] = useState<CloneStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");


  // Fetch user's projects
  const { data: projects } = trpc.projects.list.useQuery();

  // Clone mutation
  const cloneMutation = trpc.github.cloneRepo.useMutation({
    onMutate: () => {
      setStatus("cloning");
      setProgress(10);
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
    },
    onSuccess: () => {
      setProgress(100);
      setStatus("success");
      toast.success(`${owner}/${repo} has been cloned successfully.`);
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 1500);
    },
    onError: (error) => {
      setStatus("error");
      setErrorMessage(error.message);
      toast.error(`Clone failed: ${error.message}`);
    },
  });

  const handleClone = () => {
    if (!selectedProjectId) {
      toast.error("Please select a project to clone the repository into.");
      return;
    }

    cloneMutation.mutate({
      projectId: parseInt(selectedProjectId),
      owner,
      repo,
      githubRepoId: repoId,
    });
  };

  const handleClose = () => {
    if (status !== "cloning") {
      setStatus("idle");
      setProgress(0);
      setErrorMessage("");
      setSelectedProjectId("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Clone Repository
          </DialogTitle>
          <DialogDescription>
            Clone <span className="font-medium">{owner}/{repo}</span> to a local project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === "idle" || status === "selecting" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Target Project</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The repository will be cloned into this project's workspace.
                </p>
              </div>
            </div>
          ) : status === "cloning" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">Cloning repository...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                This may take a moment depending on the repository size.
              </p>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium">Repository cloned successfully!</p>
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm font-medium">Clone failed</p>
              <p className="text-xs text-muted-foreground text-center">
                {errorMessage}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {status === "idle" || status === "selecting" ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleClone} disabled={!selectedProjectId}>
                <Download className="h-4 w-4 mr-2" />
                Clone
              </Button>
            </>
          ) : status === "error" ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setStatus("idle")}>
                Try Again
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
