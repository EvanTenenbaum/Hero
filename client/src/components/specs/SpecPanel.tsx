/**
 * Spec Panel Component
 * Sprint 3: Prompt-to-Plan Workflow
 * 
 * Displays and manages feature specifications with EARS format requirements.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  FileText, 
  Sparkles, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Edit,
  Trash2,
  Link,
  MessageSquare,
  History
} from "lucide-react";

interface SpecPanelProps {
  projectId: number;
}

type SpecStatus = "draft" | "review" | "approved" | "implemented" | "archived";
type SpecPriority = "critical" | "high" | "medium" | "low";

const statusColors: Record<SpecStatus, string> = {
  draft: "bg-gray-500",
  review: "bg-yellow-500",
  approved: "bg-blue-500",
  implemented: "bg-green-500",
  archived: "bg-gray-400"
};

const priorityColors: Record<SpecPriority, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-gray-500"
};

export function SpecPanel({ projectId }: SpecPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SpecStatus | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedSpecId, setSelectedSpecId] = useState<number | null>(null);
  
  // Form state for creating specs
  const [newSpecTitle, setNewSpecTitle] = useState("");
  const [newSpecOverview, setNewSpecOverview] = useState("");
  const [generatePrompt, setGeneratePrompt] = useState("");
  
  const utils = trpc.useUtils();
  
  // Fetch specs
  const { data: specsData, isLoading } = trpc.specs.list.useQuery({
    projectId,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: searchQuery || undefined,
    limit: 50
  });
  
  // Create spec mutation
  const createSpec = trpc.specs.create.useMutation({
    onSuccess: () => {
      utils.specs.list.invalidate();
      setIsCreateOpen(false);
      setNewSpecTitle("");
      setNewSpecOverview("");
    }
  });
  
  // Generate spec from prompt
  const generateSpec = trpc.specs.generateFromPrompt.useMutation({
    onSuccess: (data) => {
      if (data.saved && 'specId' in data && data.specId) {
        utils.specs.list.invalidate();
        setSelectedSpecId(data.specId);
      }
      setIsGenerateOpen(false);
      setGeneratePrompt("");
    }
  });
  
  // Delete spec mutation
  const deleteSpec = trpc.specs.delete.useMutation({
    onSuccess: () => {
      utils.specs.list.invalidate();
      setSelectedSpecId(null);
    }
  });
  
  const handleCreateSpec = () => {
    if (!newSpecTitle.trim()) return;
    createSpec.mutate({
      projectId,
      title: newSpecTitle,
      overview: newSpecOverview || undefined
    });
  };
  
  const handleGenerateSpec = () => {
    if (!generatePrompt.trim()) return;
    generateSpec.mutate({
      projectId,
      prompt: generatePrompt,
      autoSave: true
    });
  };
  
  return (
    <div className="flex h-full">
      {/* Spec List */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Specifications</h2>
            <div className="flex gap-1">
              <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Spec from Prompt</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Textarea
                      placeholder="Describe the feature you want to build..."
                      value={generatePrompt}
                      onChange={(e) => setGeneratePrompt(e.target.value)}
                      rows={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      The AI will generate EARS-format requirements, acceptance criteria, and technical considerations.
                    </p>
                    <Button 
                      onClick={handleGenerateSpec} 
                      disabled={!generatePrompt.trim() || generateSpec.isPending}
                      className="w-full"
                    >
                      {generateSpec.isPending ? "Generating..." : "Generate Spec"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Spec</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="Spec title"
                      value={newSpecTitle}
                      onChange={(e) => setNewSpecTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="Overview (optional)"
                      value={newSpecOverview}
                      onChange={(e) => setNewSpecOverview(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      onClick={handleCreateSpec} 
                      disabled={!newSpecTitle.trim() || createSpec.isPending}
                      className="w-full"
                    >
                      Create Spec
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search specs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SpecStatus | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="implemented">Implemented</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : specsData?.specs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No specs found</p>
                <p className="text-sm">Create one or generate from a prompt</p>
              </div>
            ) : (
              specsData?.specs.map((spec) => (
                <Card 
                  key={spec.id}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedSpecId === spec.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedSpecId(spec.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{spec.title}</h3>
                        {spec.overview && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {spec.overview}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`${statusColors[spec.status as SpecStatus]} text-foreground text-xs`}>
                        {spec.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {spec.priority}
                      </Badge>
                      {spec.completionPercentage !== null && spec.completionPercentage > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {spec.completionPercentage}%
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
        
        {specsData && (
          <div className="p-2 border-t border-border text-xs text-muted-foreground text-center">
            {specsData.total} spec{specsData.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>
      
      {/* Spec Detail */}
      <div className="flex-1">
        {selectedSpecId ? (
          <SpecDetail 
            specId={selectedSpecId} 
            onDelete={() => deleteSpec.mutate({ id: selectedSpecId })}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a spec to view details</p>
              <p className="text-sm mt-1">Or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SpecDetailProps {
  specId: number;
  onDelete: () => void;
}

function SpecDetail({ specId, onDelete }: SpecDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: spec, isLoading } = trpc.specs.getById.useQuery({ id: specId });
  const { data: markdown } = trpc.specs.getAsMarkdown.useQuery({ id: specId });
  const { data: versions } = trpc.specs.getVersionHistory.useQuery({ specId });
  const { data: linkedCards } = trpc.specs.getLinkedCards.useQuery({ specId });
  const { data: comments } = trpc.specs.getComments.useQuery({ specId });
  
  const utils = trpc.useUtils();
  
  const updateSpec = trpc.specs.update.useMutation({
    onSuccess: () => {
      utils.specs.getById.invalidate({ id: specId });
      utils.specs.list.invalidate();
    }
  });
  
  if (isLoading || !spec) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }
  
  const requirements = (spec.requirements as any[]) || [];
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{spec.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`${statusColors[spec.status as SpecStatus]} text-foreground`}>
                {spec.status}
              </Badge>
              <Badge variant="outline">{spec.priority}</Badge>
              <span className="text-sm text-muted-foreground">
                v{spec.currentVersion}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Select 
              value={spec.status} 
              onValueChange={(v) => updateSpec.mutate({ id: specId, status: v as SpecStatus })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="implemented">Implemented</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 justify-start">
          <TabsTrigger value="overview" className="gap-1">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="requirements" className="gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Requirements ({requirements.length})
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1">
            <Link className="h-4 w-4" />
            Links ({linkedCards?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            Comments ({comments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <History className="h-4 w-4" />
            History ({versions?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1 p-4">
          <TabsContent value="overview" className="mt-0">
            <div className="space-y-6">
              {spec.overview && (
                <div>
                  <h3 className="font-medium mb-2">Overview</h3>
                  <p className="text-muted-foreground">{spec.overview}</p>
                </div>
              )}
              
              {spec.technicalDesign && (
                <div>
                  <h3 className="font-medium mb-2">Technical Design</h3>
                  <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                    {spec.technicalDesign}
                  </pre>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Estimated</span>
                    </div>
                    <p className="text-2xl font-semibold mt-1">
                      {spec.estimatedHours || "-"} hrs
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Progress</span>
                    </div>
                    <p className="text-2xl font-semibold mt-1">
                      {spec.completionPercentage || 0}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="requirements" className="mt-0">
            <div className="space-y-4">
              {requirements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No requirements defined</p>
                </div>
              ) : (
                requirements.map((req: any, index: number) => (
                  <Card key={req.id || index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-mono">{req.id}</CardTitle>
                        <Badge variant="outline">{req.type.replace("_", " ")}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{req.text}</p>
                      {req.rationale && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          Rationale: {req.rationale}
                        </p>
                      )}
                      {req.acceptanceCriteria && req.acceptanceCriteria.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-1">Acceptance Criteria:</p>
                          <ul className="text-sm space-y-1">
                            {req.acceptanceCriteria.map((ac: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <input type="checkbox" className="mt-1" />
                                <span>{ac}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="links" className="mt-0">
            <div className="space-y-4">
              {linkedCards?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No linked cards</p>
                  <p className="text-sm">Link this spec to Kanban cards to track implementation</p>
                </div>
              ) : (
                linkedCards?.map((link) => (
                  <Card key={link.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <span>Card #{link.cardId}</span>
                      <Badge variant="outline">{link.linkType}</Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="comments" className="mt-0">
            <div className="space-y-4">
              {comments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet</p>
                </div>
              ) : (
                comments?.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <p>{comment.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="mt-0">
            <div className="space-y-4">
              {versions?.map((version) => (
                <Card key={version.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Version {version.version}</p>
                      <p className="text-sm text-muted-foreground">{version.changeSummary}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{version.changeType}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default SpecPanel;
