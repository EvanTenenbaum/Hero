/**
 * CardDetailModal Component
 * Phase 1 Task P1-011
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Bot,
  Link2,
  MessageSquare,
  AlertTriangle,
  Save,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanCardData } from "./KanbanCard";

interface CardDetailModalProps {
  card: KanbanCardData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Partial<KanbanCardData>) => void;
  onDelete?: () => void;
  isNew?: boolean;
}

const cardTypes = [
  { value: "epic", label: "Epic", color: "bg-purple-500" },
  { value: "feature", label: "Feature", color: "bg-blue-500" },
  { value: "task", label: "Task", color: "bg-gray-500" },
  { value: "bug", label: "Bug", color: "bg-red-500" },
  { value: "spike", label: "Spike", color: "bg-yellow-500" },
  { value: "chore", label: "Chore", color: "bg-slate-500" },
];

const priorities = [
  { value: "critical", label: "Critical", color: "bg-red-600" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "low", label: "Low", color: "bg-green-500" },
];

const agents = [
  { value: "pm", label: "PM Agent" },
  { value: "developer", label: "Developer Agent" },
  { value: "qa", label: "QA Agent" },
  { value: "devops", label: "DevOps Agent" },
  { value: "research", label: "Research Agent" },
];

export function CardDetailModal({
  card,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isNew = false,
}: CardDetailModalProps) {
  const [formData, setFormData] = useState<Partial<KanbanCardData>>({
    title: card?.title || "",
    description: card?.description || "",
    cardType: card?.cardType || "task",
    priority: card?.priority || "medium",
    assignedAgent: card?.assignedAgent || null,
    dueDate: card?.dueDate || null,
    estimatedMinutes: card?.estimatedMinutes || null,
    storyPoints: card?.storyPoints || null,
    isBlocked: card?.isBlocked || false,
    blockReason: card?.blockReason || "",
    labels: card?.labels || [],
  });

  const [newLabel, setNewLabel] = useState("");

  const handleChange = (field: keyof KanbanCardData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddLabel = () => {
    if (newLabel.trim() && !formData.labels?.includes(newLabel.trim())) {
      handleChange("labels", [...(formData.labels || []), newLabel.trim()]);
      setNewLabel("");
    }
  };

  const handleRemoveLabel = (label: string) => {
    handleChange(
      "labels",
      formData.labels?.filter((l) => l !== label) || []
    );
  };

  const handleSubmit = () => {
    if (!formData.title?.trim()) return;
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Create New Card" : "Edit Card"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Enter card title..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Enter card description..."
              rows={4}
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.cardType}
                onValueChange={(value) => handleChange("cardType", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cardTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", type.color)} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", priority.color)} />
                        {priority.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned Agent */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Assigned Agent
            </Label>
            <Select
              value={formData.assignedAgent || "none"}
              onValueChange={(value) => 
                handleChange("assignedAgent", value === "none" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agent..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.value} value={agent.value}>
                    {agent.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date and Estimates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              <Input
                type="date"
                value={
                  formData.dueDate
                    ? new Date(formData.dueDate).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  handleChange(
                    "dueDate",
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Estimate (hours)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedMinutes ? formData.estimatedMinutes / 60 : ""}
                onChange={(e) =>
                  handleChange(
                    "estimatedMinutes",
                    e.target.value ? parseFloat(e.target.value) * 60 : null
                  )
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Story Points</Label>
              <Select
                value={formData.storyPoints?.toString() || "none"}
                onValueChange={(value) =>
                  handleChange("storyPoints", value === "none" ? null : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Points" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {[1, 2, 3, 5, 8, 13, 21].map((points) => (
                    <SelectItem key={points} value={points.toString()}>
                      {points}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.labels?.map((label) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {label}
                  <button
                    onClick={() => handleRemoveLabel(label)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Add label..."
                onKeyDown={(e) => e.key === "Enter" && handleAddLabel()}
              />
              <Button variant="outline" size="icon" onClick={handleAddLabel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Blocked status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isBlocked"
                checked={formData.isBlocked ?? false}
                onChange={(e) => handleChange("isBlocked", e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="isBlocked" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Mark as blocked
              </Label>
            </div>
            {formData.isBlocked && (
              <Input
                value={formData.blockReason || ""}
                onChange={(e) => handleChange("blockReason", e.target.value)}
                placeholder="Reason for blocking..."
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {!isNew && onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title?.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {isNew ? "Create" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
