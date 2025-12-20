/**
 * AgentOnboarding Component
 * Guided setup wizard for configuring AI agents on first use
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Bot, 
  Shield, 
  Zap, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Code,
  TestTube,
  Server,
  Search,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface AgentOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

// Preset configurations
const SAFETY_PRESETS = [
  { id: "typescript_only", label: "Always use TypeScript", description: "Prefer TypeScript over JavaScript for type safety", recommended: true },
  { id: "confirm_deletes", label: "Confirm file deletions", description: "Ask for approval before deleting any file", recommended: true },
  { id: "no_force_push", label: "Block force push", description: "Never allow git push --force commands", recommended: true },
  { id: "document_changes", label: "Document changes", description: "Add comments explaining code modifications", recommended: false },
  { id: "test_before_commit", label: "Test before commit", description: "Run tests before committing changes", recommended: false },
] as const;

const AGENT_TYPES = [
  { id: "pm", label: "PM Agent", icon: Bot, description: "Project planning and task management", color: "bg-blue-500" },
  { id: "developer", label: "Developer Agent", icon: Code, description: "Code generation and editing", color: "bg-green-500" },
  { id: "qa", label: "QA Agent", icon: TestTube, description: "Testing and quality assurance", color: "bg-purple-500" },
  { id: "devops", label: "DevOps Agent", icon: Server, description: "Deployment and infrastructure", color: "bg-orange-500" },
  { id: "research", label: "Research Agent", icon: Search, description: "Information gathering", color: "bg-cyan-500" },
];

type Step = "welcome" | "safety" | "agents" | "complete";

export function AgentOnboarding({ onComplete, onSkip }: AgentOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(
    new Set(SAFETY_PRESETS.filter(p => p.recommended).map(p => p.id))
  );
  const [enabledAgents, setEnabledAgents] = useState<Set<string>>(
    new Set(["pm", "developer"])
  );
  
  const utils = trpc.useUtils();
  
  const createPresets = trpc.userRules.createPresets.useMutation({
    onSuccess: () => {
      utils.userRules.list.invalidate();
    },
  });
  
  const steps: Step[] = ["welcome", "safety", "agents", "complete"];
  const currentIndex = steps.indexOf(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;
  
  const togglePreset = (presetId: string) => {
    const newSelected = new Set(selectedPresets);
    if (newSelected.has(presetId)) {
      newSelected.delete(presetId);
    } else {
      newSelected.add(presetId);
    }
    setSelectedPresets(newSelected);
  };
  
  const toggleAgent = (agentId: string) => {
    const newEnabled = new Set(enabledAgents);
    if (newEnabled.has(agentId)) {
      newEnabled.delete(agentId);
    } else {
      newEnabled.add(agentId);
    }
    setEnabledAgents(newEnabled);
  };
  
  const handleNext = async () => {
    if (currentStep === "welcome") {
      setCurrentStep("safety");
    } else if (currentStep === "safety") {
      // Save selected presets
      if (selectedPresets.size > 0) {
        try {
          await createPresets.mutateAsync({
            presets: Array.from(selectedPresets) as Array<"typescript_only" | "confirm_deletes" | "no_force_push" | "document_changes" | "test_before_commit">,
          });
        } catch (error) {
          toast.error("Failed to save safety rules");
        }
      }
      setCurrentStep("agents");
    } else if (currentStep === "agents") {
      setCurrentStep("complete");
    } else if (currentStep === "complete") {
      onComplete();
    }
  };
  
  const handleBack = () => {
    if (currentStep === "safety") {
      setCurrentStep("welcome");
    } else if (currentStep === "agents") {
      setCurrentStep("safety");
    } else if (currentStep === "complete") {
      setCurrentStep("agents");
    }
  };
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <Progress value={progress} className="h-1" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Step {currentIndex + 1} of {steps.length}</span>
            <Button variant="ghost" size="sm" onClick={onSkip} className="h-auto p-0 text-xs">
              Skip setup
            </Button>
          </div>
        </div>
        
        {/* Welcome Step */}
        {currentStep === "welcome" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to Hero IDE</CardTitle>
              <CardDescription className="text-base">
                Let's set up your AI agents to work exactly how you want them to.
                This quick setup will help you configure safety rules and agent preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-medium">Safety First</h3>
                  <p className="text-sm text-muted-foreground">Set boundaries for AI actions</p>
                </div>
                <div className="text-center p-4">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-medium">Your Rules</h3>
                  <p className="text-sm text-muted-foreground">Customize agent behavior</p>
                </div>
                <div className="text-center p-4">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <h3 className="font-medium">Full Control</h3>
                  <p className="text-sm text-muted-foreground">Approve critical actions</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleNext} className="gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}
        
        {/* Safety Rules Step */}
        {currentStep === "safety" && (
          <>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Shield className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Safety Rules</CardTitle>
                  <CardDescription>
                    Choose which safety rules to enable for your AI agents
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {SAFETY_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedPresets.has(preset.id) 
                      ? "border-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => togglePreset(preset.id)}
                >
                  <Checkbox
                    checked={selectedPresets.has(preset.id)}
                    onCheckedChange={() => togglePreset(preset.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium cursor-pointer">{preset.label}</Label>
                      {preset.recommended && (
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={createPresets.isPending} className="gap-2">
                  {createPresets.isPending ? "Saving..." : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}
        
        {/* Agent Selection Step */}
        {currentStep === "agents" && (
          <>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Bot className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle>Enable Agents</CardTitle>
                  <CardDescription>
                    Choose which AI agents you want to use in your projects
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {AGENT_TYPES.map((agent) => {
                  const Icon = agent.icon;
                  return (
                    <div
                      key={agent.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        enabledAgents.has(agent.id) 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleAgent(agent.id)}
                    >
                      <Checkbox
                        checked={enabledAgents.has(agent.id)}
                        onCheckedChange={() => toggleAgent(agent.id)}
                      />
                      <div className={`p-2 rounded-lg ${agent.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className="font-medium cursor-pointer">{agent.label}</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  You can enable or disable agents at any time from the Agent Configuration page.
                </p>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleNext} className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}
        
        {/* Complete Step */}
        {currentStep === "complete" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-green-500/10">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl">You're All Set!</CardTitle>
              <CardDescription className="text-base">
                Your AI agents are configured and ready to help you build amazing things.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-medium">Your Configuration:</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">
                      {selectedPresets.size} safety rule{selectedPresets.size !== 1 ? 's' : ''} enabled
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {enabledAgents.size} agent{enabledAgents.size !== 1 ? 's' : ''} activated
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">What's Next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Start a new project or open an existing one</li>
                  <li>• Use the chat to interact with your AI agents</li>
                  <li>• Customize rules anytime from Agent Configuration</li>
                </ul>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleNext} className="gap-2">
                  Start Building
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default AgentOnboarding;
