import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Plus, X, Sparkles, Check, Loader2 } from "lucide-react";

interface KickoffWizardProps {
  projectId: number;
  onComplete: () => void;
  onSkip: () => void;
}

interface NorthStarData {
  purpose: string;
  targetUser: string;
  problemSolved: string;
  successMetrics: string[];
  nonGoals: string[];
}

interface UserStory {
  role: string;
  action: string;
  value: string;
}

interface ProductBriefData {
  userStories: UserStory[];
  mvpIncluded: string[];
  mvpExcluded: string[];
  uxPrinciples: string[];
}

interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  other: string;
}

interface Entity {
  name: string;
  relationships: string[];
}

interface ArchitectureData {
  techStack: TechStack;
  entities: Entity[];
  integrations: string[];
  constraints: string[];
}

interface TestingStrategy {
  unit: string;
  contract: string;
  e2e: string;
}

interface QualityBarData {
  ciGates: string[];
  testingStrategy: TestingStrategy;
  regressionPolicy: string[];
}

interface Slice {
  name: string;
  userCan: string;
  proves?: string;
}

interface SliceMapData {
  slices: Slice[];
}

const STEPS = [
  { id: 1, title: "North Star", description: "Define purpose and constraints" },
  { id: 2, title: "Product Brief", description: "User stories and MVP scope" },
  { id: 3, title: "Architecture", description: "Tech stack and data model" },
  { id: 4, title: "Quality Bar", description: "CI gates and testing strategy" },
  { id: 5, title: "Slice Map", description: "Vertical slices for delivery" },
];

export function KickoffWizard({ projectId, onComplete, onSkip }: KickoffWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state for each step
  const [northStar, setNorthStar] = useState<NorthStarData>({
    purpose: "",
    targetUser: "",
    problemSolved: "",
    successMetrics: [],
    nonGoals: [],
  });

  const [productBrief, setProductBrief] = useState<ProductBriefData>({
    userStories: [{ role: "", action: "", value: "" }],
    mvpIncluded: [],
    mvpExcluded: [],
    uxPrinciples: [],
  });

  const [architecture, setArchitecture] = useState<ArchitectureData>({
    techStack: { frontend: "", backend: "", database: "", other: "" },
    entities: [{ name: "", relationships: [] }],
    integrations: [],
    constraints: [],
  });

  const [qualityBar, setQualityBar] = useState<QualityBarData>({
    ciGates: ["TypeScript compiles", "Tests pass", "Lint clean"],
    testingStrategy: { unit: "", contract: "", e2e: "" },
    regressionPolicy: [],
  });

  const [sliceMap, setSliceMap] = useState<SliceMapData>({
    slices: [{ name: "", userCan: "", proves: "" }],
  });

  // Temporary input states for array fields
  const [newMetric, setNewMetric] = useState("");
  const [newNonGoal, setNewNonGoal] = useState("");
  const [newMvpIncluded, setNewMvpIncluded] = useState("");
  const [newMvpExcluded, setNewMvpExcluded] = useState("");
  const [newUxPrinciple, setNewUxPrinciple] = useState("");
  const [newIntegration, setNewIntegration] = useState("");
  const [newConstraint, setNewConstraint] = useState("");
  const [newCiGate, setNewCiGate] = useState("");
  const [newRegressionPolicy, setNewRegressionPolicy] = useState("");

  const saveStepMutation = trpc.kickoff.saveStep.useMutation();
  const generateDocsMutation = trpc.kickoff.generateDocs.useMutation();

  const handleNext = async () => {
    // Save current step data
    const stepData: Record<string, unknown> = {};
    
    if (currentStep === 1) stepData.northStar = northStar;
    if (currentStep === 2) stepData.productBrief = productBrief;
    if (currentStep === 3) stepData.architecture = architecture;
    if (currentStep === 4) stepData.qualityBar = qualityBar;
    if (currentStep === 5) stepData.sliceMap = sliceMap;

    await saveStepMutation.mutateAsync({
      projectId,
      step: currentStep,
      data: stepData,
    });

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      // Generate docs on final step
      setIsGenerating(true);
      try {
        await generateDocsMutation.mutateAsync({ projectId });
        onComplete();
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Helper functions for array management
  const addToArray = <T,>(
    array: T[],
    setArray: React.Dispatch<React.SetStateAction<T[]>>,
    item: T,
    clearInput: () => void
  ) => {
    setArray([...array, item]);
    clearInput();
  };

  const removeFromArray = <T,>(
    array: T[],
    setArray: React.Dispatch<React.SetStateAction<T[]>>,
    index: number
  ) => {
    setArray(array.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  currentStep > step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="font-heading text-xl font-semibold">{STEPS[currentStep - 1].title}</h2>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1].description}</p>
        </div>
      </div>

      {/* Step content */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {/* Step 1: North Star */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="purpose">What is the purpose of this project?</Label>
                <Textarea
                  id="purpose"
                  placeholder="e.g., Build an AI-powered code review tool that helps teams maintain code quality"
                  value={northStar.purpose}
                  onChange={(e) => setNorthStar({ ...northStar, purpose: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="targetUser">Who is the target user?</Label>
                <Input
                  id="targetUser"
                  placeholder="e.g., Software development teams at mid-size companies"
                  value={northStar.targetUser}
                  onChange={(e) => setNorthStar({ ...northStar, targetUser: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="problemSolved">What problem does this solve?</Label>
                <Textarea
                  id="problemSolved"
                  placeholder="e.g., Manual code reviews are slow and inconsistent, leading to bugs in production"
                  value={northStar.problemSolved}
                  onChange={(e) => setNorthStar({ ...northStar, problemSolved: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Success Metrics</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., Reduce review time by 50%"
                    value={newMetric}
                    onChange={(e) => setNewMetric(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMetric.trim()) {
                        setNorthStar({ ...northStar, successMetrics: [...northStar.successMetrics, newMetric.trim()] });
                        setNewMetric("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newMetric.trim()) {
                        setNorthStar({ ...northStar, successMetrics: [...northStar.successMetrics, newMetric.trim()] });
                        setNewMetric("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {northStar.successMetrics.map((metric, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {metric}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setNorthStar({ ...northStar, successMetrics: northStar.successMetrics.filter((_, idx) => idx !== i) })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Non-Goals (What we're NOT building)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., Real-time pair programming features"
                    value={newNonGoal}
                    onChange={(e) => setNewNonGoal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newNonGoal.trim()) {
                        setNorthStar({ ...northStar, nonGoals: [...northStar.nonGoals, newNonGoal.trim()] });
                        setNewNonGoal("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newNonGoal.trim()) {
                        setNorthStar({ ...northStar, nonGoals: [...northStar.nonGoals, newNonGoal.trim()] });
                        setNewNonGoal("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {northStar.nonGoals.map((goal, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {goal}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setNorthStar({ ...northStar, nonGoals: northStar.nonGoals.filter((_, idx) => idx !== i) })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Product Brief */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label>User Stories</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  As a [role], I can [action] so that [value]
                </p>
                {productBrief.userStories.map((story, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Role"
                      value={story.role}
                      onChange={(e) => {
                        const updated = [...productBrief.userStories];
                        updated[i] = { ...updated[i], role: e.target.value };
                        setProductBrief({ ...productBrief, userStories: updated });
                      }}
                      className="w-1/4"
                    />
                    <Input
                      placeholder="Action"
                      value={story.action}
                      onChange={(e) => {
                        const updated = [...productBrief.userStories];
                        updated[i] = { ...updated[i], action: e.target.value };
                        setProductBrief({ ...productBrief, userStories: updated });
                      }}
                      className="w-1/3"
                    />
                    <Input
                      placeholder="Value"
                      value={story.value}
                      onChange={(e) => {
                        const updated = [...productBrief.userStories];
                        updated[i] = { ...updated[i], value: e.target.value };
                        setProductBrief({ ...productBrief, userStories: updated });
                      }}
                      className="w-1/3"
                    />
                    {productBrief.userStories.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = productBrief.userStories.filter((_, idx) => idx !== i);
                          setProductBrief({ ...productBrief, userStories: updated });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setProductBrief({
                      ...productBrief,
                      userStories: [...productBrief.userStories, { role: "", action: "", value: "" }],
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Story
                </Button>
              </div>

              <div>
                <Label>MVP Included</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., Basic code analysis"
                    value={newMvpIncluded}
                    onChange={(e) => setNewMvpIncluded(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMvpIncluded.trim()) {
                        setProductBrief({
                          ...productBrief,
                          mvpIncluded: [...productBrief.mvpIncluded, newMvpIncluded.trim()],
                        });
                        setNewMvpIncluded("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newMvpIncluded.trim()) {
                        setProductBrief({
                          ...productBrief,
                          mvpIncluded: [...productBrief.mvpIncluded, newMvpIncluded.trim()],
                        });
                        setNewMvpIncluded("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {productBrief.mvpIncluded.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {item}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setProductBrief({
                            ...productBrief,
                            mvpIncluded: productBrief.mvpIncluded.filter((_, idx) => idx !== i),
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>MVP Excluded (Future)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., Multi-language support"
                    value={newMvpExcluded}
                    onChange={(e) => setNewMvpExcluded(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMvpExcluded.trim()) {
                        setProductBrief({
                          ...productBrief,
                          mvpExcluded: [...productBrief.mvpExcluded, newMvpExcluded.trim()],
                        });
                        setNewMvpExcluded("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newMvpExcluded.trim()) {
                        setProductBrief({
                          ...productBrief,
                          mvpExcluded: [...productBrief.mvpExcluded, newMvpExcluded.trim()],
                        });
                        setNewMvpExcluded("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {productBrief.mvpExcluded.map((item, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {item}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setProductBrief({
                            ...productBrief,
                            mvpExcluded: productBrief.mvpExcluded.filter((_, idx) => idx !== i),
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>UX Principles</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., Fast feedback loops"
                    value={newUxPrinciple}
                    onChange={(e) => setNewUxPrinciple(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newUxPrinciple.trim()) {
                        setProductBrief({
                          ...productBrief,
                          uxPrinciples: [...productBrief.uxPrinciples, newUxPrinciple.trim()],
                        });
                        setNewUxPrinciple("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newUxPrinciple.trim()) {
                        setProductBrief({
                          ...productBrief,
                          uxPrinciples: [...productBrief.uxPrinciples, newUxPrinciple.trim()],
                        });
                        setNewUxPrinciple("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {productBrief.uxPrinciples.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {item}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setProductBrief({
                            ...productBrief,
                            uxPrinciples: productBrief.uxPrinciples.filter((_, idx) => idx !== i),
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Architecture */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <Label>Tech Stack</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="frontend" className="text-sm text-muted-foreground">Frontend</Label>
                    <Input
                      id="frontend"
                      placeholder="e.g., React, Tailwind"
                      value={architecture.techStack.frontend}
                      onChange={(e) =>
                        setArchitecture({
                          ...architecture,
                          techStack: { ...architecture.techStack, frontend: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="backend" className="text-sm text-muted-foreground">Backend</Label>
                    <Input
                      id="backend"
                      placeholder="e.g., Node.js, Express"
                      value={architecture.techStack.backend}
                      onChange={(e) =>
                        setArchitecture({
                          ...architecture,
                          techStack: { ...architecture.techStack, backend: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="database" className="text-sm text-muted-foreground">Database</Label>
                    <Input
                      id="database"
                      placeholder="e.g., PostgreSQL"
                      value={architecture.techStack.database}
                      onChange={(e) =>
                        setArchitecture({
                          ...architecture,
                          techStack: { ...architecture.techStack, database: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="other" className="text-sm text-muted-foreground">Other</Label>
                    <Input
                      id="other"
                      placeholder="e.g., Redis, Docker"
                      value={architecture.techStack.other}
                      onChange={(e) =>
                        setArchitecture({
                          ...architecture,
                          techStack: { ...architecture.techStack, other: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Data Entities</Label>
                {architecture.entities.map((entity, i) => (
                  <div key={i} className="flex gap-2 mt-2">
                    <Input
                      placeholder="Entity name"
                      value={entity.name}
                      onChange={(e) => {
                        const updated = [...architecture.entities];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setArchitecture({ ...architecture, entities: updated });
                      }}
                      className="w-1/3"
                    />
                    <Input
                      placeholder="Relationships (comma-separated)"
                      value={entity.relationships.join(", ")}
                      onChange={(e) => {
                        const updated = [...architecture.entities];
                        updated[i] = {
                          ...updated[i],
                          relationships: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        };
                        setArchitecture({ ...architecture, entities: updated });
                      }}
                      className="flex-1"
                    />
                    {architecture.entities.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = architecture.entities.filter((_, idx) => idx !== i);
                          setArchitecture({ ...architecture, entities: updated });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    setArchitecture({
                      ...architecture,
                      entities: [...architecture.entities, { name: "", relationships: [] }],
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Entity
                </Button>
              </div>

              <div>
                <Label>External Integrations</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., GitHub API"
                    value={newIntegration}
                    onChange={(e) => setNewIntegration(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newIntegration.trim()) {
                        setArchitecture({
                          ...architecture,
                          integrations: [...architecture.integrations, newIntegration.trim()],
                        });
                        setNewIntegration("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newIntegration.trim()) {
                        setArchitecture({
                          ...architecture,
                          integrations: [...architecture.integrations, newIntegration.trim()],
                        });
                        setNewIntegration("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {architecture.integrations.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {item}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setArchitecture({
                            ...architecture,
                            integrations: architecture.integrations.filter((_, idx) => idx !== i),
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Architectural Constraints</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., Must run in Docker"
                    value={newConstraint}
                    onChange={(e) => setNewConstraint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newConstraint.trim()) {
                        setArchitecture({
                          ...architecture,
                          constraints: [...architecture.constraints, newConstraint.trim()],
                        });
                        setNewConstraint("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newConstraint.trim()) {
                        setArchitecture({
                          ...architecture,
                          constraints: [...architecture.constraints, newConstraint.trim()],
                        });
                        setNewConstraint("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {architecture.constraints.map((item, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {item}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setArchitecture({
                            ...architecture,
                            constraints: architecture.constraints.filter((_, idx) => idx !== i),
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Quality Bar */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <Label>CI Gates (Required Before Merge)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., Security scan passes"
                    value={newCiGate}
                    onChange={(e) => setNewCiGate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCiGate.trim()) {
                        setQualityBar({
                          ...qualityBar,
                          ciGates: [...qualityBar.ciGates, newCiGate.trim()],
                        });
                        setNewCiGate("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newCiGate.trim()) {
                        setQualityBar({
                          ...qualityBar,
                          ciGates: [...qualityBar.ciGates, newCiGate.trim()],
                        });
                        setNewCiGate("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {qualityBar.ciGates.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {item}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setQualityBar({
                            ...qualityBar,
                            ciGates: qualityBar.ciGates.filter((_, idx) => idx !== i),
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Testing Strategy</Label>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label htmlFor="unitTests" className="text-sm text-muted-foreground">Unit Tests</Label>
                    <Input
                      id="unitTests"
                      placeholder="e.g., All business logic functions"
                      value={qualityBar.testingStrategy.unit}
                      onChange={(e) =>
                        setQualityBar({
                          ...qualityBar,
                          testingStrategy: { ...qualityBar.testingStrategy, unit: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="contractTests" className="text-sm text-muted-foreground">Contract Tests</Label>
                    <Input
                      id="contractTests"
                      placeholder="e.g., API endpoints"
                      value={qualityBar.testingStrategy.contract}
                      onChange={(e) =>
                        setQualityBar({
                          ...qualityBar,
                          testingStrategy: { ...qualityBar.testingStrategy, contract: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="e2eTests" className="text-sm text-muted-foreground">E2E Tests</Label>
                    <Input
                      id="e2eTests"
                      placeholder="e.g., Critical user flows"
                      value={qualityBar.testingStrategy.e2e}
                      onChange={(e) =>
                        setQualityBar({
                          ...qualityBar,
                          testingStrategy: { ...qualityBar.testingStrategy, e2e: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Regression Policy</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., No new bugs in existing features"
                    value={newRegressionPolicy}
                    onChange={(e) => setNewRegressionPolicy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newRegressionPolicy.trim()) {
                        setQualityBar({
                          ...qualityBar,
                          regressionPolicy: [...qualityBar.regressionPolicy, newRegressionPolicy.trim()],
                        });
                        setNewRegressionPolicy("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newRegressionPolicy.trim()) {
                        setQualityBar({
                          ...qualityBar,
                          regressionPolicy: [...qualityBar.regressionPolicy, newRegressionPolicy.trim()],
                        });
                        setNewRegressionPolicy("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {qualityBar.regressionPolicy.map((item, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {item}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setQualityBar({
                            ...qualityBar,
                            regressionPolicy: qualityBar.regressionPolicy.filter((_, idx) => idx !== i),
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Slice Map */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <Label>Vertical Slices</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Define thin, end-to-end features that can be built and tested independently
                </p>
                {sliceMap.slices.map((slice, i) => (
                  <Card key={i} className="mb-3">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Slice Name</Label>
                          <Input
                            placeholder="e.g., Basic Authentication"
                            value={slice.name}
                            onChange={(e) => {
                              const updated = [...sliceMap.slices];
                              updated[i] = { ...updated[i], name: e.target.value };
                              setSliceMap({ slices: updated });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">User Can...</Label>
                          <Input
                            placeholder="e.g., Sign up and log in with email"
                            value={slice.userCan}
                            onChange={(e) => {
                              const updated = [...sliceMap.slices];
                              updated[i] = { ...updated[i], userCan: e.target.value };
                              setSliceMap({ slices: updated });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Proves (Optional)</Label>
                          <Input
                            placeholder="e.g., Auth flow works end-to-end"
                            value={slice.proves || ""}
                            onChange={(e) => {
                              const updated = [...sliceMap.slices];
                              updated[i] = { ...updated[i], proves: e.target.value };
                              setSliceMap({ slices: updated });
                            }}
                          />
                        </div>
                        {sliceMap.slices.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              const updated = sliceMap.slices.filter((_, idx) => idx !== i);
                              setSliceMap({ slices: updated });
                            }}
                          >
                            <X className="w-4 h-4 mr-1" /> Remove Slice
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setSliceMap({
                      slices: [...sliceMap.slices, { name: "", userCan: "", proves: "" }],
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Slice
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={onSkip}>
              Skip Wizard
            </Button>
          )}
        </div>
        <Button onClick={handleNext} disabled={saveStepMutation.isPending || isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating Docs...
            </>
          ) : currentStep === 5 ? (
            <>
              <Sparkles className="w-4 h-4 mr-1" /> Generate Specs
            </>
          ) : (
            <>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
