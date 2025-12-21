ALTER TABLE `specs` ADD `phase` enum('specify','design','tasks','implement','complete') DEFAULT 'specify' NOT NULL;--> statement-breakpoint
ALTER TABLE `specs` ADD `phaseStatus` enum('draft','pending_review','approved','rejected') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `specs` ADD `originalPrompt` text;--> statement-breakpoint
ALTER TABLE `specs` ADD `clarifications` json;--> statement-breakpoint
ALTER TABLE `specs` ADD `diagrams` json;--> statement-breakpoint
ALTER TABLE `specs` ADD `fileManifest` json;--> statement-breakpoint
ALTER TABLE `specs` ADD `taskBreakdown` json;--> statement-breakpoint
ALTER TABLE `specs` ADD `dependencyGraph` json;--> statement-breakpoint
ALTER TABLE `specs` ADD `implementationProgress` json;--> statement-breakpoint
ALTER TABLE `specs` ADD `approvalHistory` json;