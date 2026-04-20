CREATE INDEX `idx_class_offerings_week_day_class_id` ON `class_offerings` (`week_day`,`class_id`);--> statement-breakpoint
CREATE INDEX `idx_classes_term_id` ON `classes` (`term_id`);