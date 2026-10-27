CREATE TABLE `study_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`epoch` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
