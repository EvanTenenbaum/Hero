CREATE TABLE `agent_checkpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`executionId` int NOT NULL,
	`userId` int NOT NULL,
	`stepNumber` int NOT NULL,
	`description` varchar(500),
	`state` json NOT NULL,
	`rollbackData` json,
	`automatic` boolean DEFAULT true,
	`tokensUsedAtCheckpoint` int DEFAULT 0,
	`costAtCheckpoint` varchar(20) DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_checkpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hook_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hookId` int NOT NULL,
	`userId` int NOT NULL,
	`triggerEvent` varchar(255) NOT NULL,
	`triggerData` json,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`result` text,
	`error` text,
	`durationMs` int,
	`tokensUsed` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `hook_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`triggerType` enum('file_save','file_create','pre_commit','post_commit','schedule') NOT NULL,
	`triggerPattern` varchar(500),
	`triggerDirectories` json,
	`action` text NOT NULL,
	`systemPrompt` text,
	`enabled` boolean DEFAULT true,
	`dryRunMode` boolean DEFAULT false,
	`lastExecutedAt` timestamp,
	`executionCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metrics_daily` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`date` varchar(10) NOT NULL,
	`messagesCount` int DEFAULT 0,
	`tokensUsed` int DEFAULT 0,
	`costUsd` varchar(20) DEFAULT '0.00',
	`agentExecutionsCount` int DEFAULT 0,
	`agentTasksCompleted` int DEFAULT 0,
	`agentTasksFailed` int DEFAULT 0,
	`linesGenerated` int DEFAULT 0,
	`filesModified` int DEFAULT 0,
	`totalExecutionTimeMs` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metrics_daily_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`category` enum('architecture','decisions','todos','bugs','context','requirements','api') NOT NULL DEFAULT 'context',
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`tags` json,
	`priority` enum('low','medium','high') DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`userStories` json,
	`assumptions` json,
	`edgeCases` json,
	`status` enum('draft','pending_review','approved','rejected','implemented') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `requirements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `technical_designs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requirementId` int NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dataFlow` json,
	`interfaces` json,
	`schemas` json,
	`endpoints` json,
	`status` enum('draft','pending_review','approved','rejected','implemented') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technical_designs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `type` enum('coder','reviewer','planner','frontend','backend','qa','security','docs','refactor','custom') NOT NULL DEFAULT 'custom';--> statement-breakpoint
ALTER TABLE `agents` ADD `role` enum('frontend','backend','qa','security','docs','refactor','general') DEFAULT 'general';--> statement-breakpoint
ALTER TABLE `agents` ADD `roleScope` json;--> statement-breakpoint
ALTER TABLE `agents` ADD `trustLevel` enum('low','medium','high') DEFAULT 'low';--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `compactedAt` timestamp;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `compactionSummary` text;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `compacted` boolean DEFAULT false;