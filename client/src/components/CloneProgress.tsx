/**
 * Clone Progress Component - Sprint 20
 * 
 * Shows real-time progress when cloning a GitHub repository.
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  FolderGit2,
  Clock,
} from "lucide-react";

interface CloneProgressProps {
  projectId: number;
  owner?: string;
  repo?: string;
  githubRepoId?: number;
  onCloneComplete?: () => void;
}

type ClonePhase = "idle" | "counting" | "compressing" | "receiving" | "resolving" | "done" | "error";

const phaseLabels: Record<ClonePhase, string> = {
  idle: "Preparing...",
  counting: "Counting objects...",
  compressing: "Compressing objects...",
  receiving: "Receiving objects...",
  resolving: "Resolving deltas...",
  done: "Clone complete!",
  error: "Clone failed",
};

const phaseProgress: Record<ClonePhase, number> = {
  idle: 0,
  counting: 10,
  compressing: 25,
  receiving: 50,
  resolving: 85,
  done: 100,
  error: 0,
};

export function CloneProgress({
  projectId,
  owner,
  repo,
  githubRepoId,
  onCloneComplete,
}: CloneProgressProps) {
  const [phase, setPhase] = useState<ClonePhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Query clone status
  const { data: cloneStatus, refetch } = trpc.github.getCloneStatus.useQuery(
    { projectId },
    {
      refetchInterval: phase !== "done" && phase !== "error" ? 2000 : false,
    }
  );

  // Clone mutation
  const cloneMutation = trpc.github.cloneRepo.useMutation({
    onSuccess: () => {
      setPhase("done");
      setProgress(100);
      onCloneComplete?.();
    },
    onError: (err) => {
      setPhase("error");
      setError(err.message);
    },
  });

  // Sync mutation
  const syncMutation = trpc.github.syncRepo.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Update UI based on clone status
  useEffect(() => {
    if (cloneStatus?.cloned) {
      if (cloneStatus.status === "ready") {
        setPhase("done");
        setProgress(100);
      } else if (cloneStatus.status === "cloning" || cloneStatus.status === "syncing") {
        // Simulate progress during cloning
        setPhase("receiving");
        setProgress((prev) => Math.min(prev + 5, 90));
      } else if (cloneStatus.status === "error") {
        setPhase("error");
        setError(cloneStatus.error || "Unknown error");
      }
    }
  }, [cloneStatus]);

  const handleStartClone = () => {
    if (!owner || !repo || !githubRepoId) return;
    
    setPhase("counting");
    setProgress(10);
    setError(null);

    cloneMutation.mutate({
      projectId,
      owner,
      repo,
      githubRepoId,
    });
  };

  const handleSync = () => {
    if (!cloneStatus?.cloned) return;
    
    // We need the clonedRepoId - for now, we'll trigger a refetch
    // In a real implementation, we'd store the clonedRepoId
    refetch();
  };

  const isCloning = cloneMutation.isPending || 
    (cloneStatus?.status === "cloning") || 
    (cloneStatus?.status === "syncing");

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5" />
            <CardTitle className="text-lg">Repository Clone</CardTitle>
          </div>
          {cloneStatus?.cloned && cloneStatus.status === "ready" && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Cloned
            </Badge>
          )}
        </div>
        {owner && repo && (
          <CardDescription>
            {owner}/{repo}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        {(isCloning || phase !== "idle") && phase !== "done" && phase !== "error" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{phaseLabels[phase]}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Success State */}
        {phase === "done" && cloneStatus?.cloned && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Repository cloned successfully</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Current Branch</span>
                <div className="flex items-center gap-1 font-medium">
                  <GitBranch className="h-4 w-4" />
                  {cloneStatus.currentBranch || "main"}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Last Synced</span>
                <div className="flex items-center gap-1 font-medium">
                  <Clock className="h-4 w-4" />
                  {cloneStatus.lastSyncedAt
                    ? new Date(cloneStatus.lastSyncedAt).toLocaleString()
                    : "Never"}
                </div>
              </div>
            </div>

            {cloneStatus.lastCommitSha && (
              <div className="text-sm">
                <span className="text-muted-foreground">Latest Commit: </span>
                <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                  {cloneStatus.lastCommitSha.slice(0, 7)}
                </code>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync with Remote
            </Button>
          </div>
        )}

        {/* Error State */}
        {phase === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Clone failed</span>
            </div>
            {error && (
              <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                {error}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={handleStartClone}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Clone
            </Button>
          </div>
        )}

        {/* Initial State - Not Cloned */}
        {!cloneStatus?.cloned && phase === "idle" && owner && repo && githubRepoId && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Clone this repository to enable local file operations and AI-powered code analysis.
            </p>
            <Button onClick={handleStartClone} disabled={cloneMutation.isPending}>
              {cloneMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FolderGit2 className="h-4 w-4 mr-2" />
              )}
              Clone Repository
            </Button>
          </div>
        )}

        {/* No Repository Selected */}
        {!owner && !repo && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a GitHub repository to clone
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default CloneProgress;
