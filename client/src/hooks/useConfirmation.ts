/**
 * useConfirmation Hook - Sprint 2 Agent Alpha
 * 
 * Hook for managing confirmation flow for risky agent actions.
 * Handles pending confirmations, approvals, and rejections.
 */

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { ConfirmationAction, RiskLevel } from '@/components/ConfirmationModal';

export interface PendingConfirmation extends ConfirmationAction {
  onConfirm: () => Promise<void>;
  onReject: () => void;
}

export interface UseConfirmationOptions {
  onConfirmed?: (action: ConfirmationAction) => void;
  onRejected?: (action: ConfirmationAction) => void;
  onError?: (error: Error) => void;
}

export function useConfirmation(options: UseConfirmationOptions = {}) {
  const { onConfirmed, onRejected, onError } = options;

  const [pendingAction, setPendingAction] = useState<PendingConfirmation | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<Array<{
    action: ConfirmationAction;
    decision: 'approved' | 'rejected';
    timestamp: Date;
  }>>([]);

  /**
   * Request confirmation for an action
   */
  const requestConfirmation = useCallback((
    action: Omit<ConfirmationAction, 'id'>,
    onConfirmCallback: () => Promise<void>,
    onRejectCallback?: () => void
  ): string => {
    const id = `confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullAction: PendingConfirmation = {
      ...action,
      id,
      onConfirm: onConfirmCallback,
      onReject: onRejectCallback || (() => {}),
    };

    setPendingAction(fullAction);
    setIsOpen(true);
    
    return id;
  }, []);

  /**
   * Approve the pending action
   */
  const approve = useCallback(async (actionId: string) => {
    if (!pendingAction || pendingAction.id !== actionId) return;

    setIsProcessing(true);
    try {
      await pendingAction.onConfirm();
      
      setHistory(prev => [...prev, {
        action: pendingAction,
        decision: 'approved',
        timestamp: new Date(),
      }]);
      
      onConfirmed?.(pendingAction);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsProcessing(false);
      setIsOpen(false);
      setPendingAction(null);
    }
  }, [pendingAction, onConfirmed, onError]);

  /**
   * Reject the pending action
   */
  const reject = useCallback((actionId: string) => {
    if (!pendingAction || pendingAction.id !== actionId) return;

    pendingAction.onReject();
    
    setHistory(prev => [...prev, {
      action: pendingAction,
      decision: 'rejected',
      timestamp: new Date(),
    }]);
    
    onRejected?.(pendingAction);
    setIsOpen(false);
    setPendingAction(null);
  }, [pendingAction, onRejected]);

  /**
   * Close the modal without making a decision
   */
  const close = useCallback(() => {
    if (pendingAction) {
      pendingAction.onReject();
      onRejected?.(pendingAction);
    }
    setIsOpen(false);
    setPendingAction(null);
  }, [pendingAction, onRejected]);

  /**
   * Clear confirmation history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  /**
   * Check if an action would require confirmation based on risk level
   */
  const wouldRequireConfirmation = useCallback((riskLevel: RiskLevel): boolean => {
    return riskLevel !== 'low';
  }, []);

  return {
    // State
    pendingAction,
    isOpen,
    isProcessing,
    history,
    
    // Actions
    requestConfirmation,
    approve,
    reject,
    close,
    clearHistory,
    
    // Utilities
    wouldRequireConfirmation,
  };
}

export default useConfirmation;
