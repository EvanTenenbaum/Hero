/**
 * PR Detail Panel - Sprint 31
 * 
 * Full PR detail view with diff viewer, comments, and review actions.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  GitPullRequest,
  GitMerge,
  MessageSquare,
  FileCode,
  Check,
  X,
  AlertCircle,
  Loader2,
  Send,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface PRDetailPanelProps {
  owner: string;
  repo: string;
  pullNumber: number;
  onClose?: () => void;
}

export function PRDetailPanel({
  owner,
  repo,
  pullNumber,
  onClose,
}: PRDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newComment, setNewComment] = useState("");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Fetch PR details
  const { data: pr, isLoading: prLoading } = trpc.github.getPullRequest.useQuery({
    owner,
    repo,
    pullNumber,
  });

  // Fetch PR files
  const { data: files, isLoading: filesLoading } = trpc.github.getPRFiles.useQuery({
    owner,
    repo,
    pullNumber,
  });

  // Fetch PR diff
  const { data: diffData, isLoading: diffLoading } = trpc.github.getPRDiff.useQuery({
    owner,
    repo,
    pullNumber,
  });

  // Fetch PR comments
  const { data: comments, refetch: refetchComments } = trpc.github.listPRComments.useQuery({
    owner,
    repo,
    pullNumber,
  });

  // Fetch PR reviews
  const { data: reviews } = trpc.github.listPRReviews.useQuery({
    owner,
    repo,
    pullNumber,
  });

  // Check mergeability
  const { data: mergeability } = trpc.github.checkMergeability.useQuery({
    owner,
    repo,
    pullNumber,
  });

  // Mutations
  const commentMutation = trpc.github.createPRComment.useMutation({
    onSuccess: () => {
      setNewComment("");
      refetchComments();
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });

  const reviewMutation = trpc.github.createPRReview.useMutation({
    onSuccess: () => {
      toast.success("Review submitted");
    },
    onError: (error) => {
      toast.error(`Failed to submit review: ${error.message}`);
    },
  });

  const mergeMutation = trpc.github.mergePR.useMutation({
    onSuccess: () => {
      toast.success("PR merged successfully");
    },
    onError: (error) => {
      toast.error(`Failed to merge: ${error.message}`);
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate({
      owner,
      repo,
      pullNumber,
      body: newComment,
    });
  };

  const handleReview = (event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT") => {
    reviewMutation.mutate({
      owner,
      repo,
      pullNumber,
      event,
      body: event === "APPROVE" ? "LGTM!" : undefined,
    });
  };

  const handleMerge = (method: "merge" | "squash" | "rebase") => {
    mergeMutation.mutate({
      owner,
      repo,
      pullNumber,
      mergeMethod: method,
    });
  };

  const toggleFileExpand = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case "open":
        return <Badge className="bg-green-500">Open</Badge>;
      case "closed":
        return <Badge variant="destructive">Closed</Badge>;
      case "merged":
        return <Badge className="bg-purple-500">Merged</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  if (prLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="text-center text-muted-foreground p-8">
        PR not found
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <GitPullRequest className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold truncate">{pr.title}</h2>
              <span className="text-muted-foreground">#{pullNumber}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {getStatusBadge(pr.state)}
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {pr.user?.login}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(pr.html_url, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              GitHub
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Branch info */}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Badge variant="outline">{pr.head?.ref}</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline">{pr.base?.ref}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">
            Files ({files?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="diff">Diff</TabsTrigger>
          <TabsTrigger value="comments">
            Comments ({comments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          {/* Overview Tab */}
          <TabsContent value="overview" className="h-full m-0 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {/* Description */}
                {pr.body && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{pr.body}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Mergeability */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Merge Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mergeability?.mergeable ? (
                      <div className="flex items-center gap-2 text-green-500">
                        <Check className="h-4 w-4" />
                        <span>Ready to merge</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-500">
                        <AlertCircle className="h-4 w-4" />
                        <span>Cannot be merged automatically</span>
                      </div>
                    )}

                    {pr.state === "open" && mergeability?.mergeable && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleMerge("squash")}
                          disabled={mergeMutation.isPending}
                        >
                          <GitMerge className="h-3 w-3 mr-1" />
                          Squash & Merge
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMerge("merge")}
                          disabled={mergeMutation.isPending}
                        >
                          Merge
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMerge("rebase")}
                          disabled={mergeMutation.isPending}
                        >
                          Rebase
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reviews */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reviews && reviews.length > 0 ? (
                      <div className="space-y-2">
                        {reviews.map((review: any) => (
                          <div
                            key={review.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <User className="h-4 w-4" />
                            <span>{review.user?.login}</span>
                            <Badge
                              variant={
                                review.state === "APPROVED"
                                  ? "default"
                                  : review.state === "CHANGES_REQUESTED"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {review.state}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No reviews yet</p>
                    )}

                    {pr.state === "open" && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleReview("APPROVE")}
                          disabled={reviewMutation.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview("REQUEST_CHANGES")}
                          disabled={reviewMutation.isPending}
                        >
                          Request Changes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="h-full m-0 p-4">
            <ScrollArea className="h-full">
              {filesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {files?.map((file: any) => (
                    <div
                      key={file.filename}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFileExpand(file.filename)}
                        className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 text-left"
                      >
                        {expandedFiles.has(file.filename) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <FileCode className="h-4 w-4" />
                        <span className="flex-1 truncate text-sm font-mono">
                          {file.filename}
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-500">+{file.additions}</span>
                          <span className="text-red-500">-{file.deletions}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {file.status}
                        </Badge>
                      </button>
                      {expandedFiles.has(file.filename) && file.patch && (
                        <div className="border-t bg-muted/30 p-2 overflow-x-auto">
                          <pre className="text-xs font-mono whitespace-pre">
                            {file.patch}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Diff Tab */}
          <TabsContent value="diff" className="h-full m-0 p-4">
            <ScrollArea className="h-full">
              {diffLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-4 rounded-lg">
                  {diffData?.diff || "No diff available"}
                </pre>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="h-full m-0 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              {comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <Card key={comment.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium text-sm">
                            {comment.user?.login}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet</p>
                </div>
              )}
            </ScrollArea>

            {/* Add comment */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || commentMutation.isPending}
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Comment
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
