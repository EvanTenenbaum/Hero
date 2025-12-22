import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bot, Plus, Play, Pause, Settings, Loader2, Zap, Shield, DollarSign } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Agents() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    type: "custom" as const,
    systemPrompt: "",
    maxSteps: 10,
    uncertaintyThreshold: 70,
    requireApprovalForChanges: true,
    budgetLimitUsd: "1.00",
  });

  const { data: agents, isLoading, refetch } = trpc.agents.list.useQuery();
  const createMutation = trpc.agents.create.useMutation({
    onSuccess: () => {
      toast.success("Agent created successfully");
      setIsCreateOpen(false);
      setNewAgent({
        name: "",
        description: "",
        type: "custom",
        systemPrompt: "",
        maxSteps: 10,
        uncertaintyThreshold: 70,
        requireApprovalForChanges: true,
        budgetLimitUsd: "1.00",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!newAgent.name.trim()) {
      toast.error("Agent name is required");
      return;
    }
    createMutation.mutate(newAgent);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Agents</h1>
            <p className="text-muted-foreground mt-1">Configure and manage autonomous AI agents</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <Plus className="h-4 w-4" /> New Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New Agent</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Configure an AI agent to work on your projects autonomously.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Agent Name</Label>
                    <Input
                      placeholder="Code Assistant"
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Type</Label>
                    <Select
                      value={newAgent.type}
                      onValueChange={(v) => setNewAgent({ ...newAgent, type: v as any })}
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
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Description</Label>
                  <Textarea
                    placeholder="A brief description of what this agent does..."
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">System Prompt</Label>
                  <Textarea
                    placeholder="Instructions for the agent..."
                    value={newAgent.systemPrompt}
                    onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                    className="bg-secondary border-border text-foreground min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Max Steps</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={newAgent.maxSteps}
                      onChange={(e) => setNewAgent({ ...newAgent, maxSteps: parseInt(e.target.value) || 10 })}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Uncertainty Threshold (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newAgent.uncertaintyThreshold}
                      onChange={(e) => setNewAgent({ ...newAgent, uncertaintyThreshold: parseInt(e.target.value) || 70 })}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Budget Limit (USD)</Label>
                  <Input
                    placeholder="1.00"
                    value={newAgent.budgetLimitUsd}
                    onChange={(e) => setNewAgent({ ...newAgent, budgetLimitUsd: e.target.value })}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Require Approval for Changes</Label>
                    <p className="text-xs text-muted-foreground">Agent will pause before applying changes</p>
                  </div>
                  <Switch
                    checked={newAgent.requireApprovalForChanges}
                    onCheckedChange={(v) => setNewAgent({ ...newAgent, requireApprovalForChanges: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-border">
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Agent"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : agents && agents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/agents/${agent.id}`}>
                <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        agent.enabled ? "bg-green-500/20 text-green-400" : "bg-foreground text-muted-foreground"
                      }`}>
                        {agent.enabled ? "Active" : "Disabled"}
                      </div>
                    </div>
                    <CardTitle className="text-foreground mt-3">{agent.name}</CardTitle>
                    {agent.description && (
                      <CardDescription className="text-muted-foreground line-clamp-2">
                        {agent.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {agent.maxSteps} steps
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {agent.uncertaintyThreshold}%
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${agent.budgetLimitUsd}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No agents yet</h3>
              <p className="text-muted-foreground text-sm text-center mb-4">
                Create your first AI agent to automate development tasks.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 gap-2">
                <Plus className="h-4 w-4" /> Create Agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
