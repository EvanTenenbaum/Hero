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
import { ArrowLeft, Bot, Play, Pause, History, Settings, Loader2, Zap, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

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
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-medium text-white mb-2">Agent not found</h3>
              <Link href="/agents">
                <Button variant="outline" className="border-slate-700 mt-4">
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
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
              {agent.description && (
                <p className="text-slate-400 text-sm">{agent.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={agent.enabled ?? false}
              onCheckedChange={(enabled) => updateMutation.mutate({ id: agentId, enabled })}
            />
            <span className="text-sm text-slate-400">{agent.enabled ? "Enabled" : "Disabled"}</span>
          </div>
        </div>

        {/* Run Agent Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-violet-400" />
              Run Agent
            </CardTitle>
            <CardDescription className="text-slate-400">
              Define a goal and let the agent work autonomously
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Goal</Label>
              <Textarea
                placeholder="Describe what you want the agent to accomplish..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                disabled={isRunning}
              />
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleRun}
                disabled={isRunning || !agent.enabled}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
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
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="config" className="data-[state=active]:bg-violet-600">
              <Settings className="h-4 w-4 mr-2" /> Configuration
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-violet-600">
              <History className="h-4 w-4 mr-2" /> Execution History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Agent Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Type</Label>
                    <Select
                      value={agent.type}
                      onValueChange={() => toast.info("Agent type cannot be changed after creation")}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="coder">Coder</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                        <SelectItem value="planner">Planner</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Project</Label>
                    <Select
                      value=""
                      onValueChange={() => toast.info("Project assignment coming soon")}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {projects?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">System Prompt</Label>
                  <Textarea
                    value={agent.systemPrompt || ""}
                    onChange={(e) => updateMutation.mutate({ id: agentId, systemPrompt: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
                    placeholder="Instructions for the agent..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Max Steps</Label>
                    <Input
                      type="number"
                      value={agent.maxSteps ?? 10}
                      onChange={(e) => updateMutation.mutate({ id: agentId, maxSteps: parseInt(e.target.value) || 10 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Uncertainty Threshold (%)</Label>
                    <Input
                      type="number"
                      value={agent.uncertaintyThreshold ?? 70}
                      onChange={(e) => updateMutation.mutate({ id: agentId, uncertaintyThreshold: parseInt(e.target.value) || 70 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Budget Limit (USD)</Label>
                    <Input
                      value={agent.budgetLimitUsd ?? ""}
                      onChange={(e) => updateMutation.mutate({ id: agentId, budgetLimitUsd: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <Label className="text-slate-300">Require Approval for Changes</Label>
                    <p className="text-xs text-slate-500">Agent will pause before applying changes</p>
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
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Execution History</CardTitle>
                <CardDescription className="text-slate-400">
                  View past agent executions and their results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm">No execution history yet. Run the agent to see results here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
