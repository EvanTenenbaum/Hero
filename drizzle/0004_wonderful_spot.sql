CREATE TABLE `board_labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boardId` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(20) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `board_labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `card_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardId` int NOT NULL,
	`userId` int,
	`agentType` varchar(50),
	`content` text NOT NULL,
	`parentCommentId` int,
	`reactions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `card_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `card_dependencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardId` int NOT NULL,
	`blockedByCardId` int NOT NULL,
	`dependencyType` enum('blocks','relates_to','duplicates','parent_of') NOT NULL DEFAULT 'blocks',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `card_dependencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `card_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardId` int NOT NULL,
	`userId` int,
	`agentType` varchar(50),
	`eventType` enum('created','updated','moved','assigned','unassigned','labeled','unlabeled','commented','spec_linked','design_linked','blocked','unblocked','completed','reopened','archived') NOT NULL,
	`field` varchar(100),
	`oldValue` text,
	`newValue` text,
	`fromColumnId` int,
	`toColumnId` int,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `card_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_boards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`settings` json,
	`isDefault` boolean DEFAULT false,
	`archived` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kanban_boards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boardId` int NOT NULL,
	`columnId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`cardType` enum('epic','feature','task','bug','spike','chore') NOT NULL DEFAULT 'task',
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`specId` int,
	`designId` int,
	`acceptanceCriteria` json,
	`assignedAgent` enum('pm','developer','qa','devops','research'),
	`assignedUserId` int,
	`assignedBy` enum('human','pm_agent') DEFAULT 'human',
	`parentCardId` int,
	`epicId` int,
	`estimatedTokens` int,
	`actualTokens` int,
	`estimatedMinutes` int,
	`actualMinutes` int,
	`storyPoints` int,
	`labels` json,
	`githubIssueId` varchar(64),
	`githubIssueNumber` int,
	`githubPrId` varchar(64),
	`githubPrNumber` int,
	`dueDate` timestamp,
	`startDate` timestamp,
	`completedAt` timestamp,
	`position` int NOT NULL DEFAULT 0,
	`isBlocked` boolean DEFAULT false,
	`blockReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kanban_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_columns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boardId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(20),
	`columnType` enum('backlog','spec_writing','design','ready','in_progress','review','done','blocked','custom') NOT NULL DEFAULT 'custom',
	`wipLimit` int,
	`position` int NOT NULL DEFAULT 0,
	`autoMoveRules` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kanban_columns_id` PRIMARY KEY(`id`)
);
