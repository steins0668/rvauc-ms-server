PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_violation_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`status_id` integer NOT NULL,
	`number` text NOT NULL,
	`date` text NOT NULL,
	`reason` text,
	`reasons` text,
	`compliance_record_id` integer,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`status_id`) REFERENCES `violation_statuses`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`compliance_record_id`) REFERENCES `compliance_records`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_violation_records`("id", "student_id", "status_id", "number", "date", "reason", "reasons", "compliance_record_id") SELECT "id", "student_id", "status_id", "number", "date", "reason", NULL as "reasons", "compliance_record_id" FROM `violation_records`;--> statement-breakpoint
DROP TABLE `violation_records`;--> statement-breakpoint
ALTER TABLE `__new_violation_records` RENAME TO `violation_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `violation_records_number_unique` ON `violation_records` (`number`);