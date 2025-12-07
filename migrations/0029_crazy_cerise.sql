PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rfid_uid_hash` text,
	`role_id` integer NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`surname` text NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text DEFAULT '' NOT NULL,
	`gender` text NOT NULL,
	`contact_number` text,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "rfid_uid_hash", "role_id", "email", "username", "password_hash", "surname", "first_name", "middle_name", "gender", "contact_number") SELECT "id", "rfid_uid_hash", "role_id", "email", "username", "password_hash", "surname", "first_name", "middle_name", "gender", "contact_number" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_rfid_uid_hash_unique` ON `users` (`rfid_uid_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_password_hash_unique` ON `users` (`password_hash`);