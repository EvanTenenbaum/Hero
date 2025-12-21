CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sprintId` int,
	`name` varchar(255) NOT NULL,
	`type` enum('tokens','api_calls','compute_hours','storage','custom') NOT NULL,
	`allocatedAmount` decimal(15,4) NOT NULL,
	`usedAmount` decimal(15,4) DEFAULT '0',
	`unit` varchar(50) DEFAULT 'units',
	`costPerUnit` decimal(10,6),
	`alertThreshold` decimal(5,2) DEFAULT '80',
	`status` enum('active','warning','exceeded','closed') DEFAULT 'active',
	`startDate` timestamp,
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cost_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`projectId` int NOT NULL,
	`sprintId` int,
	`cardId` int,
	`agentId` int,
	`executionId` int,
	`type` enum('llm_tokens','embedding_tokens','api_call','compute','storage','other') NOT NULL,
	`description` text,
	`quantity` decimal(15,4) NOT NULL,
	`unitCost` decimal(10,6),
	`totalCost` decimal(15,4),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cost_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_cost_aggregates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sprintId` int,
	`date` timestamp NOT NULL,
	`llmTokens` bigint DEFAULT 0,
	`embeddingTokens` bigint DEFAULT 0,
	`apiCalls` int DEFAULT 0,
	`computeMinutes` decimal(10,2) DEFAULT '0',
	`storageMb` decimal(10,2) DEFAULT '0',
	`totalCost` decimal(15,4) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_cost_aggregates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sprint_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sprintId` int NOT NULL,
	`date` timestamp NOT NULL,
	`totalPoints` int DEFAULT 0,
	`completedPoints` int DEFAULT 0,
	`remainingPoints` int DEFAULT 0,
	`addedPoints` int DEFAULT 0,
	`removedPoints` int DEFAULT 0,
	`tasksTotal` int DEFAULT 0,
	`tasksCompleted` int DEFAULT 0,
	`tasksInProgress` int DEFAULT 0,
	`blockedTasks` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sprint_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`goal` text,
	`status` enum('planning','active','completed','cancelled') NOT NULL DEFAULT 'planning',
	`startDate` timestamp,
	`endDate` timestamp,
	`plannedPoints` int DEFAULT 0,
	`completedPoints` int DEFAULT 0,
	`velocity` decimal(10,2),
	`retrospective` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `velocity_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sprintId` int NOT NULL,
	`sprintNumber` int NOT NULL,
	`pointsCommitted` int DEFAULT 0,
	`pointsCompleted` int DEFAULT 0,
	`pointsCarriedOver` int DEFAULT 0,
	`durationDays` int,
	`teamSize` int DEFAULT 1,
	`velocityPerDay` decimal(10,2),
	`rollingAverage3` decimal(10,2),
	`rollingAverage5` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `velocity_history_id` PRIMARY KEY(`id`)
);
