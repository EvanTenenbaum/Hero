CREATE TABLE `spec_card_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`specId` int NOT NULL,
	`cardId` int NOT NULL,
	`linkType` enum('implements','blocks','related') NOT NULL DEFAULT 'implements',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spec_card_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spec_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`specId` int NOT NULL,
	`userId` int NOT NULL,
	`parentCommentId` int,
	`content` text NOT NULL,
	`resolved` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spec_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spec_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`specId` int NOT NULL,
	`version` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`overview` text,
	`requirements` json,
	`technicalDesign` text,
	`dataModel` text,
	`apiDesign` text,
	`changeType` enum('created','updated','status_change','approved') NOT NULL,
	`changeSummary` text,
	`changedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spec_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `specs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`status` enum('draft','review','approved','implemented','archived') NOT NULL DEFAULT 'draft',
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`overview` text,
	`requirements` json,
	`technicalDesign` text,
	`dataModel` text,
	`apiDesign` text,
	`uiMockups` json,
	`estimatedHours` int,
	`actualHours` int,
	`completionPercentage` int DEFAULT 0,
	`parentSpecId` int,
	`currentVersion` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `specs_id` PRIMARY KEY(`id`)
);
