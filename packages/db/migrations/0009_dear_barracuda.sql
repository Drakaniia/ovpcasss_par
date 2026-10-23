CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`recipient_pic_id` text NOT NULL,
	`recipient_user_id` text,
	`recipient_name` text NOT NULL,
	`object_key` text NOT NULL,
	`generated_at` text NOT NULL,
	`emailed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_report_recipient_unique_idx` ON `receipts` (`report_id`,`recipient_pic_id`);--> statement-breakpoint
CREATE INDEX `receipts_report_idx` ON `receipts` (`report_id`);--> statement-breakpoint
CREATE INDEX `receipts_user_idx` ON `receipts` (`recipient_user_id`);--> statement-breakpoint
CREATE TABLE `reference_counters` (
	`name` text PRIMARY KEY NOT NULL,
	`last_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP INDEX `attachments_object_key_unique_idx`;--> statement-breakpoint
DROP INDEX `attachments_report_idx`;--> statement-breakpoint
CREATE INDEX `attachments_status_idx` ON `attachments` (`status`);--> statement-breakpoint
CREATE INDEX `attachments_report_idx` ON `attachments` (`report_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_no` text NOT NULL,
	`sequence` integer NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_by_user_id` text NOT NULL,
	`tracking_number` text,
	`owner_user_id` text,
	`endorsed_at` text,
	`submitter_signature_key` text,
	`submitter_signed_at` text,
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
	`activity_count` integer DEFAULT 1 NOT NULL,
	`total_students` integer DEFAULT 0 NOT NULL,
	`total_pic` integer DEFAULT 0 NOT NULL,
	`narrative` text DEFAULT '' NOT NULL,
	`draft_form` text,
	`submitted_by_user_id` text,
	`narrative_signature_key` text,
	`narrative_signed_at` text,
	`submitted_at` text,
	`approved_at` text,
	`approved_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_reports`("id", "reference_no", "sequence", "type", "status", "version", "created_by_user_id", "tracking_number", "owner_user_id", "endorsed_at", "submitter_signature_key", "submitter_signed_at", "classification", "campus_id", "unit_id", "department", "office", "level", "title", "activity_start_date", "activity_end_date", "location", "activity_count", "total_students", "total_pic", "narrative", "draft_form", "submitted_by_user_id", "narrative_signature_key", "narrative_signed_at", "submitted_at", "approved_at", "approved_by_user_id", "created_at", "updated_at") SELECT "id", "reference_no", "sequence", "type", "status", "version", "created_by_user_id", "tracking_number", "owner_user_id", "endorsed_at", "submitter_signature_key", "submitter_signed_at", "classification", "campus_id", "unit_id", "department", "office", "level", "title", "activity_start_date", "activity_end_date", "location", "activity_count", "total_students", "total_pic", "narrative", "draft_form", "submitted_by_user_id", "narrative_signature_key", "narrative_signed_at", "submitted_at", "approved_at", "approved_by_user_id", "created_at", "updated_at" FROM `reports`;--> statement-breakpoint
DROP TABLE `reports`;--> statement-breakpoint
ALTER TABLE `__new_reports` RENAME TO `reports`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `reports_reference_no_unique_idx` ON `reports` (`reference_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `reports_tracking_number_unique_idx` ON `reports` (`tracking_number`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE INDEX `reports_created_by_idx` ON `reports` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `reports_activity_idx` ON `reports` (`activity_start_date`);--> statement-breakpoint
CREATE INDEX `reports_submitted_idx` ON `reports` (`submitted_at`);--> statement-breakpoint
CREATE TABLE `__new_report_pics` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`invited_at` text
);
--> statement-breakpoint
INSERT INTO `__new_report_pics`("id", "report_id", "user_id", "name", "email", "phone", "sort_order", "invited_at") SELECT "id", "report_id", "user_id", "name", "email", "phone", "sort_order", "invited_at" FROM `report_pics`;--> statement-breakpoint
DROP TABLE `report_pics`;--> statement-breakpoint
ALTER TABLE `__new_report_pics` RENAME TO `report_pics`;--> statement-breakpoint
CREATE INDEX `report_pics_report_idx` ON `report_pics` (`report_id`);--> statement-breakpoint
CREATE INDEX `report_pics_user_idx` ON `report_pics` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `report_pics_report_email_unique_idx` ON `report_pics` (`report_id`,`email`);