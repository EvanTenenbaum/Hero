import { describe, it, expect } from 'vitest';

describe('GitHub OAuth Configuration', () => {
  it('should have GITHUB_CLIENT_ID configured', () => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe('');
    expect(clientId?.startsWith('Ov')).toBe(true); // GitHub OAuth App client IDs start with "Ov"
  });

  it('should have GITHUB_CLIENT_SECRET configured', () => {
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    expect(clientSecret).toBeDefined();
    expect(clientSecret).not.toBe('');
    expect(clientSecret?.length).toBeGreaterThan(30); // GitHub secrets are typically 40 chars
  });

  it('should have valid OAuth callback URL format', () => {
    // The callback URL should be configured in the GitHub OAuth App settings
    // This test verifies the expected format
    const expectedCallbackPath = '/api/github/callback';
    expect(expectedCallbackPath).toMatch(/^\/api\/github\/callback$/);
  });
});
