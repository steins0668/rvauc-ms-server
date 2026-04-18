DROP INDEX `uidx_classes_professor_id_course_id_term_id_class_number`;--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_classes_professor_id_term_id_course_id_class_number` ON `classes` (`professor_id`,`term_id`,`course_id`,`class_number`);--> statement-breakpoint
DROP INDEX `idx_class_sessions_date_ph`;--> statement-breakpoint
CREATE INDEX `idx_class_sessions_date_ph_status` ON `class_sessions` (`date_ph`,`status`);--> statement-breakpoint
CREATE INDEX `idx_class_sessions_class_id_start_time_ms` ON `class_sessions` (`class_id`,`start_ms`);--> statement-breakpoint
CREATE INDEX `idx_attendance_records_enrollment_id_class_id` ON `attendance_records` (`enrollment_id`,`class_id`);--> statement-breakpoint
CREATE INDEX `idx_class_offerings_week_day_start_time_end_time` ON `class_offerings` (`week_day`,`start_time`,`end_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_enrollments_class_id_student_id` ON `enrollments` (`class_id`,`student_id`);