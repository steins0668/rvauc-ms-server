CREATE TABLE `class_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` integer NOT NULL,
	`class_offering_id` integer NOT NULL,
	`date_ph` text NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`class_offering_id`) REFERENCES `class_offerings`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_class_sessions_class_offering_id_date_ph` ON `class_sessions` (`class_offering_id`,`date_ph`);