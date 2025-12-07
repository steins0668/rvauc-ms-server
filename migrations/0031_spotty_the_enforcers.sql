PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`professor_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`term_id` integer NOT NULL,
	`class_number` text NOT NULL,
	FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_classes`("id", "professor_id", "course_id", "term_id", "class_number") SELECT "id", "professor_id", "course_id", "term_id", "class_number" FROM `classes`;--> statement-breakpoint
DROP TABLE `classes`;--> statement-breakpoint
ALTER TABLE `__new_classes` RENAME TO `classes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;