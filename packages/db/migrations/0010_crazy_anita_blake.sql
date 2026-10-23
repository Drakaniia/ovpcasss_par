ALTER TABLE `reports` ADD `narrative_signature_cleared` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `approval_signature_key` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `approval_signed_at` text;