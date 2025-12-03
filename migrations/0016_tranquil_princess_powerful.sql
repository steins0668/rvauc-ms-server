CREATE TABLE `class_offerings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` integer NOT NULL,
	`class_number` text NOT NULL,
	`week_day` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`professor_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`units` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_code_unique` ON `courses` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `courses_name_unique` ON `courses` (`name`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`class_id` integer NOT NULL,
	`term_id` integer NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year_start` integer NOT NULL,
	`year_end` integer NOT NULL,
	`semester` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_terms_start_end_semester` ON `terms` (`year_start`,`year_end`,`semester`);--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `term_id` integer NOT NULL REFERENCES terms(id);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_compliance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`uniform_type_id` integer NOT NULL,
	`valid_footwear` integer NOT NULL,
	`has_id` integer NOT NULL,
	`valid_upperwear` integer NOT NULL,
	`valid_bottoms` integer NOT NULL,
	`term_id` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`uniform_type_id`) REFERENCES `uniform_types`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_compliance_records`("id", "student_id", "uniform_type_id", "valid_footwear", "has_id", "valid_upperwear", "valid_bottoms", "term_id", "created_at") SELECT "id", "student_id", "uniform_type_id", "valid_footwear", "has_id", "valid_upperwear", "valid_bottoms", "term_id", "created_at" FROM `compliance_records`;--> statement-breakpoint
DROP TABLE `compliance_records`;--> statement-breakpoint
ALTER TABLE `__new_compliance_records` RENAME TO `compliance_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;