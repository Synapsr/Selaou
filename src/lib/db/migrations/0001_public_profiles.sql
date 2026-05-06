CREATE TABLE `segment_feedback` (
	`id` varchar(36) NOT NULL,
	`segment_id` varchar(36) NOT NULL,
	`reviewer_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`message` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `segment_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reviewers` ADD `display_name` varchar(100);--> statement-breakpoint
ALTER TABLE `reviewers` ADD `is_public` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewers` ADD CONSTRAINT `reviewers_display_name_unique` UNIQUE(`display_name`);--> statement-breakpoint
CREATE INDEX `feedback_segment_idx` ON `segment_feedback` (`segment_id`);--> statement-breakpoint
CREATE INDEX `feedback_reviewer_idx` ON `segment_feedback` (`reviewer_id`);--> statement-breakpoint
CREATE INDEX `display_name_idx` ON `reviewers` (`display_name`);