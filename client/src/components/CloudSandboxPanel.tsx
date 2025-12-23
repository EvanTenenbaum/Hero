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
  const { data: secrets, isLoading: secretsLoading, refetch: refetchSecrets } = 
    trpc.secretsRouter.list.useQuery(
      { projectId },
      { enabled: cloudEnabled }
    );

  // Mutations
  const startSandbox = trpc.cloudSandbox.start.useMutation({
    onSuccess: () => {
      toast.success('Cloud sandbox started');
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Failed to start sandbox: ${error.message}`);
    },
  });

  const stopSandbox = trpc.cloudSandbox.stop.useMutation({
    onSuccess: () => {
      toast.success('Cloud sandbox stopped');
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Failed to stop sandbox: ${error.message}`);
    },
  });

  const addSecret = trpc.secretsRouter.create.useMutation({
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

  const deleteSecret = trpc.secretsRouter.delete.useMutation({
    onSuccess: () => {
      toast.success('Secret deleted');
      refetchSecrets();
    },
    onError: (error) => {
      toast.error(`Failed to delete secret: ${error.message}`);
    },
  });

  const toggleCloudSandbox = trpc.projects.update.useMutation({
    onSuccess: () => {
      setCloudEnabled(!cloudEnabled);
      toast.success(cloudEnabled ? 'Cloud sandbox disabled' : 'Cloud sandbox enabled');
    },
    onError: (error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });

  const handleToggleCloud = () => {
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
    
    // Validate key format
    const sanitizedKey = trimmedKey.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    if (sanitizedKey.length === 0) {
      toast.error('Secret key must contain at least one alphanumeric character');
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
    if (!sandboxStatus?.active) {
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
              {!sandboxStatus?.active ? (
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
            {sandboxStatus?.active && sandboxStatus.sandboxId && (
              <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">Sandbox ID:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {sandboxStatus.sandboxId}
                  </code>
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
                {secrets.map((secret) => (
                  <div
                    key={secret.id}
                    className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2"
                  >
                    <code className="text-sm font-mono">{secret.key}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteSecret.mutate({ id: secret.id, projectId })}
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
