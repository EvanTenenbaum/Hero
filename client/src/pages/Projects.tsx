import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { KickoffWizard } from "@/components/KickoffWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FolderGit2, Plus, GitBranch, Clock, MoreVertical, Loader2, Sparkles, Rocket } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type CreateMode = "quick" | "kickoff";

export default function Projects() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode | null>(null);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [kickoffProjectId, setKickoffProjectId] = useState<number | null>(null);

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      if (createMode === "kickoff") {
        // After creating project, show kickoff wizard
        setKickoffProjectId(project.id);
        setIsCreateOpen(false);
      } else {
        // Quick create - just close and navigate
        toast.success("Project created successfully");
        setIsCreateOpen(false);
        setNewProject({ name: "", description: "" });
        setCreateMode(null);
        refetch();
        setLocation(`/projects/${project.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!newProject.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    createMutation.mutate(newProject);
  };

  const handleKickoffComplete = () => {
    toast.success("Project kickoff complete! Your spec documents have been generated.");
    setKickoffProjectId(null);
    setNewProject({ name: "", description: "" });
    setCreateMode(null);
    refetch();
    if (kickoffProjectId) {
      setLocation(`/projects/${kickoffProjectId}`);
    }
  };

  const handleKickoffSkip = () => {
    toast.info("Kickoff skipped. You can run it later from project settings.");
    setKickoffProjectId(null);
    setNewProject({ name: "", description: "" });
    setCreateMode(null);
    refetch();
    if (kickoffProjectId) {
      setLocation(`/projects/${kickoffProjectId}`);
    }
  };

  // Show kickoff wizard if we have a project ID
  if (kickoffProjectId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <KickoffWizard
            projectId={kickoffProjectId}
            onComplete={handleKickoffComplete}
            onSkip={handleKickoffSkip}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-serif">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your development projects</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setCreateMode(null);
              setNewProject({ name: "", description: "" });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className={createMode ? "max-w-md" : "max-w-lg"}>
              {!createMode ? (
                // Mode selection
                <>
                  <DialogHeader>
                    <DialogTitle className="font-serif">Create New Project</DialogTitle>
                    <DialogDescription>
                      Choose how you'd like to start your project.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Card 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setCreateMode("kickoff")}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">Guided Kickoff</CardTitle>
                            <CardDescription className="text-xs">
                              Recommended for new projects
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">
                          Walk through a 5-step wizard to define your project's vision, 
                          architecture, and quality standards. AI will generate spec documents 
                          to guide your agents.
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setCreateMode("quick")}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Rocket className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-base">Quick Start</CardTitle>
                            <CardDescription className="text-xs">
                              Jump right in
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">
                          Create a blank project and start coding immediately. 
                          You can run the kickoff wizard later from project settings.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                // Project details form
                <>
                  <DialogHeader>
                    <DialogTitle className="font-serif">
                      {createMode === "kickoff" ? "Project Details" : "Quick Start"}
                    </DialogTitle>
                    <DialogDescription>
                      {createMode === "kickoff" 
                        ? "Enter basic details, then we'll guide you through the kickoff process."
                        : "Create a new project to start developing with AI assistance."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input
                        id="name"
                        placeholder="my-awesome-project"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="A brief description of your project..."
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateMode(null)}>
                      Back
                    </Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : createMode === "kickoff" ? (
                        "Continue to Kickoff"
                      ) : (
                        "Create Project"
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary">
                        <FolderGit2 className="h-5 w-5" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="mt-3 text-lg">{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {project.githubRepoFullName && (
                        <div className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {project.githubDefaultBranch || "main"}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(project.lastActivityAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center mb-4">
                <FolderGit2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium font-serif mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-sm text-center mb-4">
                Create your first project to start developing with AI assistance.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
