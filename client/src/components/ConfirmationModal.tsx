/**
 * Confirmation Modal Component - Sprint 2 Agent Alpha
 * 
 * Modal for confirming risky agent actions before execution.
 * Shows action details, risk level, and allows approve/reject.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, ShieldAlert, ShieldX, CheckCircle, XCircle } from 'lucide-react';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ConfirmationAction {
  id: string;
  type: string;
  description: string;
  riskLevel: RiskLevel;
  reason: string;
  details?: Record<string, unknown>;
  agentType?: string;
}

interface ConfirmationModalProps {
  action: ConfirmationAction | null;
  open: boolean;
  onConfirm: (actionId: string) => void;
  onReject: (actionId: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const riskConfig: Record<RiskLevel, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  description: string;
}> = {
  low: {
    icon: <Shield className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Low Risk',
    description: 'This action is generally safe and reversible.',
  },
  medium: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Medium Risk',
    description: 'This action may have side effects. Review carefully.',
  },
  high: {
    icon: <ShieldAlert className="h-5 w-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'High Risk',
    description: 'This action could affect important data or systems.',
  },
  critical: {
    icon: <ShieldX className="h-5 w-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Critical Risk',
    description: 'This action is potentially destructive. Proceed with extreme caution.',
  },
};

export function ConfirmationModal({
  action,
  open,
  onConfirm,
  onReject,
  onClose,
  isLoading = false,
}: ConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');

  if (!action) return null;

  const risk = riskConfig[action.riskLevel];
  const requiresTypedConfirmation = action.riskLevel === 'critical';
  const confirmationWord = 'CONFIRM';
  const canConfirm = !requiresTypedConfirmation || confirmText === confirmationWord;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(action.id);
      setConfirmText('');
    }
  };

  const handleReject = () => {
    onReject(action.id);
    setConfirmText('');
  };

  const handleClose = () => {
    onClose();
    setConfirmText('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={risk.color}>{risk.icon}</span>
            Action Requires Confirmation
          </DialogTitle>
          <DialogDescription>
            The AI agent wants to perform an action that requires your approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Risk Level Badge */}
          <div className={`p-3 rounded-lg border ${risk.bgColor} ${risk.borderColor}`}>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={risk.color}>
                {risk.label}
              </Badge>
              {action.agentType && (
                <Badge variant="secondary" className="capitalize">
                  {action.agentType} Agent
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{risk.description}</p>
          </div>

          {/* Action Details */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Requested Action</h4>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-mono text-sm">{action.type}</p>
              <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Why Confirmation Required</h4>
            <p className="text-sm text-muted-foreground">{action.reason}</p>
          </div>

          {/* Details (if any) */}
          {action.details && Object.keys(action.details).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Additional Details</h4>
              <div className="p-3 bg-muted rounded-lg font-mono text-xs overflow-auto max-h-32">
                <pre>{JSON.stringify(action.details, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Critical Confirmation Input */}
          {requiresTypedConfirmation && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-red-600">
                Type "{confirmationWord}" to confirm this critical action
              </h4>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                placeholder={confirmationWord}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isLoading}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={`gap-2 ${action.riskLevel === 'critical' ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            <CheckCircle className="h-4 w-4" />
            {isLoading ? 'Processing...' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmationModal;
