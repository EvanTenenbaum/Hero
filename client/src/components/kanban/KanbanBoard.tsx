/**
 * KanbanBoard Component
 * Phase 1 Task P1-008
 */

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { Plus, Settings, Filter, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { KanbanColumn, KanbanColumnData, KanbanColumnSkeleton } from "./KanbanColumn";
import { KanbanCard, KanbanCardData } from "./KanbanCard";
import { cn } from "@/lib/utils";

export interface BoardSettings {
  defaultView: "board" | "list" | "timeline";
  showLabels: boolean;
  showAssignees: boolean;
  showDueDates: boolean;
  swimlaneBy: "agent" | "priority" | "epic" | "label" | "none";
  cardSize: "compact" | "normal" | "detailed";
}

export interface KanbanBoardData {
  id: number;
  name: string;
  description?: string | null;
  columns: KanbanColumnData[];
  labels: Array<{ id: number; name: string; color: string }>;
  settings?: BoardSettings;
}

interface KanbanBoardProps {
  board: KanbanBoardData | null;
  isLoading?: boolean;
  onMoveCard?: (cardId: number, targetColumnId: number, targetPosition: number) => void;
  onReorderColumns?: (columnIds: number[]) => void;
  onAddColumn?: () => void;
  onEditColumn?: (column: KanbanColumnData) => void;
  onDeleteColumn?: (column: KanbanColumnData) => void;
  onAddCard?: (columnId: number) => void;
  onCardClick?: (card: KanbanCardData) => void;
  onCardEdit?: (card: KanbanCardData) => void;
  onCardDelete?: (card: KanbanCardData) => void;
  onSettingsChange?: (settings: Partial<BoardSettings>) => void;
}

export function KanbanBoard({
  board,
  isLoading,
  onMoveCard,
  onReorderColumns,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onAddCard,
  onCardClick,
  onCardEdit,
  onCardDelete,
  onSettingsChange,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<KanbanCardData | null>(null);
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const cardId = active.id as number;
    
    // Find the card across all columns
    for (const column of board?.columns || []) {
      const card = column.cards.find((c) => c.id === cardId);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  }, [board]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over for visual feedback
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !board) return;

    const activeId = active.id as number;
    const overId = over.id;

    // Find source column and card
    let sourceColumnId: number | null = null;
    let sourceIndex: number = -1;

    for (const column of board.columns) {
      const cardIndex = column.cards.findIndex((c) => c.id === activeId);
      if (cardIndex !== -1) {
        sourceColumnId = column.id;
        sourceIndex = cardIndex;
        break;
      }
    }

    if (sourceColumnId === null) return;

    // Determine target column and position
    let targetColumnId: number;
    let targetPosition: number;

    if (typeof overId === "string" && overId.startsWith("column-")) {
      // Dropped on a column
      targetColumnId = parseInt(overId.replace("column-", ""));
      const targetColumn = board.columns.find((c) => c.id === targetColumnId);
      targetPosition = targetColumn?.cards.length || 0;
    } else {
      // Dropped on a card
      const overCardId = overId as number;
      for (const column of board.columns) {
        const cardIndex = column.cards.findIndex((c) => c.id === overCardId);
        if (cardIndex !== -1) {
          targetColumnId = column.id;
          targetPosition = cardIndex;
          break;
        }
      }
      targetColumnId = targetColumnId!;
      targetPosition = targetPosition!;
    }

    // Only call onMoveCard if something changed
    if (sourceColumnId !== targetColumnId || sourceIndex !== targetPosition) {
      onMoveCard?.(activeId, targetColumnId, targetPosition);
    }
  }, [board, onMoveCard]);

  // Filter cards based on selected filters
  const getFilteredCards = useCallback((cards: KanbanCardData[]) => {
    return cards.filter((card) => {
      if (filterAgent && card.assignedAgent !== filterAgent) return false;
      if (filterPriority && card.priority !== filterPriority) return false;
      return true;
    });
  }, [filterAgent, filterPriority]);

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        <KanbanColumnSkeleton />
        <KanbanColumnSkeleton />
        <KanbanColumnSkeleton />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <LayoutGrid className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No board selected</p>
        <p className="text-sm">Create or select a board to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{board.name}</h2>
          {board.description && (
            <span className="text-sm text-muted-foreground">
              {board.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {(filterAgent || filterPriority) && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded">
                    {[filterAgent, filterPriority].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Agent
              </div>
              {["pm", "developer", "qa", "devops", "research"].map((agent) => (
                <DropdownMenuCheckboxItem
                  key={agent}
                  checked={filterAgent === agent}
                  onCheckedChange={(checked) => setFilterAgent(checked ? agent : null)}
                >
                  {agent.toUpperCase()}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Priority
              </div>
              {["critical", "high", "medium", "low"].map((priority) => (
                <DropdownMenuCheckboxItem
                  key={priority}
                  checked={filterPriority === priority}
                  onCheckedChange={(checked) => setFilterPriority(checked ? priority : null)}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setFilterAgent(null);
                  setFilterPriority(null);
                }}
              >
                Clear filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={board.settings?.showLabels ?? true}
                onCheckedChange={(checked) => 
                  onSettingsChange?.({ showLabels: checked })
                }
              >
                Show labels
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={board.settings?.showAssignees ?? true}
                onCheckedChange={(checked) => 
                  onSettingsChange?.({ showAssignees: checked })
                }
              >
                Show assignees
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={board.settings?.showDueDates ?? true}
                onCheckedChange={(checked) => 
                  onSettingsChange?.({ showDueDates: checked })
                }
              >
                Show due dates
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add column button */}
          <Button size="sm" onClick={onAddColumn}>
            <Plus className="h-4 w-4 mr-2" />
            Add column
          </Button>
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={{
                  ...column,
                  cards: getFilteredCards(column.cards),
                }}
                onAddCard={() => onAddCard?.(column.id)}
                onEditColumn={() => onEditColumn?.(column)}
                onDeleteColumn={() => onDeleteColumn?.(column)}
                onCardClick={onCardClick}
                onCardEdit={onCardEdit}
                onCardDelete={onCardDelete}
              />
            ))}

            {/* Add column placeholder */}
            <div
              className={cn(
                "flex flex-col items-center justify-center w-72 min-w-72",
                "border-2 border-dashed border-border rounded-lg",
                "text-muted-foreground hover:border-primary/50 hover:text-primary",
                "cursor-pointer transition-colors"
              )}
              onClick={onAddColumn}
            >
              <Plus className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Add column</span>
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeCard && (
              <KanbanCard card={activeCard} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
