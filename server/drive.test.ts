/**
 * Google Drive Integration Tests
 * Validates OAuth credentials and basic functionality
 */

import { describe, it, expect } from "vitest";

describe("Google Drive Integration", () => {
  describe("OAuth Credentials", () => {
    it("should have GOOGLE_CLIENT_ID environment variable set", () => {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      expect(clientId).toBeDefined();
      expect(clientId).not.toBe("");
      // Client ID should be a non-empty string (format varies by OAuth provider)
      expect(clientId!.length).toBeGreaterThan(5);
    });

    it("should have GOOGLE_CLIENT_SECRET environment variable set", () => {
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      expect(clientSecret).toBeDefined();
      expect(clientSecret).not.toBe("");
      // Google Client Secrets are typically 24+ characters
      expect(clientSecret!.length).toBeGreaterThanOrEqual(10);
    });

    it("should be able to construct OAuth URL", () => {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = "https://example.com/api/drive/callback";
      const scope = "https://www.googleapis.com/auth/drive.readonly";
      
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId!);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scope);
      authUrl.searchParams.set("access_type", "offline");
      
      expect(authUrl.toString()).toContain("accounts.google.com");
      expect(authUrl.toString()).toContain(clientId!);
    });
  });

  describe("Drive Router", () => {
    it("should have drive router module", async () => {
      const driveRouter = await import("./drive/router");
      expect(driveRouter.driveRouter).toBeDefined();
    });

    it("should have required procedures", async () => {
      const { driveRouter } = await import("./drive/router");
      const procedures = Object.keys(driveRouter._def.procedures);
      
      expect(procedures).toContain("getConnection");
      expect(procedures).toContain("getAuthUrl");
      expect(procedures).toContain("handleCallback");
      expect(procedures).toContain("disconnect");
      expect(procedures).toContain("listFiles");
    });
  });
});
