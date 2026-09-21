-- =========================================================
-- Personal Workspace Database Schema
-- PHP + MySQL
--
-- This file contains database structure only.
-- No personal user data is included.
--
-- Default login:
-- Username: admin
-- Password: admin123
-- =========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

SET NAMES utf8mb4;

-- =========================================================
-- Table: folders
-- =========================================================

CREATE TABLE `folders` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `parent_id` int DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- Table: growth_nodes
-- =========================================================

CREATE TABLE `growth_nodes` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `parent_id` int DEFAULT NULL,
  `folder_id` int DEFAULT NULL,
  `content` longtext,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- Table: interviews
-- =========================================================

CREATE TABLE `interviews` (
  `id` int NOT NULL,
  `company` varchar(255) NOT NULL,
  `position` varchar(255) DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL,
  `salary` varchar(100) DEFAULT NULL,
  `interview_date` date DEFAULT NULL,
  `job_scope` longtext,
  `notes` longtext,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- Table: notes
-- =========================================================

CREATE TABLE `notes` (
  `id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` longtext,
  `folder_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- Table: places
-- =========================================================

CREATE TABLE `places` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `address` text,
  `notes` longtext,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- Table: profiles
-- =========================================================

CREATE TABLE `profiles` (
  `id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- Table: todos
-- =========================================================

CREATE TABLE `todos` (
  `id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` longtext,
  `status` varchar(50) DEFAULT 'pending',
  `priority` varchar(50) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- Table: users
-- =========================================================

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- Indexes
-- =========================================================

ALTER TABLE `folders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`);

ALTER TABLE `growth_nodes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `folder_id` (`folder_id`);

ALTER TABLE `interviews`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `folder_id` (`folder_id`);

ALTER TABLE `places`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `profiles`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `todos`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

-- =========================================================
-- Auto Increment
-- =========================================================

ALTER TABLE `folders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `growth_nodes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `interviews`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `notes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `places`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `profiles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `todos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

-- =========================================================
-- Default Admin Account
-- =========================================================

INSERT INTO `users` (`id`, `username`, `password`, `created_at`) VALUES
(1, 'admin', MD5('admin123'), NOW());

-- =========================================================
-- Finish
-- =========================================================

COMMIT;
