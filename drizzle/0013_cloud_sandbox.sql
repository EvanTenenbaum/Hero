-- Cloud Sandbox Migration
-- Adds support for E2B cloud sandbox execution

-- Add cloud sandbox columns to projects table
ALTER TABLE `projects` ADD COLUMN `repo_owner` varchar(255);
ALTER TABLE `projects` ADD COLUMN `repo_name` varchar(255);
ALTER TABLE `projects` ADD COLUMN `github_installation_id` varchar(255);
ALTER TABLE `projects` ADD COLUMN `default_branch` varchar(255) DEFAULT 'main';
ALTER TABLE `projects` ADD COLUMN `use_cloud_sandbox` boolean DEFAULT false;

-- Create project_secrets table for encrypted runtime secrets
CREATE TABLE IF NOT EXISTS `project_secrets` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `key` varchar(255) NOT NULL,
  `encryptedValue` text NOT NULL,
  `description` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY `project_key_unique` (`projectId`, `key`),
  KEY `idx_project_secrets_project_id` (`projectId`)
);

-- Add index for cloud sandbox queries
CREATE INDEX `idx_projects_cloud_sandbox` ON `projects` (`use_cloud_sandbox`);
CREATE INDEX `idx_projects_repo` ON `projects` (`repo_owner`, `repo_name`);
