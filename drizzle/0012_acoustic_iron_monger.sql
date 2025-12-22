CREATE TABLE `project_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`doc_type` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`version` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_kickoff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`purpose` text,
	`target_user` text,
	`problem_solved` text,
	`success_metrics` json,
	`non_goals` json,
	`user_stories` json,
	`mvp_included` json,
	`mvp_excluded` json,
	`ux_principles` json,
	`tech_stack` json,
	`entities` json,
	`integrations` json,
	`constraints` json,
	`ci_gates` json,
	`testing_strategy` json,
	`regression_policy` json,
	`slices` json,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_kickoff_id` PRIMARY KEY(`id`)
);
