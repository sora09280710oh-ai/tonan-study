CREATE TABLE `learnerPointBalances` (
	`learnerId` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`totalEarned` int NOT NULL DEFAULT 0,
	`totalAppliedMinutes` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learnerPointBalances_learnerId` PRIMARY KEY(`learnerId`)
);
--> statement-breakpoint
CREATE TABLE `missionClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`missionId` varchar(80) NOT NULL,
	`periodKey` varchar(10) NOT NULL,
	`rewardPoints` int NOT NULL DEFAULT 0,
	`claimedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `missionClaims_id` PRIMARY KEY(`id`),
	CONSTRAINT `missionClaims_learner_mission_period_unique` UNIQUE(`learnerId`,`missionId`,`periodKey`)
);
--> statement-breakpoint
CREATE TABLE `missionEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`category` enum('english','kanji') NOT NULL DEFAULT 'english',
	`eventKey` varchar(120) NOT NULL,
	`eventDate` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `missionEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `missionEvents_learner_key_unique` UNIQUE(`learnerId`,`eventKey`)
);
--> statement-breakpoint
CREATE INDEX `missionClaims_learner_period_idx` ON `missionClaims` (`learnerId`,`periodKey`);--> statement-breakpoint
CREATE INDEX `missionEvents_learner_date_idx` ON `missionEvents` (`learnerId`,`eventDate`);