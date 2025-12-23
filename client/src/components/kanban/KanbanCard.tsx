/**
 * KanbanCard Component
 * Phase 1 Task P1-010
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Calendar, Clock, User, AlertTriangle, 
  MessageSquare, Link2, MoreHorizontal,
  Bot, Play, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface KanbanCardData {
  id: number;
  title: string;
  description?: string | null;
  cardType: "epic" | "feature" | "task" | "bug" | "spike" | "chore";
  priority: "critical" | "high" | "medium" | "low";
  assignedAgent?: "pm" | "developer" | "qa" | "devops" | "research" | null;
  labels?: string[] | null;
  dueDate?: Date | null;
  estimatedMinutes?: number | null;
  storyPoints?: number | null;
  isBlocked?: boolean | null;
  blockReason?: string | null;
  commentCount?: number;
  dependencyCount?: number;
}

interface KanbanCardProps {
  card: KanbanCardData;
  projectId?: number;
  cloudEnabled?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onExecute?: () => void;
  isExecuting?: boolean;
  isDragging?: boolean;
}

const cardTypeColors: Record<string, string> = {
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  feature: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  task: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  bug: "bg-red-500/20 text-red-400 border-red-500/30",
  spike: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  chore: "bg-muted/20 text-muted-foreground border-muted-foreground/30",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-600",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const agentIcons: Record<string, { label: string; color: string }> = {
  pm: { label: "PM", color: "text-purple-400" },
  developer: { label: "DEV", color: "text-blue-400" },
  qa: { label: "QA", color: "text-green-400" },
  devops: { label: "OPS", color: "text-orange-400" },
  research: { label: "RES", color: "text-cyan-400" },
};

export function KanbanCard({ 
  card, 
  projectId,
  cloudEnabled,
  onClick, 
  onEdit, 
  onDelete,
  onExecute,
  isExecuting,
  isDragging 
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative bg-card border border-border rounded-lg p-3 cursor-pointer",
        "hover:border-primary/50 hover:shadow-md transition-all duration-200",
        isDragging && "opacity-50 shadow-lg rotate-2",
        card.isBlocked && "border-red-500/50 bg-red-500/5"
      )}
    >
      {/* Priority indicator */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
          priorityColors[card.priority]
        )} 
      />

      {/* Card header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge 
          variant="outline" 
          className={cn("text-xs", cardTypeColors[card.cardType])}
        >
          {card.cardType}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {cloudEnabled && onExecute && (
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onExecute(); }}
                disabled={isExecuting}
                className="text-green-400"
              >
                {isExecuting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executing...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Execute in Cloud</>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm mb-2 line-clamp-2">{card.title}</h4>

      {/* Blocked indicator */}
      {card.isBlocked && (
        <div className="flex items-center gap-1 text-xs text-red-400 mb-2">
          <AlertTriangle className="h-3 w-3" />
          <span className="truncate">{card.blockReason || "Blocked"}</span>
        </div>
      )}

      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.slice(0, 3).map((label) => (
            <Badge key={label} variant="secondary" className="text-xs px-1.5 py-0">
              {label}
            </Badge>
          ))}
          {card.labels.length > 3 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              +{card.labels.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          {/* Due date */}
          {card.dueDate && (
            <div className={cn(
              "flex items-center gap-1",
              isOverdue && "text-red-400"
            )}>
              <Calendar className="h-3 w-3" />
              <span>{new Date(card.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          
          {/* Story points */}
          {card.storyPoints && (
            <div className="flex items-center gap-1">
              <span className="font-medium">{card.storyPoints}pt</span>
            </div>
          )}

          {/* Estimate */}
          {card.estimatedMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{Math.round(card.estimatedMinutes / 60)}h</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Comments */}
          {(card.commentCount ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{card.commentCount}</span>
            </div>
          )}

          {/* Dependencies */}
          {(card.dependencyCount ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              <span>{card.dependencyCount}</span>
            </div>
          )}

          {/* Assigned agent */}
          {card.assignedAgent && (
            <div className={cn(
              "flex items-center gap-1 font-medium",
              agentIcons[card.assignedAgent]?.color
            )}>
              <Bot className="h-3 w-3" />
              <span>{agentIcons[card.assignedAgent]?.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton for loading state
export function KanbanCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-3 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-5 w-16 bg-muted rounded" />
      </div>
      <div className="h-4 w-full bg-muted rounded mb-2" />
      <div className="h-4 w-2/3 bg-muted rounded mb-3" />
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}
