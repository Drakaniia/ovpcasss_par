CREATE TABLE `report_pics` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `report_pics_report_idx` ON `report_pics` (`report_id`);--> statement-breakpoint
CREATE TABLE `report_sdgs` (
	`report_id` text NOT NULL,
	`sdg_id` text NOT NULL,
	PRIMARY KEY(`report_id`, `sdg_id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`tracking_number` text,
	`status` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`owner_user_id` text NOT NULL,
	`classification` text NOT NULL,
	`campus_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`department` text,
	`office` text,
	`level` text NOT NULL,
	`title` text NOT NULL,
	`activity_start_date` text NOT NULL,
	`activity_end_date` text NOT NULL,
	`location` text NOT NULL,
	`total_students` integer DEFAULT 0 NOT NULL,
	`total_pic` integer DEFAULT 0 NOT NULL,
	`narrative` text DEFAULT '' NOT NULL,
	`submitted_at` text,
	`endorsed_at` text,
	`approved_at` text,
	`approved_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_tracking_number_unique_idx` ON `reports` (`tracking_number`);--> statement-breakpoint
CREATE INDEX `reports_status_type_idx` ON `reports` (`status`,`type`);--> statement-breakpoint
CREATE INDEX `reports_owner_idx` ON `reports` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `reports_activity_idx` ON `reports` (`activity_start_date`);--> statement-breakpoint
CREATE TABLE `tracking_counters` (
	`prefix` text NOT NULL,
	`year` integer NOT NULL,
	`last_seq` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`prefix`, `year`)
);
