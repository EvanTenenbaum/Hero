/**
 * GitHub API Integration Module
 * Handles all GitHub API operations including OAuth, repository management, and file operations
 */

import axios from "axios";

const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
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

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  content?: string; // Base64 encoded for files
  encoding?: string;
  download_url?: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
}

/**
 * Create an authenticated GitHub API client
 */
function createGitHubClient(accessToken: string) {
  return axios.create({
    baseURL: GITHUB_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

/**
 * Get the authenticated user's profile
 */
export async function getAuthenticatedUser(accessToken: string): Promise<GitHubUser> {
  const client = createGitHubClient(accessToken);
  const response = await client.get<GitHubUser>("/user");
  return response.data;
}

/**
 * List repositories for the authenticated user
 */
export async function listUserRepositories(
  accessToken: string,
  options: {
    sort?: "created" | "updated" | "pushed" | "full_name";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
    type?: "all" | "owner" | "public" | "private" | "member";
  } = {}
): Promise<GitHubRepository[]> {
  const client = createGitHubClient(accessToken);
  const response = await client.get<GitHubRepository[]>("/user/repos", {
    params: {
      sort: options.sort || "updated",
      direction: options.direction || "desc",
      per_page: options.per_page || 30,
      page: options.page || 1,
      type: options.type || "all",
    },
  });
  return response.data;
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
): Promise<{ total_count: number; items: GitHubRepository[] }> {
  const client = createGitHubClient(accessToken);
  const response = await client.get<{ total_count: number; items: GitHubRepository[] }>(
    "/search/repositories",
    {
      params: {
        q: query,
        sort: options.sort || "updated",
        order: options.order || "desc",
        per_page: options.per_page || 30,
        page: options.page || 1,
      },
    }
  );
  return response.data;
}

/**
 * Get a specific repository
 */
export async function getRepository(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubRepository> {
  const client = createGitHubClient(accessToken);
  const response = await client.get<GitHubRepository>(`/repos/${owner}/${repo}`);
  return response.data;
}

/**
 * List branches for a repository
 */
export async function listBranches(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  const client = createGitHubClient(accessToken);
  const response = await client.get<GitHubBranch[]>(`/repos/${owner}/${repo}/branches`);
  return response.data;
}

/**
 * Get the file tree for a repository
 */
export async function getRepositoryTree(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string = "main",
  recursive: boolean = true
): Promise<GitHubTreeItem[]> {
  const client = createGitHubClient(accessToken);
  const response = await client.get<{ tree: GitHubTreeItem[] }>(
    `/repos/${owner}/${repo}/git/trees/${branch}`,
    {
      params: { recursive: recursive ? "1" : "0" },
    }
  );
  return response.data.tree;
}

/**
 * Get contents of a file or directory
 */
export async function getContents(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<GitHubFileContent | GitHubFileContent[]> {
  const client = createGitHubClient(accessToken);
  const response = await client.get<GitHubFileContent | GitHubFileContent[]>(
    `/repos/${owner}/${repo}/contents/${path}`,
    {
      params: ref ? { ref } : undefined,
    }
  );
  return response.data;
}

/**
 * Get file content decoded from base64
 */
export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<{ content: string; sha: string; size: number }> {
  const content = await getContents(accessToken, owner, repo, path, ref);
  
  if (Array.isArray(content)) {
    throw new Error("Path is a directory, not a file");
  }
  
  if (content.type !== "file" || !content.content) {
    throw new Error("Unable to get file content");
  }
  
  // Decode base64 content
  const decodedContent = Buffer.from(content.content, "base64").toString("utf-8");
  
  return {
    content: decodedContent,
    sha: content.sha,
    size: content.size,
  };
}

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
  sha?: string, // Required for updates
  branch?: string
): Promise<{ commit: GitHubCommit; content: GitHubFileContent }> {
  const client = createGitHubClient(accessToken);
  
  // Encode content to base64
  const encodedContent = Buffer.from(content, "utf-8").toString("base64");
  
  const response = await client.put<{ commit: GitHubCommit; content: GitHubFileContent }>(
    `/repos/${owner}/${repo}/contents/${path}`,
    {
      message,
      content: encodedContent,
      sha,
      branch,
    }
  );
  
  return response.data;
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
): Promise<{ commit: GitHubCommit }> {
  const client = createGitHubClient(accessToken);
  
  const response = await client.delete<{ commit: GitHubCommit }>(
    `/repos/${owner}/${repo}/contents/${path}`,
    {
      data: {
        message,
        sha,
        branch,
      },
    }
  );
  
  return response.data;
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
): Promise<Array<{ sha: string; commit: GitHubCommit; author: GitHubUser | null }>> {
  const client = createGitHubClient(accessToken);
  const response = await client.get(`/repos/${owner}/${repo}/commits`, {
    params: options,
  });
  return response.data;
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
  const client = createGitHubClient(accessToken);
  
  const response = await client.post(`/repos/${owner}/${repo}/git/refs`, {
    ref: `refs/heads/${branchName}`,
    sha: sourceSha,
  });
  
  return response.data;
}

/**
 * Get the latest commit SHA for a branch
 */
export async function getBranchSha(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const client = createGitHubClient(accessToken);
  const response = await client.get(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
  return response.data.object.sha;
}
