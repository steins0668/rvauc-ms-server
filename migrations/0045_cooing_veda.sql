ALTER TABLE `compliance_records` ADD `created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `compliance_records` ADD `updated_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `compliance_records` ADD `updated_by_user_id` integer REFERENCES users(id);