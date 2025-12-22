import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, Play, Pause, History, Settings, Loader2, Zap, AlertTriangle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { RollbackPanel, Checkpoint, RollbackPreview } from "@/components/RollbackPanel";

export default function AgentDetail() {
  const params = useParams<{ id: string }>();
  const agentId = parseInt(params.id || "0");
  const [isRunning, setIsRunning] = useState(false);
  const [goal, setGoal] = useState("");

  const { data: agent, isLoading, refetch } = trpc.agents.get.useQuery(
    { id: agentId },
    { enabled: agentId > 0 }
  );

  const { data: projects } = trpc.projects.list.useQuery();

  const updateMutation = trpc.agents.update.useMutation({
    onSuccess: () => {
      toast.success("Agent updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const executeMutation = trpc.agents.startExecution.useMutation({
    onSuccess: () => {
      toast.success("Agent execution started");
      setIsRunning(false);
      refetch();
    },
    onError: (e) => {
      toast.error(e.message);
      setIsRunning(false);
    },
  });

  const handleRun = () => {
    if (!goal.trim()) {
      toast.error("Please enter a goal for the agent");
      return;
    }
    setIsRunning(true);
    executeMutation.mutate({ agentId, goal });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-medium text-foreground mb-2">Agent not found</h3>
              <Link href="/agents">
                <Button variant="outline" className="border-border mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Agents
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
              {agent.description && (
                <p className="text-muted-foreground text-sm">{agent.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={agent.enabled ?? false}
              onCheckedChange={(enabled) => updateMutation.mutate({ id: agentId, enabled })}
            />
            <span className="text-sm text-muted-foreground">{agent.enabled ? "Enabled" : "Disabled"}</span>
          </div>
        </div>

        {/* Run Agent Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Run Agent
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Define a goal and let the agent work autonomously
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Goal</Label>
              <Textarea
                placeholder="Describe what you want the agent to accomplish..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="bg-secondary border-border text-foreground min-h-[100px]"
                disabled={isRunning}
              />
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleRun}
                disabled={isRunning || !agent.enabled}
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Run Agent
                  </>
                )}
              </Button>
              {!agent.enabled && (
                <p className="text-sm text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Enable the agent to run it
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="config" className="data-[state=active]:bg-primary">
              <Settings className="h-4 w-4 mr-2" /> Configuration
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary">
              <History className="h-4 w-4 mr-2" /> Execution History
            </TabsTrigger>
            <TabsTrigger value="rollback" className="data-[state=active]:bg-primary">
              <RotateCcw className="h-4 w-4 mr-2" /> Checkpoints
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Agent Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Type</Label>
                    <Select
                      value={agent.type}
                      onValueChange={() => toast.info("Agent type cannot be changed after creation")}
                    >
                      <SelectTrigger className="bg-secondary border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="coder">Coder</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                        <SelectItem value="planner">Planner</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Project</Label>
                    <Select
                      value=""
                      onValueChange={() => toast.info("Project assignment coming soon")}
                    >
                      <SelectTrigger className="bg-secondary border-border text-foreground">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        {projects?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">System Prompt</Label>
                  <Textarea
                    value={agent.systemPrompt || ""}
                    onChange={(e) => updateMutation.mutate({ id: agentId, systemPrompt: e.target.value })}
                    className="bg-secondary border-border text-foreground min-h-[120px]"
                    placeholder="Instructions for the agent..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Max Steps</Label>
                    <Input
                      type="number"
                      value={agent.maxSteps ?? 10}
                      onChange={(e) => updateMutation.mutate({ id: agentId, maxSteps: parseInt(e.target.value) || 10 })}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Uncertainty Threshold (%)</Label>
                    <Input
                      type="number"
                      value={agent.uncertaintyThreshold ?? 70}
                      onChange={(e) => updateMutation.mutate({ id: agentId, uncertaintyThreshold: parseInt(e.target.value) || 70 })}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Budget Limit (USD)</Label>
                    <Input
                      value={agent.budgetLimitUsd ?? ""}
                      onChange={(e) => updateMutation.mutate({ id: agentId, budgetLimitUsd: e.target.value })}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <Label className="text-foreground">Require Approval for Changes</Label>
                    <p className="text-xs text-muted-foreground">Agent will pause before applying changes</p>
                  </div>
                  <Switch
                    checked={agent.requireApprovalForChanges ?? false}
                    onCheckedChange={(v) => updateMutation.mutate({ id: agentId, requireApprovalForChanges: v })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <ExecutionHistoryTab agentId={agentId} />
          </TabsContent>

          <TabsContent value="rollback">
            <RollbackTab agentId={agentId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}


function ExecutionHistoryTab({ agentId }: { agentId: number }) {
  const { data: allExecutions, isLoading } = trpc.agents.executions.useQuery();
  // Filter executions by agentId on the client side
  const executions = allExecutions?.filter(e => e.agentId === agentId);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Execution History</CardTitle>
          <CardDescription className="text-muted-foreground">
            View past agent executions and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No execution history yet. Run the agent to see results here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Execution History</CardTitle>
        <CardDescription className="text-muted-foreground">
          View past agent executions and their results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {executions.map((exec) => (
            <div
              key={exec.id}
              className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border"
            >
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  exec.state === 'completed' ? 'bg-green-500' :
                  exec.state === 'failed' ? 'bg-red-500' :
                  exec.state === 'executing' ? 'bg-yellow-500 animate-pulse' :
                  'bg-background0'
                }`} />
                <div>
                  <p className="text-sm font-medium text-foreground truncate max-w-md">
                    {exec.goal || 'No goal specified'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(exec.createdAt).toLocaleString()} • Step {exec.currentStep || 0}/{exec.totalSteps || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  exec.state === 'completed' ? 'bg-green-500/20 text-green-400' :
                  exec.state === 'failed' ? 'bg-red-500/20 text-red-400' :
                  exec.state === 'executing' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-background0/20 text-muted-foreground'
                }`}>
                  {exec.state}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RollbackTab({ agentId }: { agentId: number }) {
  const { data: allExecutions } = trpc.agents.executions.useQuery();
  const executions = allExecutions?.filter(e => e.agentId === agentId);
  const { data: checkpoints, refetch: refetchCheckpoints } = trpc.checkpoints.list.useQuery(
    { executionId: executions?.[0]?.id || 0 },
    { enabled: !!executions?.[0]?.id }
  );

  const rollbackMutation = trpc.checkpoints.rollback.useMutation({
    onSuccess: () => {
      toast.success("Rolled back successfully");
      refetchCheckpoints();
    },
    onError: (err) => toast.error(err.message),
  });

  const latestExecution = executions?.[0];

  if (!latestExecution) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Checkpoints & Rollback</CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage execution checkpoints and rollback to previous states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No executions yet. Run the agent to create checkpoints.</p>
        </CardContent>
      </Card>
    );
  }

  const formattedCheckpoints: Checkpoint[] = (checkpoints || []).map((cp) => ({
    id: cp.id,
    executionId: cp.executionId,
    stepNumber: cp.stepNumber,
    description: cp.description,
    createdAt: new Date(cp.createdAt),
    automatic: cp.automatic ?? undefined,
  }));

  const handleRollback = async (checkpointId: number) => {
    await rollbackMutation.mutateAsync({ checkpointId });
  };

  const handlePreview = async (checkpointId: number): Promise<RollbackPreview | null> => {
    // For now, return a simple preview based on checkpoint position
    const checkpoint = formattedCheckpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) return null;

    const laterCheckpoints = formattedCheckpoints.filter(
      cp => cp.stepNumber > checkpoint.stepNumber
    );

    return {
      stepsToRevert: (latestExecution.currentStep || 0) - checkpoint.stepNumber,
      checkpointsToRemove: laterCheckpoints.length,
    };
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Checkpoints & Rollback</CardTitle>
        <CardDescription className="text-muted-foreground">
          Manage execution checkpoints and rollback to previous states
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
          <p className="text-sm text-foreground">
            <span className="font-medium">Current Execution:</span> {latestExecution.goal || 'No goal'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Step {latestExecution.currentStep || 0} of {latestExecution.totalSteps || 0} • Status: {latestExecution.state}
          </p>
        </div>
        <RollbackPanel
          checkpoints={formattedCheckpoints}
          currentStep={latestExecution.currentStep || 0}
          onRollback={handleRollback}
          onPreview={handlePreview}
          isLoading={rollbackMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}
