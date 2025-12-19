/**
 * ExecutionMonitor Component
 * Real-time visualization of agent execution with step-by-step progress
 */

import { useState, useEffect, useRef } from "react";
import { useExecutionStream, AgentStep, ExecutionState } from "@/hooks/useExecutionStream";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Streamdown } from "streamdown";
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Brain,
  Zap,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionMonitorProps {
  executionId: number | null;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

export function ExecutionMonitor({
  executionId,
  onPause,
  onResume,
  onStop,
  onApprove,
  onReject,
  className,
}: ExecutionMonitorProps) {
  const { isConnected, steps, state, error } = useExecutionStream(executionId);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      running: { variant: "default", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      paused: { variant: "secondary", icon: <Pause className="w-3 h-3" /> },
      completed: { variant: "outline", icon: <CheckCircle className="w-3 h-3 text-green-500" /> },
      failed: { variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
      awaiting_approval: { variant: "secondary", icon: <AlertTriangle className="w-3 h-3 text-yellow-500" /> },
    };
    const config = variants[status] || variants.running;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getStepIcon = (type: AgentStep["type"]) => {
    switch (type) {
      case "thinking":
        return <Brain className="w-4 h-4 text-blue-500" />;
      case "action":
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case "result":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "checkpoint":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!executionId) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No execution selected
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Execution Monitor</CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="gap-1 text-green-500 border-green-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-red-500 border-red-500">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Disconnected
              </Badge>
            )}
            {state && getStatusBadge(state.status)}
          </div>
        </div>
      </CardHeader>

      {state && (
        <>
          {/* Progress Section */}
          <div className="px-6 pb-4 space-y-3">
            {/* Step Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  Step {state.currentStep} / {state.maxSteps}
                </span>
              </div>
              <Progress value={(state.currentStep / state.maxSteps) * 100} className="h-2" />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">Cost</div>
                  <div className="font-medium">
                    ${state.costIncurred.toFixed(4)} / ${state.budgetLimit.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">Tokens</div>
                  <div className="font-medium">{state.tokensUsed.toLocaleString()}</div>
                </div>
              </div>
              {state.uncertaintyLevel !== undefined && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground">Uncertainty</div>
                    <div className="font-medium">{state.uncertaintyLevel}%</div>
                  </div>
                </div>
              )}
            </div>

            {/* Goal */}
            {state.goal && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">Goal</div>
                <div className="text-sm">{state.goal}</div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              {state.status === "running" && (
                <>
                  <Button variant="outline" size="sm" onClick={onPause}>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                  <Button variant="destructive" size="sm" onClick={onStop}>
                    <Square className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                </>
              )}
              {state.status === "paused" && (
                <Button variant="default" size="sm" onClick={onResume}>
                  <Play className="w-4 h-4 mr-1" />
                  Resume
                </Button>
              )}
              {state.status === "awaiting_approval" && (
                <>
                  <Button variant="default" size="sm" onClick={onApprove}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button variant="destructive" size="sm" onClick={onReject}>
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* Steps Timeline */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px]" ref={scrollRef}>
          <div className="p-4 space-y-3">
            {steps.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                {isConnected ? "Waiting for execution steps..." : "Connect to see execution steps"}
              </div>
            ) : (
              steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "relative pl-6 pb-3",
                    index !== steps.length - 1 && "border-l-2 border-muted ml-2"
                  )}
                >
                  {/* Step Icon */}
                  <div className="absolute -left-2 top-0 p-1 bg-background rounded-full border">
                    {getStepIcon(step.type)}
                  </div>

                  {/* Step Content */}
                  <div
                    className={cn(
                      "rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50",
                      step.type === "error" && "border-red-500/50 bg-red-500/5",
                      step.type === "checkpoint" && "border-orange-500/50 bg-orange-500/5"
                    )}
                    onClick={() => toggleStep(step.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {step.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {expandedSteps.has(step.id) ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Collapsed Preview */}
                    {!expandedSteps.has(step.id) && (
                      <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {step.content.substring(0, 150)}
                        {step.content.length > 150 && "..."}
                      </div>
                    )}

                    {/* Expanded Content */}
                    {expandedSteps.has(step.id) && (
                      <div className="mt-2">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Streamdown>{step.content}</Streamdown>
                        </div>
                        {step.metadata && (
                          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                            {Object.entries(step.metadata).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span>{key}:</span>
                                <span className="font-mono">{JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Error Display */}
      {error && (
        <div className="px-6 pb-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm">
            {error.message}
          </div>
        </div>
      )}
    </Card>
  );
}
