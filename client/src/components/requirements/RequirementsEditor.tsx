/**
 * RequirementsEditor Component
 * Phase 2 - Spec-Driven Development
 * 
 * A comprehensive requirements editor with user stories, acceptance criteria,
 * and spec status tracking following EARS notation.
 */

import { useState, useCallback } from "react";
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface UserStory {
  id: string;
  role: string;
  want: string;
  benefit: string;
  acceptanceCriteria: string[];
}

export interface RequirementData {
  id?: number;
  projectId: number;
  title: string;
  description: string;
  userStories: UserStory[];
  assumptions: string[];
  edgeCases: string[];
  status: "draft" | "pending_review" | "approved" | "rejected" | "implemented";
  linkedCardIds?: number[];
}

interface RequirementsEditorProps {
  requirement?: RequirementData;
  projectId: number;
  onSave: (requirement: RequirementData) => void;
  onCancel: () => void;
  onLinkToCard?: (requirementId: number) => void;
  isLoading?: boolean;
}

const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-400", icon: Circle },
  pending_review: { label: "Pending Review", color: "bg-yellow-500/20 text-yellow-400", icon: AlertCircle },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400", icon: AlertCircle },
  implemented: { label: "Implemented", color: "bg-blue-500/20 text-blue-400", icon: CheckCircle2 },
};

function generateId(): string {
  return `us-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function RequirementsEditor({
  requirement,
  projectId,
  onSave,
  onCancel,
  onLinkToCard,
  isLoading,
}: RequirementsEditorProps) {
  const [formData, setFormData] = useState<RequirementData>({
    projectId,
    title: requirement?.title || "",
    description: requirement?.description || "",
    userStories: requirement?.userStories || [],
    assumptions: requirement?.assumptions || [],
    edgeCases: requirement?.edgeCases || [],
    status: requirement?.status || "draft",
    linkedCardIds: requirement?.linkedCardIds || [],
    ...(requirement?.id && { id: requirement.id }),
  });

  const [newAssumption, setNewAssumption] = useState("");
  const [newEdgeCase, setNewEdgeCase] = useState("");

  // User Story handlers
  const addUserStory = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      userStories: [
        ...prev.userStories,
        {
          id: generateId(),
          role: "",
          want: "",
          benefit: "",
          acceptanceCriteria: [],
        },
      ],
    }));
  }, []);

  const updateUserStory = useCallback((id: string, field: keyof UserStory, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      userStories: prev.userStories.map((story) =>
        story.id === id ? { ...story, [field]: value } : story
      ),
    }));
  }, []);

  const removeUserStory = useCallback((id: string) => {
    setFormData((prev) => ({
      ...prev,
      userStories: prev.userStories.filter((story) => story.id !== id),
    }));
  }, []);

  // Acceptance Criteria handlers
  const addAcceptanceCriteria = useCallback((storyId: string) => {
    setFormData((prev) => ({
      ...prev,
      userStories: prev.userStories.map((story) =>
        story.id === storyId
          ? { ...story, acceptanceCriteria: [...story.acceptanceCriteria, ""] }
          : story
      ),
    }));
  }, []);

  const updateAcceptanceCriteria = useCallback((storyId: string, index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      userStories: prev.userStories.map((story) =>
        story.id === storyId
          ? {
              ...story,
              acceptanceCriteria: story.acceptanceCriteria.map((ac, i) =>
                i === index ? value : ac
              ),
            }
          : story
      ),
    }));
  }, []);

  const removeAcceptanceCriteria = useCallback((storyId: string, index: number) => {
    setFormData((prev) => ({
      ...prev,
      userStories: prev.userStories.map((story) =>
        story.id === storyId
          ? {
              ...story,
              acceptanceCriteria: story.acceptanceCriteria.filter((_, i) => i !== index),
            }
          : story
      ),
    }));
  }, []);

  // Assumptions handlers
  const addAssumption = useCallback(() => {
    if (newAssumption.trim()) {
      setFormData((prev) => ({
        ...prev,
        assumptions: [...prev.assumptions, newAssumption.trim()],
      }));
      setNewAssumption("");
    }
  }, [newAssumption]);

  const removeAssumption = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      assumptions: prev.assumptions.filter((_, i) => i !== index),
    }));
  }, []);

  // Edge Cases handlers
  const addEdgeCase = useCallback(() => {
    if (newEdgeCase.trim()) {
      setFormData((prev) => ({
        ...prev,
        edgeCases: [...prev.edgeCases, newEdgeCase.trim()],
      }));
      setNewEdgeCase("");
    }
  }, [newEdgeCase]);

  const removeEdgeCase = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      edgeCases: prev.edgeCases.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSave(formData);
  }, [formData, onSave]);

  const StatusIcon = statusConfig[formData.status].icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">
            {requirement?.id ? "Edit Requirement" : "New Requirement"}
          </h2>
        </div>
        <Badge className={cn("flex items-center gap-1", statusConfig[formData.status].color)}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig[formData.status].label}
        </Badge>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Define the requirement title and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter requirement title..."
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the requirement in detail..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  status: value as RequirementData["status"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="implemented">Implemented</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Stories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Stories</CardTitle>
              <CardDescription>
                Define user stories using the "As a... I want... So that..." format
              </CardDescription>
            </div>
            <Button onClick={addUserStory} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Story
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.userStories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No user stories yet. Click "Add Story" to create one.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {formData.userStories.map((story, index) => (
                <AccordionItem
                  key={story.id}
                  value={story.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        US-{index + 1}
                      </Badge>
                      <span className="text-sm font-medium">
                        {story.role
                          ? `As a ${story.role}, I want ${story.want || "..."}`
                          : "New User Story"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>As a...</Label>
                        <Input
                          placeholder="user role"
                          value={story.role}
                          onChange={(e) => updateUserStory(story.id, "role", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>I want...</Label>
                        <Input
                          placeholder="desired action"
                          value={story.want}
                          onChange={(e) => updateUserStory(story.id, "want", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>So that...</Label>
                        <Input
                          placeholder="expected benefit"
                          value={story.benefit}
                          onChange={(e) => updateUserStory(story.id, "benefit", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Acceptance Criteria */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Acceptance Criteria</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addAcceptanceCriteria(story.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Criteria
                        </Button>
                      </div>
                      {story.acceptanceCriteria.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No acceptance criteria defined yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {story.acceptanceCriteria.map((criteria, acIndex) => (
                            <div key={acIndex} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <Input
                                placeholder="Given... When... Then..."
                                value={criteria}
                                onChange={(e) =>
                                  updateAcceptanceCriteria(story.id, acIndex, e.target.value)
                                }
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeAcceptanceCriteria(story.id, acIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeUserStory(story.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Story
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Assumptions & Edge Cases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assumptions */}
        <Card>
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
            <CardDescription>List any assumptions made for this requirement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add an assumption..."
                value={newAssumption}
                onChange={(e) => setNewAssumption(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAssumption()}
              />
              <Button onClick={addAssumption} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.assumptions.length > 0 && (
              <ul className="space-y-2">
                {formData.assumptions.map((assumption, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm">{assumption}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeAssumption(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Edge Cases */}
        <Card>
          <CardHeader>
            <CardTitle>Edge Cases</CardTitle>
            <CardDescription>Document edge cases to consider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add an edge case..."
                value={newEdgeCase}
                onChange={(e) => setNewEdgeCase(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEdgeCase()}
              />
              <Button onClick={addEdgeCase} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.edgeCases.length > 0 && (
              <ul className="space-y-2">
                {formData.edgeCases.map((edgeCase, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm">{edgeCase}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeEdgeCase(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Link to Cards */}
      {requirement?.id && onLinkToCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Linked Kanban Cards
            </CardTitle>
            <CardDescription>
              Link this requirement to Kanban cards for traceability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => onLinkToCard(requirement.id!)}>
              <Plus className="h-4 w-4 mr-1" />
              Link to Card
            </Button>
            {formData.linkedCardIds && formData.linkedCardIds.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {formData.linkedCardIds.length} card(s) linked
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading || !formData.title.trim()}>
          {isLoading ? "Saving..." : requirement?.id ? "Update Requirement" : "Create Requirement"}
        </Button>
      </div>
    </div>
  );
}
