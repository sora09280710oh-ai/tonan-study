CREATE TABLE `dailyStudyJournalClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`category` enum('english','kanji') NOT NULL,
	`articleDate` varchar(10) NOT NULL,
	`journalEntryId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyStudyJournalClaims_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyStudyJournalClaims_learner_category_date_unique` UNIQUE(`learnerId`,`category`,`articleDate`)
);
--> statement-breakpoint
CREATE INDEX `dailyStudyJournalClaims_learner_date_idx` ON `dailyStudyJournalClaims` (`learnerId`,`articleDate`);