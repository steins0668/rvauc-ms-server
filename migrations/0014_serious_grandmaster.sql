ALTER TABLE `users` ADD `rfid_uid` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_rfid_uid_unique` ON `users` (`rfid_uid`);