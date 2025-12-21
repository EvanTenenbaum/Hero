import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  Star,
  GitFork,
  Lock,
  Globe,
  Search,
  FolderGit2,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  owner: string;
  ownerAvatar: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface RepositoryBrowserProps {
  onSelectRepository?: (repo: Repository) => void;
  selectedRepoId?: number;
}

// Transform GitHub API response to our Repository interface
function transformRepo(repo: GitHubRepo): Repository {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    private: repo.private,
    htmlUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    defaultBranch: repo.default_branch,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    updatedAt: repo.updated_at,
    owner: repo.owner.login,
    ownerAvatar: repo.owner.avatar_url,
  };
}

export function RepositoryBrowser({ onSelectRepository, selectedRepoId }: RepositoryBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data: connectionData, isLoading: connectionLoading } = trpc.github.getConnection.useQuery();
  const connection = connectionData?.connected ? connectionData : null;
  
  const { data: reposData, isLoading: reposLoading, refetch } = trpc.github.listRepos.useQuery(
    { page, perPage: 30, sort: "updated" },
    { enabled: !!connection }
  );

  const { data: searchData, isLoading: searchLoading } = trpc.github.searchRepos.useQuery(
    { query: `user:${connection?.username} ${searchQuery}`, page: 1 },
    { enabled: !!connection && searchQuery.length > 2 }
  );

  const repositories: Repository[] = useMemo(() => {
    if (searchQuery.length > 2 && searchData?.items) {
      return searchData.items.map(transformRepo);
    }
    if (reposData) {
      return reposData.map(transformRepo);
    }
    return [];
  }, [searchQuery, searchData, reposData]);

  const isLoading = connectionLoading || reposLoading || (searchQuery.length > 2 && searchLoading);

  if (connectionLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!connection) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FolderGit2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Connect GitHub</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-sm">
            Connect your GitHub account to browse repositories, view files, and make changes directly from Hero IDE.
          </p>
          <Button variant="outline" disabled>
            <GitBranch className="w-4 h-4 mr-2" />
            GitHub OAuth Coming Soon
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={`https://github.com/${connection.username}.png`}
            alt={connection.username || "GitHub User"}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <div className="font-medium">{connection.username}</div>
            <div className="text-xs text-muted-foreground">Connected</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Repository List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : repositories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No repositories found" : "No repositories available"}
            </div>
          ) : (
            repositories.map((repo: Repository) => (
              <Card
                key={repo.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedRepoId === repo.id ? "border-primary bg-accent/30" : ""
                }`}
                onClick={() => onSelectRepository?.(repo)}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium truncate">
                          {repo.name}
                        </CardTitle>
                        {repo.private ? (
                          <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      {repo.description && (
                        <CardDescription className="text-xs mt-1 line-clamp-2">
                          {repo.description}
                        </CardDescription>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-4 pt-0">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {repo.language}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {repo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3" />
                      {repo.forks}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {repo.defaultBranch}
                    </span>
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-auto hover:text-foreground"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {!searchQuery && reposData && reposData.length >= 30 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default RepositoryBrowser;
