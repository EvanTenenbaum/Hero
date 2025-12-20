/**
 * Rollback Panel Component - Sprint 3 Agent Beta
 * 
 * UI for viewing checkpoints and performing rollbacks.
 * Shows checkpoint timeline and rollback preview.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  RotateCcw, 
  Clock, 
  GitBranch, 
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Trash2
} from 'lucide-react';

export interface Checkpoint {
  id: number;
  executionId: number;
  stepNumber: number;
  description: string | null;
  createdAt: Date;
  automatic?: boolean;
}

export interface RollbackPreview {
  stepsToRevert: number;
  checkpointsToRemove: number;
}

interface RollbackPanelProps {
  checkpoints: Checkpoint[];
  currentStep: number;
  onRollback: (checkpointId: number) => Promise<void>;
  onDelete?: (checkpointId: number) => Promise<void>;
  onPreview?: (checkpointId: number) => Promise<RollbackPreview | null>;
  isLoading?: boolean;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function RollbackPanel({
  checkpoints,
  currentStep,
  onRollback,
  onDelete,
  onPreview,
  isLoading = false,
}: RollbackPanelProps) {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [preview, setPreview] = useState<RollbackPreview | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleSelectCheckpoint = async (checkpoint: Checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    
    if (onPreview) {
      const previewData = await onPreview(checkpoint.id);
      setPreview(previewData);
    }
    
    setIsDialogOpen(true);
  };

  const handleConfirmRollback = async () => {
    if (!selectedCheckpoint) return;
    
    setIsRollingBack(true);
    try {
      await onRollback(selectedCheckpoint.id);
      setIsDialogOpen(false);
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleDelete = async (checkpoint: Checkpoint, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      await onDelete(checkpoint.id);
    }
  };

  if (checkpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Checkpoints
          </CardTitle>
          <CardDescription>
            No checkpoints available for this execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Checkpoints are created automatically at key steps and can be used to rollback if needed.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group checkpoints by date
  const groupedCheckpoints = checkpoints.reduce((groups, checkpoint) => {
    const dateKey = formatDate(checkpoint.createdAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(checkpoint);
    return groups;
  }, {} as Record<string, Checkpoint[]>);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Checkpoints
            </span>
            <Badge variant="secondary">{checkpoints.length}</Badge>
          </CardTitle>
          <CardDescription>
            Click a checkpoint to preview and rollback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedCheckpoints).map(([date, dateCheckpoints]) => (
              <div key={date}>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">{date}</h4>
                <div className="space-y-2">
                  {dateCheckpoints.map((checkpoint, index) => {
                    const isLatest = index === 0 && date === Object.keys(groupedCheckpoints)[0];
                    const isCurrent = checkpoint.stepNumber === currentStep;
                    
                    return (
                      <div
                        key={checkpoint.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                          transition-colors hover:bg-muted/50
                          ${isCurrent ? 'border-green-500 bg-green-50/50' : ''}
                          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
                        `}
                        onClick={() => handleSelectCheckpoint(checkpoint)}
                      >
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                          <div className={`
                            w-3 h-3 rounded-full
                            ${isCurrent ? 'bg-green-500' : isLatest ? 'bg-blue-500' : 'bg-muted-foreground/30'}
                          `} />
                          {index < dateCheckpoints.length - 1 && (
                            <div className="w-0.5 h-6 bg-muted-foreground/20 mt-1" />
                          )}
                        </div>

                        {/* Checkpoint info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              Step {checkpoint.stepNumber}
                            </span>
                            {isCurrent && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Current
                              </Badge>
                            )}
                            {isLatest && !isCurrent && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                Latest
                              </Badge>
                            )}
                            {checkpoint.automatic === false && (
                              <Badge variant="secondary">Manual</Badge>
                            )}
                          </div>
                          {checkpoint.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {checkpoint.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(checkpoint.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {onDelete && !isCurrent && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => handleDelete(checkpoint, e)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Rollback to Checkpoint
            </DialogTitle>
            <DialogDescription>
              This will revert the execution to step {selectedCheckpoint?.stepNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedCheckpoint && (
            <div className="space-y-4 py-4">
              {/* Checkpoint details */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Step {selectedCheckpoint.stepNumber}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(selectedCheckpoint.createdAt)} at {formatTime(selectedCheckpoint.createdAt)}
                  </span>
                </div>
                {selectedCheckpoint.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCheckpoint.description}
                  </p>
                )}
              </div>

              {/* Preview */}
              {preview && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">What will happen:</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span>{preview.stepsToRevert} steps will be reverted</span>
                    </div>
                    {preview.checkpointsToRemove > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>{preview.checkpointsToRemove} newer checkpoints will be removed</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">This action cannot be undone</p>
                    <p>All progress after this checkpoint will be lost.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isRollingBack}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRollback}
              disabled={isRollingBack}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {isRollingBack ? 'Rolling back...' : 'Confirm Rollback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RollbackPanel;
