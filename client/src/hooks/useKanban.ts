/**
 * useKanban Hook
 * Phase 1 Task P1-012
 */

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { KanbanCardData } from "@/components/kanban/KanbanCard";
import { KanbanColumnData } from "@/components/kanban/KanbanColumn";
import { KanbanBoardData, BoardSettings } from "@/components/kanban/KanbanBoard";

export function useKanban(projectId: number | null) {
  const utils = trpc.useUtils();
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardData | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isNewCard, setIsNewCard] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<number | null>(null);

  // Queries
  const boardsQuery = trpc.kanban.getBoardsByProject.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  const boardQuery = trpc.kanban.getBoard.useQuery(
    { id: selectedBoardId! },
    { enabled: !!selectedBoardId }
  );

  // Mutations
  const createBoardMutation = trpc.kanban.createBoard.useMutation({
    onSuccess: (newBoard) => {
      // Invalidate and refetch boards list
      utils.kanban.getBoardsByProject.invalidate();
      // Auto-select the newly created board
      if (newBoard?.id) {
        setSelectedBoardId(newBoard.id);
      }
    },
  });

  const updateBoardMutation = trpc.kanban.updateBoard.useMutation({
    onSuccess: () => {
      utils.kanban.getBoard.invalidate();
      utils.kanban.getBoardsByProject.invalidate();
    },
  });

  const deleteBoardMutation = trpc.kanban.deleteBoard.useMutation({
    onSuccess: () => {
      utils.kanban.getBoardsByProject.invalidate();
      setSelectedBoardId(null);
    },
  });

  const createBoardFromTemplateMutation = trpc.kanban.createBoardFromTemplate.useMutation({
    onSuccess: (board) => {
      utils.kanban.getBoardsByProject.invalidate();
      if (board) setSelectedBoardId(board.id);
    },
  });

  const createColumnMutation = trpc.kanban.createColumn.useMutation({
    onSuccess: () => {
      utils.kanban.getBoard.invalidate();
    },
  });

  const updateColumnMutation = trpc.kanban.updateColumn.useMutation({
    onSuccess: () => {
      utils.kanban.getBoard.invalidate();
    },
  });

  const deleteColumnMutation = trpc.kanban.deleteColumn.useMutation({
    onSuccess: () => {
      utils.kanban.getBoard.invalidate();
    },
  });

  const createCardMutation = trpc.kanban.createCard.useMutation({
    onSuccess: () => {
      utils.kanban.getBoard.invalidate();
    },
  });

  const updateCardMutation = trpc.kanban.updateCard.useMutation({
    onSuccess: () => {
      utils.kanban.getBoard.invalidate();
    },
  });

  const deleteCardMutation = trpc.kanban.deleteCard.useMutation({
    onSuccess: () => {
      utils.kanban.getBoard.invalidate();
    },
  });

  const moveCardMutation = trpc.kanban.moveCard.useMutation({
    onMutate: async ({ cardId, targetColumnId, targetPosition }) => {
      // Cancel outgoing refetches
      await utils.kanban.getBoard.cancel();

      // Snapshot previous value
      const previousBoard = utils.kanban.getBoard.getData({ id: selectedBoardId! });

      // Optimistically update
      if (previousBoard) {
        const newColumns = previousBoard.columns.map(col => ({ ...col, cards: [...col.cards] }));
        let movedCard: typeof newColumns[0]['cards'][0] | undefined;

        // Find and remove card from source column
        for (let i = 0; i < newColumns.length; i++) {
          const cardIndex = newColumns[i].cards.findIndex((c) => c.id === cardId);
          if (cardIndex !== -1) {
            movedCard = newColumns[i].cards[cardIndex];
            newColumns[i].cards = newColumns[i].cards.filter((c) => c.id !== cardId);
            break;
          }
        }

        // Add card to target column
        if (movedCard) {
          const targetColumnIndex = newColumns.findIndex((c) => c.id === targetColumnId);
          if (targetColumnIndex !== -1) {
            newColumns[targetColumnIndex].cards.splice(targetPosition, 0, movedCard);
          }
        }

        utils.kanban.getBoard.setData({ id: selectedBoardId! }, {
          ...previousBoard,
          columns: newColumns,
        });
      }

      return { previousBoard };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousBoard) {
        utils.kanban.getBoard.setData(
          { id: selectedBoardId! },
          context.previousBoard
        );
      }
    },
    onSettled: () => {
      utils.kanban.getBoard.invalidate();
    },
  });

  // Board actions
  const createBoard = useCallback(
    async (name: string, description?: string) => {
      if (!projectId) return;
      const board = await createBoardMutation.mutateAsync({
        projectId,
        name,
        description,
      });
      setSelectedBoardId(board.id);
      return board;
    },
    [projectId, createBoardMutation]
  );

  const selectBoard = useCallback((boardId: number) => {
    setSelectedBoardId(boardId);
  }, []);

  const deleteBoard = useCallback(
    async (boardId: number) => {
      await deleteBoardMutation.mutateAsync({ id: boardId });
    },
    [deleteBoardMutation]
  );

  const createBoardFromTemplate = useCallback(
    async (templateType: "sprint" | "feature_development" | "bug_triage" | "kanban_basic", customName?: string) => {
      if (!projectId) return;
      const board = await createBoardFromTemplateMutation.mutateAsync({
        projectId,
        templateType,
        name: customName,
      });
      return board;
    },
    [projectId, createBoardFromTemplateMutation]
  );

  // Column actions
  const addColumn = useCallback(
    async (name: string, columnType: "backlog" | "spec_writing" | "design" | "ready" | "in_progress" | "review" | "done" | "blocked" | "custom" = "custom") => {
      if (!selectedBoardId) return;
      await createColumnMutation.mutateAsync({
        boardId: selectedBoardId,
        name,
        columnType,
      });
    },
    [selectedBoardId, createColumnMutation]
  );

  const updateColumn = useCallback(
    async (columnId: number, updates: { name?: string; wipLimit?: number | null }) => {
      await updateColumnMutation.mutateAsync({ id: columnId, ...updates });
    },
    [updateColumnMutation]
  );

  const deleteColumn = useCallback(
    async (columnId: number) => {
      await deleteColumnMutation.mutateAsync({ id: columnId });
    },
    [deleteColumnMutation]
  );

  // Card actions
  const openNewCard = useCallback((columnId: number) => {
    setSelectedCard(null);
    setTargetColumnId(columnId);
    setIsNewCard(true);
    setIsCardModalOpen(true);
  }, []);

  const openEditCard = useCallback((card: KanbanCardData) => {
    setSelectedCard(card);
    setIsNewCard(false);
    setIsCardModalOpen(true);
  }, []);

  const closeCardModal = useCallback(() => {
    setIsCardModalOpen(false);
    setSelectedCard(null);
    setTargetColumnId(null);
  }, []);

  const saveCard = useCallback(
    async (cardData: Partial<KanbanCardData>) => {
      if (isNewCard && targetColumnId) {
        await createCardMutation.mutateAsync({
          boardId: selectedBoardId!,
          columnId: targetColumnId,
          title: cardData.title!,
          description: cardData.description ?? undefined,
          cardType: cardData.cardType || "task",
          priority: cardData.priority || "medium",
          assignedAgent: cardData.assignedAgent ?? undefined,
          dueDate: cardData.dueDate ? new Date(cardData.dueDate) : undefined,
          estimatedMinutes: cardData.estimatedMinutes ?? undefined,
          storyPoints: cardData.storyPoints ?? undefined,
        });
      } else if (selectedCard) {
        await updateCardMutation.mutateAsync({
          id: selectedCard.id,
          title: cardData.title,
          description: cardData.description ?? undefined,
          cardType: cardData.cardType,
          priority: cardData.priority,
          assignedAgent: cardData.assignedAgent ?? undefined,
          dueDate: cardData.dueDate ? new Date(cardData.dueDate) : undefined,
          estimatedMinutes: cardData.estimatedMinutes ?? undefined,
          storyPoints: cardData.storyPoints ?? undefined,
          isBlocked: cardData.isBlocked ?? undefined,
          blockReason: cardData.blockReason ?? undefined,
        });
      }
      closeCardModal();
    },
    [isNewCard, targetColumnId, selectedCard, createCardMutation, updateCardMutation, closeCardModal]
  );

  const deleteCard = useCallback(
    async (cardId: number) => {
      await deleteCardMutation.mutateAsync({ id: cardId });
      closeCardModal();
    },
    [deleteCardMutation, closeCardModal]
  );

  const moveCard = useCallback(
    async (cardId: number, targetColumnId: number, targetPosition: number) => {
      await moveCardMutation.mutateAsync({ cardId, targetColumnId, targetPosition });
    },
    [moveCardMutation]
  );

  return {
    // State
    boards: boardsQuery.data || [],
    board: boardQuery.data || null,
    selectedBoardId,
    selectedCard,
    isCardModalOpen,
    isNewCard,
    isLoading: boardsQuery.isLoading || boardQuery.isLoading,
    isMutating:
      createBoardMutation.isPending ||
      createBoardFromTemplateMutation.isPending ||
      createColumnMutation.isPending ||
      createCardMutation.isPending ||
      moveCardMutation.isPending,

    // Board actions
    createBoard,
    selectBoard,
    deleteBoard,
    createBoardFromTemplate,

    // Column actions
    addColumn,
    updateColumn,
    deleteColumn,

    // Card actions
    openNewCard,
    openEditCard,
    closeCardModal,
    saveCard,
    deleteCard,
    moveCard,
  };
}
