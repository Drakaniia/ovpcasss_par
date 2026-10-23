ALTER TABLE `reports` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `archived_by_user_id` text;--> statement-breakpoint
CREATE INDEX `reports_archived_idx` ON `reports` (`archived_at`);