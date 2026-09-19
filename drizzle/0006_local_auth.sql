ALTER TABLE `users` ADD COLUMN `passwordHash` text NULL;
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) DEFAULT 'local';
ALTER TABLE `emailConfig` MODIFY COLUMN `provider` varchar(80) NOT NULL DEFAULT 'manus-email-automation';
