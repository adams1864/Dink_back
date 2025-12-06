CREATE TABLE "accounts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"provider_id" varchar(64) NOT NULL,
	"account_id" varchar(128) NOT NULL,
	"access_token" varchar(512),
	"refresh_token" varchar(512),
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" varchar(255),
	"id_token" varchar(512),
	"password" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bundle_products" (
	"bundle_id" integer NOT NULL,
	"product_id" bigint NOT NULL,
	CONSTRAINT "bundle_products_bundle_id_product_id_pk" PRIMARY KEY("bundle_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "bundle_status" DEFAULT 'unpublished' NOT NULL,
	"cover_image" varchar(255) DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"identifier" varchar(191) NOT NULL,
	"value" varchar(255) NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" varchar(64) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"total_cents" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) DEFAULT '',
	"size" varchar(50) DEFAULT '',
	"gender" varchar(50) DEFAULT '',
	"color" varchar(100) DEFAULT '',
	"price" numeric(10, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"status" "product_status" DEFAULT 'unpublished' NOT NULL,
	"cover_image" varchar(255) DEFAULT '',
	"image_1" varchar(255) DEFAULT '',
	"image_2" varchar(255) DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_emails" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"email" varchar(191) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"token" varchar(191) NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active" timestamp,
	"ip_address" varchar(191),
	"user_agent" varchar(255),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(191) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" varchar(255),
	"name" varchar(255),
	"image" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_products" ADD CONSTRAINT "bundle_products_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_products" ADD CONSTRAINT "bundle_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bundle_products_bundle_idx" ON "bundle_products" USING btree ("bundle_id");--> statement-breakpoint
CREATE INDEX "bundle_products_product_idx" ON "bundle_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "email_verifications_identifier_idx" ON "email_verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "user_emails_user_idx" ON "user_emails" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_emails_email_unique" ON "user_emails" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_token_unique" ON "user_sessions" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");