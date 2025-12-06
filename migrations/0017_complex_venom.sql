PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attendance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`enrollment_id` integer NOT NULL,
	`status_id` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`status_id`) REFERENCES `attendance_statuses`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
DROP TABLE `attendance_records`;--> statement-breakpoint
ALTER TABLE `__new_attendance_records` RENAME TO `attendance_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;