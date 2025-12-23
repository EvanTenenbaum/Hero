/**
 * SandboxStatusIndicator Component
 * 
 * Displays the current cloud sandbox status in the header/navbar.
 * Shows whether a sandbox is running and provides quick actions.
 */

import { useState } from 'react';
import { Cloud, CloudOff, Loader2, Terminal, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface SandboxStatusIndicatorProps {
  projectId?: number;
  className?: string;
}

export function SandboxStatusIndicator({ 
  projectId, 
  className 
}: SandboxStatusIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Query sandbox status if projectId is provided
  const { data: status, isLoading, refetch } = trpc.cloudSandbox.status.useQuery(
    { projectId: projectId! },
    { 
      enabled: !!projectId,
      refetchInterval: 10000, // Poll every 10 seconds
    }
  );

  const stopSandbox = trpc.cloudSandbox.stop.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Don't render if no project context
  if (!projectId) {
    return null;
  }

  const isActive = status?.active;
  const sandboxId = status?.sandboxId;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 h-8",
            isActive && "text-green-400",
            className
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isActive ? (
            <Cloud className="h-4 w-4" />
          ) : (
            <CloudOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="hidden sm:inline text-xs">
            {isLoading ? 'Checking...' : isActive ? 'Sandbox Active' : 'Sandbox Idle'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Cloud Sandbox</h4>
            <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-600" : ""}>
              {isActive ? 'Running' : 'Stopped'}
            </Badge>
          </div>

          {isActive && sandboxId && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Terminal className="h-3 w-3" />
                <span className="font-mono truncate">{sandboxId}</span>
              </div>
              
              {status?.health && (
                <div className="flex items-center gap-2">
                  <span>Health:</span>
                  <Badge variant="outline" className="text-xs">
                    {status.health.status}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {isActive && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => stopSandbox.mutate({ projectId })}
              disabled={stopSandbox.isPending}
            >
              {stopSandbox.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Stop Sandbox
            </Button>
          )}

          {!isActive && (
            <p className="text-xs text-muted-foreground">
              The sandbox will start automatically when you execute a task or send a message with cloud execution enabled.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
