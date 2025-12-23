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

export {};
