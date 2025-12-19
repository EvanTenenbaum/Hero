import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FolderGit2, GitBranch, Settings, FileCode, Bot, Shield, Loader2 } from "lucide-react";
import { Link, useParams } from "wouter";

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");

  const { data: project, isLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-medium text-white mb-2">Project not found</h3>
              <Link href="/projects">
                <Button variant="outline" className="border-slate-700 mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
            <FolderGit2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {project.description && (
              <p className="text-slate-400 text-sm">{project.description}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="files" className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="files" className="data-[state=active]:bg-violet-600">
              <FileCode className="h-4 w-4 mr-2" /> Files
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-violet-600">
              <Bot className="h-4 w-4 mr-2" /> Agents
            </TabsTrigger>
            <TabsTrigger value="governance" className="data-[state=active]:bg-violet-600">
              <Shield className="h-4 w-4 mr-2" /> Governance
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-violet-600">
              <Settings className="h-4 w-4 mr-2" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Project Files</CardTitle>
                <CardDescription className="text-slate-400">
                  Browse and edit files in your project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {project.githubRepoFullName ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <GitBranch className="h-4 w-4" />
                    Connected to {project.githubRepoFullName}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Connect a GitHub repository to browse files, or create files locally.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Project Agents</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure AI agents to work on this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm">
                  No agents configured for this project yet. Go to the Agents page to create one.
                </p>
                <Link href="/agents">
                  <Button className="mt-4 bg-violet-600 hover:bg-violet-700">
                    <Bot className="h-4 w-4 mr-2" /> Configure Agents
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="governance">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Governance & Change Requests</CardTitle>
                <CardDescription className="text-slate-400">
                  Track changes with the 8-step approval workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm">
                  No change requests for this project yet. Changes made by agents will appear here for review.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Project Settings</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure project-specific settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300">Project Type</label>
                  <p className="text-slate-400 text-sm">{project.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">Status</label>
                  <p className="text-slate-400 text-sm capitalize">{project.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">Created</label>
                  <p className="text-slate-400 text-sm">{new Date(project.createdAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
