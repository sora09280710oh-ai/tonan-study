CREATE TABLE `creatureStageImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eggDefinitionId` int NOT NULL,
	`stage` int NOT NULL,
	`imageKey` varchar(512) NOT NULL,
	`imageUrl` varchar(1024) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creatureStageImages_id` PRIMARY KEY(`id`),
	CONSTRAINT `creatureStageImages_egg_stage_unique` UNIQUE(`eggDefinitionId`,`stage`)
);
--> statement-breakpoint
CREATE TABLE `eggDefinitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` varchar(500) NOT NULL DEFAULT '',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eggDefinitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learnerCreatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`eggDefinitionId` int NOT NULL,
	`stage` int NOT NULL DEFAULT 1,
	`startGrowthSeconds` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `learnerCreatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learnerEggs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`eggDefinitionId` int NOT NULL,
	`normalMissionId` int NOT NULL,
	`hatchedCreatureId` int,
	`acquiredAt` timestamp NOT NULL DEFAULT (now()),
	`hatchedAt` timestamp,
	CONSTRAINT `learnerEggs_id` PRIMARY KEY(`id`),
	CONSTRAINT `learnerEggs_learner_normalMission_unique` UNIQUE(`learnerId`,`normalMissionId`)
);
--> statement-breakpoint
CREATE TABLE `normalMissionClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`normalMissionId` int NOT NULL,
	`claimedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `normalMissionClaims_id` PRIMARY KEY(`id`),
	CONSTRAINT `normalMissionClaims_learner_mission_unique` UNIQUE(`learnerId`,`normalMissionId`)
);
--> statement-breakpoint
CREATE TABLE `normalMissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`targetStudySeconds` int NOT NULL,
	`rewardEggDefinitionId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `normalMissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `learners` ADD `activeCreatureId` int;--> statement-breakpoint
CREATE INDEX `creatureStageImages_egg_idx` ON `creatureStageImages` (`eggDefinitionId`);--> statement-breakpoint
CREATE INDEX `learnerCreatures_learner_created_idx` ON `learnerCreatures` (`learnerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `learnerEggs_learner_hatched_idx` ON `learnerEggs` (`learnerId`,`hatchedAt`);--> statement-breakpoint
CREATE INDEX `normalMissions_active_order_idx` ON `normalMissions` (`isActive`,`sortOrder`);