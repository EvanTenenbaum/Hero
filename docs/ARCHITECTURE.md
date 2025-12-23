# HERO IDE Architecture

## Overview

HERO IDE is a cloud-native AI-powered development environment that enables autonomous code generation, execution, and deployment through E2B cloud sandboxes.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (React)                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Chat UI     │  │  Kanban      │  │  Project     │              │
│  │  (CloudChat) │  │  Board       │  │  Settings    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│  ┌──────┴─────────────────┴─────────────────┴───────┐              │
│  │              tRPC Client (React Query)            │              │
│  └──────────────────────┬────────────────────────────┘              │
└─────────────────────────┼───────────────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────┼───────────────────────────────────────────┐
│                         │         SERVER (Node.js)                   │
├─────────────────────────┼───────────────────────────────────────────┤
│  ┌──────────────────────┴────────────────────────────┐              │
│  │                   tRPC Router                      │              │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │              │
│  │  │ chat    │ │ kanban  │ │ cloud   │ │ secrets │ │              │
│  │  │ agent   │ │ router  │ │ sandbox │ │ router  │ │              │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ │              │
│  └───────┼───────────┼───────────┼───────────┼──────┘              │
│          │           │           │           │                      │
│  ┌───────┴───────────┴───────────┴───────────┴──────┐              │
│  │              CloudExecutionEngine                 │              │
│  │  ┌─────────────────────────────────────────────┐ │              │
│  │  │  Governance: Budget, Steps, Uncertainty     │ │              │
│  │  └─────────────────────────────────────────────┘ │              │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│              │
│  │  │ fs.ts   │ │terminal │ │ github  │ │ meta    ││              │
│  │  │ tools   │ │ tools   │ │ tools   │ │ agent   ││              │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘│              │
│  └───────┼───────────┼───────────┼───────────┼─────┘              │
│          │           │           │           │                      │
│  ┌───────┴───────────┴───────────┴───────────┴──────┐              │
│  │              SandboxManager                       │              │
│  │  - Sandbox pooling & lifecycle                   │              │
│  │  - Health monitoring                             │              │
│  │  - Auto-timeout & cleanup                        │              │
│  └──────────────────────┬────────────────────────────┘              │
└─────────────────────────┼───────────────────────────────────────────┘
                          │ E2B API
┌─────────────────────────┼───────────────────────────────────────────┐
│                         │         E2B CLOUD SANDBOX                  │
├─────────────────────────┼───────────────────────────────────────────┤
│  ┌──────────────────────┴────────────────────────────┐              │
│  │              Isolated Container                    │              │
│  │  ┌─────────────────────────────────────────────┐ │              │
│  │  │  /repo - Cloned GitHub Repository           │ │              │
│  │  │  Environment Variables (Secrets)            │ │              │
│  │  │  Node.js / Python / Shell                   │ │              │
│  │  └─────────────────────────────────────────────┘ │              │
│  └───────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. CloudExecutionEngine (`server/agents/cloudExecutionEngine.ts`)

The central orchestrator for AI-driven code execution:

- **Tool Execution**: Routes tool calls to appropriate handlers (fs, terminal, github)
- **Governance**: Enforces budget limits, step limits, and uncertainty thresholds
- **State Management**: Tracks execution history, pending confirmations, and costs
- **Safety**: Requires user confirmation for destructive operations

### 2. SandboxManager (`server/services/sandboxManager.ts`)

Manages E2B cloud sandbox lifecycle:

- **Pooling**: Pre-warms sandboxes for faster startup
- **Health Monitoring**: Periodic health checks with caching
- **Auto-Timeout**: Automatically stops idle sandboxes
- **Cleanup**: Removes old sandboxes when pool is full

### 3. ProjectHydrator (`server/services/projectHydrator.ts`)

Prepares sandboxes for project execution:

- **Repository Cloning**: Clones GitHub repos with proper authentication
- **Secrets Injection**: Decrypts and injects environment variables
- **Dependency Installation**: Runs package manager install
- **Token Refresh**: Handles GitHub OAuth token refresh

### 4. Cloud Tools (`server/agents/tools/`)

Sandbox-aware tool implementations:

| Tool | File | Description |
|------|------|-------------|
| File Operations | `fs.ts` | Read, write, list files in sandbox |
| Terminal | `terminal.ts` | Execute shell commands safely |
| GitHub | `github.ts` | PR creation, branch management |

## Security Model

### Authentication
- Google OAuth 2.0 for user authentication
- GitHub OAuth for repository access
- JWT tokens for API authentication

### Authorization
- Project-level access control
- Kanban board/column/card authorization
- Sandbox isolation per project

### Secrets Management
- AES-256-GCM encryption at rest
- Environment-based KDF salt
- Secrets never logged or exposed in errors

### Execution Safety
- Path traversal protection
- Shell command escaping
- Confirmation required for destructive operations
- Budget and step limits

## Database Schema

### Core Tables
- `users` - User accounts
- `projects` - Project metadata with cloud sandbox config
- `project_secrets` - Encrypted environment variables

### Kanban Tables
- `kanban_boards` - Project boards
- `kanban_columns` - Board columns
- `kanban_cards` - Task cards

### Execution Tables
- `agent_executions` - Execution history
- `execution_steps` - Step-by-step logs

## API Endpoints

### Cloud Sandbox
- `cloudSandbox.start` - Start a sandbox for a project
- `cloudSandbox.stop` - Stop a running sandbox
- `cloudSandbox.status` - Get sandbox status
- `cloudSandbox.execute` - Execute a tool in sandbox

### Secrets
- `secretsRouter.list` - List project secrets (keys only)
- `secretsRouter.create` - Add a new secret
- `secretsRouter.delete` - Remove a secret

### Chat Agent
- `chatAgent.executeInCloud` - Execute AI with cloud tools
- `chatAgent.getExecutionStatus` - Get execution state
- `chatAgent.cancelExecution` - Cancel running execution

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `E2B_API_KEY` | Yes | E2B sandbox API key |
| `SECRETS_ENCRYPTION_KEY` | Yes | 64-char hex key for AES-256 |
| `SECRETS_KDF_SALT` | Yes | 32-char hex salt for key derivation |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | OAuth callback URL |
| `DATABASE_URL` | Yes | MySQL connection string |

## Deployment

### Railway (Backend)
- Node.js server with tRPC
- MySQL database
- Environment variables configured

### Vercel (Frontend)
- React SPA with Vite
- Static asset hosting
- API proxy to Railway

## Deployment & Operations

### CI/CD Pipeline

1. **GitHub Actions**: Automated testing on every PR
2. **Railway Auto-Deploy**: Backend deploys automatically from `main` branch
3. **Vercel Auto-Deploy**: Frontend deploys automatically from `main` branch

### Infrastructure

- **Railway**: Node.js backend with MySQL database
- **Vercel**: Static frontend hosting with edge functions
- **E2B**: Cloud sandbox infrastructure (managed service)

### Monitoring & Observability

- **Railway Logs**: Backend application logs
- **Vercel Analytics**: Frontend performance metrics
- **E2B Dashboard**: Sandbox usage and health monitoring

### E2B Sandbox Security Model

The E2B sandbox integration provides strong isolation:

1. **Container Isolation**: Each sandbox runs in an isolated container
2. **Network Isolation**: Sandboxes cannot access internal services
3. **Resource Limits**: CPU, memory, and disk limits enforced
4. **Time Limits**: Auto-timeout after configurable duration (default 30 min)
5. **No Persistence**: Sandboxes are ephemeral, destroyed after use
6. **Secrets Injection**: Secrets are injected at runtime, never persisted in sandbox

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Malicious code execution | Sandbox isolation, resource limits |
| Data exfiltration | Network isolation, no external access |
| Secrets leakage | Runtime injection, never logged |
| Resource exhaustion | CPU/memory limits, auto-timeout |
| Lateral movement | No access to host or other sandboxes |

## Development

### Local Development Setup

1. **Prerequisites**:
   - Node.js 22+
   - pnpm
   - MySQL database (local or cloud)
   - E2B API key (for cloud sandbox features)

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Database Setup**:
   ```bash
   pnpm db:push  # Push schema to database
   ```

4. **Running Locally**:
   ```bash
   pnpm dev  # Starts both frontend and backend
   ```

5. **Cloud Sandbox Testing**:
   - Cloud sandbox features require a valid E2B_API_KEY
   - Without E2B key, sandbox features will be disabled
   - Use the CloudSandboxPanel in project settings to test

### Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```
