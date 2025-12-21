/**
 * GitHub OAuth Service
 * Sprint 4: GitHub Integration
 * 
 * Handles GitHub OAuth flow for repository access.
 */

import { getDb } from "../db";
import { githubConnections } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || "";

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

/**
 * Generate GitHub OAuth authorization URL
 */
export function getGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "repo read:user user:email",
    state,
    allow_signup: "true",
  });
  
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub OAuth error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data as GitHubTokenResponse;
}

/**
 * Get GitHub user info using access token
 */
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Store or update GitHub connection for a user
 */
export async function storeGitHubConnection(
  userId: number,
  githubUser: GitHubUser,
  accessToken: string,
  scopes: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if connection already exists
  const [existing] = await db.select()
    .from(githubConnections)
    .where(eq(githubConnections.userId, userId))
    .limit(1);

  if (existing) {
    // Update existing connection
    await db.update(githubConnections)
      .set({
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiresAt: expiresAt || null,
        scopes,
        updatedAt: new Date(),
      })
      .where(eq(githubConnections.userId, userId));
  } else {
    // Create new connection
    await db.insert(githubConnections).values({
      userId,
      githubId: String(githubUser.id),
      githubUsername: githubUser.login,
      accessToken,
      refreshToken: refreshToken || null,
      tokenExpiresAt: expiresAt || null,
      scopes,
    });
  }
}

/**
 * Get stored GitHub connection for a user
 */
export async function getGitHubConnection(userId: number): Promise<{
  accessToken: string;
  githubUsername: string;
  githubId: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const [connection] = await db.select({
    accessToken: githubConnections.accessToken,
    githubUsername: githubConnections.githubUsername,
    githubId: githubConnections.githubId,
    tokenExpiresAt: githubConnections.tokenExpiresAt,
  })
    .from(githubConnections)
    .where(eq(githubConnections.userId, userId))
    .limit(1);

  if (!connection) {
    return null;
  }

  // Check if token is expired
  if (connection.tokenExpiresAt && new Date() > connection.tokenExpiresAt) {
    return null;
  }

  return {
    accessToken: connection.accessToken,
    githubUsername: connection.githubUsername,
    githubId: connection.githubId,
  };
}

/**
 * Revoke GitHub connection
 */
export async function revokeGitHubConnection(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(githubConnections)
    .where(eq(githubConnections.userId, userId));
}

/**
 * Check if user has valid GitHub connection
 */
export async function hasGitHubConnection(userId: number): Promise<boolean> {
  const connection = await getGitHubConnection(userId);
  return connection !== null;
}
