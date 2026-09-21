-- =========================================================
-- Personal Workspace Database Schema
-- 与 api.php + app.js 完全匹配
--
-- 默认登录：
-- 用户名：admin
-- 密码：admin123
-- =========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- =========================================================
-- Table: users（用户登录）
-- =========================================================
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Table: growth_nodes（个人提升，Notion 风格树形结构）
-- =========================================================
CREATE TABLE `growth_nodes` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('folder','file') NOT NULL DEFAULT 'file',
  `content` longtext,
  `parent_id` varchar(64) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  KEY `sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Table: todos（待办事项）
-- =========================================================
CREATE TABLE `todos` (
  `id` varchar(64) NOT NULL,
  `text` varchar(500) NOT NULL,
  `category` varchar(50) DEFAULT '',
  `priority` varchar(20) DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `reminder` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `notes` text,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `progress` varchar(20) NOT NULL DEFAULT 'notstarted',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Table: interviews（面试记录）
-- =========================================================
CREATE TABLE `interviews` (
  `id` varchar(64) NOT NULL,
  `company` varchar(255) NOT NULL,
  `position` varchar(255) DEFAULT '',
  `interview_date` date DEFAULT NULL,
  `location` varchar(255) DEFAULT '',
  `salary` varchar(100) DEFAULT '',
  `status` varchar(50) DEFAULT 'preparing',
  `notes` longtext,
  `job_scope` longtext,
  `mission` longtext,
  `services` longtext,
  `interview_script` longtext,
  `strength` longtext,
  `weakness` longtext,
  `interview_question` longtext,
  `question_to_ask` longtext,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Table: profiles（个人资料）
-- =========================================================
CREATE TABLE `profiles` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `icon` varchar(20) DEFAULT '📄',
  `content` longtext,
  `folder` varchar(100) DEFAULT '未分类',
  `file_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Table: places（好去处）
-- =========================================================
CREATE TABLE `places` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(50) DEFAULT 'other',
  `rating` int DEFAULT 0,
  `address` text,
  `notes` longtext,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 默认管理员账号
-- 用户名：admin
-- 密码：admin123
-- ⚠️ 上线前请修改密码
-- =========================================================
INSERT INTO `users` (`username`, `password`) VALUES
('admin', MD5('admin123'));

COMMIT;
