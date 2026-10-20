CREATE TABLE `acknowledgements` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`object_key` text NOT NULL,
	`generated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acknowledgements_report_unique_idx` ON `acknowledgements` (`report_id`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`original_name` text NOT NULL,
	`object_key` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`mime_type` text DEFAULT '' NOT NULL,
	`sha256` text,
	`status` text NOT NULL,
	`uploaded_by_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `attachments_report_idx` ON `attachments` (`report_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `attachments_object_key_unique_idx` ON `attachments` (`object_key`);--> statement-breakpoint
CREATE TABLE `report_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`kind` text NOT NULL,
	`round` integer DEFAULT 1 NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `report_comments_report_idx` ON `report_comments` (`report_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `reports` ADD `draft_form` text;