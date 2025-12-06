ALTER TABLE `compliance_records` RENAME COLUMN "created_at" TO "recorded_at";--> statement-breakpoint
ALTER TABLE `compliance_records` ADD `recorded_ms` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `compliance_records` ADD `date_ph` text NOT NULL;