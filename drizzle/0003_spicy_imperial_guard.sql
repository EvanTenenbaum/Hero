CREATE TABLE `agent_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`executionId` int,
	`sessionId` varchar(64),
	`userId` int NOT NULL,
	`agentType` varchar(50) NOT NULL,
	`event` varchar(255) NOT NULL,
	`level` enum('debug','info','warn','error') NOT NULL DEFAULT 'info',
	`data` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`agentType` varchar(50) NOT NULL,
	`metadata` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `agent_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `execution_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`executionId` int NOT NULL,
	`stepNumber` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`input` json,
	`output` json,
	`status` enum('pending','running','awaiting_confirmation','complete','failed','skipped') NOT NULL DEFAULT 'pending',
	`requiresConfirmation` boolean DEFAULT false,
	`confirmedAt` timestamp,
	`confirmedBy` int,
	`error` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `execution_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentType` enum('pm','developer','qa','devops','research') NOT NULL,
	`version` varchar(20) NOT NULL,
	`identitySection` text NOT NULL,
	`communicationSection` text NOT NULL,
	`toolsSection` text NOT NULL,
	`safetySection` text NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prompt_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_agent_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentType` enum('pm','developer','qa','devops','research'),
	`ruleType` enum('instruction','allow','deny','confirm') NOT NULL,
	`ruleContent` text NOT NULL,
	`isActive` boolean DEFAULT true,
	`priority` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_agent_rules_id` PRIMARY KEY(`id`)
);
