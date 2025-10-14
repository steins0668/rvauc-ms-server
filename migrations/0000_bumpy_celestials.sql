CREATE TABLE `attendance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`status_id` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`status_id`) REFERENCES `attendance_statuses`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `attendance_statuses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_statuses_name_unique` ON `attendance_statuses` (`name`);--> statement-breakpoint
CREATE TABLE `colleges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `colleges_name_unique` ON `colleges` (`name`);--> statement-breakpoint
CREATE TABLE `compliance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`uniform_type_id` integer NOT NULL,
	`valid_footwear` integer NOT NULL,
	`has_id` integer NOT NULL,
	`valid_upperwear` integer NOT NULL,
	`valid_bottoms` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`uniform_type_id`) REFERENCES `uniform_types`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`college_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`college_id`) REFERENCES `colleges`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE TABLE `professors` (
	`id` integer PRIMARY KEY NOT NULL,
	`college_id` integer NOT NULL,
	`faculty_rank` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`college_id`) REFERENCES `colleges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `session_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text,
	`is_used` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `user_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_tokens_token_hash_unique` ON `session_tokens` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_tokens_token_hash_uidx` ON `session_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY NOT NULL,
	`department_id` integer NOT NULL,
	`student_number` text NOT NULL,
	`year_level` integer NOT NULL,
	`block` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_student_number_unique` ON `students` (`student_number`);--> statement-breakpoint
CREATE TABLE `uniform_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`department_id` integer,
	`name` text,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`session_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text,
	`last_used_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_sessions_session_hash_unique` ON `user_sessions` (`session_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_sessions_session_hash_uidx` ON `user_sessions` (`session_hash`);--> statement-breakpoint
CREATE INDEX `user_sessions_user_id_idx` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_sessions_persistent_clean_up_idx` ON `user_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `user_sessions_session_clean_up_idx` ON `user_sessions` (`expires_at`,`last_used_at`) WHERE "user_sessions"."expires_at" is null;--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`surname` text NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`contact_number` text,
	FOREIGN KEY (`id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_password_hash_unique` ON `users` (`password_hash`);--> statement-breakpoint
CREATE TABLE `violation_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`status_id` integer NOT NULL,
	`number` text NOT NULL,
	`date` text NOT NULL,
	`reason` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`status_id`) REFERENCES `violation_statuses`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `violation_records_number_unique` ON `violation_records` (`number`);--> statement-breakpoint
CREATE TABLE `violation_statuses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `violation_statuses_name_unique` ON `violation_statuses` (`name`);