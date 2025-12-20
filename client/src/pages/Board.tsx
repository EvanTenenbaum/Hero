/**
 * Board Page
 * Phase 1 Task P1-014
 * Main Kanban board view with project selection and board management
 */

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CardDetailModal } from "@/components/kanban/CardDetailModal";
import { useKanban } from "@/hooks/useKanban";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  LayoutGrid,
  Loader2,
  FolderKanban,
  Settings,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Board() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isNewBoardDialogOpen, setIsNewBoardDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [isNewColumnDialogOpen, setIsNewColumnDialogOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // Fetch projects
  const projectsQuery = trpc.projects.list.useQuery();

  // Kanban hook
  const {
    boards,
    board,
    selectedBoardId,
    selectedCard,
    isCardModalOpen,
    isNewCard,
    isLoading,
    isMutating,
    createBoard,
    selectBoard,
    deleteBoard,
    addColumn,
    updateColumn,
    deleteColumn,
    openNewCard,
    openEditCard,
    closeCardModal,
    saveCard,
    deleteCard,
    moveCard,
  } = useKanban(selectedProjectId);

  // Auto-select first project
  useEffect(() => {
    if (projectsQuery.data?.length && !selectedProjectId) {
      setSelectedProjectId(projectsQuery.data[0].id);
    }
  }, [projectsQuery.data, selectedProjectId]);

  // Auto-select first board when boards load
  useEffect(() => {
    if (boards.length && !selectedBoardId) {
      selectBoard(boards[0].id);
    }
  }, [boards, selectedBoardId, selectBoard]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    await createBoard(newBoardName, newBoardDescription || undefined);
    setNewBoardName("");
    setNewBoardDescription("");
    setIsNewBoardDialogOpen(false);
  };

  const handleDeleteBoard = async (boardId: number) => {
    if (confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
      await deleteBoard(boardId);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    await addColumn(newColumnName);
    setNewColumnName("");
    setIsNewColumnDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Kanban Board</h1>
            </div>

            {/* Project Selector */}
            <Select
              value={selectedProjectId?.toString() || ""}
              onValueChange={(v) => setSelectedProjectId(Number(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projectsQuery.data?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Board Selector */}
            {boards.length > 0 && (
              <Select
                value={selectedBoardId?.toString() || ""}
                onValueChange={(v) => selectBoard(Number(v))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewColumnDialogOpen(true)}
              disabled={!selectedBoardId}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Column
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsNewBoardDialogOpen(true)}
              disabled={!selectedProjectId}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              New Board
            </Button>

            {selectedBoardId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {/* TODO: Board settings */}}>
                    <Settings className="h-4 w-4 mr-2" />
                    Board Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteBoard(selectedBoardId)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Board
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Board Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedProjectId ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FolderKanban className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg">Select a project to view boards</p>
              <p className="text-sm mt-2">
                Or create a new project in the Projects section
              </p>
            </div>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <LayoutGrid className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg">No boards yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsNewBoardDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first board
              </Button>
            </div>
          ) : board ? (
            <KanbanBoard
              board={{
                id: board.id,
                name: board.name,
                description: board.description,
                columns: board.columns.map((col) => ({
                  id: col.id,
                  name: col.name,
                  columnType: col.columnType,
                  color: col.color,
                  wipLimit: col.wipLimit,
                  position: col.position,
                  cards: col.cards.map((card) => ({
                    id: card.id,
                    title: card.title,
                    description: card.description,
                    cardType: card.cardType,
                    priority: card.priority,
                    assignedAgent: card.assignedAgent,
                    labels: card.labels || [],
                    dueDate: card.dueDate,
                    estimatedMinutes: card.estimatedMinutes,
                    actualMinutes: card.actualMinutes,
                    storyPoints: card.storyPoints,
                    isBlocked: card.isBlocked ?? undefined,
                    blockReason: card.blockReason,
                    position: card.position,
                  })),
                })),
                labels: [],
                settings: {
                  defaultView: (board.settings?.defaultView || "board") as "board" | "list" | "timeline",
                  showLabels: board.settings?.showLabels ?? true,
                  showAssignees: board.settings?.showAssignees ?? true,
                  showDueDates: board.settings?.showDueDates ?? true,
                  swimlaneBy: (board.settings?.swimlaneBy || "none") as "agent" | "priority" | "epic" | "label" | "none",
                  cardSize: (board.settings?.cardSize || "normal") as "compact" | "normal" | "detailed",
                },
              }}
              onCardClick={openEditCard}
              onMoveCard={moveCard}
              onAddCard={openNewCard}
              onAddColumn={() => setIsNewColumnDialogOpen(true)}
              onDeleteColumn={(col) => deleteColumn(col.id)}
            />
          ) : null}
        </div>
      </div>

      {/* New Board Dialog */}
      <Dialog open={isNewBoardDialogOpen} onOpenChange={setIsNewBoardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Create a new Kanban board to organize your project tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board Name</Label>
              <Input
                id="board-name"
                placeholder="e.g., Sprint 1, Feature Development"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-description">Description (optional)</Label>
              <Textarea
                id="board-description"
                placeholder="What is this board for?"
                value={newBoardDescription}
                onChange={(e) => setNewBoardDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewBoardDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBoard} disabled={!newBoardName.trim() || isMutating}>
              {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Column Dialog */}
      <Dialog open={isNewColumnDialogOpen} onOpenChange={setIsNewColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogDescription>
              Add a new column to organize your tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="column-name">Column Name</Label>
              <Input
                id="column-name"
                placeholder="e.g., To Do, In Progress, Done"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newColumnName.trim()) {
                    handleAddColumn();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim() || isMutating}>
              {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Detail Modal */}
      <CardDetailModal
        isOpen={isCardModalOpen}
        onClose={closeCardModal}
        card={selectedCard}
        isNew={isNewCard}
        onSave={saveCard}
        onDelete={selectedCard ? () => deleteCard(selectedCard.id) : undefined}
      />
    </DashboardLayout>
  );
}
