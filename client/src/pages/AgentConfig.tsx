import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  Shield, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Bot,
  Code,
  TestTube,
  Server,
  Search,
} from "lucide-react";
import { toast } from "sonner";

// Agent type icons and colors
const AGENT_CONFIG = {
  pm: { icon: Bot, color: "bg-blue-500", label: "PM Agent", description: "Project management and planning" },
  developer: { icon: Code, color: "bg-green-500", label: "Developer Agent", description: "Code generation and editing" },
  qa: { icon: TestTube, color: "bg-purple-500", label: "QA Agent", description: "Testing and quality assurance" },
  devops: { icon: Server, color: "bg-orange-500", label: "DevOps Agent", description: "Deployment and infrastructure" },
  research: { icon: Search, color: "bg-cyan-500", label: "Research Agent", description: "Information gathering and analysis" },
};

// Preset rules for quick setup
const PRESET_RULES = [
  { id: "typescript_only", label: "Always use TypeScript", icon: Code },
  { id: "confirm_deletes", label: "Confirm before deleting files", icon: AlertTriangle },
  { id: "no_force_push", label: "Never force push to git", icon: Shield },
  { id: "document_changes", label: "Document code changes", icon: CheckCircle },
  { id: "test_before_commit", label: "Run tests before commits", icon: TestTube },
] as const;

type PresetId = typeof PRESET_RULES[number]["id"];

export default function AgentConfig() {
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [newRuleContent, setNewRuleContent] = useState("");
  const [newRuleType, setNewRuleType] = useState<"instruction" | "allow" | "deny" | "confirm">("instruction");
  
  const utils = trpc.useUtils();
  
  // Fetch user rules
  const { data: rules, isLoading } = trpc.userRules.list.useQuery(
    selectedAgent === "all" ? undefined : { agentType: selectedAgent as "pm" | "developer" | "qa" | "devops" | "research" }
  );
  
  // Mutations
  const createRule = trpc.userRules.create.useMutation({
    onSuccess: () => {
      utils.userRules.list.invalidate();
      setNewRuleContent("");
      toast.success("Rule created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });
  
  const deleteRule = trpc.userRules.delete.useMutation({
    onSuccess: () => {
      utils.userRules.list.invalidate();
      toast.success("Rule deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
  
  const createPresets = trpc.userRules.createPresets.useMutation({
    onSuccess: () => {
      utils.userRules.list.invalidate();
      toast.success("Preset rules added");
    },
    onError: (error) => {
      toast.error(`Failed to add presets: ${error.message}`);
    },
  });
  
  const handleAddRule = () => {
    if (!newRuleContent.trim()) {
      toast.error("Please enter a rule");
      return;
    }
    
    createRule.mutate({
      agentType: selectedAgent === "all" ? undefined : selectedAgent as "pm" | "developer" | "qa" | "devops" | "research",
      ruleType: newRuleType,
      ruleContent: newRuleContent.trim(),
    });
  };
  
  const handleAddPreset = (presetId: PresetId) => {
    createPresets.mutate({ presets: [presetId] });
  };
  
  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case "instruction": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "allow": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "deny": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "confirm": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Agent Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Customize how AI agents behave in your projects. Set rules, permissions, and safety boundaries.
          </p>
        </div>
        
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rules" className="gap-2">
              <Shield className="h-4 w-4" />
              Rules & Boundaries
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2">
              <Bot className="h-4 w-4" />
              Agent Settings
            </TabsTrigger>
            <TabsTrigger value="presets" className="gap-2">
              <Zap className="h-4 w-4" />
              Quick Presets
            </TabsTrigger>
          </TabsList>
          
          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            {/* Agent Filter */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filter by Agent</CardTitle>
                <CardDescription>Select which agent type to configure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedAgent === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAgent("all")}
                  >
                    All Agents
                  </Button>
                  {Object.entries(AGENT_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <Button
                        key={key}
                        variant={selectedAgent === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedAgent(key)}
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Add New Rule */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add New Rule</CardTitle>
                <CardDescription>
                  Create custom rules to control agent behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <Textarea
                    placeholder="Enter your rule... (e.g., 'Always add error handling to async functions')"
                    value={newRuleContent}
                    onChange={(e) => setNewRuleContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as typeof newRuleType)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instruction">📝 Instruction</SelectItem>
                        <SelectItem value="allow">✅ Allow</SelectItem>
                        <SelectItem value="deny">🚫 Deny</SelectItem>
                        <SelectItem value="confirm">⚠️ Confirm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleAddRule} disabled={createRule.isPending} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Rule
                </Button>
              </CardContent>
            </Card>
            
            {/* Existing Rules */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Active Rules</CardTitle>
                <CardDescription>
                  {rules?.length || 0} rule{rules?.length !== 1 ? 's' : ''} configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
                ) : rules?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No rules configured yet</p>
                    <p className="text-sm">Add rules above or use quick presets to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules?.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getRuleTypeColor(rule.ruleType)}>
                              {rule.ruleType}
                            </Badge>
                            {rule.agentType && (
                              <Badge variant="secondary" className="text-xs">
                                {AGENT_CONFIG[rule.agentType as keyof typeof AGENT_CONFIG]?.label || rule.agentType}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{rule.ruleContent}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule.mutate({ id: rule.id })}
                          disabled={deleteRule.isPending}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(AGENT_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{config.label}</CardTitle>
                          <CardDescription className="text-xs">{config.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${key}-enabled`} className="text-sm">Enabled</Label>
                        <Switch id={`${key}-enabled`} defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${key}-confirm`} className="text-sm">Require confirmation</Label>
                        <Switch id={`${key}-confirm`} />
                      </div>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Settings className="h-4 w-4" />
                        Advanced Settings
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          {/* Presets Tab */}
          <TabsContent value="presets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Presets</CardTitle>
                <CardDescription>
                  One-click setup for common safety and productivity rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {PRESET_RULES.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <Button
                        key={preset.id}
                        variant="outline"
                        className="h-auto py-4 justify-start gap-3"
                        onClick={() => handleAddPreset(preset.id)}
                        disabled={createPresets.isPending}
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span>{preset.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Rule Type Guide</CardTitle>
                <CardDescription>
                  Understanding different rule types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className={getRuleTypeColor("instruction")}>instruction</Badge>
                    <div>
                      <p className="font-medium text-sm">Instructions</p>
                      <p className="text-sm text-muted-foreground">
                        General guidelines the agent should follow. Example: "Always use TypeScript"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className={getRuleTypeColor("allow")}>allow</Badge>
                    <div>
                      <p className="font-medium text-sm">Allow Rules</p>
                      <p className="text-sm text-muted-foreground">
                        Explicitly permit certain actions. Example: "Allow modifying test files"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className={getRuleTypeColor("deny")}>deny</Badge>
                    <div>
                      <p className="font-medium text-sm">Deny Rules</p>
                      <p className="text-sm text-muted-foreground">
                        Block specific actions completely. Example: "Never delete production configs"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className={getRuleTypeColor("confirm")}>confirm</Badge>
                    <div>
                      <p className="font-medium text-sm">Confirmation Rules</p>
                      <p className="text-sm text-muted-foreground">
                        Require user approval before action. Example: "Confirm before git push"
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
