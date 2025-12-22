/**
 * PR Management Service - Sprint 20
 * 
 * Enhanced pull request management with diff viewing, comments,
 * merge operations, and review requests.
 */

const GITHUB_API_BASE = "https://api.github.com";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface PRFile {
  sha: string;
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  previous_filename?: string;
}

export interface PRComment {
  id: number;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface PRReviewComment {
  id: number;
  body: string;
  path: string;
  position: number | null;
  line: number | null;
  side: "LEFT" | "RIGHT";
  commit_id: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  diff_hunk: string;
}

export interface PRReview {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string | null;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";
  submitted_at: string;
  html_url: string;
}

export interface PRMergeResult {
  sha: string;
  merged: boolean;
  message: string;
}

export interface ReviewRequest {
  users: Array<{
    login: string;
    avatar_url: string;
  }>;
  teams: Array<{
    name: string;
    slug: string;
  }>;
}

// ════════════════════════════════════════════════════════════════════════════
// API HELPER
// ════════════════════════════════════════════════════════════════════════════

async function githubFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.github.v3+json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub API error: ${response.statusText}`);
  }

  return response.json();
}

// ════════════════════════════════════════════════════════════════════════════
// PR DIFF OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get files changed in a PR
 */
export async function getPRFiles(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  options: { per_page?: number; page?: number } = {}
): Promise<PRFile[]> {
  const params = new URLSearchParams({
    per_page: String(options.per_page || 100),
    page: String(options.page || 1),
  });

  return githubFetch<PRFile[]>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/files?${params}`,
    accessToken
  );
}

/**
 * Get the diff for a specific file in a PR
 */
export async function getPRFileDiff(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  filename: string
): Promise<string | null> {
  const files = await getPRFiles(accessToken, owner, repo, pullNumber);
  const file = files.find(f => f.filename === filename);
  return file?.patch || null;
}

/**
 * Get combined diff for entire PR
 */
export async function getPRDiff(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3.diff",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get PR diff: ${response.statusText}`);
  }

  return response.text();
}

// ════════════════════════════════════════════════════════════════════════════
// PR COMMENTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * List issue comments on a PR (general comments)
 */
export async function listPRComments(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  options: { per_page?: number; page?: number } = {}
): Promise<PRComment[]> {
  const params = new URLSearchParams({
    per_page: String(options.per_page || 30),
    page: String(options.page || 1),
  });

  return githubFetch<PRComment[]>(
    `/repos/${owner}/${repo}/issues/${pullNumber}/comments?${params}`,
    accessToken
  );
}

/**
 * List review comments on a PR (inline code comments)
 */
export async function listPRReviewComments(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  options: { per_page?: number; page?: number } = {}
): Promise<PRReviewComment[]> {
  const params = new URLSearchParams({
    per_page: String(options.per_page || 30),
    page: String(options.page || 1),
  });

  return githubFetch<PRReviewComment[]>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/comments?${params}`,
    accessToken
  );
}

/**
 * Create a general comment on a PR
 */
export async function createPRComment(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
): Promise<PRComment> {
  return githubFetch<PRComment>(
    `/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );
}

/**
 * Create an inline review comment on a PR
 */
export async function createPRReviewComment(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
  commitId: string,
  path: string,
  line: number,
  side: "LEFT" | "RIGHT" = "RIGHT"
): Promise<PRReviewComment> {
  return githubFetch<PRReviewComment>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        commit_id: commitId,
        path,
        line,
        side,
      }),
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PR REVIEWS
// ════════════════════════════════════════════════════════════════════════════

/**
 * List reviews on a PR
 */
export async function listPRReviews(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PRReview[]> {
  return githubFetch<PRReview[]>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
    accessToken
  );
}

/**
 * Create a review on a PR
 */
export async function createPRReview(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  body?: string,
  comments?: Array<{
    path: string;
    line: number;
    body: string;
    side?: "LEFT" | "RIGHT";
  }>
): Promise<PRReview> {
  return githubFetch<PRReview>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        body,
        comments,
      }),
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PR MERGE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check if a PR is mergeable
 */
export async function checkMergeability(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<{
  mergeable: boolean | null;
  mergeable_state: string;
  merged: boolean;
  rebaseable: boolean | null;
}> {
  const pr = await githubFetch<{
    mergeable: boolean | null;
    mergeable_state: string;
    merged: boolean;
    rebaseable: boolean | null;
  }>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}`,
    accessToken
  );

  return {
    mergeable: pr.mergeable,
    mergeable_state: pr.mergeable_state,
    merged: pr.merged,
    rebaseable: pr.rebaseable,
  };
}

/**
 * Merge a PR
 */
export async function mergePR(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  options: {
    commit_title?: string;
    commit_message?: string;
    merge_method?: "merge" | "squash" | "rebase";
    sha?: string;
  } = {}
): Promise<PRMergeResult> {
  return githubFetch<PRMergeResult>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
    accessToken,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commit_title: options.commit_title,
        commit_message: options.commit_message,
        merge_method: options.merge_method || "merge",
        sha: options.sha,
      }),
    }
  );
}

/**
 * Update a PR branch (sync with base)
 */
export async function updatePRBranch(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  expectedHeadSha?: string
): Promise<{ message: string; url: string }> {
  const body: Record<string, string> = {};
  if (expectedHeadSha) {
    body.expected_head_sha = expectedHeadSha;
  }

  return githubFetch(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/update-branch`,
    accessToken,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REVIEW REQUESTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get requested reviewers for a PR
 */
export async function getRequestedReviewers(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<ReviewRequest> {
  return githubFetch<ReviewRequest>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
    accessToken
  );
}

/**
 * Request reviewers for a PR
 */
export async function requestReviewers(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  reviewers?: string[],
  teamReviewers?: string[]
): Promise<{ users: Array<{ login: string }>; teams: Array<{ slug: string }> }> {
  const body: Record<string, string[]> = {};
  if (reviewers && reviewers.length > 0) {
    body.reviewers = reviewers;
  }
  if (teamReviewers && teamReviewers.length > 0) {
    body.team_reviewers = teamReviewers;
  }

  return githubFetch(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

/**
 * Remove requested reviewers from a PR
 */
export async function removeRequestedReviewers(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  reviewers?: string[],
  teamReviewers?: string[]
): Promise<void> {
  const body: Record<string, string[]> = {};
  if (reviewers && reviewers.length > 0) {
    body.reviewers = reviewers;
  }
  if (teamReviewers && teamReviewers.length > 0) {
    body.team_reviewers = teamReviewers;
  }

  await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PR COMMITS
// ════════════════════════════════════════════════════════════════════════════

/**
 * List commits on a PR
 */
export async function listPRCommits(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  options: { per_page?: number; page?: number } = {}
): Promise<Array<{
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  author: { login: string; avatar_url: string } | null;
}>> {
  const params = new URLSearchParams({
    per_page: String(options.per_page || 100),
    page: String(options.page || 1),
  });

  return githubFetch(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/commits?${params}`,
    accessToken
  );
}


