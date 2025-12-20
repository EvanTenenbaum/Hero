/**
 * BoardTemplates Component
 * Phase 2 - Board Templates
 * 
 * Pre-configured board templates for quick project setup.
 */

import { useState } from "react";
import { 
  LayoutGrid, Zap, Bug, Rocket, Check, 
  ArrowRight, Columns3 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TemplateType = "sprint" | "feature_development" | "bug_triage" | "kanban_basic";

interface BoardTemplate {
  id: TemplateType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  columns: string[];
  labels: string[];
  recommended?: boolean;
  color: string;
}

const TEMPLATES: BoardTemplate[] = [
  {
    id: "sprint",
    name: "Sprint Board",
    description: "Agile sprint board for 2-week iterations with code review and QA stages",
    icon: Zap,
    columns: ["Sprint Backlog", "To Do", "In Progress", "Code Review", "QA", "Done"],
    labels: ["story", "bug", "tech-debt", "spike", "blocked"],
    recommended: true,
    color: "bg-blue-500",
  },
  {
    id: "feature_development",
    name: "Feature Development",
    description: "Spec-driven feature development workflow from idea to release",
    icon: Rocket,
    columns: ["Ideas", "Spec Writing", "Design Review", "Approved", "Development", "Testing", "Released"],
    labels: ["feature", "enhancement", "mvp", "nice-to-have", "customer-request"],
    color: "bg-purple-500",
  },
  {
    id: "bug_triage",
    name: "Bug Triage",
    description: "Bug tracking and triage workflow with severity-based labels",
    icon: Bug,
    columns: ["Reported", "Triaging", "Confirmed", "Fixing", "Verifying", "Closed", "Won't Fix"],
    labels: ["critical", "high", "medium", "low", "regression", "security"],
    color: "bg-red-500",
  },
  {
    id: "kanban_basic",
    name: "Basic Kanban",
    description: "Simple three-column Kanban board for general use",
    icon: LayoutGrid,
    columns: ["To Do", "In Progress", "Done"],
    labels: ["urgent", "important", "normal"],
    color: "bg-green-500",
  },
];

interface BoardTemplatesProps {
  onSelect: (templateType: TemplateType, customName?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BoardTemplates({
  onSelect,
  onCancel,
  isLoading,
}: BoardTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [customName, setCustomName] = useState("");

  const handleCreate = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate, customName || undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Choose a Template</h2>
        <p className="text-sm text-muted-foreground">
          Select a pre-configured board template to get started quickly
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.id;

          return (
            <Card
              key={template.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20"
              )}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={cn("p-2 rounded-lg", template.color, "bg-opacity-20")}>
                    <Icon className={cn("h-5 w-5", template.color.replace("bg-", "text-"))} />
                  </div>
                  <div className="flex items-center gap-2">
                    {template.recommended && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                <CardTitle className="text-base mt-3">{template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Columns preview */}
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                      <Columns3 className="h-3 w-3" />
                      <span>{template.columns.length} columns</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {template.columns.slice(0, 4).map((col, i) => (
                        <span key={col} className="flex items-center">
                          <Badge variant="outline" className="text-xs py-0">
                            {col}
                          </Badge>
                          {i < Math.min(template.columns.length - 1, 3) && (
                            <ArrowRight className="h-3 w-3 mx-0.5 text-muted-foreground" />
                          )}
                        </span>
                      ))}
                      {template.columns.length > 4 && (
                        <Badge variant="outline" className="text-xs py-0">
                          +{template.columns.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Labels preview */}
                  <div className="flex flex-wrap gap-1">
                    {template.labels.slice(0, 4).map((label) => (
                      <Badge
                        key={label}
                        variant="secondary"
                        className="text-xs py-0"
                      >
                        {label}
                      </Badge>
                    ))}
                    {template.labels.length > 4 && (
                      <Badge variant="secondary" className="text-xs py-0">
                        +{template.labels.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom name input */}
      {selectedTemplate && (
        <div className="space-y-2">
          <Label htmlFor="boardName">Board Name (optional)</Label>
          <Input
            id="boardName"
            placeholder={TEMPLATES.find(t => t.id === selectedTemplate)?.name}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use the default template name
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!selectedTemplate || isLoading}
        >
          {isLoading ? "Creating..." : "Create Board"}
        </Button>
      </div>
    </div>
  );
}

export { TEMPLATES };
