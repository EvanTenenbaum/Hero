# Hero IDE Cloud Migration - Comprehensive QA Report

**Date:** December 23, 2025
**QA Type:** Red Hat Security & Quality Assessment
**Focus:** Cloud-Native Migration Gaps, Outdated Documentation, Bugs & Stubs
**Status:** CRITICAL ISSUES IDENTIFIED

---

## Executive Summary

The Hero IDE has undergone a significant cloud migration from local filesystem operations to E2B cloud sandboxes and from Manus OAuth to Google OAuth. However, this migration is **incomplete** with critical gaps between documentation and implementation. This report identifies:

- **59 outdated documentation references** to deprecated "Manus OAuth"
- **6 critical security vulnerabilities** in the authentication system
- **7 files** still using local filesystem instead of cloud sandbox
- **4 TODO comments** indicating incomplete implementations
- **30+ console.log statements** left in production code
- **1 critical encryption weakness** using Base64 instead of AES-256

---

## Part 1: Outdated Documentation (Manus OAuth → Google OAuth)

### Critical Finding: Documentation Not Updated After Auth Migration

The commit history shows `108fb03 feat: Replace Manus OAuth with Google OAuth authentication`, but **59 files** still reference the deprecated "Manus OAuth" system.

### Files Requiring Update

| File | Issue | Priority |
|------|-------|----------|
| `README.md:58` | Tech stack lists "Auth: Manus OAuth" | **CRITICAL** |
| `docs/SYSTEM_ARCHITECTURE.md:224` | Lists "Manus OAuth - User authentication" | **CRITICAL** |
| `docs/DEPLOYMENT.md:15,63-67` | References Manus OAuth environment variables | **HIGH** |
| `ROADMAP.md:14,99,101,109` | Multiple Manus references | **HIGH** |
| `AGENT_HANDOFF.md:37,83-84,334-343` | Auth and environment sections | **HIGH** |
| `docs/SYSTEM_QA_HANDOFF.md:99,367,981-985` | Full auth flow and env vars | **HIGH** |
| `INTEGRATION_REPORT.md:23,259` | Auth status section | **MEDIUM** |
| `client/src/pages/Home.tsx:104` | Footer says "Built with Manus" | **MEDIUM** |
| `client/src/components/ManusDialog.tsx` | Component name is misleading | **LOW** |

### Recommended Actions

1. **Update README.md**: Change `Auth | Manus OAuth` to `Auth | Google OAuth`
2. **Update SYSTEM_ARCHITECTURE.md**: Replace Manus OAuth reference
3. **Update DEPLOYMENT.md**: Remove Manus-specific environment variables, add Google OAuth vars
4. **Rename ManusDialog.tsx** to `LoginDialog.tsx` or `GoogleAuthDialog.tsx`
5. **Update footer** in Home.tsx to remove Manus branding

---

## Part 2: Security Vulnerabilities in Authentication

### CRITICAL: OAuth Implementation Issues

| ID | Vulnerability | File | Line | Severity |
|----|--------------|------|------|----------|
| SEC-001 | **Missing GOOGLE_REDIRECT_URI Validation** - Redirect URI dynamically constructed from headers, not validated against configured value | `server/_core/oauth.ts` | 69 | **CRITICAL** |
| SEC-002 | **Unsafe State Parameter Decoding** - Double encoding/decoding with insufficient error handling | `server/_core/oauth.ts` | 124 | **HIGH** |
| SEC-003 | **Cross-Site Cookie** - `sameSite: "none"` allows cross-origin cookie attacks | `server/_core/cookies.ts` | 45 | **HIGH** |
| SEC-004 | **User Data in LocalStorage** - Unencrypted user info stored in `localStorage` | `client/src/_core/hooks/useAuth.ts` | 46 | **MEDIUM** |
| SEC-005 | **No CSRF Protection** - State parameter not cryptographically validated | `server/_core/oauth.ts` | - | **MEDIUM** |
| SEC-006 | **1-Year Session Expiry** - JWT tokens valid for 1 year with no revocation | `server/_core/sdk.ts` | 73-101 | **MEDIUM** |

### Details: SEC-001 (Open Redirect)

```typescript
// server/_core/oauth.ts:67-69
const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
const host = req.headers["x-forwarded-host"] || req.headers.host || "";
const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
// NOT VALIDATED AGAINST ENV.GOOGLE_REDIRECT_URI!
```

**Risk:** Attacker can inject malicious host via `X-Forwarded-Host` header to steal OAuth tokens.

**Fix:** Validate that constructed redirectUri matches `ENV.GOOGLE_REDIRECT_URI`.

---

## Part 3: Cloud Migration Gaps

### Files Still Using Local Filesystem

The cloud migration to E2B sandboxes is incomplete. The following files still use local filesystem operations:

| File | Lines | Operation | Status |
|------|-------|-----------|--------|
| `server/github/gitService.ts` | 26, 73, 89, 101, 214, 286-287, 432, 482-491 | `/tmp/hero-workspaces`, `fs.mkdir`, `execAsync` | **NOT MIGRATED** |
| `server/meta/fileModificationService.ts` | 14, 48, 62, 66, 69, 95, 236, 275 | `process.cwd()`, `fs.readFile`, `fs.writeFile`, `execAsync` | **NOT MIGRATED** |
| `server/context/router.ts` | 72, 107 | `fs.existsSync`, `fs.promises.readFile` | **NOT MIGRATED** |
| `server/context/fileWatcher.ts` | 135, 165-166 | `fs.promises.readdir`, `stat`, `readFile` | **NOT MIGRATED** |
| `server/github/conflictService.ts` | 62-81, 415 | `execAsync` for git, `fs.writeFile` | **NOT MIGRATED** |
| `server/_core/vite.ts` | 36, 55 | `fs.promises.readFile`, `fs.existsSync` | **ACCEPTABLE** (build) |

### Hardcoded Paths in Test Files (64 occurrences)

- `server/sprint27-performance.test.ts` - 9 references to `/home/ubuntu/hero-ide/`
- `server/sprint28-features.test.ts` - 18 references
- `server/kickoff/kickoff-wizard.test.ts` - 26 references
- `server/sprint26-reliability.test.ts` - 11 references

---

## Part 4: TODO Comments & Incomplete Implementations

### Outstanding TODOs

| File | Line | TODO Comment | Priority |
|------|------|--------------|----------|
| `server/routers.ts` | 915 | `// TODO: Encrypt value before storing` | **CRITICAL** |
| `server/context/router.ts` | 385 | `// TODO: Update chunks with embeddings in database` | **MEDIUM** |
| `server/services/projectHydrator.ts` | 279 | `// TODO: Implement token refresh logic if token is expired` | **HIGH** |
| `client/src/pages/Board.tsx` | 224 | `{/* TODO: Board settings */}` | **LOW** |

### Critical: Secrets Stored with Base64 (Not Encryption)

```typescript
// server/routers.ts:915-916
// TODO: Encrypt value before storing
const encryptedValue = Buffer.from(input.value).toString("base64");
```

**Risk:** Project secrets are stored with Base64 encoding which is NOT encryption. Anyone with database access can decode all secrets.

**Fix:** Use the AES-256-GCM encryption from `projectHydrator.ts`.

---

## Part 5: Sandbox Implementation Issues

### Issues in sandboxManager.ts

| Issue | Line | Description | Severity |
|-------|------|-------------|----------|
| Hardcoded REPO_PATH | 41 | `/home/user/repo` not configurable | **MEDIUM** |
| Hardcoded SANDBOX_TEMPLATE | 40 | `'base'` template not configurable | **LOW** |
| No graceful shutdown hook | - | No process exit handler to cleanup sandboxes | **MEDIUM** |
| Console.log in production | 94, 143, 168, 191, 226, 246, 268, 284 | 8 console.log statements | **LOW** |

### Issues in projectHydrator.ts

| Issue | Line | Description | Severity |
|-------|------|-------------|----------|
| Missing token refresh | 279 | TODO comment, expired tokens will fail | **CRITICAL** |
| Silent database failures | 391-393, 264-266 | Returns `[]` instead of throwing | **HIGH** |
| Insecure KDF salt | 59 | Falls back to encryption key as salt | **HIGH** |
| Git credentials race condition | 172-190 | Credentials may not be cleaned up on failure | **MEDIUM** |
| No decryption validation | 86-101 | No length check before slicing | **MEDIUM** |
| process.env usage | 291-292 | Should use ENV wrapper | **LOW** |

---

## Part 6: Debug Code Left in Production

### Console.log Statements (30+ in production code)

| File | Count | Sample Lines |
|------|-------|--------------|
| `server/services/projectHydrator.ts` | 7 | 168, 235, 355, 380, 422, 427, 459 |
| `server/services/sandboxManager.ts` | 8 | 94, 143, 168, 191, 226, 246, 268, 284 |
| `server/_core/oauth.ts` | 7 | 88, 144, 164, 167, 177, 201, 215 |
| `server/_core/index.ts` | 2 | 57, 61 |
| `server/github/webhookService.ts` | 2 | 165, 334 |
| `server/context/fileWatcher.ts` | 3 | 228, 251, 298 |
| `server/meta/fileModificationService.ts` | 1 | 286 |
| `client/src/pages/ComponentShowcase.tsx` | 1 | 197 |

**Recommendation:** Replace with proper logging library (winston, pino) or remove entirely.

---

## Part 7: Schema & Database Issues

### Missing Token Expiry Handling

```typescript
// drizzle/schema.ts:34
tokenExpiresAt: timestamp("tokenExpiresAt"),
```

The `tokenExpiresAt` field exists but is never checked when using tokens. Expired GitHub tokens will cause clone failures.

### Inconsistent GitHub Fields

The `projects` table has duplicate GitHub-related fields:
- `githubRepoFullName` (line 77) and `repoOwner`/`repoName` (lines 82-83)
- `githubDefaultBranch` (line 78) and `defaultBranch` (line 85)

---

## Part 8: Priority Action Items

### P0 - Critical (Fix Immediately)

1. **SEC-001**: Validate `GOOGLE_REDIRECT_URI` against configured value
2. **Secrets Encryption**: Replace Base64 with AES-256-GCM in `routers.ts:916`
3. **Token Refresh**: Implement GitHub token refresh in `projectHydrator.ts`
4. **KDF Salt**: Require `SECRETS_KDF_SALT` environment variable

### P1 - High (Fix This Week)

1. **Update README.md**: Replace Manus OAuth references with Google OAuth
2. **Update SYSTEM_ARCHITECTURE.md**: Reflect current auth implementation
3. **Update DEPLOYMENT.md**: Correct environment variables
4. **SEC-002**: Add proper state parameter validation with cryptographic nonce
5. **SEC-003**: Change `sameSite` to `"lax"` unless cross-origin is required
6. **Migrate gitService.ts**: Route through sandbox instead of `/tmp`

### P2 - Medium (Fix This Sprint)

1. **Rename ManusDialog.tsx** to `LoginDialog.tsx`
2. **Remove console.log statements**: Replace with proper logging
3. **Add graceful shutdown**: Register process handlers for sandbox cleanup
4. **Fix test paths**: Update `/home/ubuntu/hero-ide/` references
5. **Implement embeddings TODO**: Complete vector storage in context router

### P3 - Low (Backlog)

1. **Consolidate GitHub fields**: Remove duplicate project schema fields
2. **Add environment validation**: Warn on startup if E2B_API_KEY missing
3. **Make timeouts configurable**: Move hardcoded values to ENV

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Critical Security Issues | 2 |
| High Security Issues | 4 |
| Medium Security Issues | 3 |
| Outdated Documentation Files | 59 |
| Files Not Cloud-Migrated | 5 |
| TODO Comments | 4 |
| Console.log in Production | 30+ |
| Hardcoded Test Paths | 64 |

---

## Appendix A: Quick Reference - Files Needing Updates

### Documentation (Manus → Google OAuth)
```
README.md
docs/SYSTEM_ARCHITECTURE.md
docs/DEPLOYMENT.md
ROADMAP.md
AGENT_HANDOFF.md
docs/SYSTEM_QA_HANDOFF.md
INTEGRATION_REPORT.md
```

### Security Fixes
```
server/_core/oauth.ts
server/_core/cookies.ts
server/_core/sdk.ts
server/routers.ts (line 916)
client/src/_core/hooks/useAuth.ts
```

### Cloud Migration
```
server/github/gitService.ts
server/meta/fileModificationService.ts
server/context/router.ts
server/context/fileWatcher.ts
server/github/conflictService.ts
server/services/projectHydrator.ts
```

---

*Report generated by Claude QA Agent*
*Branch: claude/qa-cloud-migration-wTG2s*
