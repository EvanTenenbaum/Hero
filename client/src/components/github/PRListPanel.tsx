/**
 * PRListPanel - Sprint 29
 * 
 * Panel for listing and viewing pull requests from a GitHub repository.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitPullRequest,
  GitMerge,
  XCircle,
  MessageSquare,
  Clock,
  User,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PRListPanelProps {
  owner: string;
  repo: string;
  onSelectPR?: (prNumber: number) => void;
}

// Use the type from tRPC response
type PullRequest = {
  number: number;
  title: string;
  state: "open" | "closed";
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  draft?: boolean;
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
  comments?: number;
  review_comments?: number;
};

export function PRListPanel({ owner, repo, onSelectPR }: PRListPanelProps) {
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");

  // Fetch pull requests
  const { data: pullRequests, isLoading, refetch } = trpc.github.listPullRequests.useQuery(
    { owner, repo, state: filter },
    { enabled: !!owner && !!repo }
  );

  const getStateIcon = (pr: PullRequest) => {
    if (pr.merged_at) {
      return <GitMerge className="h-4 w-4 text-purple-500" />;
    }
    if (pr.state === "closed") {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <GitPullRequest className="h-4 w-4 text-green-500" />;
  };

  const getStateBadge = (pr: PullRequest) => {
    if (pr.merged_at) {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700">Merged</Badge>;
    }
    if (pr.state === "closed") {
      return <Badge variant="secondary" className="bg-red-100 text-red-700">Closed</Badge>;
    }
    if (pr.draft) {
      return <Badge variant="outline">Draft</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-700">Open</Badge>;
  };

  if (!owner || !repo) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Select a repository to view pull requests</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-5 w-5" />
          <h3 className="font-medium">Pull Requests</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`https://github.com/${owner}/${repo}/pulls`, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            GitHub
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="px-4 pt-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* PR list */}
      <ScrollArea className="flex-1 px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : !pullRequests || pullRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitPullRequest className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No pull requests found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(pullRequests as PullRequest[]).map((pr) => (
              <button
                key={pr.number}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                onClick={() => onSelectPR?.(pr.number)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getStateIcon(pr)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{pr.title}</span>
                      {getStateBadge(pr)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="font-mono">#{pr.number}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {pr.user.login}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true })}
                      </span>
                      {((pr.comments || 0) + (pr.review_comments || 0)) > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {(pr.comments || 0) + (pr.review_comments || 0)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-1 rounded">{pr.head.ref}</span>
                      <ChevronRight className="h-3 w-3" />
                      <span className="font-mono bg-muted px-1 rounded">{pr.base.ref}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
