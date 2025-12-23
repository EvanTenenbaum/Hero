-- Migration: Add Agent Memory and Audit Tables
-- Created: 2024-12-23
-- Description: Creates tables for agent memory system and audit logging

-- ============================================
-- Agent Memory Short-Term Table
-- ============================================
CREATE TABLE IF NOT EXISTS `agent_memory_short_term` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` VARCHAR(64) NOT NULL,
  `user_id` INT NOT NULL,
  `project_id` INT NULL,
  `memory_key` VARCHAR(255) NOT NULL,
  `memory_value` JSON NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `session_idx` (`session_id`, `user_id`),
  INDEX `expiration_idx` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Agent Memory Long-Term Table
-- ============================================
CREATE TABLE IF NOT EXISTS `agent_memory_long_term` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `project_id` INT NULL,
  `memory_type` VARCHAR(30) NOT NULL,
  `memory_key` VARCHAR(255) NOT NULL,
  `memory_value` JSON NOT NULL,
  `relevance_score` FLOAT NOT NULL DEFAULT 1.0,
  `access_count` INT NOT NULL DEFAULT 0,
  `last_accessed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `user_type_idx` (`user_id`, `memory_type`),
  INDEX `project_key_idx` (`project_id`, `memory_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Audit Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `project_id` INT NULL,
  `execution_id` VARCHAR(64) NULL,
  `action` VARCHAR(100) NOT NULL,
  `category` VARCHAR(30) NOT NULL DEFAULT 'general',
  `severity` VARCHAR(20) NOT NULL DEFAULT 'info',
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `user_action_idx` (`user_id`, `action`),
  INDEX `category_idx` (`category`),
  INDEX `severity_idx` (`severity`),
  INDEX `created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Execution State Table
-- ============================================
CREATE TABLE IF NOT EXISTS `execution_state` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `execution_id` VARCHAR(64) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `project_id` INT NOT NULL,
  `agent_type` VARCHAR(20) NOT NULL,
  `state` JSON NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL,
  `error` TEXT NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `execution_id_idx` (`execution_id`),
  INDEX `user_project_idx` (`user_id`, `project_id`),
  INDEX `status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Execution Checkpoints Table
-- ============================================
CREATE TABLE IF NOT EXISTS `execution_checkpoints` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `execution_id` VARCHAR(64) NOT NULL,
  `checkpoint_id` VARCHAR(64) NOT NULL,
  `state` JSON NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `unique_checkpoint_idx` (`execution_id`, `checkpoint_id`),
  INDEX `checkpoint_execution_id_idx` (`execution_id`),
  CONSTRAINT `fk_checkpoint_execution` FOREIGN KEY (`execution_id`) 
    REFERENCES `execution_state` (`execution_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Pattern Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS `pattern_cache` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pattern_id` VARCHAR(64) NOT NULL UNIQUE,
  `user_id` INT NULL,
  `project_id` INT NULL,
  `pattern_type` VARCHAR(30) NOT NULL,
  `query_signature` VARCHAR(255) NOT NULL,
  `tool_sequence` JSON NOT NULL,
  `success_count` INT NOT NULL DEFAULT 0,
  `failure_count` INT NOT NULL DEFAULT 0,
  `avg_duration_ms` INT NULL,
  `last_used_at` TIMESTAMP NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `pattern_id_idx` (`pattern_id`),
  INDEX `user_project_idx` (`user_id`, `project_id`),
  INDEX `pattern_type_idx` (`pattern_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Cleanup Job for Expired Short-Term Memory
-- ============================================
-- Note: This should be run as a scheduled job
-- DELETE FROM `agent_memory_short_term` WHERE `expires_at` < NOW();
