CREATE TABLE `agent_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`conversationId` int,
	`goal` text NOT NULL,
	`assumptions` json,
	`stoppingConditions` json,
	`state` enum('idle','planning','executing','waiting_approval','halted','completed','failed') NOT NULL DEFAULT 'idle',
	`currentStep` int DEFAULT 0,
	`totalSteps` int DEFAULT 0,
	`steps` json,
	`haltReason` enum('max_steps_reached','uncertainty_threshold','scope_expansion','budget_exceeded','user_requested','violation_detected','goal_invalid','dependency_failed','context_changed'),
	`haltMessage` text,
	`totalTokensUsed` int DEFAULT 0,
	`totalCostUsd` varchar(20) DEFAULT '0.00',
	`totalDurationMs` int DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('coder','reviewer','planner','custom') NOT NULL DEFAULT 'custom',
	`systemPrompt` text,
	`model` varchar(64) DEFAULT 'gemini-2.5-flash',
	`temperature` varchar(10) DEFAULT '0.7',
	`maxTokens` int DEFAULT 8192,
	`maxSteps` int DEFAULT 10,
	`uncertaintyThreshold` int DEFAULT 70,
	`allowScopeExpansion` boolean DEFAULT false,
	`requireApprovalForChanges` boolean DEFAULT true,
	`autoCheckpoint` boolean DEFAULT true,
	`budgetLimitUsd` varchar(20) DEFAULT '1.00',
	`budgetLimitTokens` int DEFAULT 100000,
	`rules` json,
	`enabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`agentExecutionId` int,
	`tokensUsed` int NOT NULL,
	`costUsd` varchar(20) NOT NULL,
	`model` varchar(64),
	`operation` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budget_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `change_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`agentExecutionId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` enum('code_change','config_change','dependency_change','schema_change','deployment','other') NOT NULL DEFAULT 'code_change',
	`scope` json,
	`lifecycleStep` enum('declare_intent','scope_definition','risk_assessment','preview_changes','approval_request','apply_changes','verification','completion') NOT NULL DEFAULT 'declare_intent',
	`status` enum('draft','pending_review','approved','rejected','in_progress','completed','rolled_back') NOT NULL DEFAULT 'draft',
	`riskLevel` enum('low','medium','high','critical'),
	`riskFactors` json,
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`changesApplied` json,
	`rollbackAvailable` boolean DEFAULT false,
	`rollbackData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `change_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`title` varchar(255),
	`type` enum('general','project','agent') NOT NULL DEFAULT 'general',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`model` varchar(64),
	`tokensUsed` int,
	`costUsd` varchar(20),
	`toolCalls` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `github_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`githubId` varchar(64) NOT NULL,
	`githubUsername` varchar(255) NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`scopes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `github_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('local','github','imported') NOT NULL DEFAULT 'local',
	`githubRepoId` varchar(64),
	`githubRepoFullName` varchar(255),
	`githubDefaultBranch` varchar(255),
	`githubCloneUrl` text,
	`settings` json,
	`status` enum('active','archived','deleted') NOT NULL DEFAULT 'active',
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `secrets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`name` varchar(255) NOT NULL,
	`key` varchar(255) NOT NULL,
	`encryptedValue` text NOT NULL,
	`description` text,
	`category` enum('api_key','oauth_token','database','other') DEFAULT 'other',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `secrets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthlyBudgetLimitUsd` varchar(20) DEFAULT '50.00',
	`dailyBudgetLimitUsd` varchar(20) DEFAULT '10.00',
	`defaultModel` varchar(64) DEFAULT 'gemini-2.5-flash',
	`modelRouting` json,
	`notifyOnViolation` boolean DEFAULT true,
	`notifyOnBudgetWarning` boolean DEFAULT true,
	`notifyOnAgentCompletion` boolean DEFAULT true,
	`theme` enum('light','dark','system') DEFAULT 'system',
	`sidebarCollapsed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `violations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`userId` int NOT NULL,
	`agentExecutionId` int,
	`changeRequestId` int,
	`type` enum('scope_exceeded','budget_exceeded','unauthorized_change','rule_violation','safety_violation','approval_bypassed') NOT NULL,
	`severity` enum('warning','error','critical') NOT NULL DEFAULT 'warning',
	`description` text NOT NULL,
	`context` json,
	`resolved` boolean DEFAULT false,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;