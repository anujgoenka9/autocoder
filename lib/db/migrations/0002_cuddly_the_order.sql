ALTER TABLE "users" ADD COLUMN "subscription_plan" varchar(20) DEFAULT 'base' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" varchar(20) DEFAULT 'inactive';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" text;