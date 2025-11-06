CREATE TABLE `sign_in_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`is_used` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sign_in_requests_code_hash_unique` ON `sign_in_requests` (`code_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `sign_in_requests_active_code_uidx` ON `sign_in_requests` (`user_id`,`is_used`) WHERE "sign_in_requests"."is_used" = false;