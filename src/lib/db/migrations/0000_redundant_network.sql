CREATE TABLE `audio_sources` (
	`id` varchar(36) NOT NULL,
	`external_id` varchar(255),
	`name` varchar(255) NOT NULL,
	`audio_url` text NOT NULL,
	`source_url` text,
	`whisper_data` json NOT NULL,
	`total_segments` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audio_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_source_configs` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` varchar(20) NOT NULL,
	`config` json NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_sync_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `data_source_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewers` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`review_count` int NOT NULL DEFAULT 0,
	`correction_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`last_review_at` timestamp,
	CONSTRAINT `reviewers_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviewers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` varchar(36) NOT NULL,
	`segment_id` varchar(36) NOT NULL,
	`reviewer_id` varchar(36) NOT NULL,
	`is_correct` boolean NOT NULL,
	`corrected_text` text,
	`corrected_words` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `segments` (
	`id` varchar(36) NOT NULL,
	`audio_source_id` varchar(36) NOT NULL,
	`segment_index` int NOT NULL,
	`start_time` decimal(10,3) NOT NULL,
	`end_time` decimal(10,3) NOT NULL,
	`text` text NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`review_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `segments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `external_id_idx` ON `audio_sources` (`external_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `reviewers` (`email`);--> statement-breakpoint
CREATE INDEX `segment_idx` ON `reviews` (`segment_id`);--> statement-breakpoint
CREATE INDEX `reviewer_idx` ON `reviews` (`reviewer_id`);--> statement-breakpoint
CREATE INDEX `audio_source_idx` ON `segments` (`audio_source_id`);--> statement-breakpoint
CREATE INDEX `confidence_idx` ON `segments` (`confidence`);--> statement-breakpoint
CREATE INDEX `review_count_idx` ON `segments` (`review_count`);