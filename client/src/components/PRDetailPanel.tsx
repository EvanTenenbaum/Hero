/**
 * PR Detail Panel - Sprint 20
 * 
 * Comprehensive pull request viewer with diff, comments, reviews,
 * and merge controls.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  GitPullRequest,
  GitMerge,
  MessageSquare,
  FileCode,
  CheckCircle,
  XCircle,
  Clock,
  User,
  GitCommit,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PRDetailPanelProps {
  owner: string;
  repo: string;
  pullNumber: number;
  onClose?: () => void;
}

export function PRDetailPanel({ owner, repo, pullNumber, onClose }: PRDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("files");
  const [commentText, setCommentText] = useState("");
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">("merge");
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // Queries
  const { data: pr, isLoading: prLoading } = trpc.github.getPullRequest.useQuery({
    owner,
    repo,
    pullNumber,
  });

  const { data: files, isLoading: filesLoading } = trpc.github.getPRFiles.useQuery({
    owner,
    repo,
    pullNumber,
  });

  const { data: comments, isLoading: commentsLoading } = trpc.github.listPRComments.useQuery({
    owner,
    repo,
    pullNumber,
  });

  const { data: reviews } = trpc.github.listPRReviews.useQuery({
    owner,
    repo,
    pullNumber,
  });

  const { data: commits } = trpc.github.listPRCommits.useQuery({
    owner,
    repo,
    pullNumber,
  });

  const { data: mergeability } = trpc.github.checkMergeability.useQuery({
    owner,
    repo,
    pullNumber,
  });

  // Mutations
  const utils = trpc.useUtils();

  const createComment = trpc.github.createPRComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.github.listPRComments.invalidate({ owner, repo, pullNumber });
    },
  });

  const mergePR = trpc.github.mergePR.useMutation({
    onSuccess: () => {
      setShowMergeDialog(false);
      utils.github.getPullRequest.invalidate({ owner, repo, pullNumber });
      utils.github.checkMergeability.invalidate({ owner, repo, pullNumber });
    },
  });

  const createReview = trpc.github.createPRReview.useMutation({
    onSuccess: () => {
      utils.github.listPRReviews.invalidate({ owner, repo, pullNumber });
    },
  });

  if (prLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!pr) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Pull request not found</p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    createComment.mutate({
      owner,
      repo,
      pullNumber,
      body: commentText,
    });
  };

  const handleMerge = () => {
    mergePR.mutate({
      owner,
      repo,
      pullNumber,
      mergeMethod,
    });
  };

  const handleApprove = () => {
    createReview.mutate({
      owner,
      repo,
      pullNumber,
      event: "APPROVE",
      body: "Looks good to me!",
    });
  };

  const handleRequestChanges = () => {
    createReview.mutate({
      owner,
      repo,
      pullNumber,
      event: "REQUEST_CHANGES",
      body: "Please address the comments.",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" />
              <CardTitle className="text-lg">{pr.title}</CardTitle>
              <Badge variant={pr.state === "open" ? "default" : "secondary"}>
                {pr.state}
              </Badge>
              {pr.merged_at && (
                <Badge variant="outline" className="text-purple-500 border-purple-500">
                  <GitMerge className="h-3 w-3 mr-1" />
                  Merged
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              #{pullNumber} opened by {pr.user.login} · {pr.head.ref} → {pr.base.ref}
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Plus className="h-4 w-4 text-green-500" />
            {pr.additions}
          </span>
          <span className="flex items-center gap-1">
            <Minus className="h-4 w-4 text-red-500" />
            {pr.deletions}
          </span>
          <span className="flex items-center gap-1">
            <FileCode className="h-4 w-4" />
            {pr.changed_files} files
          </span>
        </div>

        {/* Merge Status */}
        {pr.state === "open" && mergeability && (
          <div className="mt-3">
            {mergeability.mergeable === true ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                This branch has no conflicts with the base branch
              </div>
            ) : mergeability.mergeable === false ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <XCircle className="h-4 w-4" />
                This branch has conflicts that must be resolved
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <Clock className="h-4 w-4" />
                Checking mergeability...
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="files">
              <FileCode className="h-4 w-4 mr-1" />
              Files ({files?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="commits">
              <GitCommit className="h-4 w-4 mr-1" />
              Commits ({commits?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-1" />
              Comments ({comments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <CheckCircle className="h-4 w-4 mr-1" />
              Reviews ({reviews?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-4">
            {filesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {files?.map((file) => (
                    <div
                      key={file.filename}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{file.filename}</span>
                          <Badge variant="outline" className="text-xs">
                            {file.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-500">+{file.additions}</span>
                          <span className="text-red-500">-{file.deletions}</span>
                        </div>
                      </div>
                      {file.patch && (
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-h-48">
                          {file.patch.slice(0, 500)}
                          {file.patch.length > 500 && "..."}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Commits Tab */}
          <TabsContent value="commits" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {commits?.map((commit) => (
                  <div
                    key={commit.sha}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <GitCommit className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {commit.commit.message.split("\n")[0]}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="font-mono text-xs">{commit.sha.slice(0, 7)}</span>
                          <span>·</span>
                          <span>{commit.author?.login || commit.commit.author.name}</span>
                          <span>·</span>
                          <span>{new Date(commit.commit.author.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {commentsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : comments?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No comments yet
                  </p>
                ) : (
                  comments?.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{comment.user.login}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Leave a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || createComment.isPending}
              >
                {createComment.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Comment
              </Button>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {reviews?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No reviews yet
                  </p>
                ) : (
                  reviews?.map((review) => (
                    <div
                      key={review.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {review.state === "APPROVED" && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {review.state === "CHANGES_REQUESTED" && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {review.state === "COMMENTED" && (
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium">{review.user.login}</span>
                        <Badge variant="outline" className="text-xs">
                          {review.state.replace("_", " ")}
                        </Badge>
                      </div>
                      {review.body && (
                        <p className="text-sm whitespace-pre-wrap">{review.body}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            {/* Review Actions */}
            {pr.state === "open" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleApprove}
                  disabled={createReview.isPending}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRequestChanges}
                  disabled={createReview.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Request Changes
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Merge Section */}
        {pr.state === "open" && !pr.merged_at && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select
                  value={mergeMethod}
                  onValueChange={(v) => setMergeMethod(v as typeof mergeMethod)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">Create merge commit</SelectItem>
                    <SelectItem value="squash">Squash and merge</SelectItem>
                    <SelectItem value="rebase">Rebase and merge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
                <DialogTrigger asChild>
                  <Button
                    disabled={mergeability?.mergeable === false}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <GitMerge className="h-4 w-4 mr-1" />
                    Merge Pull Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Merge Pull Request</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to merge this pull request using{" "}
                      <strong>{mergeMethod}</strong>?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleMerge}
                      disabled={mergePR.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {mergePR.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Confirm Merge
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PRDetailPanel;
