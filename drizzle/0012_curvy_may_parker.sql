CREATE TABLE `studyJournalEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`category` enum('english','kanji') NOT NULL,
	`level` varchar(20) NOT NULL,
	`title` varchar(300) NOT NULL,
	`passage` text NOT NULL,
	`translation` text NOT NULL,
	`annotationsJson` text NOT NULL,
	`sourcesJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studyJournalEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `studyJournalEntries_learner_created_idx` ON `studyJournalEntries` (`learnerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `studyJournalEntries_learner_category_idx` ON `studyJournalEntries` (`learnerId`,`category`);