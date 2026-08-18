CREATE TABLE `revivalTicketUses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`eventDate` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revivalTicketUses_id` PRIMARY KEY(`id`),
	CONSTRAINT `revivalTicketUses_learner_date_unique` UNIQUE(`learnerId`,`eventDate`)
);
--> statement-breakpoint
CREATE INDEX `revivalTicketUses_learner_date_idx` ON `revivalTicketUses` (`learnerId`,`eventDate`);