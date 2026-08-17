CREATE TABLE `monsterStages` (
	`stage` int NOT NULL,
	`imageKey` varchar(512) NOT NULL,
	`imageUrl` varchar(1024) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monsterStages_stage` PRIMARY KEY(`stage`)
);
