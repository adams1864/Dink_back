CREATE TABLE `accounts` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`provider_id` varchar(64) NOT NULL,
	`account_id` varchar(128) NOT NULL,
	`access_token` varchar(512),
	`refresh_token` varchar(512),
	`access_token_expires_at` timestamp,
	`refresh_token_expires_at` timestamp,
	`scope` varchar(255),
	`id_token` varchar(512),
	`password` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_provider_account_unique` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `bundle_products` (
	`bundle_id` int NOT NULL,
	`product_id` int NOT NULL,
	CONSTRAINT `bundle_products_bundle_id_product_id_pk` PRIMARY KEY(`bundle_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `bundles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` varchar(50) DEFAULT 'unpublished',
	`cover_image` varchar(255) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bundles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` varchar(64) NOT NULL,
	`identifier` varchar(191) NOT NULL,
	`value` varchar(255) NOT NULL,
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(64) NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`customer_email` varchar(255) NOT NULL,
	`status` varchar(50) DEFAULT 'pending',
	`total_cents` int DEFAULT 0,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100) DEFAULT '',
	`size` varchar(50) DEFAULT '',
	`gender` varchar(50) DEFAULT '',
	`color` varchar(100) DEFAULT '',
	`price` int NOT NULL,
	`stock` int DEFAULT 0,
	`status` varchar(50) DEFAULT 'unpublished',
	`cover_image` varchar(255) DEFAULT '',
	`image_1` varchar(255) DEFAULT '',
	`image_2` varchar(255) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_emails` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`email` varchar(191) NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_emails_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`token` varchar(191) NOT NULL,
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`last_active` timestamp,
	`ip_address` varchar(191),
	`user_agent` varchar(255),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`email` varchar(191) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`password_hash` varchar(255),
	`name` varchar(255),
	`image` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `bundle_products` ADD CONSTRAINT `bundle_products_bundle_id_bundles_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_products` ADD CONSTRAINT `bundle_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `bundle_products_bundle_idx` ON `bundle_products` (`bundle_id`);--> statement-breakpoint
CREATE INDEX `bundle_products_product_idx` ON `bundle_products` (`product_id`);--> statement-breakpoint
CREATE INDEX `email_verifications_identifier_idx` ON `email_verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `user_emails_user_idx` ON `user_emails` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_sessions_user_idx` ON `user_sessions` (`user_id`);