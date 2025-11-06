ALTER TABLE `password_reset_tokens` RENAME TO `password_reset_codes`;--> statement-breakpoint
ALTER TABLE `password_reset_codes` RENAME COLUMN "token_hash" TO "code_hash";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_password_reset_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`is_used` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_password_reset_codes`("id", "user_id", "code_hash", "created_at", "expires_at", "is_used") SELECT "id", "user_id", "code_hash", "created_at", "expires_at", "is_used" FROM `password_reset_codes`;--> statement-breakpoint
DROP TABLE `password_reset_codes`;--> statement-breakpoint
ALTER TABLE `__new_password_reset_codes` RENAME TO `password_reset_codes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_codes_code_hash_unique` ON `password_reset_codes` (`code_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_codes_active_code_uidx` ON `password_reset_codes` (`user_id`,`is_used`) WHERE "password_reset_codes"."is_used" = false;