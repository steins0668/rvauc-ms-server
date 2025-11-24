ALTER TABLE `users` RENAME COLUMN "rfid_uid" TO "rfid_uid_hash";--> statement-breakpoint
DROP INDEX `users_rfid_uid_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_rfid_uid_hash_unique` ON `users` (`rfid_uid_hash`);