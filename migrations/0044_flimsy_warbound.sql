PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attendance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`class_id` integer NOT NULL,
	`class_offering_id` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`record_count` integer DEFAULT 1 NOT NULL,
	`recorded_at` text NOT NULL,
	`recorded_ms` integer NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by_user_id` integer,
	`date_ph` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`class_offering_id`) REFERENCES `class_offerings`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_attendance_records`("id", "student_id", "class_id", "class_offering_id", "status", "created_at", "record_count", "recorded_at", "recorded_ms", "updated_at", "updated_by_user_id", "date_ph") SELECT "id", "student_id", "class_id", "class_offering_id", "status", "created_at", "record_count", "recorded_at", "recorded_ms", "updated_at", "updated_by_user_id", "date_ph" FROM `attendance_records`;--> statement-breakpoint
DROP TABLE `attendance_records`;--> statement-breakpoint
ALTER TABLE `__new_attendance_records` RENAME TO `attendance_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_attendance_records_student_id_class_id_class_offering_id_date_ph` ON `attendance_records` (`student_id`,`class_id`,`class_offering_id`,`date_ph`);