/**
 * Prompt-to-Plan Workflow Component
 * Sprint 6: Visual workflow for spec-driven development
 * 
 * Guides users through: Specify → Design → Tasks → Implement
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Palette, 
  ListTodo, 
  Play, 
  CheckCircle2, 
  ChevronRight,
  Loader2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface PromptToPlanWorkflowProps {
  projectId: number;
  specId?: number;
  onSpecCreated?: (specId: number) => void;
}

type Phase = "specify" | "design" | "tasks" | "implement" | "complete";

const PHASES: { id: Phase; label: string; icon: React.ElementType; description: string }[] = [
  { id: "specify", label: "Specify", icon: FileText, description: "Define requirements in EARS format" },
  { id: "design", label: "Design", icon: Palette, description: "Generate technical design" },
  { id: "tasks", label: "Tasks", icon: ListTodo, description: "Break down into executable tasks" },
  { id: "implement", label: "Implement", icon: Play, description: "Execute with verification" },
  { id: "complete", label: "Complete", icon: CheckCircle2, description: "Feature delivered" }
];

export function PromptToPlanWorkflow({ projectId, specId, onSpecCreated }: PromptToPlanWorkflowProps) {
  const [prompt, setPrompt] = useState("");
  const [activeSpecId, setActiveSpecId] = useState<number | undefined>(specId);
  
  // Queries
  const specQuery = trpc.specs.getById.useQuery(
    { id: activeSpecId! },
    { enabled: !!activeSpecId }
  );
  
  const progressQuery = trpc.specs.getImplementationProgress.useQuery(
    { specId: activeSpecId! },
    { enabled: !!activeSpecId && specQuery.data?.phase === "implement" }
  );

  // Mutations
  const generateSpec = trpc.specs.generateFromPrompt.useMutation({
    onSuccess: (data) => {
      if ('specId' in data && data.specId) {
        setActiveSpecId(data.specId);
        onSpecCreated?.(data.specId);
        toast.success("Spec generated successfully!");
      }
    },
    onError: (error) => {
      toast.error(`Failed to generate spec: ${error.message}`);
    }
  });

  const generateDesign = trpc.specs.generateDesign.useMutation({
    onSuccess: () => {
      specQuery.refetch();
      toast.success("Design generated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to generate design: ${error.message}`);
    }
  });

  const breakdownTasks = trpc.specs.breakdownIntoTasks.useMutation({
    onSuccess: () => {
      specQuery.refetch();
      toast.success("Tasks created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create tasks: ${error.message}`);
    }
  });

  const advancePhase = trpc.specs.advancePhase.useMutation({
    onSuccess: () => {
      specQuery.refetch();
      toast.success("Phase advanced!");
    },
    onError: (error) => {
      toast.error(`Failed to advance phase: ${error.message}`);
    }
  });

  const spec = specQuery.data;
  const currentPhase = (spec?.phase as Phase) || "specify";
  const currentPhaseIndex = PHASES.findIndex(p => p.id === currentPhase);

  const handleGenerateSpec = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a feature description");
      return;
    }
    generateSpec.mutate({ 
      projectId, 
      prompt,
      autoSave: true 
    });
  };

  const handleGenerateDesign = () => {
    if (!activeSpecId) return;
    generateDesign.mutate({ specId: activeSpecId });
  };

  const handleBreakdownTasks = () => {
    if (!activeSpecId) return;
    breakdownTasks.mutate({ specId: activeSpecId });
  };

  const handleAdvancePhase = (approve: boolean) => {
    if (!activeSpecId) return;
    advancePhase.mutate({ specId: activeSpecId, approve });
  };

  const isLoading = generateSpec.isPending || generateDesign.isPending || 
                    breakdownTasks.isPending || advancePhase.isPending;

  return (
    <div className="space-y-6">
      {/* Phase Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Prompt-to-Plan Workflow</CardTitle>
          <CardDescription>
            Transform natural language into executable code through structured phases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            {PHASES.map((phase, index) => {
              const Icon = phase.icon;
              const isActive = phase.id === currentPhase;
              const isComplete = index < currentPhaseIndex;
              const isFuture = index > currentPhaseIndex;

              return (
                <div key={phase.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isComplete ? "bg-green-500 text-white" : ""}
                      ${isActive ? "bg-primary text-primary-foreground" : ""}
                      ${isFuture ? "bg-muted text-muted-foreground" : ""}
                    `}>
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? "font-semibold" : ""}`}>
                      {phase.label}
                    </span>
                  </div>
                  {index < PHASES.length - 1 && (
                    <ChevronRight className={`h-4 w-4 mx-2 ${
                      index < currentPhaseIndex ? "text-green-500" : "text-muted-foreground"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          
          {progressQuery.data && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Implementation Progress</span>
                <span>{progressQuery.data.completionPercentage}%</span>
              </div>
              <Progress value={progressQuery.data.completionPercentage} />
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>✓ {progressQuery.data.completedTasks} completed</span>
                <span>⏳ {progressQuery.data.inProgressTasks} in progress</span>
                <span>📋 {progressQuery.data.pendingTasks} pending</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Content */}
      <Tabs value={currentPhase} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {PHASES.map(phase => (
            <TabsTrigger 
              key={phase.id} 
              value={phase.id}
              disabled={PHASES.findIndex(p => p.id === phase.id) > currentPhaseIndex}
            >
              {phase.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Specify Phase */}
        <TabsContent value="specify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Describe Your Feature
              </CardTitle>
              <CardDescription>
                Describe what you want to build in natural language. 
                The AI will generate structured EARS requirements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeSpecId ? (
                <>
                  <Textarea
                    placeholder="Example: I want to add a user dashboard that shows their recent activity, project statistics, and quick actions for common tasks..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <Button 
                    onClick={handleGenerateSpec}
                    disabled={isLoading || !prompt.trim()}
                    className="w-full"
                  >
                    {generateSpec.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Requirements...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate EARS Requirements
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{spec?.title}</h3>
                    <Badge variant={spec?.phaseStatus === "approved" ? "default" : "secondary"}>
                      {spec?.phaseStatus}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{spec?.overview}</p>
                  
                  {spec?.requirements && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Requirements</h4>
                      {(spec.requirements as any[]).map((req: any, i: number) => (
                        <div key={i} className="p-3 bg-muted rounded-lg text-sm">
                          <Badge variant="outline" className="mb-1">{req.type}</Badge>
                          <p>{req.rawText || req.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleAdvancePhase(false)}
                      disabled={isLoading}
                    >
                      Request Changes
                    </Button>
                    <Button 
                      onClick={() => handleAdvancePhase(true)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Approve & Continue to Design
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Design Phase */}
        <TabsContent value="design" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Technical Design
              </CardTitle>
              <CardDescription>
                Generate data models, API contracts, and component designs based on requirements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!spec?.technicalDesign ? (
                <Button 
                  onClick={handleGenerateDesign}
                  disabled={isLoading}
                  className="w-full"
                >
                  {generateDesign.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Codebase & Generating Design...
                    </>
                  ) : (
                    <>
                      <Palette className="mr-2 h-4 w-4" />
                      Generate Technical Design
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                      {spec.technicalDesign}
                    </pre>
                  </div>

                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleAdvancePhase(false)}
                      disabled={isLoading}
                    >
                      Request Changes
                    </Button>
                    <Button 
                      onClick={() => handleAdvancePhase(true)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Approve & Continue to Tasks
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Phase */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Task Breakdown
              </CardTitle>
              <CardDescription>
                Break down the design into atomic, executable tasks with dependencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!spec?.taskBreakdown ? (
                <Button 
                  onClick={handleBreakdownTasks}
                  disabled={isLoading}
                  className="w-full"
                >
                  {breakdownTasks.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Breaking Down into Tasks...
                    </>
                  ) : (
                    <>
                      <ListTodo className="mr-2 h-4 w-4" />
                      Generate Task Breakdown
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    {(spec.taskBreakdown as any[]).slice(0, 10).map((task: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Badge variant="outline">{task.id}</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.estimatedHours}h • {task.assignedAgentType}
                          </p>
                        </div>
                        <Badge>{task.priority}</Badge>
                      </div>
                    ))}
                    {(spec.taskBreakdown as any[]).length > 10 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{(spec.taskBreakdown as any[]).length - 10} more tasks
                      </p>
                    )}
                  </div>

                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleAdvancePhase(false)}
                      disabled={isLoading}
                    >
                      Request Changes
                    </Button>
                    <Button 
                      onClick={() => handleAdvancePhase(true)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Approve & Start Implementation
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Implement Phase */}
        <TabsContent value="implement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Implementation
              </CardTitle>
              <CardDescription>
                Tasks are being executed with spec traceability and verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {progressQuery.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-green-500">
                        {progressQuery.data.completedTasks}
                      </p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-blue-500">
                        {progressQuery.data.inProgressTasks}
                      </p>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </div>
                    <div className="p-4 bg-yellow-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-500">
                        {progressQuery.data.blockedTasks}
                      </p>
                      <p className="text-xs text-muted-foreground">Blocked</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">
                        {progressQuery.data.pendingTasks}
                      </p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Estimated remaining: {progressQuery.data.estimatedRemainingHours} hours
                  </div>

                  {progressQuery.data.completionPercentage === 100 && (
                    <Button 
                      onClick={() => handleAdvancePhase(true)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Mark as Complete
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading progress...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complete Phase */}
        <TabsContent value="complete" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                Feature Complete
              </CardTitle>
              <CardDescription>
                All tasks have been implemented and verified against requirements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{spec?.title}</h3>
                <p className="text-muted-foreground">
                  Successfully implemented with full spec traceability.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
