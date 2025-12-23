/**
 * Test Setup - Database Mocking
 *
 * Provides mock database for tests that don't need a real database connection.
 */

import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/callback';
process.env.E2B_API_KEY = 'test-e2b-key';
process.env.SECRETS_ENCRYPTION_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
process.env.SECRETS_KDF_SALT = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
process.env.GITHUB_CLIENT_ID = 'Ov23liTestGitHubClientId1234567';
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret-that-is-at-least-forty-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.GEMINI_API_KEY = 'test-gemini-api-key-1234567890';

// Mock the database module to prevent real database connections in tests
vi.mock('../db', async (importOriginal) => {
  const original = await importOriginal<typeof import('../db')>();
  return {
    ...original,
    getDb: vi.fn().mockResolvedValue(null),
    getProjectById: vi.fn().mockResolvedValue(null),
    getUserById: vi.fn().mockResolvedValue(null),
  };
});

export {};
