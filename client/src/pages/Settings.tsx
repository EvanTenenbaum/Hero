import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Settings as SettingsIcon, Key, Shield, Bot, Bell, Loader2, Plus, Trash2, Eye, EyeOff, DollarSign, Github, ExternalLink, Check, X } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import { CostDashboard, UsageSummary, BudgetStatus } from "@/components/CostDashboard";

export default function Settings() {
  const params = useParams<{ tab: string }>();
  const defaultTab = params.tab || "general";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure Hero IDE preferences and integrations</p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="general" className="data-[state=active]:bg-primary">
              <SettingsIcon className="h-4 w-4 mr-2" /> General
            </TabsTrigger>
            <TabsTrigger value="secrets" className="data-[state=active]:bg-primary">
              <Key className="h-4 w-4 mr-2" /> Secrets
            </TabsTrigger>
            <TabsTrigger value="governance" className="data-[state=active]:bg-primary">
              <Shield className="h-4 w-4 mr-2" /> Governance
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-primary">
              <Bot className="h-4 w-4 mr-2" /> Agent Rules
            </TabsTrigger>
            <TabsTrigger value="budget" className="data-[state=active]:bg-primary">
              <DollarSign className="h-4 w-4 mr-2" /> Budget
            </TabsTrigger>
            <TabsTrigger value="github" className="data-[state=active]:bg-primary">
              <Github className="h-4 w-4 mr-2" /> GitHub
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

          <TabsContent value="budget">
            <BudgetSettings />
          </TabsContent>

          <TabsContent value="github">
            <GitHubSettings />
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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">General Settings</CardTitle>
        <CardDescription className="text-muted-foreground">
          Configure general application preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-foreground">Enable Notifications</Label>
            <p className="text-xs text-muted-foreground">Receive notifications for agent activities</p>
          </div>
          <Switch
            checked={settings?.notifyOnAgentCompletion ?? true}
            onCheckedChange={(v) => updateMutation.mutate({ notifyOnAgentCompletion: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-foreground">Auto-approve Low-risk Changes</Label>
            <p className="text-xs text-muted-foreground">Automatically approve changes below risk threshold</p>
          </div>
          <Switch
            checked={false}
            onCheckedChange={() => toast.info("Feature coming soon")}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Default Budget Limit (USD)</Label>
          <Input
            type="text"
            value={settings?.dailyBudgetLimitUsd ?? "10.00"}
            onChange={(e) => updateMutation.mutate({ dailyBudgetLimitUsd: e.target.value })}
            className="bg-secondary border-border text-foreground max-w-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Default Model</Label>
          <Input
            type="text"
            value={settings?.defaultModel ?? "gemini-2.0-flash"}
            onChange={(e) => updateMutation.mutate({ defaultModel: e.target.value })}
            className="bg-secondary border-border text-foreground max-w-xs"
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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Secrets & API Keys</CardTitle>
        <CardDescription className="text-muted-foreground">
          Manage API keys and secrets for external integrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new secret */}
        <div className="p-4 bg-secondary/50 rounded-lg space-y-4">
          <h4 className="text-sm font-medium text-foreground">Add New Secret</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Key</Label>
              <Input
                placeholder="GITHUB_TOKEN"
                value={newSecret.key}
                onChange={(e) => setNewSecret({ ...newSecret, key: e.target.value })}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Value</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newSecret.value}
                onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                className="bg-secondary border-border text-foreground"
              />
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate(newSecret)}
            disabled={!newSecret.key || !newSecret.value || createMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Secret
          </Button>
        </div>

        {/* Existing secrets */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Existing Secrets</h4>
          {secrets && secrets.length > 0 ? (
            <div className="space-y-2">
             {secrets?.map((secret: { id: number; key: string }) => (
                <div key={secret.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm text-foreground">{secret.key}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowValues({ ...showValues, [secret.id]: !showValues[secret.id] })}
                      className="h-8 w-8 text-muted-foreground"
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
            <p className="text-muted-foreground text-sm">No secrets configured yet.</p>
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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Governance Settings</CardTitle>
        <CardDescription className="text-muted-foreground">
          Configure change lifecycle and approval workflows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-secondary/50 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-4">8-Step Change Lifecycle</h4>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">1</span> Goal Declaration</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">2</span> Plan Proposal</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">3</span> Risk Assessment</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">4</span> Approval Request</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">5</span> Execution</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">6</span> Verification</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">7</span> Documentation</li>
            <li className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">8</span> Completion</li>
          </ol>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-foreground">Require Approval for All Changes</Label>
            <p className="text-xs text-muted-foreground">All agent changes must be manually approved</p>
          </div>
          <Switch
            checked={true}
            onCheckedChange={() => toast.info("Feature coming soon")}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Risk Threshold for Auto-approval</Label>
          <p className="text-xs text-muted-foreground">Changes below this risk level can be auto-approved (0-100)</p>
          <Input
            type="number"
            min={0}
            max={100}
            defaultValue={30}
            className="bg-secondary border-border text-foreground max-w-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AgentRulesSettings() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Agent Rules</CardTitle>
        <CardDescription className="text-muted-foreground">
          Define global rules and constraints for all agents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-secondary/50 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-2">Default Safety Rules</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Agents cannot delete files without explicit approval</li>
            <li>• Agents cannot modify authentication or security code</li>
            <li>• Agents must explain their reasoning before changes</li>
            <li>• Agents halt when uncertainty exceeds threshold</li>
            <li>• Agents respect budget limits per execution</li>
          </ul>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-amber-400 mb-2">Custom Rules (Coming Soon)</h4>
          <p className="text-sm text-muted-foreground">
            Define custom rules using natural language or code patterns to restrict agent behavior.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetSettings() {
  const { data: settings, isLoading } = trpc.settings.get.useQuery();

  // Calculate usage from settings or use defaults
  const usage: UsageSummary = {
    today: { tokens: 0, cost: 0, executions: 0 },
    thisWeek: { tokens: 0, cost: 0, executions: 0 },
    thisMonth: { tokens: 0, cost: 0, executions: 0 },
    allTime: { tokens: 0, cost: 0, executions: 0 },
  };

  const dailyLimit = settings?.dailyBudgetLimitUsd ? parseFloat(settings.dailyBudgetLimitUsd) : 10;
  const monthlyLimit = dailyLimit * 30;

  const budget: BudgetStatus = {
    dailyLimit,
    monthlyLimit,
    dailyUsed: usage.today.cost,
    monthlyUsed: usage.thisMonth.cost,
    dailyRemaining: dailyLimit - usage.today.cost,
    monthlyRemaining: monthlyLimit - usage.thisMonth.cost,
    isOverDailyLimit: usage.today.cost > dailyLimit,
    isOverMonthlyLimit: usage.thisMonth.cost > monthlyLimit,
    warningLevel: 'none',
  };

  // Calculate warning level
  const dailyPercent = (budget.dailyUsed / (budget.dailyLimit || 1)) * 100;
  const monthlyPercent = (budget.monthlyUsed / (budget.monthlyLimit || 1)) * 100;
  const maxPercent = Math.max(dailyPercent, monthlyPercent);

  if (maxPercent >= 100) budget.warningLevel = 'exceeded';
  else if (maxPercent >= 90) budget.warningLevel = 'high';
  else if (maxPercent >= 75) budget.warningLevel = 'medium';
  else if (maxPercent >= 50) budget.warningLevel = 'low';

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Budget & Cost Tracking</CardTitle>
        <CardDescription className="text-muted-foreground">
          Monitor token usage and costs across all agent executions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CostDashboard usage={usage} budget={budget} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}

function GitHubSettings() {
  const { data: connection, isLoading, refetch } = trpc.github.getConnection.useQuery();
  const { data: authUrl } = trpc.github.getAuthUrl.useQuery(undefined, {
    enabled: !connection?.connected,
  });
  const disconnectMutation = trpc.github.disconnect.useMutation({
    onSuccess: () => {
      toast.success("GitHub disconnected");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <SettingsLoader />;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Integration
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Connect your GitHub account to browse repositories, view files, and make changes directly from Hero IDE.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {connection?.connected ? (
          <>
            {/* Connected state */}
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-green-400">Connected to GitHub</p>
                    <p className="text-sm text-muted-foreground">Logged in as @{connection.username}</p>
                  </div>
                </div>
                <a
                  href={`https://github.com/${connection.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Permissions info */}
            <div className="p-4 bg-secondary/50 rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-3">Permissions Granted</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Read access to repositories
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Write access to repository contents
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Create and manage pull requests
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Create and manage branches
                </li>
              </ul>
            </div>

            {/* Disconnect button */}
            <Button
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Disconnect GitHub
            </Button>
          </>
        ) : (
          <>
            {/* Not connected state */}
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center">
                  <Github className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Not Connected</p>
                  <p className="text-sm text-muted-foreground">Connect your GitHub account to get started</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground mb-4">
                <p>By connecting your GitHub account, you will be able to:</p>
                <ul className="space-y-2 ml-4">
                  <li>• Browse and search your repositories</li>
                  <li>• View and edit files directly in Hero IDE</li>
                  <li>• Create commits and push changes</li>
                  <li>• Manage branches and pull requests</li>
                  <li>• Let AI agents work with your codebase</li>
                </ul>
              </div>

              {authUrl?.url ? (
                <Button
                  className="bg-[#24292f] hover:bg-[#32383f] text-foreground"
                  onClick={() => window.location.href = authUrl.url}
                >
                  <Github className="h-4 w-4 mr-2" />
                  Connect with GitHub
                </Button>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400">
                    GitHub OAuth is not configured. Please set up GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsLoader() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </CardContent>
    </Card>
  );
}
