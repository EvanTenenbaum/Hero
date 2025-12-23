/**
 * CloudSandboxPanel Component
 * 
 * Displays cloud sandbox status and controls for a project.
 * Integrates with the useCloudSandbox hook for E2B sandbox management.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Cloud,
  CloudOff,
  Play,
  Square,
  Terminal,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Key,
  Plus,
  Trash2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface CloudSandboxPanelProps {
  projectId: number;
  repoOwner?: string | null;
  repoName?: string | null;
  useCloudSandbox?: boolean;
}

export default function CloudSandboxPanel({
  projectId,
  repoOwner,
  repoName,
  useCloudSandbox: initialCloudEnabled = false,
}: CloudSandboxPanelProps) {
  const [cloudEnabled, setCloudEnabled] = useState(initialCloudEnabled);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  
  const utils = trpc.useUtils();

  // Query sandbox status
  const { data: sandboxStatus, isLoading: statusLoading, refetch: refetchStatus } = 
    trpc.cloudSandbox.status.useQuery(
      { projectId },
      { 
        enabled: cloudEnabled,
        refetchInterval: cloudEnabled ? 5000 : false, // Poll when enabled
      }
    );

  // Query project secrets
  const { data: secretsData, isLoading: secretsLoading, refetch: refetchSecrets } =
    trpc.secrets.list.useQuery(
      { projectId },
      { enabled: cloudEnabled }
    );

  // Extract secrets array from response
  const secrets = secretsData?.secrets;

  // Mutations
  const startSandbox = trpc.cloudSandbox.start.useMutation({
    onSuccess: () => {
      toast.success('Cloud sandbox started');
      refetchStatus();
    },
    onError: () => {
      // SECURITY: Don't expose internal error details to client
      toast.error('Failed to start sandbox. Please try again.');
    },
  });

  const stopSandbox = trpc.cloudSandbox.stop.useMutation({
    onSuccess: () => {
      toast.success('Cloud sandbox stopped');
      refetchStatus();
    },
    onError: () => {
      // SECURITY: Don't expose internal error details to client
      toast.error('Failed to stop sandbox. Please try again.');
    },
  });

  const addSecret = trpc.secrets.add.useMutation({
    onSuccess: () => {
      toast.success('Secret added');
      setNewSecretKey('');
      setNewSecretValue('');
      refetchSecrets();
    },
    onError: (error) => {
      toast.error(`Failed to add secret: ${error.message}`);
    },
  });

  const deleteSecret = trpc.secrets.delete.useMutation({
    onSuccess: () => {
      toast.success('Secret deleted');
      refetchSecrets();
    },
    onError: () => {
      // SECURITY: Don't expose internal error details to client
      toast.error('Failed to delete secret. Please try again.');
    },
  });

  const toggleCloudSandbox = trpc.projects.update.useMutation({
    onSuccess: () => {
      // Only update state on success (not optimistically)
      setCloudEnabled(!cloudEnabled);
      toast.success(cloudEnabled ? 'Cloud sandbox disabled' : 'Cloud sandbox enabled');
    },
    onError: () => {
      // SECURITY: Don't expose internal error details to client
      toast.error('Failed to update project. Please try again.');
    },
  });

  const handleToggleCloud = () => {
    // Don't optimistically update - wait for server confirmation
    toggleCloudSandbox.mutate({
      id: projectId,
      useCloudSandbox: !cloudEnabled,
    });
  };

  const handleAddSecret = () => {
    const trimmedKey = newSecretKey.trim();
    const trimmedValue = newSecretValue.trim();
    
    if (!trimmedKey || !trimmedValue) {
      toast.error('Both key and value are required');
      return;
    }
    
    // SECURITY: Validate key length to prevent DoS
    if (trimmedKey.length > 64) {
      toast.error('Secret key must be 64 characters or less');
      return;
    }
    
    // Validate key format - must start with letter, only alphanumeric and underscore
    const sanitizedKey = trimmedKey.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    if (sanitizedKey.length === 0) {
      toast.error('Secret key must contain at least one alphanumeric character');
      return;
    }
    
    // SECURITY: Enforce standard env var naming (must start with letter or underscore)
    if (!/^[A-Z_][A-Z0-9_]*$/.test(sanitizedKey)) {
      toast.error('Secret key must start with a letter or underscore');
      return;
    }
    
    addSecret.mutate({
      projectId,
      key: sanitizedKey,
      value: trimmedValue,
    });
  };

  const getStatusBadge = () => {
    if (statusLoading) {
      return <Badge variant="outline"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Checking...</Badge>;
    }
    if (!sandboxStatus?.isRunning) {
      return <Badge variant="secondary"><CloudOff className="h-3 w-3 mr-1" /> Inactive</Badge>;
    }
    return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Running</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Cloud Sandbox Toggle */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Cloud Sandbox
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Execute code in an isolated E2B cloud environment
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Switch
                checked={cloudEnabled}
                onCheckedChange={handleToggleCloud}
                disabled={toggleCloudSandbox.isPending}
              />
            </div>
          </div>
        </CardHeader>
        
        {cloudEnabled && (
          <CardContent className="space-y-4">
            {/* Repository Info */}
            {repoOwner && repoName ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Terminal className="h-4 w-4" />
                Repository: {repoOwner}/{repoName}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-yellow-500">
                <AlertCircle className="h-4 w-4" />
                No repository connected. Connect a GitHub repo to enable full functionality.
              </div>
            )}

            {/* Sandbox Controls */}
            <div className="flex items-center gap-2">
              {!sandboxStatus?.isRunning ? (
                <Button
                  onClick={() => startSandbox.mutate({ projectId })}
                  disabled={startSandbox.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {startSandbox.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start Sandbox
                </Button>
              ) : (
                <Button
                  onClick={() => stopSandbox.mutate({ projectId })}
                  disabled={stopSandbox.isPending}
                  variant="destructive"
                >
                  {stopSandbox.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Stop Sandbox
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetchStatus()}
                disabled={statusLoading}
              >
                <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Sandbox Info */}
            {sandboxStatus?.isRunning && sandboxStatus.isHealthy && (
              <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">Status:</span>
                  <Badge variant="outline" className="text-xs">
                    {sandboxStatus.isHealthy ? 'Healthy' : 'Degraded'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Secrets Management */}
      {cloudEnabled && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Key className="h-5 w-5" />
              Environment Secrets
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Securely store API keys and secrets for your cloud sandbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Secrets */}
            {secretsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading secrets...
              </div>
            ) : secrets && secrets.length > 0 ? (
              <div className="space-y-2">
                {secrets.map((secret: { id: number; key: string }) => (
                  <div
                    key={secret.id}
                    className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2"
                  >
                    <code className="text-sm font-mono">{secret.key}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteSecret.mutate({ key: secret.key, projectId })}
                      disabled={deleteSecret.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No secrets configured yet.</p>
            )}

            {/* Add New Secret */}
            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm font-medium">Add New Secret</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="KEY_NAME"
                  value={newSecretKey}
                  onChange={(e) => setNewSecretKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  className="font-mono"
                />
                <Input
                  type="password"
                  placeholder="Secret value"
                  value={newSecretValue}
                  onChange={(e) => setNewSecretValue(e.target.value)}
                />
                <Button
                  onClick={handleAddSecret}
                  disabled={addSecret.isPending || !newSecretKey || !newSecretValue}
                >
                  {addSecret.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
