import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  GitBranch,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface SprintPlanningUIProps {
  boardId: number;
  boardName: string;
  onClose?: () => void;
}

interface TaskAnalysis {
  cardId: number;
  title: string;
  description: string | null;
  type: string | null;
  priority: string | null;
  estimateHours: number | null;
  storyPoints: number | null;
  assignedAgent: string | null;
  touchedFiles: string[];
  touchedModules: string[];
  complexity: 'low' | 'medium' | 'high';
  suggestedAgent: string;
  parallelizable: boolean;
}

interface SprintWorkstream {
  name: string;
  agent: string;
  tasks: TaskAnalysis[];
  totalHours: number;
  totalPoints: number;
  reasoning: string;
}

interface SprintPlan {
  sprintName: string;
  sprintGoal: string;
  duration: string;
  workstreams: SprintWorkstream[];
  conflicts: Array<{
    task1: number;
    task2: number;
    reason: string;
    resolution: string;
  }>;
  criticalPath: number[];
  risks: string[];
  recommendations: string[];
}

export function SprintPlanningUI({ boardId, boardName, onClose }: SprintPlanningUIProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [durationDays, setDurationDays] = useState(14);
  const [sprintPlan, setSprintPlan] = useState<SprintPlan | null>(null);
  const [adjustment, setAdjustment] = useState("");

  const generateMutation = trpc.kanban.generateSprintPlan.useMutation({
    onSuccess: (plan) => {
      setSprintPlan(plan as SprintPlan);
      toast.success("Sprint plan generated!");
    },
    onError: (error) => {
      toast.error(`Failed to generate sprint plan: ${error.message}`);
    },
  });

  const adjustMutation = trpc.kanban.adjustSprintPlan.useMutation({
    onSuccess: (plan) => {
      setSprintPlan(plan as SprintPlan);
      setAdjustment("");
      toast.success("Sprint plan adjusted!");
    },
    onError: (error) => {
      toast.error(`Failed to adjust sprint plan: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!sprintName.trim() || !sprintGoal.trim()) {
      toast.error("Please enter sprint name and goal");
      return;
    }
    generateMutation.mutate({
      boardId,
      sprintName,
      sprintGoal,
      durationDays,
    });
  };

  const handleAdjust = () => {
    if (!adjustment.trim() || !sprintPlan) {
      toast.error("Please enter an adjustment");
      return;
    }
    adjustMutation.mutate({
      currentPlan: sprintPlan,
      adjustment,
    });
  };

  const getAgentColor = (agent: string) => {
    const colors: Record<string, string> = {
      PM: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      Dev: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      QA: "bg-green-500/10 text-green-500 border-green-500/20",
      DevOps: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      Research: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    };
    return colors[agent] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  const getComplexityColor = (complexity: string) => {
    const colors: Record<string, string> = {
      low: "bg-green-500/10 text-green-500",
      medium: "bg-yellow-500/10 text-yellow-500",
      high: "bg-red-500/10 text-red-500",
    };
    return colors[complexity] || "bg-gray-500/10 text-gray-500";
  };

  const getPriorityColor = (priority: string | null) => {
    const colors: Record<string, string> = {
      critical: "bg-red-500/10 text-red-500",
      high: "bg-orange-500/10 text-orange-500",
      medium: "bg-yellow-500/10 text-yellow-500",
      low: "bg-gray-500/10 text-gray-500",
    };
    return colors[priority || 'medium'] || "bg-gray-500/10 text-gray-500";
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="gap-2"
        variant="outline"
      >
        <Sparkles className="w-4 h-4" />
        Generate Sprint Plan
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Sprint Orchestrator
            </DialogTitle>
            <DialogDescription>
              Generate an optimized sprint plan for "{boardName}" with AI-powered task analysis
            </DialogDescription>
          </DialogHeader>

          {!sprintPlan ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sprint Name</label>
                <Input
                  placeholder="e.g., Sprint 1 - User Authentication"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sprint Goal</label>
                <Textarea
                  placeholder="What should be accomplished by the end of this sprint?"
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (days)</label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 14)}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="gap-2"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing Tasks...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Sprint Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{sprintPlan.sprintName}</CardTitle>
                  <CardDescription>{sprintPlan.sprintGoal}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {sprintPlan.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {sprintPlan.workstreams.length} workstreams
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-4 h-4" />
                      {sprintPlan.conflicts.length} conflicts detected
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="workstreams">
                <TabsList>
                  <TabsTrigger value="workstreams">Workstreams</TabsTrigger>
                  <TabsTrigger value="conflicts">
                    Conflicts ({sprintPlan.conflicts.length})
                  </TabsTrigger>
                  <TabsTrigger value="risks">
                    Risks ({sprintPlan.risks.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="workstreams" className="space-y-4 mt-4">
                  {sprintPlan.workstreams.map((workstream, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Badge className={getAgentColor(workstream.agent)}>
                              {workstream.agent}
                            </Badge>
                            {workstream.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{workstream.totalHours}h</span>
                            <span>•</span>
                            <span>{workstream.totalPoints} pts</span>
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          {workstream.reasoning}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {workstream.tasks.map((task, taskIdx) => (
                            <div
                              key={task.cardId}
                              className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-6">
                                  {taskIdx + 1}.
                                </span>
                                <span className="font-medium">{task.title}</span>
                                <Badge
                                  variant="outline"
                                  className={getComplexityColor(task.complexity)}
                                >
                                  {task.complexity}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={getPriorityColor(task.priority)}
                                >
                                  {task.priority || 'medium'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                {task.estimateHours && (
                                  <span>{task.estimateHours}h</span>
                                )}
                                {task.storyPoints && (
                                  <span>{task.storyPoints} pts</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="conflicts" className="space-y-4 mt-4">
                  {sprintPlan.conflicts.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        No conflicts detected
                      </CardContent>
                    </Card>
                  ) : (
                    sprintPlan.conflicts.map((conflict, idx) => (
                      <Card key={idx} className="border-yellow-500/20">
                        <CardContent className="py-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                Task #{conflict.task1} ↔ Task #{conflict.task2}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {conflict.reason}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" />
                                {conflict.resolution}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="risks" className="space-y-4 mt-4">
                  {sprintPlan.risks.length === 0 && sprintPlan.recommendations.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        No risks identified
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {sprintPlan.risks.map((risk, idx) => (
                        <Card key={idx} className="border-red-500/20">
                          <CardContent className="py-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-sm">{risk}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {sprintPlan.recommendations.map((rec, idx) => (
                        <Card key={idx} className="border-blue-500/20">
                          <CardContent className="py-4">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                              <p className="text-sm">{rec}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </TabsContent>
              </Tabs>

              {/* Adjustment Input */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Adjust Plan</CardTitle>
                  <CardDescription>
                    Describe changes you want to make to the sprint plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="e.g., Move task 3 to Dev workstream, prioritize authentication tasks first"
                      value={adjustment}
                      onChange={(e) => setAdjustment(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAdjust}
                      disabled={adjustMutation.isPending || !adjustment.trim()}
                      className="shrink-0"
                    >
                      {adjustMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSprintPlan(null);
                    setSprintName("");
                    setSprintGoal("");
                  }}
                >
                  Start Over
                </Button>
                <Button
                  onClick={() => {
                    toast.success("Sprint plan approved!");
                    setShowDialog(false);
                    onClose?.();
                  }}
                >
                  Approve Sprint Plan
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
