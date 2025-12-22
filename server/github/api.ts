/**
 * GitHub API Service
 * Sprint 4: GitHub Integration
 * 
 * Provides repository operations using GitHub REST API.
 */

const GITHUB_API_BASE = "https://api.github.com";

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

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir" | "symlink" | "submodule";
  content?: string;
  encoding?: string;
  download_url: string | null;
  html_url: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

async function githubFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<T> {
  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3+json",
        ...options.headers,
      },
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`GitHub API request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List user's repositories
 */
export async function listRepositories(
  accessToken: string,
  options: {
    type?: "all" | "owner" | "public" | "private" | "member";
    sort?: "created" | "updated" | "pushed" | "full_name";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
  } = {}
): Promise<GitHubRepo[]> {
  const params = new URLSearchParams({
    type: options.type || "all",
    sort: options.sort || "updated",
    direction: options.direction || "desc",
    per_page: String(options.per_page || 30),
    page: String(options.page || 1),
  });

  return githubFetch<GitHubRepo[]>(`/user/repos?${params}`, accessToken);
}

/**
 * Get a specific repository
 */
export async function getRepository(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubRepo> {
  return githubFetch<GitHubRepo>(`/repos/${owner}/${repo}`, accessToken);
}

/**
 * List repository branches
 */
export async function listBranches(
  accessToken: string,
  owner: string,
  repo: string,
  options: { per_page?: number; page?: number } = {}
): Promise<GitHubBranch[]> {
  const params = new URLSearchParams({
    per_page: String(options.per_page || 30),
    page: String(options.page || 1),
  });

  return githubFetch<GitHubBranch[]>(
    `/repos/${owner}/${repo}/branches?${params}`,
    accessToken
  );
}

/**
 * Get repository contents (file tree)
 */
export async function getContents(
  accessToken: string,
  owner: string,
  repo: string,
  path: string = "",
  ref?: string
): Promise<GitHubContent | GitHubContent[]> {
  const params = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  return githubFetch<GitHubContent | GitHubContent[]>(
    `/repos/${owner}/${repo}/contents/${path}${params}`,
    accessToken
  );
}

/**
 * Get file content (decoded)
 */
export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<{ content: string; sha: string; size: number }> {
  const file = await getContents(accessToken, owner, repo, path, ref) as GitHubContent;
  
  if (file.type !== "file") {
    throw new Error(`Path ${path} is not a file`);
  }

  if (!file.content) {
    throw new Error(`File ${path} has no content`);
  }

  // Decode base64 content
  const content = Buffer.from(file.content, "base64").toString("utf-8");
  
  return {
    content,
    sha: file.sha,
    size: file.size,
  };
}

/**
 * List commits for a repository
 */
export async function listCommits(
  accessToken: string,
  owner: string,
  repo: string,
  options: {
    sha?: string;
    path?: string;
    per_page?: number;
    page?: number;
  } = {}
): Promise<GitHubCommit[]> {
  const params = new URLSearchParams({
    per_page: String(options.per_page || 30),
    page: String(options.page || 1),
  });
  
  if (options.sha) params.set("sha", options.sha);
  if (options.path) params.set("path", options.path);

  return githubFetch<GitHubCommit[]>(
    `/repos/${owner}/${repo}/commits?${params}`,
    accessToken
  );
}

/**
 * Get a specific commit
 */
export async function getCommit(
  accessToken: string,
  owner: string,
  repo: string,
  sha: string
): Promise<GitHubCommit & { files: Array<{ filename: string; status: string; additions: number; deletions: number }> }> {
  return githubFetch(
    `/repos/${owner}/${repo}/commits/${sha}`,
    accessToken
  );
}

/**
 * Search repositories
 */
export async function searchRepositories(
  accessToken: string,
  query: string,
  options: {
    sort?: "stars" | "forks" | "help-wanted-issues" | "updated";
    order?: "asc" | "desc";
    per_page?: number;
    page?: number;
  } = {}
): Promise<{ total_count: number; items: GitHubRepo[] }> {
  const params = new URLSearchParams({
    q: query,
    per_page: String(options.per_page || 30),
    page: String(options.page || 1),
  });
  
  if (options.sort) params.set("sort", options.sort);
  if (options.order) params.set("order", options.order);

  return githubFetch(
    `/search/repositories?${params}`,
    accessToken
  );
}

// Export types
export type { GitHubRepo, GitHubBranch, GitHubContent, GitHubCommit };


/**
 * Create or update a file in a repository
 */
export async function createOrUpdateFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
  branch?: string
): Promise<{ content: GitHubContent; commit: { sha: string; html_url: string } }> {
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
  };
  
  if (sha) body.sha = sha;
  if (branch) body.branch = branch;

  return githubFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    accessToken,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

/**
 * Delete a file from a repository
 */
export async function deleteFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  message: string,
  sha: string,
  branch?: string
): Promise<{ commit: { sha: string; html_url: string } }> {
  const body: Record<string, string> = {
    message,
    sha,
  };
  
  if (branch) body.branch = branch;

  return githubFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    accessToken,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  user: {
    login: string;
    avatar_url: string;
  };
}

/**
 * List pull requests for a repository
 */
export async function listPullRequests(
  accessToken: string,
  owner: string,
  repo: string,
  options: {
    state?: "open" | "closed" | "all";
    sort?: "created" | "updated" | "popularity" | "long-running";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
  } = {}
): Promise<GitHubPullRequest[]> {
  const params = new URLSearchParams({
    state: options.state || "open",
    sort: options.sort || "created",
    direction: options.direction || "desc",
    per_page: String(options.per_page || 30),
    page: String(options.page || 1),
  });

  return githubFetch<GitHubPullRequest[]>(
    `/repos/${owner}/${repo}/pulls?${params}`,
    accessToken
  );
}

/**
 * Get a specific pull request
 */
export async function getPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<GitHubPullRequest & { additions: number; deletions: number; changed_files: number }> {
  return githubFetch(
    `/repos/${owner}/${repo}/pulls/${pullNumber}`,
    accessToken
  );
}

/**
 * Create a pull request
 */
export async function createPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string
): Promise<GitHubPullRequest> {
  return githubFetch<GitHubPullRequest>(
    `/repos/${owner}/${repo}/pulls`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, head, base, body }),
    }
  );
}

/**
 * Create a new branch
 */
export async function createBranch(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string,
  sourceSha: string
): Promise<{ ref: string; object: { sha: string } }> {
  return githubFetch(
    `/repos/${owner}/${repo}/git/refs`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: sourceSha,
      }),
    }
  );
}

// Export additional types
export type { GitHubPullRequest };
