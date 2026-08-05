CREATE TABLE `foundry_installations` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `product_id` text NOT NULL,
  `label` text NOT NULL,
  `world_id` text,
  `world_name` text,
  `foundry_version` text,
  `module_version` text,
  `token_hash` text NOT NULL,
  `last_validated_at` integer,
  `revoked_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `foundry_installations_token_hash_unique` ON `foundry_installations` (`token_hash`);
--> statement-breakpoint
CREATE TABLE `foundry_activation_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `user_code` text NOT NULL,
  `device_secret_hash` text NOT NULL,
  `installation_label` text NOT NULL,
  `world_id` text,
  `world_name` text,
  `foundry_version` text,
  `module_version` text,
  `status` text DEFAULT 'pending' NOT NULL,
  `approved_by_user_id` text,
  `installation_id` text,
  `issued_token` text,
  `expires_at` integer NOT NULL,
  `approved_at` integer,
  `consumed_at` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`approved_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`installation_id`) REFERENCES `foundry_installations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `foundry_activation_requests_user_code_unique` ON `foundry_activation_requests` (`user_code`);
