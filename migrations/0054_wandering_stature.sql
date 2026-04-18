PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_enrollments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`class_id` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_enrollments`("id", "student_id", "class_id", "status") SELECT "id", "student_id", NULL, "status" FROM `enrollments`;--> statement-breakpoint
DROP TABLE `enrollments`;--> statement-breakpoint
ALTER TABLE `__new_enrollments` RENAME TO `enrollments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;