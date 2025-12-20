import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TimelineView } from "@/components/kanban/TimelineView";
import { CalendarView } from "@/components/kanban/CalendarView";
import { useKanban } from "@/hooks/useKanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Columns3, Calendar, GanttChart, LayoutGrid } from "lucide-react";
import { SprintPlanningUI } from "@/components/sprint/SprintPlanningUI";
import { CardDetailModal } from "@/components/kanban/CardDetailModal";
import { toast } from "sonner";

interface BoardPaneProps {
  boardId?: number;
}

type ViewType = 'board' | 'timeline' | 'calendar';

export default function BoardPane({ boardId: initialBoardId }: BoardPaneProps) {
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [activeView, setActiveView] = useState<ViewType>('board');

  // Use kanban hook - pass null for projectId to get all boards
  const kanban = useKanban(null);
  const utils = trpc.useUtils();
  
  // Set initial board if provided
  useEffect(() => {
    if (initialBoardId && !kanban.selectedBoardId) {
      kanban.selectBoard(initialBoardId);
    }
  }, [initialBoardId]);

  // Fetch all boards for selector
  const { data: allBoards, isLoading: boardsLoading } = trpc.kanban.getBoards.useQuery();

  // Prepare cards data for Timeline and Calendar views
  const viewCards = useMemo(() => {
    if (!kanban.board?.columns) return [];
    
    return kanban.board.columns.flatMap((column) =>
      (column.cards || []).map((card) => ({
        id: card.id,
        title: card.title,
        type: card.cardType || 'task',
        priority: card.priority || 'medium',
        assignedAgent: card.assignedAgent,
        dueDate: card.dueDate ? card.dueDate.toISOString() : null,
        estimateHours: card.estimatedMinutes ? Math.round(card.estimatedMinutes / 60) : null,
        columnId: column.id,
        columnName: column.name,
      }))
    );
  }, [kanban.board]);

  const viewColumns = useMemo(() => {
    if (!kanban.board?.columns) return [];
    return kanban.board.columns.map((col) => ({ id: col.id, name: col.name }));
  }, [kanban.board]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      toast.error("Please enter a board name");
      return;
    }
    try {
      const board = await kanban.createBoard(newBoardName, newBoardDescription || undefined);
      // Invalidate boards query to refresh the list
      await utils.kanban.getBoards.invalidate();
      if (board) {
        kanban.selectBoard(board.id);
      }
      setShowNewBoardDialog(false);
      setNewBoardName("");
      setNewBoardDescription("");
      toast.success("Board created successfully");
    } catch (error) {
      toast.error("Failed to create board");
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error("Please enter a column name");
      return;
    }
    await kanban.addColumn(newColumnName);
    setShowAddColumnDialog(false);
    setNewColumnName("");
    toast.success("Column added");
  };

  const handleCardClick = (cardId: number) => {
    // Find the card in the board data and open edit modal
    if (!kanban.board?.columns) return;
    
    for (const column of kanban.board.columns) {
      const card = column.cards?.find((c) => c.id === cardId);
      if (card) {
        // Convert to KanbanCardData format for the modal
        kanban.openEditCard(card as any);
        break;
      }
    }
  };

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!kanban.selectedBoardId) {
    return (
      <div className="flex flex-col h-full">
        {/* Board selector header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Columns3 className="w-5 h-5 text-muted-foreground" />
            <Select
              value=""
              onValueChange={(v) => kanban.selectBoard(parseInt(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a board" />
              </SelectTrigger>
              <SelectContent>
                {allBoards?.map((board: { id: number; name: string }) => (
                  <SelectItem key={board.id} value={board.id.toString()}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => setShowNewBoardDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Board
          </Button>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Columns3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Board Selected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a board from the dropdown or create a new one
            </p>
            <Button onClick={() => setShowNewBoardDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Board
            </Button>
          </div>
        </div>

        {/* New Board Dialog */}
        <Dialog open={showNewBoardDialog} onOpenChange={setShowNewBoardDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
              <DialogDescription>
                Create a new Kanban board to organize your tasks
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Board Name</label>
                <Input
                  placeholder="e.g., Sprint 1"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  placeholder="Brief description of this board"
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewBoardDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBoard} disabled={kanban.isMutating}>
                {kanban.isMutating ? "Creating..." : "Create Board"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board selector header with view tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-3">
          <Select
            value={kanban.selectedBoardId.toString()}
            onValueChange={(v) => kanban.selectBoard(parseInt(v))}
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Select a board" />
            </SelectTrigger>
            <SelectContent>
              {allBoards?.map((board: { id: number; name: string }) => (
                <SelectItem key={board.id} value={board.id.toString()}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Tabs - Simple button-based switching */}
          <div className="flex items-center bg-muted rounded-lg p-[3px] h-8">
            <button
              type="button"
              onClick={() => setActiveView('board')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors h-7 ${activeView === 'board' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('timeline')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors h-7 ${activeView === 'timeline' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <GanttChart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('calendar')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors h-7 ${activeView === 'calendar' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {kanban.selectedBoardId && kanban.board && (
            <SprintPlanningUI
              boardId={kanban.selectedBoardId}
              boardName={kanban.board.name}
            />
          )}
          <Button size="sm" variant="outline" onClick={() => setShowNewBoardDialog(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'board' && (
          <KanbanBoard
            board={kanban.board}
            isLoading={kanban.isLoading}
            onMoveCard={kanban.moveCard}
            onAddColumn={() => setShowAddColumnDialog(true)}
            onAddCard={kanban.openNewCard}
            onCardClick={kanban.openEditCard}
          />
        )}
        {activeView === 'timeline' && (
          <TimelineView
            cards={viewCards}
            columns={viewColumns}
            onCardClick={handleCardClick}
          />
        )}
        {activeView === 'calendar' && (
          <CalendarView
            cards={viewCards}
            columns={viewColumns}
            onCardClick={handleCardClick}
          />
        )}
      </div>

      {/* New Board Dialog */}
      <Dialog open={showNewBoardDialog} onOpenChange={setShowNewBoardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Create a new Kanban board to organize your tasks
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Board Name</label>
              <Input
                placeholder="e.g., Sprint 1"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Brief description of this board"
                value={newBoardDescription}
                onChange={(e) => setNewBoardDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBoardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBoard} disabled={kanban.isMutating}>
              {kanban.isMutating ? "Creating..." : "Create Board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Detail Modal */}
      <CardDetailModal
        card={kanban.selectedCard}
        isOpen={kanban.isCardModalOpen}
        onClose={kanban.closeCardModal}
        onSave={kanban.saveCard}
        onDelete={kanban.selectedCard ? () => kanban.deleteCard(kanban.selectedCard!.id) : undefined}
        isNew={kanban.isNewCard}
      />

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>
              Add a new column to your board
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Column Name</label>
              <Input
                placeholder="e.g., In Progress"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn} disabled={kanban.isMutating}>
              {kanban.isMutating ? "Adding..." : "Add Column"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
