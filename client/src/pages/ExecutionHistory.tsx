/**
 * Execution History Page
 * View and analyze past agent executions
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Play,
  ChevronDown,
  ChevronRight,
  Timer,
  Activity,
} from "lucide-react";

export default function ExecutionHistory() {
  const [selectedExecution, setSelectedExecution] = useState<number | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Fetch recent executions
  const { data: executions, isLoading: loadingExecutions } = trpc.agents.executions.useQuery();

  // Fetch steps for selected execution
  const { data: steps, isLoading: loadingSteps } = trpc.executionSteps.list.useQuery(
    { executionId: selectedExecution! },
    { enabled: !!selectedExecution }
  );

  // Fetch logs for selected execution
  const { data: logs } = trpc.agentLogs.list.useQuery(
    { executionId: selectedExecution! },
    { enabled: !!selectedExecution }
  );

  const toggleStep = (stepId: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "complete":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "awaiting_confirmation":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "complete":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "running":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "awaiting_confirmation":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  // Calculate summary stats for selected execution
  const summary = steps ? {
    total: steps.length,
    completed: steps.filter(s => s.status === 'complete').length,
    failed: steps.filter(s => s.status === 'failed').length,
    totalDuration: steps.reduce((sum, s) => sum + (s.durationMs || 0), 0),
  } : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Execution History</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze past agent executions, steps, and logs.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Executions List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Executions</CardTitle>
              <CardDescription>
                {executions?.length || 0} execution{executions?.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {loadingExecutions ? (
                  <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : !executions?.length ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No executions yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {executions.map((exec) => (
                      <button
                        key={exec.id}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          selectedExecution === exec.id ? "bg-muted" : ""
                        }`}
                        onClick={() => setSelectedExecution(exec.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {getStatusIcon(exec.state)}
                            <span className="font-medium text-sm truncate">
                              {exec.goal || `Execution #${exec.id}`}
                            </span>
                          </div>
                          <Badge variant="outline" className={`text-xs shrink-0 ${getStatusColor(exec.state)}`}>
                            {exec.state}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{formatDate(exec.createdAt)}</span>
                          {exec.totalSteps !== null && exec.totalSteps > 0 && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {exec.currentStep}/{exec.totalSteps} steps
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Execution Details */}
          {selectedExecution ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              {summary && (
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Total Steps</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{summary.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">Completed</span>
                      </div>
                      <p className="text-2xl font-bold mt-1 text-green-500">{summary.completed}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-muted-foreground">Failed</span>
                      </div>
                      <p className="text-2xl font-bold mt-1 text-red-500">{summary.failed}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Duration</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{formatDuration(summary.totalDuration)}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Steps & Logs Tabs */}
              <Tabs defaultValue="steps">
                <TabsList>
                  <TabsTrigger value="steps">Steps ({steps?.length || 0})</TabsTrigger>
                  <TabsTrigger value="logs">Logs ({logs?.length || 0})</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="steps" className="mt-4">
                  <Card>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px]">
                        {loadingSteps ? (
                          <div className="p-4 text-center text-muted-foreground">Loading steps...</div>
                        ) : !steps?.length ? (
                          <div className="p-4 text-center text-muted-foreground">No steps recorded</div>
                        ) : (
                          <div className="divide-y">
                            {steps.map((step) => {
                              const isExpanded = expandedSteps.has(step.id);
                              return (
                                <div key={step.id} className="border-b last:border-0">
                                  <button
                                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                                    onClick={() => toggleStep(step.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <span className="text-xs text-muted-foreground font-mono">
                                        #{step.stepNumber}
                                      </span>
                                      {getStatusIcon(step.status)}
                                      <span className="font-medium text-sm">{step.action}</span>
                                      <Badge variant="outline" className={`ml-auto text-xs ${getStatusColor(step.status)}`}>
                                        {step.status}
                                      </Badge>
                                      {step.durationMs && (
                                        <span className="text-xs text-muted-foreground">
                                          {formatDuration(step.durationMs)}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                  {isExpanded && (
                                    <div className="px-4 pb-4 space-y-3 bg-muted/30">
                                      {step.input && Object.keys(step.input).length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
                                          <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                                            {JSON.stringify(step.input, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      {step.output && Object.keys(step.output).length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                                          <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                                            {JSON.stringify(step.output, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      {step.error && (
                                        <div>
                                          <p className="text-xs font-medium text-red-500 mb-1">Error</p>
                                          <pre className="text-xs bg-red-500/10 text-red-500 p-2 rounded border border-red-500/20">
                                            {step.error}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="logs" className="mt-4">
                  <Card>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px]">
                        {!logs?.length ? (
                          <div className="p-4 text-center text-muted-foreground">No logs recorded</div>
                        ) : (
                          <div className="divide-y">
                            {logs.map((log) => (
                              <div key={log.id} className="p-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      log.level === 'error' ? 'text-red-500 border-red-500/20' :
                                      log.level === 'warn' ? 'text-yellow-500 border-yellow-500/20' :
                                      'text-muted-foreground'
                                    }`}
                                  >
                                    {log.level}
                                  </Badge>
                                  <span className="font-medium">{log.event}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {formatDate(log.createdAt)}
                                  </span>
                                </div>
                                {log.data && Object.keys(log.data).length > 0 && (
                                  <pre className="text-xs text-muted-foreground mt-2 overflow-x-auto">
                                    {JSON.stringify(log.data, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <Card>
                    <CardContent className="py-4">
                      <div className="space-y-4">
                        {steps?.map((step, index) => (
                          <div key={step.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                step.status === 'complete' ? 'bg-green-500/20' :
                                step.status === 'failed' ? 'bg-red-500/20' :
                                'bg-muted'
                              }`}>
                                {getStatusIcon(step.status)}
                              </div>
                              {index < (steps?.length || 0) - 1 && (
                                <div className="w-0.5 h-full bg-border mt-2" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="font-medium text-sm">{step.action}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(step.createdAt)}
                                {step.durationMs && ` • ${formatDuration(step.durationMs)}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[600px] text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an execution to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
