CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendarEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventDate` varchar(10) NOT NULL,
	`title` varchar(160) NOT NULL,
	`category` enum('english','kanji','both') NOT NULL DEFAULT 'both',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendarEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cardSets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`bookId` int NOT NULL,
	`category` enum('english','kanji') NOT NULL,
	`name` varchar(120) NOT NULL,
	`startNo` int NOT NULL,
	`endNo` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cardSets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pinHash` varchar(64) NOT NULL,
	`revivalTickets` int NOT NULL DEFAULT 2,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learners_id` PRIMARY KEY(`id`),
	CONSTRAINT `learners_pinHash_unique` UNIQUE(`pinHash`)
);
--> statement-breakpoint
CREATE TABLE `recommendedTests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`category` enum('english','kanji') NOT NULL,
	`bookId` int NOT NULL,
	`startNo` int NOT NULL,
	`endNo` int NOT NULL,
	`questionCount` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendedTests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studyProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`entryId` int NOT NULL,
	`strength` int NOT NULL DEFAULT 0,
	`correctCount` int NOT NULL DEFAULT 0,
	`lastReviewedAt` timestamp,
	`nextReviewAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `studyProgress_learner_entry_unique` UNIQUE(`learnerId`,`entryId`)
);
--> statement-breakpoint
CREATE TABLE `studySessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`learnerId` int NOT NULL,
	`seconds` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studySessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wordBooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int,
	`category` enum('english','kanji') NOT NULL,
	`kind` enum('standard','personal') NOT NULL,
	`name` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wordBooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wordEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`entryNo` int NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`writingAnswer` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wordEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `wordEntries_book_number_unique` UNIQUE(`bookId`,`entryNo`)
);
--> statement-breakpoint
CREATE INDEX `calendarEvents_date_idx` ON `calendarEvents` (`eventDate`);--> statement-breakpoint
CREATE INDEX `cardSets_learner_category_idx` ON `cardSets` (`learnerId`,`category`);--> statement-breakpoint
CREATE INDEX `studyProgress_review_due_idx` ON `studyProgress` (`learnerId`,`nextReviewAt`);--> statement-breakpoint
CREATE INDEX `studySessions_learner_date_idx` ON `studySessions` (`learnerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `wordBooks_owner_category_idx` ON `wordBooks` (`ownerId`,`category`);--> statement-breakpoint
CREATE INDEX `wordEntries_book_idx` ON `wordEntries` (`bookId`);