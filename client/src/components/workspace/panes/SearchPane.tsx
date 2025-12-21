import { useState } from "react";
import { CodeSearch } from "@/components/context/CodeSearch";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SearchPaneProps {
  searchQuery?: string;
  onQueryChange?: (query: string) => void;
}

export default function SearchPane({ searchQuery, onQueryChange }: SearchPaneProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  // Fetch projects to select from
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Code Search</h3>
          <p className="text-sm text-muted-foreground">
            Choose a project to search its codebase
          </p>
          <div className="w-64">
            <Select onValueChange={(value) => setSelectedProjectId(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project: { id: number; name: string }) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Project:</Label>
        <Select 
          value={String(selectedProjectId)} 
          onValueChange={(value) => setSelectedProjectId(Number(value))}
        >
          <SelectTrigger className="h-7 w-48 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projects?.map((project: { id: number; name: string }) => (
              <SelectItem key={project.id} value={String(project.id)}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-[calc(100%-40px)] overflow-auto p-4">
        <CodeSearch projectId={selectedProjectId} />
      </div>
    </div>
  );
}
