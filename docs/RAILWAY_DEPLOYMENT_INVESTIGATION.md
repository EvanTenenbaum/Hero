# Railway Deployment Investigation Report

**Date:** December 22, 2025  
**Issue:** Deployment failures since Sprint 13  
**Status:** ✅ RESOLVED

---

## Summary

**Railway IS the production deployment target.** The project uses a **GitHub → Railway** pipeline where pushes to `main` trigger automatic deployments.

- **Railway Project:** `hero-ide-production`
- **Project ID:** `25a2081a-3b4e-4be8-a6b7-d937d689a3eb`
- **Environment:** `production`
- **Latest Status:** ✅ SUCCESS (as of Dec 22, 2025)

---

## Root Cause of Failures

The deployment failures were caused by **incorrect import paths** in server files:

```
✘ [ERROR] Could not resolve "../_core/db"
    server/coordination/coordinationSession.ts:7:19
    server/coordination/sharedStateManager.ts:8:19
    server/coordination/conflictDetector.ts:8:19
    server/coordination/messageProtocol.ts:8:19
    server/coordination/handoffManager.ts:8:19
```

**Problem:** Files in `server/coordination/` were importing `from "../_core/db"` but `db.ts` is located at `server/db.ts`, not `server/_core/db.ts`.

**Resolution:** The `server/coordination/` folder was removed, eliminating the broken imports. The latest deployment succeeded.

---

## Deployment Architecture

```
GitHub (EvanTenenbaum/Hero)
         │
         │ Push to main
         ▼
Railway (auto-trigger via webhook)
         │
         │ Clone & Build
         ▼
Railpack Builder
         │
         │ pnpm install && pnpm build
         ▼
Deploy to production
         │
         │ Health check
         ▼
Live at Railway domain
```

---

## Railway Configuration

Railway auto-detects the project configuration from `package.json`. No `railway.json` or `railway.toml` is required.

**Build Detection:**
- Builder: Railpack (auto-detected)
- Build command: `pnpm run build`
- Start command: `pnpm start`

**Environment:**
- Region: `us-west2`
- Replicas: 1
- Restart policy: ON_FAILURE (max 10 retries)

---

## Checking Deployment Status

### Via Railway API

```bash
# Set your API key
export RAILWAY_API_KEY="your-api-key"

# List recent deployments
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ project(id: \"25a2081a-3b4e-4be8-a6b7-d937d689a3eb\") { environments { edges { node { deployments(first: 5) { edges { node { id status createdAt } } } } } } } }"}' | jq .

# Get build logs for a specific deployment
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ buildLogs(deploymentId: \"DEPLOYMENT_ID\", limit: 200) { message timestamp severity } }"}' | jq -r '.data.buildLogs[].message'
```

---

## Common Issues & Fixes

### 1. Import Path Errors

**Symptom:** `Could not resolve "..."` errors in build logs

**Fix:** Verify import paths match actual file locations:
- `server/db.ts` → import as `../db` from subdirectories
- `server/_core/*.ts` → import as `../_core/filename`

### 2. TypeScript Errors

**Symptom:** Type errors during build

**Fix:** Run `npx tsc --noEmit` locally before pushing

### 3. Missing Environment Variables

**Symptom:** Runtime errors about undefined env vars

**Fix:** Ensure all required variables are set in Railway dashboard

---

## Deployment History

| Date | Status | Commit | Notes |
|------|--------|--------|-------|
| Dec 22, 2025 06:49 | ✅ SUCCESS | Latest | Sprints 21-23 complete |
| Dec 21, 2025 21:55 | ❌ FAILED | 57e167f | Import path errors |
| Dec 21, 2025 21:22 | ❌ FAILED | - | Import path errors |
| Dec 21, 2025 21:20 | ❌ FAILED | - | Import path errors |
| Dec 21, 2025 21:14 | ❌ FAILED | - | Import path errors |

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - System overview

---

*Last Updated: December 22, 2025*
