/**
 * Execution Monitor - Sprint 30
 * 
 * Real-time monitoring of agent execution with live updates.
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Zap,
  DollarSign,
  Brain,
  Clock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionMonitorProps {
  executionId: number;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface Step {
  id: string;
  type: "thinking" | "action" | "result" | "error" | "checkpoint";
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export function ExecutionMonitor({
  executionId,
  onComplete,
  onError,
}: ExecutionMonitorProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Get current execution state
  // FIX: Stop polling after execution completes to prevent infinite polling
  const { data: state, refetch: refetchState } = trpc.agents.getExecution.useQuery(
    { id: executionId },
    { 
      refetchInterval: (query) => {
        const data = query.state.data;
        // Stop polling when execution is complete, failed, or halted
        if (data?.state === 'completed' || data?.state === 'failed' || data?.state === 'halted') {
          return false;
        }
        return 2000;
      }
    }
  );

  // Control mutations
  const pauseMutation = trpc.agents.pauseExecution.useMutation({
    onSuccess: () => refetchState(),
  });
  const resumeMutation = trpc.agents.resumeExecution.useMutation({
    onSuccess: () => refetchState(),
  });
  const stopMutation = trpc.agents.stopExecution.useMutation({
    onSuccess: () => {
      refetchState();
      onComplete?.();
    },
  });
  const approveMutation = trpc.agents.approveExecution.useMutation({
    onSuccess: () => refetchState(),
  });

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, isAutoScroll]);

  // Check for completion
  useEffect(() => {
    if (state?.state === "completed") {
      onComplete?.();
    } else if (state?.state === "failed") {
      onError?.("Execution failed");
    }
  }, [state?.state, onComplete, onError]);

  const isRunning = state?.state === "executing";
  const isPaused = state?.state === "halted";
  const isWaitingApproval = state?.state === "waiting_approval";
  const isComplete = state?.state === "completed" || state?.state === "failed";

  const progress = state
    ? ((state.currentStep || 0) / (10)) * 100
    : 0;

  const getStepIcon = (type: Step["type"]) => {
    switch (type) {
      case "thinking":
        return <Brain className="h-4 w-4 text-purple-500" />;
      case "action":
        return <Zap className="h-4 w-4 text-blue-500" />;
      case "result":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "checkpoint":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Loader2
              className={cn(
                "h-4 w-4",
                isRunning && "animate-spin text-blue-500"
              )}
            />
            Execution Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => pauseMutation.mutate({ executionId })}
                disabled={pauseMutation.isPending}
              >
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </Button>
            )}
            {isPaused && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => resumeMutation.mutate({ executionId })}
                disabled={resumeMutation.isPending}
              >
                <Play className="h-3 w-3 mr-1" />
                Resume
              </Button>
            )}
            {isWaitingApproval && (
              <Button
                size="sm"
                variant="default"
                onClick={() => approveMutation.mutate({ executionId })}
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </Button>
            )}
            {!isComplete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => stopMutation.mutate({ executionId })}
                disabled={stopMutation.isPending}
              >
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <Badge
            variant={
              isRunning
                ? "default"
                : isComplete
                ? state?.state === "completed"
                  ? "default"
                  : "destructive"
                : "secondary"
            }
          >
            {state?.state || "unknown"}
          </Badge>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Zap className="h-3 w-3" />
            Step {state?.currentStep || 0} / 10
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3 w-3" />$
            {parseFloat(state?.totalCostUsd || "0").toFixed(4)}
          </span>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="mt-3 h-2" />
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea
          ref={scrollRef}
          className="h-full"
          onScrollCapture={(e) => {
            const target = e.target as HTMLDivElement;
            const isAtBottom =
              target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
            setIsAutoScroll(isAtBottom);
          }}
        >
          <div className="p-4 space-y-3">
            {/* Goal */}
            {state?.goal && (
              <div className="p-3 rounded-lg bg-accent/50 border">
                <p className="text-xs text-muted-foreground mb-1">Goal</p>
                <p className="text-sm">{state.goal}</p>
              </div>
            )}

            {/* Steps from execution state */}
            {((state?.steps || []) as Array<{ id?: string; type?: string; content?: string; timestamp?: Date; metadata?: Record<string, unknown>; stepNumber?: number; description?: string; status?: string }>).map((step, index) => (
              <div
                key={step.id || index}
                className={cn(
                  "p-3 rounded-lg border",
                  step.type === "error" && "border-red-500/50 bg-red-500/10",
                  step.type === "checkpoint" && "border-yellow-500/50 bg-yellow-500/10",
                  step.type === "result" && "border-green-500/50 bg-green-500/10"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getStepIcon((step.type || step.status || 'action') as Step['type'])}
                  <Badge variant="outline" className="text-xs capitalize">
                    {step.type || step.status || 'step'}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : `Step ${step.stepNumber || index + 1}`}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{step.content || step.description || 'Processing...'}</p>
                {step.metadata && Object.keys(step.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {'tokensUsed' in step.metadata && step.metadata.tokensUsed != null && (
                      <span className="mr-3">
                        Tokens: {String(step.metadata.tokensUsed)}
                      </span>
                    )}
                    {'cost' in step.metadata && step.metadata.cost != null && (
                      <span>Cost: ${Number(step.metadata.cost).toFixed(4)}</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator when running */}
            {isRunning && (
              <div className="flex items-center gap-2 p-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            )}

            {/* Waiting for approval */}
            {isWaitingApproval && (
              <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Approval Required</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  The agent has reached a checkpoint and requires your approval
                  to continue.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate({ executionId })}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve & Continue
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => stopMutation.mutate({ executionId })}
                    disabled={stopMutation.isPending}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Auto-scroll indicator */}
        {!isAutoScroll && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-4 right-4"
            onClick={() => {
              setIsAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
          >
            <ChevronDown className="h-3 w-3 mr-1" />
            Scroll to bottom
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
