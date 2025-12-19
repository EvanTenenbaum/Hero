import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  Circle, 
  FileCode, 
  GitBranch,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface CheckpointTimelineProps {
  executionId: number;
  currentStep?: number;
  onRollback?: (checkpointId: number) => void;
}

interface CheckpointState {
  executionState: string;
  currentStep: number;
  steps: unknown[];
  context: Record<string, unknown>;
  filesModified: string[];
}

interface Checkpoint {
  id: number;
  agentId: number;
  executionId: number;
  userId: number;
  stepNumber: number;
  description?: string | null;
  state: CheckpointState;
  rollbackData?: {
    fileSnapshots: Array<{
      path: string;
      content: string;
      action: "create" | "modify" | "delete";
    }>;
    dbChanges: unknown[];
  } | null;
  automatic: boolean;
  createdAt: Date;
}

function CheckpointItem({ 
  checkpoint, 
  isLatest, 
  isCurrent,
  onRollback,
  isRollingBack 
}: { 
  checkpoint: Checkpoint; 
  isLatest: boolean;
  isCurrent: boolean;
  onRollback: () => void;
  isRollingBack: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const state = checkpoint.state as CheckpointState;
  const filesModified = state?.filesModified || [];

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border last:hidden" />
      
      {/* Timeline dot */}
      <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center ${
        isCurrent ? 'bg-primary text-primary-foreground' : 
        isLatest ? 'bg-green-500 text-white' : 
        'bg-muted border-2 border-border'
      }`}>
        {isCurrent ? (
          <Circle className="h-3 w-3 fill-current" />
        ) : isLatest ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <GitBranch className="h-3 w-3 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">Step {checkpoint.stepNumber}</span>
              {checkpoint.automatic ? (
                <Badge variant="secondary" className="text-xs">Auto</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Manual</Badge>
              )}
              {isLatest && (
                <Badge className="text-xs bg-green-500">Latest</Badge>
              )}
              {isCurrent && (
                <Badge className="text-xs">Current</Badge>
              )}
            </div>
            {checkpoint.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {checkpoint.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(checkpoint.createdAt).toLocaleString()}
              </span>
              {filesModified.length > 0 && (
                <span className="flex items-center gap-1">
                  <FileCode className="h-3 w-3" />
                  {filesModified.length} file{filesModified.length !== 1 ? 's' : ''} modified
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {!isLatest && !isCurrent && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isRollingBack}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Rollback
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Rollback to Step {checkpoint.stepNumber}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will restore the agent execution state to step {checkpoint.stepNumber}. 
                      Any changes made after this checkpoint will be lost. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onRollback}>
                      Confirm Rollback
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Execution State</h4>
              <Badge variant="outline">{state?.executionState || 'unknown'}</Badge>
            </div>

            {filesModified.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Files Modified</h4>
                <div className="space-y-1">
                  {filesModified.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileCode className="h-3 w-3" />
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{file}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {checkpoint.rollbackData?.fileSnapshots && checkpoint.rollbackData.fileSnapshots.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Rollback Data Available</h4>
                <p className="text-xs text-muted-foreground">
                  {checkpoint.rollbackData.fileSnapshots.length} file snapshot{checkpoint.rollbackData.fileSnapshots.length !== 1 ? 's' : ''} stored
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckpointTimeline({ 
  executionId, 
  currentStep,
  onRollback 
}: CheckpointTimelineProps) {
  const { data: checkpoints, isLoading, refetch } = trpc.checkpoints.list.useQuery(
    { executionId },
    { enabled: !!executionId }
  );

  const rollbackMutation = trpc.checkpoints.rollback.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
      onRollback?.(data.restoredState?.currentStep || 0);
    },
    onError: (error) => {
      toast.error(`Rollback failed: ${error.message}`);
    },
  });

  const handleRollback = (checkpointId: number) => {
    rollbackMutation.mutate({ checkpointId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Checkpoints
          </CardTitle>
          <CardDescription>Loading checkpoint history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!checkpoints || checkpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Checkpoints
          </CardTitle>
          <CardDescription>
            No checkpoints recorded yet for this execution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Checkpoints will appear here as the agent executes tasks.
            </p>
            <p className="text-xs mt-2">
              Each checkpoint captures the execution state for potential rollback.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedCheckpoints = [...checkpoints].sort((a, b) => b.stepNumber - a.stepNumber);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Checkpoints
        </CardTitle>
        <CardDescription>
          {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {sortedCheckpoints.map((checkpoint, index) => (
            <CheckpointItem
              key={checkpoint.id}
              checkpoint={checkpoint as Checkpoint}
              isLatest={index === 0}
              isCurrent={checkpoint.stepNumber === currentStep}
              onRollback={() => handleRollback(checkpoint.id)}
              isRollingBack={rollbackMutation.isPending}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
