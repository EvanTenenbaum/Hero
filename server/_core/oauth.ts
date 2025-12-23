import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { SignJWT } from "jose";

// Google OAuth configuration
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_API = "https://www.googleapis.com/oauth2/v2/userinfo";

// Scopes for basic profile info
const AUTH_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
].join(" ");

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getSessionSecret() {
  const secret = ENV.cookieSecret;
  return new TextEncoder().encode(secret);
}

async function createSessionToken(
  openId: string,
  options: { expiresInMs?: number; name?: string } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    openId,
    appId: ENV.appId || "hero-ide",
    name: options.name || "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export function registerOAuthRoutes(app: Express) {
  // ══════════════════════════════════════════════════════════════════════════
  // GOOGLE OAUTH INITIATION
  // ══════════════════════════════════════════════════════════════════════════
  
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const clientId = ENV.GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error("[OAuth] GOOGLE_CLIENT_ID not configured");
      res.status(500).json({ error: "Google OAuth not configured" });
      return;
    }

    // Get the state from query params (contains redirect path)
    const incomingState = getQueryParam(req, "state") || "";
    
    // Build redirect URI - prefer configured value for security
    let redirectUri: string;
    
    if (ENV.GOOGLE_REDIRECT_URI) {
      // Use configured redirect URI (most secure)
      redirectUri = ENV.GOOGLE_REDIRECT_URI;
    } else {
      // Fallback to dynamic construction with validation
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "";
      
      // SEC-001 FIX: Validate host against allowed patterns
      const allowedHosts = [
        'localhost',
        '127.0.0.1',
        'hero-production-75cb.up.railway.app',
        'hero-ide.vercel.app',
      ];
      const hostStr = Array.isArray(host) ? host[0] : host;
      const hostWithoutPort = hostStr.split(':')[0];
      
      if (!allowedHosts.some(allowed => hostWithoutPort === allowed || hostWithoutPort.endsWith(`.${allowed}`))) {
        console.error(`[OAuth] SEC-001: Blocked unauthorized host: ${host}`);
        res.status(400).json({ error: 'Invalid redirect host' });
        return;
      }
      
      redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    }

    // Combine redirect path with our internal state
    const state = Buffer.from(JSON.stringify({
      redirectUri,
      originalState: incomingState,
    })).toString("base64");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: AUTH_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    console.debug("[OAuth] Redirecting to Google OAuth:", authUrl);
    res.redirect(302, authUrl);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GOOGLE OAUTH CALLBACK
  // ══════════════════════════════════════════════════════════════════════════
  
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");

    if (error) {
      console.error("[OAuth] Google returned error:", error);
      res.redirect(302, "/?error=oauth_denied");
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // Decode state to get redirect URI
      let redirectUri: string;
      let redirectPath = "/";
      
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString());
        redirectUri = stateData.redirectUri;
        
        // Try to extract original redirect path
        if (stateData.originalState) {
          try {
            const originalState = JSON.parse(atob(decodeURIComponent(stateData.originalState)));
            redirectPath = originalState.redirect || "/";
          } catch {
            // Ignore parsing errors for original state
          }
        }
      } catch {
        console.error("[OAuth] Invalid state parameter");
        res.status(400).json({ error: "Invalid state parameter" });
        return;
      }

      const clientId = ENV.GOOGLE_CLIENT_ID;
      const clientSecret = ENV.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("Google OAuth credentials not configured");
      }

      // Exchange code for tokens
      console.debug("[OAuth] Exchanging code for tokens...");
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("[OAuth] Token exchange failed:", errorText);
        throw new Error(`Failed to exchange code: ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      console.debug("[OAuth] Token exchange successful");

      // Get user info from Google
      console.debug("[OAuth] Fetching user info...");
      const userInfoResponse = await fetch(GOOGLE_USERINFO_API, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error("Failed to get user info from Google");
      }

      const userInfo = await userInfoResponse.json();
      console.debug("[OAuth] User info received:", { email: userInfo.email, name: userInfo.name });

      // Use Google ID as the openId for our system
      const openId = `google_${userInfo.id}`;

      // Upsert user in database
      await db.upsertUser({
        openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await createSessionToken(openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.debug("[OAuth] Login successful, redirecting to:", redirectPath);
      res.redirect(302, redirectPath);
    } catch (error) {
      console.error("[OAuth] Callback failed:", error);
      res.redirect(302, "/?error=oauth_failed");
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LEGACY CALLBACK (for backward compatibility)
  // ══════════════════════════════════════════════════════════════════════════
  
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    // Redirect legacy callback to new Google OAuth flow
    console.debug("[OAuth] Legacy callback hit, redirecting to Google OAuth");
    res.redirect(302, "/api/auth/google");
  });
}
