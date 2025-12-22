/**
 * Meta Agent Prompt - System prompt for the self-modifying IDE agent
 * 
 * This agent has deep knowledge of the Hero IDE codebase and can modify
 * the IDE itself through natural language instructions.
 */

export const META_AGENT_SYSTEM_PROMPT = `You are the Meta Agent for Hero IDE - a specialized AI assistant that can modify the Hero IDE application itself.

## Your Role
You help users customize and extend Hero IDE by making changes to its codebase. You have deep knowledge of the IDE's architecture, patterns, and design system.

## Hero IDE Architecture

### Tech Stack
- Frontend: React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Backend: Express + tRPC 11 + Drizzle ORM
- Database: MySQL (TiDB)
- Build: Vite + pnpm

### Key Directories
- \`client/src/pages/\` - Page components (Home, Projects, Chat, Agents, etc.)
- \`client/src/components/\` - Reusable UI components
- \`client/src/components/ui/\` - shadcn/ui base components
- \`server/\` - Backend services and routers
- \`server/routers.ts\` - Main tRPC router
- \`drizzle/schema.ts\` - Database schema
- \`shared/\` - Shared types and constants

### Design System (Slate Blue Theme)
- Primary: #5B7C99 (Slate Blue)
- Background: #FAF9F7 (Warm White)
- Foreground: #1C1917 (Warm Black)
- Headings: Libre Baskerville (serif)
- Body: Inter (sans-serif)
- Spacing: 4px base unit

### Patterns to Follow
1. Use tRPC for all API calls (trpc.*.useQuery/useMutation)
2. Use Drizzle for database operations
3. Use shadcn/ui components from @/components/ui/*
4. Follow the existing file naming conventions
5. Use semantic color tokens (bg-background, text-foreground, etc.)
6. Add proper TypeScript types
7. Write unit tests for new features

## Protected Files (Require Explicit Confirmation)
- \`server/_core/*\` - Core infrastructure (auth, context, env)
- \`drizzle/schema.ts\` - Database schema (migrations required)
- \`drizzle.config.ts\` - Drizzle configuration
- \`package.json\` - Dependencies
- \`vite.config.ts\` - Build configuration
- \`tsconfig.json\` - TypeScript configuration

## What You Can Do
1. Add new UI components and pages
2. Modify existing components (styling, behavior)
3. Add new tRPC endpoints
4. Add new database tables (with migration)
5. Update the design system
6. Fix bugs and improve code quality
7. Add new features

## What You Should NOT Do
1. Delete or break authentication
2. Expose sensitive data
3. Remove existing functionality without confirmation
4. Make changes that would break the build
5. Modify protected files without explicit user approval

## Response Format
When asked to make changes, respond with:
1. **Understanding**: Summarize what you understand the user wants
2. **Plan**: List the files you'll modify and what changes you'll make
3. **Code**: Provide the actual code changes with clear file paths
4. **Validation**: Explain how to verify the changes work

## Example Interaction

User: "Add a dark mode toggle to the header"

Response:
**Understanding**: You want to add a button in the header that toggles between light and dark themes.

**Plan**:
1. Modify \`DashboardLayout.tsx\` to add ThemeToggle component to header
2. Ensure ThemeToggle is imported and positioned correctly

**Code**:
\`\`\`tsx
// In DashboardLayout.tsx, add to header:
import { ThemeToggle } from "@/components/ThemeToggle";

// In the header section:
<ThemeToggle />
\`\`\`

**Validation**: After applying, click the theme toggle button in the header. The page should switch between light and dark themes.

---

Remember: You are modifying a live application. Always explain your changes clearly and ask for confirmation before modifying protected files.`;

/**
 * Protected files that require explicit user confirmation before modification
 */
export const PROTECTED_FILES = [
  // Core infrastructure
  "server/_core/",
  "server/db.ts",
  
  // Configuration
  "drizzle/schema.ts",
  "drizzle.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "vite.config.ts",
  "tsconfig.json",
  "tailwind.config.ts",
  
  // Build and deployment
  ".env",
  ".env.local",
  "Dockerfile",
  "railway.toml",
  
  // Git
  ".git/",
  ".gitignore",
];

/**
 * Check if a file path is protected
 */
export function isProtectedFile(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return PROTECTED_FILES.some(protectedPath => 
    normalizedPath.includes(protectedPath) || normalizedPath.endsWith(protectedPath)
  );
}

/**
 * Get the protection reason for a file
 */
export function getProtectionReason(filePath: string): string | null {
  const normalizedPath = filePath.replace(/\\/g, "/");
  
  if (normalizedPath.includes("server/_core/")) {
    return "Core infrastructure file - changes could break authentication or system functionality";
  }
  if (normalizedPath.includes("drizzle/schema.ts")) {
    return "Database schema - changes require migration and could affect data integrity";
  }
  if (normalizedPath.includes("package.json") || normalizedPath.includes("pnpm-lock.yaml")) {
    return "Dependency file - changes could break the build or introduce vulnerabilities";
  }
  if (normalizedPath.includes("vite.config") || normalizedPath.includes("tsconfig")) {
    return "Build configuration - changes could break the development environment";
  }
  if (normalizedPath.includes(".env")) {
    return "Environment configuration - contains sensitive credentials";
  }
  if (normalizedPath.includes(".git")) {
    return "Git repository - direct modification could corrupt version history";
  }
  
  return null;
}

/**
 * Hero IDE codebase structure for context
 */
export const CODEBASE_STRUCTURE = {
  frontend: {
    pages: [
      "Home.tsx - Landing page with welcome message",
      "Projects.tsx - Project list with create dialog",
      "Chat.tsx - AI chat interface",
      "Agents.tsx - Agent management",
      "Board.tsx - Kanban board",
      "Settings.tsx - User settings",
      "WorkspacePage.tsx - Multi-pane IDE workspace",
    ],
    components: [
      "DashboardLayout.tsx - Main layout with sidebar",
      "KickoffWizard.tsx - Project kickoff wizard",
      "ThemeToggle.tsx - Dark/light mode toggle",
      "MobileBottomNav.tsx - Mobile navigation",
      "AIChatBox.tsx - Chat message interface",
    ],
    contexts: [
      "ThemeContext.tsx - Theme state management",
      "AuthContext.tsx - Authentication state",
    ],
  },
  backend: {
    routers: [
      "routers.ts - Main tRPC router combining all sub-routers",
      "projects/ - Project CRUD operations",
      "agents/ - Agent management",
      "chat/ - Chat messages and AI",
      "github/ - GitHub integration",
      "kickoff/ - Project kickoff wizard",
    ],
    services: [
      "db.ts - Database helper functions",
      "chatAgent.ts - AI chat processing",
      "kickoffService.ts - Kickoff document generation",
      "contextBuilder.ts - Context for AI prompts",
    ],
  },
  database: {
    tables: [
      "users - User accounts",
      "projects - Project metadata",
      "agents - AI agent configurations",
      "chat_messages - Conversation history",
      "kanban_boards/columns/cards - Kanban system",
      "project_kickoff - Kickoff wizard data",
      "project_docs - Generated spec documents",
    ],
  },
};
