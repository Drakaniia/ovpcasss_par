PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_report_pics` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`invited_at` text
);
--> statement-breakpoint
INSERT INTO `__new_report_pics`("id", "report_id", "user_id", "name", "email", "phone", "sort_order", "invited_at") SELECT "id", "report_id", "user_id", "name", "email", "phone", "sort_order", "invited_at" FROM `report_pics`;--> statement-breakpoint
DROP TABLE `report_pics`;--> statement-breakpoint
ALTER TABLE `__new_report_pics` RENAME TO `report_pics`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `report_pics_report_idx` ON `report_pics` (`report_id`);--> statement-breakpoint
CREATE INDEX `report_pics_user_idx` ON `report_pics` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `report_pics_report_email_unique_idx` ON `report_pics` (`report_id`,`email`);