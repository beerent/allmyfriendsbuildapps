CREATE TYPE "public"."platform" AS ENUM('twitch', 'youtube', 'kick', 'x', 'tiktok');--> statement-breakpoint
CREATE TYPE "public"."twitch_event_type" AS ENUM('subscribe', 'resub', 'gift_sub');--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE 'kofi';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE 'buymeacoffee';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE 'goal';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE 'countdown';--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_unique" UNIQUE("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"target_id" uuid,
	"read" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"username" text NOT NULL,
	"is_primary" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_links_user_id_platform_unique" UNIQUE("user_id","platform")
);
--> statement-breakpoint
CREATE TABLE "twitch_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" text NOT NULL,
	"broadcaster_id" text NOT NULL,
	"event_type" "twitch_event_type" NOT NULL,
	"user_name" text NOT NULL,
	"user_id" text NOT NULL,
	"avatar_url" text,
	"tier" text NOT NULL,
	"message" text,
	"cumulative_months" integer,
	"streak_months" integer,
	"is_gift" integer DEFAULT 0 NOT NULL,
	"gifter_name" text,
	"gifter_id" text,
	"gift_total" integer,
	"event_timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "twitch_events_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "upvotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "upvotes_user_id_item_id_unique" UNIQUE("user_id","item_id")
);
--> statement-breakpoint
ALTER TABLE "ad_profile_items" ADD COLUMN "config" jsonb;--> statement-breakpoint
ALTER TABLE "marketplace_items" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "marketplace_items" ADD COLUMN "archived" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace_items" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "spotify_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "spotify_refresh_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "spotify_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitch_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitch_refresh_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitch_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitch_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kofi_username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bmc_username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'America/New_York';--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_item_id_marketplace_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."marketplace_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_twitch_events_broadcaster_created" ON "twitch_events" ("broadcaster_id", "created_at" DESC);