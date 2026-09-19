ALTER TABLE `emailConfig` MODIFY COLUMN `provider` varchar(80) NOT NULL DEFAULT 'gmail';--> statement-breakpoint
ALTER TABLE `emailConfig` ADD `gmailRefreshTokenEncrypted` text;