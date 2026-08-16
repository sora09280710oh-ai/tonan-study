ALTER TABLE `wordEntries` ADD `importBatchId` varchar(64);--> statement-breakpoint
CREATE INDEX `wordEntries_import_batch_idx` ON `wordEntries` (`importBatchId`);