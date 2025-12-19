# Hero IDE - Project TODO

## Phase 1: Database Schema
- [x] Users table with roles (admin/user)
- [x] Projects table with metadata and settings
- [x] Chat messages table with conversation history
- [x] Agents table with configuration and state
- [x] Agent executions table for tracking runs
- [x] Secrets table for encrypted API keys
- [x] GitHub connections table for OAuth tokens
- [x] Governance rules table
- [x] Change requests table for lifecycle tracking
- [x] Budget tracking table

## Phase 2: Authentication
- [x] Manus OAuth integration (using built-in auth)
- [x] Session management with JWT
- [x] User role management (admin/user)
- [x] Protected routes and procedures

## Phase 3: LLM Integration
- [x] Gemini API integration via built-in LLM helper
- [x] Streaming chat responses
- [x] Chat history persistence
- [x] Markdown rendering with Streamdown
- [x] System prompts and context management

## Phase 4: GitHub Integration
- [ ] GitHub OAuth token storage
- [ ] Repository listing and search
- [ ] Repository cloning/import
- [ ] File browsing and tree view
- [ ] File content viewing and editing
- [ ] Branch management
- [ ] Pull request creation and viewing
- [ ] Issue tracking integration

## Phase 5: Project Management
- [x] Create new project
- [ ] Import from GitHub
- [ ] Clone repository
- [x] Project settings
- [ ] File editor with syntax highlighting
- [x] Project dashboard

## Phase 6: Agent System
- [x] Agent configuration and rules
- [x] Agent execution engine (basic)
- [x] Goal declaration and validation
- [x] Step-by-step execution with checkpoints
- [x] Uncertainty threshold monitoring
- [x] Automatic halting on violations
- [x] Budget tracking per execution
- [ ] Rollback capability

## Phase 7: Settings Management
- [ ] API connections management
- [x] Secrets management (encrypted)
- [x] Agent rules configuration
- [x] Budget limits configuration
- [x] Model routing configuration
- [ ] MCP server configuration (future)

## Phase 8: Governance System
- [x] 8-step change lifecycle (schema)
- [x] Change request creation
- [x] Approval workflow
- [x] Violation detection
- [x] Audit logging
- [ ] Risk assessment UI

## Phase 9: UI Components
- [x] Dashboard layout with sidebar
- [x] Projects screen
- [x] Chat screen with streaming
- [x] Agents screen with monitoring
- [x] Settings screen with tabs
- [ ] File editor component
- [ ] Repository browser component

## Phase 10: Testing & QA
- [x] Unit tests for core procedures (19 tests passing)
- [x] Integration tests for auth flow
- [ ] Agent execution tests
- [ ] Governance workflow tests

## Roadmap: Next Steps for Feature Completion

### Priority 1: GitHub Integration (Critical for IDE functionality)
- [ ] Implement GitHub OAuth flow for user token storage
- [ ] Build repository browser component
- [ ] Implement file tree navigation
- [ ] Add Monaco editor for code editing
- [ ] Enable commit and push functionality

### Priority 2: Advanced Agent Features
- [ ] Implement full agent execution loop with LLM
- [ ] Add real-time execution monitoring
- [ ] Build rollback mechanism
- [ ] Add execution history and replay

### Priority 3: Enhanced Governance
- [ ] Build risk assessment scoring
- [ ] Add change diff visualization
- [ ] Implement approval notifications
- [ ] Add governance dashboard

### Priority 4: MCP Integration (Future)
- [ ] MCP server connection management
- [ ] Tool discovery and registration
- [ ] Tool execution from agents

