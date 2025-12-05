DROP INDEX `uidx_attendance_records_student_id_enrollment_id_recorded_date`;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `recorded_ms` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `date_ph` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_attendance_records_student_id_enrollment_id_date_ph` ON `attendance_records` (`student_id`,`enrollment_id`,`date_ph`);--> statement-breakpoint
ALTER TABLE `attendance_records` DROP COLUMN `recorded_date`;--> statement-breakpoint
ALTER TABLE `attendance_records` DROP COLUMN `recorded_time`;