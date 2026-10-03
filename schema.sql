-- ============================================================================
-- Database Schema for Bites & Clicks - User Feedback System
-- Table: user_feedback
-- ============================================================================

-- Optional: Create database if it does not exist
CREATE DATABASE IF NOT EXISTS `biteclicks_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `biteclicks_db`;

-- Drop table if needing a clean reset (commented out for safety)
-- DROP TABLE IF EXISTS `user_feedback`;

-- 1. Create table `user_feedback`
CREATE TABLE IF NOT EXISTS `user_feedback` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL COMMENT "User's full name",
    `email` VARCHAR(255) NOT NULL COMMENT "User's email address",
    `message` TEXT NOT NULL COMMENT "Suggestions, review, or feedback message",
    `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT "Timestamp when feedback was submitted",
    
    -- Helpful index for chronological querying & reporting
    INDEX `idx_submitted_at` (`submitted_at`),
    INDEX `idx_email` (`email`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
