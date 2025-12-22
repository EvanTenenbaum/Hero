# Hero IDE Deployment Guide

## Overview

Hero IDE uses a **GitHub → Railway** deployment pipeline. When code is pushed to the `main` branch on GitHub, Railway automatically triggers a new deployment.

## Infrastructure

| Component | Provider | Details |
|-----------|----------|---------|
| **Source Control** | GitHub | Repository: `EvanTenenbaum/Hero` |
| **Hosting** | Railway | Project: `hero-ide-production` |
| **Database** | TiDB (via Manus) | MySQL-compatible, connection via `DATABASE_URL` |
| **Storage** | S3 (via Manus) | File uploads via `storagePut`/`storageGet` |
| **Auth** | Manus OAuth | Handles user authentication |

## Railway Project Details

- **Project Name:** `hero-ide-production`
- **Project ID:** `25a2081a-3b4e-4be8-a6b7-d937d689a3eb`
- **Environment:** `production`
- **Environment ID:** `3ba65868-4ba7-4856-9fe6-9c7fd0859438`
- **Build System:** Railpack (auto-detected)
- **Region:** `us-west2`

## Deployment Flow

```
1. Developer pushes to GitHub (main branch)
         ↓
2. Railway detects push via webhook
         ↓
3. Railway clones repo and runs build
         ↓
4. Build: pnpm install → pnpm run build
         ↓
5. Deploy: Start server on Railway's PORT
         ↓
6. Health check passes → Live
```

## Build Process

Railway auto-detects the project as a Node.js/pnpm project and runs:

```bash
pnpm install
pnpm run build
```

The build command (from `package.json`):
- Builds the Vite client (`vite build`)
- Bundles the server with esbuild

## Environment Variables

Railway requires these environment variables (set in Railway dashboard):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `BUILT_IN_FORGE_API_URL` | Manus API URL |
| `BUILT_IN_FORGE_API_KEY` | Manus API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |

## Common Deployment Issues

### 1. Import Path Errors

**Symptom:** Build fails with "Could not resolve" errors

**Example:**
```
✘ [ERROR] Could not resolve "../_core/db"
    server/coordination/coordinationSession.ts:7:19
```

**Cause:** Incorrect relative import paths in server files

**Fix:** Ensure imports use correct paths:
- `db.ts` is at `server/db.ts`, not `server/_core/db.ts`
- Use `import { getDb } from "../db"` not `import { db } from "../_core/db"`

### 2. TypeScript Compilation Errors

**Symptom:** Build fails with TypeScript errors

**Fix:** Run `npx tsc --noEmit` locally before pushing to catch errors

### 3. Missing Dependencies

**Symptom:** Build fails with "module not found"

**Fix:** Ensure all dependencies are in `package.json` (not just devDependencies for runtime deps)

### 4. Port Binding

**Symptom:** Deployment succeeds but app is unreachable

**Fix:** Server must listen on `process.env.PORT` (Railway assigns dynamic port)

## Checking Deployment Status

### Via Railway API

```bash
# List recent deployments
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ project(id: \"25a2081a-3b4e-4be8-a6b7-d937d689a3eb\") { environments { edges { node { deployments(first: 5) { edges { node { id status createdAt } } } } } } } }"}'

# Get build logs for a deployment
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ buildLogs(deploymentId: \"DEPLOYMENT_ID\", limit: 200) { message timestamp severity } }"}'
```

### Via Railway Dashboard

1. Go to https://railway.app/dashboard
2. Select `hero-ide-production` project
3. Click on the service to see deployment history
4. Click on a deployment to see build logs

## Rollback

To rollback to a previous deployment:

1. Go to Railway dashboard
2. Find the last successful deployment
3. Click "Redeploy" on that deployment

Or trigger a new deployment by reverting the commit on GitHub.

## Local Development vs Production

| Aspect | Local (Manus Sandbox) | Production (Railway) |
|--------|----------------------|---------------------|
| URL | `https://3000-*.manusvm.computer` | Railway-assigned domain |
| Database | Same TiDB instance | Same TiDB instance |
| Hot Reload | Yes (Vite dev server) | No (built bundle) |
| Env Vars | Injected by Manus | Set in Railway dashboard |

## Monitoring

- **Build Logs:** Available in Railway dashboard per deployment
- **Runtime Logs:** Available in Railway dashboard (live tail)
- **Metrics:** Railway provides CPU/memory/network metrics

## Related Files

- `package.json` - Build scripts and dependencies
- `vite.config.ts` - Vite build configuration
- `server/_core/env.ts` - Environment variable handling
- `vercel.json` - Legacy Vercel config (not used, Railway is primary)

---

*Last Updated: December 22, 2025*
*Deployment Status: ✅ SUCCESS (as of latest push)*
