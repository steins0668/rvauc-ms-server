PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attendance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`class_id` integer NOT NULL,
	`status` text NOT NULL,
	`record_count` integer DEFAULT 1 NOT NULL,
	`recorded_at` text NOT NULL,
	`recorded_ms` integer NOT NULL,
	`date_ph` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_attendance_records`("id", "student_id", "class_id", "status", "record_count", "recorded_at", "recorded_ms", "date_ph") SELECT "id", "student_id", "class_id", "status", "record_count", "recorded_at", "recorded_ms", "date_ph" FROM `attendance_records`;--> statement-breakpoint
DROP TABLE `attendance_records`;--> statement-breakpoint
ALTER TABLE `__new_attendance_records` RENAME TO `attendance_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_attendance_records_student_id_class_id_date_ph` ON `attendance_records` (`student_id`,`class_id`,`date_ph`);