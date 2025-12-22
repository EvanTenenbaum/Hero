# Hero IDE

**AI-Powered Integrated Development Environment**

Hero IDE is a next-generation development environment that combines traditional IDE capabilities with AI-powered agents for automated coding, project management, and workflow orchestration.

## Features

### Core IDE Features
- **Multi-Pane Workspace**: Flexible layout with file tree, code editor, and contextual AI assistant
- **Project Management**: Create, organize, and manage multiple projects
- **Kanban Board**: Visual task management with drag-and-drop cards
- **Real-time Chat**: AI-powered chat interface for development assistance

### AI Agent System
- **Multiple Agent Types**: PM, Dev, QA, DevOps, and Research agents
- **Agent Orchestration**: Coordinate multiple agents on complex tasks
- **Execution Engine**: State machine-based task execution with pause/resume/cancel
- **Checkpoint & Rollback**: Safe experimentation with instant rollback capability

### GitHub Integration
- **Repository Management**: Clone, sync, and manage repositories
- **Issue Sync**: Bidirectional sync between GitHub issues and Kanban cards
- **PR Management**: View diffs, add comments, request reviews, and merge PRs
- **File Operations**: Read, write, and commit files directly

### Context Engine
- **Semantic Search**: Find relevant code using natural language queries
- **Hybrid Search**: Combines keyword and semantic search for best results
- **Auto-Indexing**: Automatically indexes project files for fast retrieval
- **Token-Aware Context**: Builds context within LLM token limits

### Project Kickoff Protocol
- **5-Step Wizard**: North Star → Product Brief → Architecture → Quality Bar → Slice Map
- **AI-Generated Specs**: Automatically generate project documentation
- **Agent Brief**: Creates operating rules for AI agents based on project specs

### Self-Modifying IDE (Meta Mode)
- **Chat-Driven Development**: Modify Hero IDE itself through natural language
- **Protected Files**: Safety system prevents changes to critical files
- **Change Preview**: See diffs before applying modifications
- **Audit Logging**: Track all IDE modifications

### Design System
- **Typography-First**: Clean, readable interface with Libre Baskerville headings and Inter body text
- **Slate Blue Palette**: Professional, neutral accent color (#5B7C99)
- **Dark/Light Themes**: Full theme support with toggle
- **Mobile Responsive**: Bottom tab navigation and touch-optimized targets

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Express 4, tRPC 11, Drizzle ORM |
| Database | MySQL/TiDB |
| AI | Google Gemini API |
| Auth | Manus OAuth |
| Hosting | Railway (auto-deploy from GitHub) |

## Project Structure

```
hero-ide/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities and tRPC client
│   └── public/             # Static assets
├── server/                 # Express backend
│   ├── _core/              # Framework infrastructure
│   ├── agents/             # AI agent system
│   ├── context/            # Context engine
│   ├── github/             # GitHub integration
│   ├── kanban/             # Kanban board
│   ├── kickoff/            # Project kickoff wizard
│   ├── meta/               # Self-modifying IDE
│   └── routers.ts          # Main tRPC router
├── drizzle/                # Database schema
├── docs/                   # Documentation
└── shared/                 # Shared types and constants
```

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm
- MySQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/EvanTenenbaum/Hero.git
cd Hero

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database and API credentials

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | MySQL connection string |
| JWT_SECRET | Session cookie signing secret |
| GEMINI_API_KEY | Google Gemini API key |
| GITHUB_CLIENT_ID | GitHub OAuth client ID |
| GITHUB_CLIENT_SECRET | GitHub OAuth client secret |

## Development

```bash
# Run development server
pnpm dev

# Run tests
pnpm test

# Type check
npx tsc --noEmit

# Build for production
pnpm build
```

## Deployment

Hero IDE is deployed on Railway with auto-deploy from the main branch.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment documentation.

## Documentation

- [Design System](docs/HERO_IDE_UNIFIED_DESIGN_SYSTEM.md) - Complete UI/UX specifications
- [Agent Kickoff Protocol](docs/AGENT_KICKOFF_PROTOCOL_ROADMAP.md) - Project kickoff wizard
- [Self-Modifying IDE](docs/SELF_MODIFYING_IDE_SPEC.md) - Meta Mode specification
- [Deployment Guide](docs/DEPLOYMENT.md) - Railway deployment setup
- [Sprint Plan](docs/OPTIMIZED_SPRINT_PLAN.md) - Development roadmap

## Test Coverage

- **794 tests** covering all major features
- Security audit (SQL injection, XSS, CSRF)
- Performance audit (load times, bundle size)
- Accessibility audit (WCAG compliance)

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pnpm test`
5. Submit a pull request

---

Built with ❤️ by the Hero IDE team
