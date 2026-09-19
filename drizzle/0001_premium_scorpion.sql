CREATE TABLE `adminInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`usedBy` int,
	`revokedAt` timestamp,
	CONSTRAINT `adminInvites_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminInvites_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(160) NOT NULL,
	`adminId` int NOT NULL,
	`registrationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderName` varchar(160) NOT NULL,
	`senderEmail` varchar(320) NOT NULL,
	`replyTo` varchar(320),
	`provider` varchar(80) NOT NULL DEFAULT 'Not configured',
	`enabled` boolean NOT NULL DEFAULT false,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`emailType` varchar(80) NOT NULL,
	`registrationId` int,
	`status` enum('PENDING','SENT','FAILED') NOT NULL,
	`failureReason` text,
	`sentBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` varchar(240) NOT NULL,
	`body` text NOT NULL,
	`groupLink` varchar(500),
	`channelLink` varchar(500),
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`registrationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`country` varchar(80) NOT NULL,
	`countryCode` varchar(8) NOT NULL,
	`whatsappNumber` varchar(40) NOT NULL,
	`normalizedWhatsapp` varchar(40) NOT NULL,
	`classLevel` varchar(120) NOT NULL,
	`school` varchar(240) NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`reviewedAt` timestamp,
	`reviewedBy` int,
	`rejectionReason` text,
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrations_normalizedWhatsapp_unique` UNIQUE(`normalizedWhatsapp`),
	CONSTRAINT `registrations_email_unique` UNIQUE(`email`)
);
