PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_no` text NOT NULL,
	`sequence` integer NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_by_user_id` text NOT NULL,
	`classification` text NOT NULL,
	`campus_id` text,
	`unit_id` text,
	`department` text,
	`office` text,
	`level` text NOT NULL,
	`title` text NOT NULL,
	`activity_start_date` text NOT NULL,
	`activity_end_date` text NOT NULL,
	`location` text NOT NULL,
	`activity_count` integer DEFAULT 1 NOT NULL,
	`total_students` integer DEFAULT 0 NOT NULL,
	`total_pic` integer DEFAULT 0 NOT NULL,
	`narrative` text DEFAULT '' NOT NULL,
	`draft_form` text,
	`submitted_by_user_id` text,
	`narrative_signature_key` text,
	`narrative_signed_at` text,
	`narrative_signature_cleared` integer DEFAULT false NOT NULL,
	`approval_signature_key` text,
	`approval_signed_at` text,
	`submitted_at` text,
	`approved_at` text,
	`approved_by_user_id` text,
	`archived_at` text,
	`archived_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_reports`("id", "reference_no", "sequence", "type", "status", "version", "created_by_user_id", "classification", "campus_id", "unit_id", "department", "office", "level", "title", "activity_start_date", "activity_end_date", "location", "activity_count", "total_students", "total_pic", "narrative", "draft_form", "submitted_by_user_id", "narrative_signature_key", "narrative_signed_at", "narrative_signature_cleared", "approval_signature_key", "approval_signed_at", "submitted_at", "approved_at", "approved_by_user_id", "archived_at", "archived_by_user_id", "created_at", "updated_at") SELECT "id", "reference_no", "sequence", "type", "status", "version", "created_by_user_id", "classification", "campus_id", "unit_id", "department", "office", "level", "title", "activity_start_date", "activity_end_date", "location", "activity_count", "total_students", "total_pic", "narrative", "draft_form", "submitted_by_user_id", "narrative_signature_key", "narrative_signed_at", "narrative_signature_cleared", "approval_signature_key", "approval_signed_at", "submitted_at", "approved_at", "approved_by_user_id", "archived_at", "archived_by_user_id", "created_at", "updated_at" FROM `reports`;--> statement-breakpoint
DROP TABLE `reports`;--> statement-breakpoint
ALTER TABLE `__new_reports` RENAME TO `reports`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `reports_reference_no_unique_idx` ON `reports` (`reference_no`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE INDEX `reports_created_by_idx` ON `reports` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `reports_activity_idx` ON `reports` (`activity_start_date`);--> statement-breakpoint
CREATE INDEX `reports_submitted_idx` ON `reports` (`submitted_at`);--> statement-breakpoint
CREATE INDEX `reports_archived_idx` ON `reports` (`archived_at`);