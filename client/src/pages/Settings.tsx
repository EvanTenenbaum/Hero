import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Settings as SettingsIcon, Key, Shield, Bot, Bell, Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";

export default function Settings() {
  const params = useParams<{ tab: string }>();
  const defaultTab = params.tab || "general";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Configure Hero IDE preferences and integrations</p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="general" className="data-[state=active]:bg-violet-600">
              <SettingsIcon className="h-4 w-4 mr-2" /> General
            </TabsTrigger>
            <TabsTrigger value="secrets" className="data-[state=active]:bg-violet-600">
              <Key className="h-4 w-4 mr-2" /> Secrets
            </TabsTrigger>
            <TabsTrigger value="governance" className="data-[state=active]:bg-violet-600">
              <Shield className="h-4 w-4 mr-2" /> Governance
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-violet-600">
              <Bot className="h-4 w-4 mr-2" /> Agent Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="secrets">
            <SecretsSettings />
          </TabsContent>

          <TabsContent value="governance">
            <GovernanceSettings />
          </TabsContent>

          <TabsContent value="agents">
            <AgentRulesSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function GeneralSettings() {
  const { data: settings, isLoading, refetch } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <SettingsLoader />;
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">General Settings</CardTitle>
        <CardDescription className="text-slate-400">
          Configure general application preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-slate-300">Enable Notifications</Label>
            <p className="text-xs text-slate-500">Receive notifications for agent activities</p>
          </div>
          <Switch
            checked={settings?.notifyOnAgentCompletion ?? true}
            onCheckedChange={(v) => updateMutation.mutate({ notifyOnAgentCompletion: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-slate-300">Auto-approve Low-risk Changes</Label>
            <p className="text-xs text-slate-500">Automatically approve changes below risk threshold</p>
          </div>
          <Switch
            checked={false}
            onCheckedChange={() => toast.info("Feature coming soon")}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Default Budget Limit (USD)</Label>
          <Input
            type="text"
            value={settings?.dailyBudgetLimitUsd ?? "10.00"}
            onChange={(e) => updateMutation.mutate({ dailyBudgetLimitUsd: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white max-w-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Default Model</Label>
          <Input
            type="text"
            value={settings?.defaultModel ?? "gemini-2.0-flash"}
            onChange={(e) => updateMutation.mutate({ defaultModel: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white max-w-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SecretsSettings() {
  const [showValues, setShowValues] = useState<Record<number, boolean>>({});
  const [newSecret, setNewSecret] = useState({ name: "", key: "", value: "" });

  const { data: secrets, isLoading, refetch } = trpc.settings.secrets.useQuery({});
  const createMutation = trpc.settings.createSecret.useMutation({
    onSuccess: () => {
      toast.success("Secret created");
      setNewSecret({ name: "", key: "", value: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.settings.deleteSecret.useMutation({
    onSuccess: () => {
      toast.success("Secret deleted");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <SettingsLoader />;
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Secrets & API Keys</CardTitle>
        <CardDescription className="text-slate-400">
          Manage API keys and secrets for external integrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new secret */}
        <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
          <h4 className="text-sm font-medium text-slate-300">Add New Secret</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs">Key</Label>
              <Input
                placeholder="GITHUB_TOKEN"
                value={newSecret.key}
                onChange={(e) => setNewSecret({ ...newSecret, key: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs">Value</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newSecret.value}
                onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate(newSecret)}
            disabled={!newSecret.key || !newSecret.value || createMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Secret
          </Button>
        </div>

        {/* Existing secrets */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Existing Secrets</h4>
          {secrets && secrets.length > 0 ? (
            <div className="space-y-2">
             {secrets?.map((secret: { id: number; key: string }) => (
                <div key={secret.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-slate-500" />
                    <span className="font-mono text-sm text-slate-300">{secret.key}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowValues({ ...showValues, [secret.id]: !showValues[secret.id] })}
                      className="h-8 w-8 text-slate-400"
                    >
                      {showValues[secret.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: secret.id })}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No secrets configured yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GovernanceSettings() {
  const { data: settings, isLoading, refetch } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Governance settings updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <SettingsLoader />;
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Governance Settings</CardTitle>
        <CardDescription className="text-slate-400">
          Configure change lifecycle and approval workflows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-4">8-Step Change Lifecycle</h4>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">1</span> Goal Declaration</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">2</span> Plan Proposal</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">3</span> Risk Assessment</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">4</span> Approval Request</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">5</span> Execution</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">6</span> Verification</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">7</span> Documentation</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">8</span> Completion</li>
          </ol>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-slate-300">Require Approval for All Changes</Label>
            <p className="text-xs text-slate-500">All agent changes must be manually approved</p>
          </div>
          <Switch
            checked={true}
            onCheckedChange={() => toast.info("Feature coming soon")}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Risk Threshold for Auto-approval</Label>
          <p className="text-xs text-slate-500">Changes below this risk level can be auto-approved (0-100)</p>
          <Input
            type="number"
            min={0}
            max={100}
            defaultValue={30}
            className="bg-slate-800 border-slate-700 text-white max-w-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AgentRulesSettings() {
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Agent Rules</CardTitle>
        <CardDescription className="text-slate-400">
          Define global rules and constraints for all agents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Default Safety Rules</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>• Agents cannot delete files without explicit approval</li>
            <li>• Agents cannot modify authentication or security code</li>
            <li>• Agents must explain their reasoning before changes</li>
            <li>• Agents halt when uncertainty exceeds threshold</li>
            <li>• Agents respect budget limits per execution</li>
          </ul>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-amber-400 mb-2">Custom Rules (Coming Soon)</h4>
          <p className="text-sm text-slate-400">
            Define custom rules using natural language or code patterns to restrict agent behavior.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsLoader() {
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </CardContent>
    </Card>
  );
}
