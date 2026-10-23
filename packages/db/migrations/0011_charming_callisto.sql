DROP TABLE `acknowledgements`;--> statement-breakpoint
DROP TABLE `tracking_counters`;--> statement-breakpoint
DROP INDEX `reports_tracking_number_unique_idx`;--> statement-breakpoint
ALTER TABLE `reports` DROP COLUMN `tracking_number`;--> statement-breakpoint
ALTER TABLE `reports` DROP COLUMN `owner_user_id`;--> statement-breakpoint
ALTER TABLE `reports` DROP COLUMN `endorsed_at`;--> statement-breakpoint
ALTER TABLE `reports` DROP COLUMN `submitter_signature_key`;--> statement-breakpoint
ALTER TABLE `reports` DROP COLUMN `submitter_signed_at`;