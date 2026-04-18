DROP INDEX `uidx_terms_start_end_semester`;--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_terms_year_start_semester` ON `terms` (`year_start`,`semester`);