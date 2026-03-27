CREATE TABLE `rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`building` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_rooms_name_building` ON `rooms` (`name`,`building`);--> statement-breakpoint
ALTER TABLE `class_offerings` ADD `room_id` integer REFERENCES rooms(id);