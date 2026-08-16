CREATE TABLE `learnerEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`eventDate` varchar(10) NOT NULL,
	`title` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learnerEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `learnerEvents_learner_date_idx` ON `learnerEvents` (`learnerId`,`eventDate`);