/**
 * Indexing Status Component
 * 
 * Displays the current status of codebase indexing for a project.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  Database, 
  FileCode, 
  Zap, 
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react";

interface IndexingStatusProps {
  projectId: number;
  rootPath?: string;
}

export function IndexingStatus({ projectId, rootPath }: IndexingStatusProps) {
  const [isIndexing, setIsIndexing] = useState(false);
  
  const { data: status, refetch, isLoading } = trpc.context.getStatus.useQuery(
    { projectId },
    { refetchInterval: isIndexing ? 2000 : false }
  );
  
  const startIndexing = trpc.context.startIndexing.useMutation({
    onMutate: () => setIsIndexing(true),
    onSuccess: () => {
      setIsIndexing(false);
      refetch();
    },
    onError: () => setIsIndexing(false),
  });
  
  const clearIndex = trpc.context.clearIndex.useMutation({
    onSuccess: () => refetch(),
  });
  
  const handleStartIndexing = () => {
    if (!rootPath) return;
    startIndexing.mutate({ projectId, rootPath });
  };
  
  const handleClearIndex = () => {
    if (confirm("Are you sure you want to clear all indexed data?")) {
      clearIndex.mutate({ projectId });
    }
  };
  
  const getStatusBadge = () => {
    switch (status?.status) {
      case "indexing":
        return <Badge variant="default" className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Indexing</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Indexed</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Not Indexed</Badge>;
    }
  };
  
  const progress = status?.totalFiles 
    ? Math.round((status.indexedFiles / status.totalFiles) * 100) 
    : 0;
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5" />
              Context Engine
            </CardTitle>
            <CardDescription>Codebase indexing for AI context</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        {status?.status === "indexing" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Indexing files...</span>
              <span>{status.indexedFiles} / {status.totalFiles}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {/* Stats */}
        {(status?.totalChunks ?? 0) > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <FileCode className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Files:</span>
              <span className="font-medium">{status?.indexedFiles}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Chunks:</span>
              <span className="font-medium">{status?.totalChunks}</span>
            </div>
          </div>
        )}
        
        {/* Chunk breakdown */}
        {status?.chunksByType && Object.keys(status.chunksByType).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(status.chunksByType).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-xs">
                {type}: {count}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Last indexed */}
        {status?.lastFullIndexAt && (
          <p className="text-xs text-muted-foreground">
            Last indexed: {new Date(status.lastFullIndexAt).toLocaleString()}
          </p>
        )}
        
        {/* Error message */}
        {status?.lastError && (
          <div className="p-2 bg-destructive/10 rounded text-sm text-destructive">
            {status.lastError}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleStartIndexing}
            disabled={isIndexing || !rootPath}
            size="sm"
            className="flex-1"
          >
            {isIndexing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Indexing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {(status?.totalChunks ?? 0) > 0 ? "Re-index" : "Start Indexing"}
              </>
            )}
          </Button>
          
          {(status?.totalChunks ?? 0) > 0 && (
            <Button 
              onClick={handleClearIndex}
              variant="outline"
              size="sm"
              disabled={isIndexing}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {!rootPath && (
          <p className="text-xs text-muted-foreground text-center">
            Select a project to enable indexing
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact indexing status for sidebar/header
 */
export function IndexingStatusBadge({ projectId }: { projectId: number }) {
  const { data: status } = trpc.context.getStatus.useQuery({ projectId });
  
  if (!status || status.status === "idle") {
    return null;
  }
  
  if (status.status === "indexing") {
    return (
      <Badge variant="default" className="bg-blue-500 text-xs">
        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        Indexing
      </Badge>
    );
  }
  
  if (status.status === "completed" && (status.totalChunks ?? 0) > 0) {
    return (
      <Badge variant="outline" className="text-xs">
        <Database className="w-3 h-3 mr-1" />
        {status.totalChunks ?? 0} chunks
      </Badge>
    );
  }
  
  return null;
}
