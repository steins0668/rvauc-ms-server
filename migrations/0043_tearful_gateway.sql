ALTER TABLE `attendance_records` ADD `created_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `updated_by_user_id` integer REFERENCES users(id);