PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_class_offerings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` integer NOT NULL,
	`class_number` text NOT NULL,
	`week_day` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`start_time_text` text NOT NULL,
	`end_time_text` text NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
DROP TABLE `class_offerings`;--> statement-breakpoint
ALTER TABLE `__new_class_offerings` RENAME TO `class_offerings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;