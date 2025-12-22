/**
 * Execution History Panel - Sprint 30
 * 
 * Displays agent execution history with replay capability.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  DollarSign,
  Zap,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ExecutionHistoryPanelProps {
  agentId?: number;
  onSelectExecution?: (executionId: number) => void;
}

export function ExecutionHistoryPanel({
  agentId,
  onSelectExecution,
}: ExecutionHistoryPanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: executions, isLoading } = trpc.agents.executions.useQuery();

  const filteredExecutions = agentId
    ? executions?.filter((e) => e.agentId === agentId)
    : executions;

  const getStatusIcon = (state: string) => {
    switch (state) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "executing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "waiting_approval":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "halted":
        return <Pause className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (state: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      executing: "secondary",
      waiting_approval: "outline",
      halted: "outline",
    };
    return (
      <Badge variant={variants[state] || "outline"} className="text-xs">
        {state.replace("_", " ")}
      </Badge>
    );
  };

  const handleSelect = (id: number) => {
    setSelectedId(id);
    onSelectExecution?.(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!filteredExecutions?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Clock className="h-8 w-8 mb-2" />
          <p>No execution history</p>
          <p className="text-sm">Run an agent to see its history here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Execution History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-2">
            {filteredExecutions.map((execution) => (
              <button
                key={execution.id}
                onClick={() => handleSelect(execution.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedId === execution.id
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(execution.state)}
                    <span className="font-medium truncate text-sm">
                      {execution.goal?.slice(0, 50) || "Untitled execution"}
                      {(execution.goal?.length || 0) > 50 && "..."}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {getStatusBadge(execution.state)}
                  
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {execution.currentStep || 0} steps
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${parseFloat(execution.totalCostUsd || "0").toFixed(4)}
                  </span>
                  
                  <span className="ml-auto">
                    {execution.startedAt &&
                      formatDistanceToNow(new Date(execution.startedAt), {
                        addSuffix: true,
                      })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * Execution Detail View - Shows steps and allows replay
 */
interface ExecutionDetailProps {
  executionId: number;
  onRollback?: (checkpointId: number) => void;
}

export function ExecutionDetail({ executionId, onRollback }: ExecutionDetailProps) {
  const { data: execution, isLoading } = trpc.agents.getExecution.useQuery({
    id: executionId,
  });

  const { data: checkpoints } = trpc.checkpoints.list.useQuery({
    executionId,
  });

  const rollbackMutation = trpc.checkpoints.rollback.useMutation();

  const handleRollback = async (checkpointId: number) => {
    await rollbackMutation.mutateAsync({ checkpointId });
    onRollback?.(checkpointId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="text-center text-muted-foreground p-4">
        Execution not found
      </div>
    );
  }

  const steps = (execution.steps as Array<{
    id: string;
    stepNumber: number;
    description: string;
    status: string;
  }>) || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Execution #{execution.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Goal:</strong> {execution.goal}
            </p>
            <p>
              <strong>Status:</strong> {execution.state}
            </p>
            <p>
              <strong>Steps:</strong> {execution.currentStep || 0}
            </p>
            <p>
              <strong>Cost:</strong> ${parseFloat(execution.totalCostUsd || "0").toFixed(4)}
            </p>
          </div>
        </CardContent>
      </Card>

      {checkpoints && checkpoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Checkpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div>
                    <p className="text-sm font-medium">Step {cp.stepNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {cp.description || "Auto checkpoint"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRollback(cp.id)}
                    disabled={rollbackMutation.isPending}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Rollback
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Execution Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id || index}
                    className="p-2 rounded border text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Step {step.stepNumber || index + 1}
                      </Badge>
                      <Badge
                        variant={
                          step.status === "completed"
                            ? "default"
                            : step.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {step.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
