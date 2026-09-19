CREATE TABLE `emailMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` varchar(700) NOT NULL,
	`filename` varchar(240) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`contentId` varchar(120),
	`placement` enum('INLINE','ATTACHMENT') NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailMedia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`masterEnabled` boolean NOT NULL DEFAULT true,
	`newRegistration` boolean NOT NULL DEFAULT true,
	`emailFailure` boolean NOT NULL DEFAULT true,
	`adminEvents` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `emailConfig` MODIFY COLUMN `provider` varchar(80) NOT NULL DEFAULT 'resend';--> statement-breakpoint
ALTER TABLE `emailLogs` MODIFY COLUMN `status` enum('PENDING','SENDING','SENT','FAILED') NOT NULL;--> statement-breakpoint
ALTER TABLE `emailLogs` ADD `subject` varchar(240);--> statement-breakpoint
ALTER TABLE `emailLogs` ADD `providerMessageId` varchar(240);--> statement-breakpoint
ALTER TABLE `emailLogs` ADD `retryOf` int;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD `category` enum('ACCEPTANCE','GENERAL') DEFAULT 'ACCEPTANCE' NOT NULL;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD `htmlBody` text;