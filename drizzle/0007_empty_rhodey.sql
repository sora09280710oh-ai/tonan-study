CREATE TABLE `dailySelectAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`category` enum('english','kanji') NOT NULL,
	`selectDate` varchar(10) NOT NULL,
	`entryIds` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailySelectAttempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailySelect_learner_category_date_unique` UNIQUE(`learnerId`,`category`,`selectDate`)
);
--> statement-breakpoint
CREATE INDEX `dailySelect_learner_date_idx` ON `dailySelectAttempts` (`learnerId`,`selectDate`);