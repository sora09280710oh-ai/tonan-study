CREATE TABLE `classrooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`joinCode` varchar(16) NOT NULL,
	`teacherPasswordHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classrooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `classrooms_join_code_unique` UNIQUE(`joinCode`),
	CONSTRAINT `classrooms_teacher_password_unique` UNIQUE(`teacherPasswordHash`)
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD `classroomId` int;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `classroomId` int;--> statement-breakpoint
ALTER TABLE `learners` ADD `classroomId` int;--> statement-breakpoint
ALTER TABLE `recommendedTests` ADD `classroomId` int;--> statement-breakpoint
ALTER TABLE `wordBooks` ADD `classroomId` int;--> statement-breakpoint
CREATE INDEX `announcements_classroom_created_idx` ON `announcements` (`classroomId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `calendarEvents_classroom_date_idx` ON `calendarEvents` (`classroomId`,`eventDate`);--> statement-breakpoint
CREATE INDEX `learners_classroom_idx` ON `learners` (`classroomId`);--> statement-breakpoint
CREATE INDEX `recommendedTests_classroom_date_idx` ON `recommendedTests` (`classroomId`,`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `wordBooks_classroom_category_idx` ON `wordBooks` (`classroomId`,`category`);