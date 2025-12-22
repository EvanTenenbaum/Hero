-- Sprint 27: Performance Indexes Migration
-- Add indexes for frequently queried columns to improve performance

-- Users table
CREATE INDEX IF NOT EXISTS idx_users_openId ON users(openId);

-- GitHub connections
CREATE INDEX IF NOT EXISTS idx_github_connections_userId ON github_connections(userId);

-- Drive connections
CREATE INDEX IF NOT EXISTS idx_drive_connections_userId ON drive_connections(userId);

-- Projects table
CREATE INDEX IF NOT EXISTS idx_projects_userId ON projects(userId);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_userId_status ON projects(userId, status);

-- Project notes
CREATE INDEX IF NOT EXISTS idx_project_notes_projectId ON project_notes(projectId);
CREATE INDEX IF NOT EXISTS idx_project_notes_userId ON project_notes(userId);
CREATE INDEX IF NOT EXISTS idx_project_notes_category ON project_notes(category);

-- Chat conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_userId ON chat_conversations(userId);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_projectId ON chat_conversations(projectId);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON chat_conversations(type);

-- Chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversationId ON chat_messages(conversationId);
CREATE INDEX IF NOT EXISTS idx_chat_messages_createdAt ON chat_messages(createdAt);

-- Agents
CREATE INDEX IF NOT EXISTS idx_agents_userId ON agents(userId);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);

-- Agent executions
CREATE INDEX IF NOT EXISTS idx_agent_executions_agentId ON agent_executions(agentId);
CREATE INDEX IF NOT EXISTS idx_agent_executions_userId ON agent_executions(userId);
CREATE INDEX IF NOT EXISTS idx_agent_executions_state ON agent_executions(state);
CREATE INDEX IF NOT EXISTS idx_agent_executions_userId_state ON agent_executions(userId, state);

-- Change requests
CREATE INDEX IF NOT EXISTS idx_change_requests_projectId ON change_requests(projectId);
CREATE INDEX IF NOT EXISTS idx_change_requests_userId ON change_requests(userId);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);

-- Violations
CREATE INDEX IF NOT EXISTS idx_violations_userId ON violations(userId);
CREATE INDEX IF NOT EXISTS idx_violations_projectId ON violations(projectId);
CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(type);

-- Budget usage
CREATE INDEX IF NOT EXISTS idx_budget_usage_userId ON budget_usage(userId);
CREATE INDEX IF NOT EXISTS idx_budget_usage_projectId ON budget_usage(projectId);
CREATE INDEX IF NOT EXISTS idx_budget_usage_createdAt ON budget_usage(createdAt);

-- Metrics daily - CRITICAL for dashboard performance
CREATE INDEX IF NOT EXISTS idx_metrics_daily_userId ON metrics_daily(userId);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_date ON metrics_daily(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_daily_userId_date ON metrics_daily(userId, date);

-- Requirements
CREATE INDEX IF NOT EXISTS idx_requirements_projectId ON requirements(projectId);
CREATE INDEX IF NOT EXISTS idx_requirements_userId ON requirements(userId);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);

-- Technical designs
CREATE INDEX IF NOT EXISTS idx_technical_designs_requirementId ON technical_designs(requirementId);
CREATE INDEX IF NOT EXISTS idx_technical_designs_projectId ON technical_designs(projectId);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_designId ON tasks(designId);
CREATE INDEX IF NOT EXISTS idx_tasks_projectId ON tasks(projectId);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Kanban boards
CREATE INDEX IF NOT EXISTS idx_kanban_boards_projectId ON kanban_boards(projectId);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_userId ON kanban_boards(userId);

-- Kanban columns
CREATE INDEX IF NOT EXISTS idx_kanban_columns_boardId ON kanban_columns(boardId);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_position ON kanban_columns(boardId, position);

-- Kanban cards - CRITICAL for board performance
CREATE INDEX IF NOT EXISTS idx_kanban_cards_columnId ON kanban_cards(columnId);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_position ON kanban_cards(columnId, position);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_assignedUserId ON kanban_cards(assignedUserId);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_sprintId ON kanban_cards(sprintId);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_dueDate ON kanban_cards(dueDate);

-- Card dependencies
CREATE INDEX IF NOT EXISTS idx_card_dependencies_cardId ON card_dependencies(cardId);
CREATE INDEX IF NOT EXISTS idx_card_dependencies_blockedByCardId ON card_dependencies(blockedByCardId);

-- Card history
CREATE INDEX IF NOT EXISTS idx_card_history_cardId ON card_history(cardId);
CREATE INDEX IF NOT EXISTS idx_card_history_createdAt ON card_history(createdAt);

-- Card comments
CREATE INDEX IF NOT EXISTS idx_card_comments_cardId ON card_comments(cardId);

-- Board labels
CREATE INDEX IF NOT EXISTS idx_board_labels_boardId ON board_labels(boardId);

-- Agent logs
CREATE INDEX IF NOT EXISTS idx_agent_logs_executionId ON agent_logs(executionId);
CREATE INDEX IF NOT EXISTS idx_agent_logs_userId ON agent_logs(userId);
CREATE INDEX IF NOT EXISTS idx_agent_logs_createdAt ON agent_logs(createdAt);

-- Execution steps
CREATE INDEX IF NOT EXISTS idx_execution_steps_executionId ON execution_steps(executionId);
CREATE INDEX IF NOT EXISTS idx_execution_steps_status ON execution_steps(status);

-- Agent sessions
CREATE INDEX IF NOT EXISTS idx_agent_sessions_userId ON agent_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_projectId ON agent_sessions(projectId);

-- Context chunks
CREATE INDEX IF NOT EXISTS idx_context_chunks_projectId ON context_chunks(projectId);
CREATE INDEX IF NOT EXISTS idx_context_chunks_type ON context_chunks(type);

-- Spec documents
CREATE INDEX IF NOT EXISTS idx_spec_documents_projectId ON spec_documents(projectId);
CREATE INDEX IF NOT EXISTS idx_spec_documents_type ON spec_documents(type);
CREATE INDEX IF NOT EXISTS idx_spec_documents_status ON spec_documents(status);

-- Spec sections
CREATE INDEX IF NOT EXISTS idx_spec_sections_documentId ON spec_sections(documentId);
CREATE INDEX IF NOT EXISTS idx_spec_sections_position ON spec_sections(documentId, position);

-- Kickoff sessions
CREATE INDEX IF NOT EXISTS idx_kickoff_sessions_projectId ON kickoff_sessions(projectId);
CREATE INDEX IF NOT EXISTS idx_kickoff_sessions_userId ON kickoff_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_kickoff_sessions_status ON kickoff_sessions(status);
