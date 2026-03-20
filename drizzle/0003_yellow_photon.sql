ALTER TYPE "public"."item_type" ADD VALUE 'twitch';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitch_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitch_refresh_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitch_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitch_user_id" text;