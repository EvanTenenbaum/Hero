/**
 * KanbanColumn Component
 * Phase 1 Task P1-009
 */

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, MoreHorizontal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { KanbanCard, KanbanCardData, KanbanCardSkeleton } from "./KanbanCard";

export interface KanbanColumnData {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  columnType: string;
  wipLimit?: number | null;
  cards: KanbanCardData[];
}

interface KanbanColumnProps {
  column: KanbanColumnData;
  projectId?: number;
  cloudEnabled?: boolean;
  executingCardId?: number | null;
  onAddCard?: () => void;
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
  onCardClick?: (card: KanbanCardData) => void;
  onCardEdit?: (card: KanbanCardData) => void;
  onCardDelete?: (card: KanbanCardData) => void;
  onCardExecute?: (card: KanbanCardData) => void;
  isLoading?: boolean;
}

export function KanbanColumn({
  column,
  projectId,
  cloudEnabled,
  executingCardId,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onCardClick,
  onCardEdit,
  onCardDelete,
  onCardExecute,
  isLoading,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  const isOverWipLimit = column.wipLimit && column.cards.length >= column.wipLimit;
  const cardIds = column.cards.map((c) => c.id);

  return (
    <div
      className={cn(
        "flex flex-col w-72 min-w-72 bg-muted/30 rounded-lg",
        isOver && "ring-2 ring-primary/50"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          {/* Color indicator */}
          {column.color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
          )}
          
          <h3 className="font-semibold text-sm">{column.name}</h3>
          
          {/* Card count */}
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            isOverWipLimit 
              ? "bg-red-500/20 text-red-400" 
              : "bg-muted text-muted-foreground"
          )}>
            {column.cards.length}
            {column.wipLimit && `/${column.wipLimit}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onAddCard}
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditColumn}>
                Edit column
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeleteColumn} className="text-destructive">
                Delete column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* WIP limit warning */}
      {isOverWipLimit && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>WIP limit reached</span>
        </div>
      )}

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]"
      >
        {isLoading ? (
          <>
            <KanbanCardSkeleton />
            <KanbanCardSkeleton />
            <KanbanCardSkeleton />
          </>
        ) : (
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {column.cards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                projectId={projectId}
                cloudEnabled={cloudEnabled}
                isExecuting={executingCardId === card.id}
                onClick={() => onCardClick?.(card)}
                onEdit={() => onCardEdit?.(card)}
                onDelete={() => onCardDelete?.(card)}
                onExecute={() => onCardExecute?.(card)}
              />
            ))}
          </SortableContext>
        )}

        {/* Empty state */}
        {!isLoading && column.cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">No cards</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={onAddCard}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add card
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton for loading state
export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col w-72 min-w-72 bg-muted/30 rounded-lg animate-pulse">
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted" />
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-5 w-8 bg-muted rounded-full" />
        </div>
      </div>
      <div className="p-2 space-y-2">
        <KanbanCardSkeleton />
        <KanbanCardSkeleton />
      </div>
    </div>
  );
}
