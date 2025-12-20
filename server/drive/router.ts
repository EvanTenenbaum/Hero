/**
 * Google Drive tRPC Router
 * Handles OAuth flow and file operations
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { driveConnections } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "../_core/env";

// Google OAuth configuration
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_USERINFO_API = "https://www.googleapis.com/oauth2/v2/userinfo";

// Required scopes for Drive access
const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

export const driveRouter = router({
  // ══════════════════════════════════════════════════════════════════════════
  // CONNECTION STATUS
  // ══════════════════════════════════════════════════════════════════════════

  getConnection: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [connection] = await db
      .select()
      .from(driveConnections)
      .where(eq(driveConnections.userId, ctx.user.id))
      .limit(1);

    if (!connection) {
      return null;
    }

    return {
      id: connection.id,
      email: connection.email,
      displayName: connection.displayName,
      connectedAt: connection.createdAt,
    };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // OAUTH FLOW
  // ══════════════════════════════════════════════════════════════════════════

  getAuthUrl: protectedProcedure.query(async ({ ctx }) => {
    const clientId = ENV.GOOGLE_CLIENT_ID;
    const redirectUri = ENV.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error("Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.");
    }

    const state = Buffer.from(JSON.stringify({ userId: ctx.user.id })).toString("base64");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: DRIVE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }),

  handleCallback: publicProcedure
    .input(z.object({
      code: z.string(),
      state: z.string(),
    }))
    .mutation(async ({ input }) => {
      const clientId = ENV.GOOGLE_CLIENT_ID;
      const clientSecret = ENV.GOOGLE_CLIENT_SECRET;
      const redirectUri = ENV.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new Error("Google OAuth not configured");
      }

      // Decode state to get userId
      let userId: number;
      try {
        const stateData = JSON.parse(Buffer.from(input.state, "base64").toString());
        userId = stateData.userId;
      } catch {
        throw new Error("Invalid state parameter");
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: input.code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Failed to exchange code: ${error}`);
      }

      const tokens = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch(GOOGLE_USERINFO_API, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error("Failed to get user info");
      }

      const userInfo = await userInfoResponse.json();

      // Store connection
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      // Upsert connection
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db
        .select()
        .from(driveConnections)
        .where(eq(driveConnections.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(driveConnections)
          .set({
            googleId: userInfo.id,
            email: userInfo.email,
            displayName: userInfo.name,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || existing[0].refreshToken,
            tokenExpiresAt: expiresAt,
            scopes: DRIVE_SCOPES,
          })
          .where(eq(driveConnections.userId, userId));
      } else {
        await db.insert(driveConnections).values({
          userId,
          googleId: userInfo.id,
          email: userInfo.email,
          displayName: userInfo.name,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          scopes: DRIVE_SCOPES,
        });
      }

      return { success: true, email: userInfo.email };
    }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db
      .delete(driveConnections)
      .where(eq(driveConnections.userId, ctx.user.id));
    return { success: true };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // FILE OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  listFiles: protectedProcedure
    .input(z.object({
      folderId: z.string().optional(),
      pageToken: z.string().optional(),
      query: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const connection = await getValidConnection(ctx.user.id);
      if (!connection) {
        throw new Error("Not connected to Google Drive");
      }

      const params = new URLSearchParams({
        pageSize: "50",
        fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,webViewLink,thumbnailLink,iconLink)",
        orderBy: "folder,name",
      });

      // Build query
      const queryParts: string[] = ["trashed = false"];
      
      if (input.folderId) {
        queryParts.push(`'${input.folderId}' in parents`);
      } else {
        queryParts.push("'root' in parents");
      }

      if (input.query) {
        queryParts.push(`name contains '${input.query}'`);
      }

      params.set("q", queryParts.join(" and "));

      if (input.pageToken) {
        params.set("pageToken", input.pageToken);
      }

      const response = await fetch(`${GOOGLE_DRIVE_API}/files?${params}`, {
        headers: { Authorization: `Bearer ${connection.accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          await refreshToken(ctx.user.id, connection);
          throw new Error("Token refreshed, please retry");
        }
        throw new Error(`Drive API error: ${response.statusText}`);
      }

      const data: DriveFileList = await response.json();
      return data;
    }),

  getFile: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connection = await getValidConnection(ctx.user.id);
      if (!connection) {
        throw new Error("Not connected to Google Drive");
      }

      const response = await fetch(
        `${GOOGLE_DRIVE_API}/files/${input.fileId}?fields=id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink`,
        { headers: { Authorization: `Bearer ${connection.accessToken}` } }
      );

      if (!response.ok) {
        throw new Error(`Failed to get file: ${response.statusText}`);
      }

      return response.json() as Promise<DriveFile>;
    }),

  getFileContent: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connection = await getValidConnection(ctx.user.id);
      if (!connection) {
        throw new Error("Not connected to Google Drive");
      }

      // First get file metadata to check type
      const metaResponse = await fetch(
        `${GOOGLE_DRIVE_API}/files/${input.fileId}?fields=mimeType,name`,
        { headers: { Authorization: `Bearer ${connection.accessToken}` } }
      );

      if (!metaResponse.ok) {
        throw new Error(`Failed to get file metadata: ${metaResponse.statusText}`);
      }

      const meta = await metaResponse.json();

      // For Google Docs, export as plain text
      if (meta.mimeType.startsWith("application/vnd.google-apps.")) {
        const exportMimeType = getExportMimeType(meta.mimeType);
        const exportResponse = await fetch(
          `${GOOGLE_DRIVE_API}/files/${input.fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
          { headers: { Authorization: `Bearer ${connection.accessToken}` } }
        );

        if (!exportResponse.ok) {
          throw new Error(`Failed to export file: ${exportResponse.statusText}`);
        }

        return {
          content: await exportResponse.text(),
          mimeType: exportMimeType,
          name: meta.name,
        };
      }

      // For regular files, download content
      const contentResponse = await fetch(
        `${GOOGLE_DRIVE_API}/files/${input.fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${connection.accessToken}` } }
      );

      if (!contentResponse.ok) {
        throw new Error(`Failed to download file: ${contentResponse.statusText}`);
      }

      // For text files, return content as string
      if (meta.mimeType.startsWith("text/") || meta.mimeType === "application/json") {
        return {
          content: await contentResponse.text(),
          mimeType: meta.mimeType,
          name: meta.name,
        };
      }

      // For binary files, return base64
      const buffer = await contentResponse.arrayBuffer();
      return {
        content: Buffer.from(buffer).toString("base64"),
        mimeType: meta.mimeType,
        name: meta.name,
        isBase64: true,
      };
    }),
});

// Helper functions

async function getValidConnection(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [connection] = await db
    .select()
    .from(driveConnections)
    .where(eq(driveConnections.userId, userId))
    .limit(1);

  return connection || null;
}

async function refreshToken(userId: number, connection: typeof driveConnections.$inferSelect) {
  const clientId = ENV.GOOGLE_CLIENT_ID;
  const clientSecret = ENV.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !connection.refreshToken) {
    throw new Error("Cannot refresh token");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const tokens = await response.json();
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(driveConnections)
    .set({
      accessToken: tokens.access_token,
      tokenExpiresAt: expiresAt,
    })
    .where(eq(driveConnections.userId, userId));
}

function getExportMimeType(googleMimeType: string): string {
  const exportMap: Record<string, string> = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
    "application/vnd.google-apps.presentation": "text/plain",
    "application/vnd.google-apps.drawing": "image/png",
  };
  return exportMap[googleMimeType] || "text/plain";
}
