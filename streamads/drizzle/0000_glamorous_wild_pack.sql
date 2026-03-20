CREATE TYPE "public"."color_style" AS ENUM('matched', 'fulltint');--> statement-breakpoint
CREATE TYPE "public"."color_theme" AS ENUM('blue', 'purple', 'magenta', 'red', 'orange', 'green', 'teal', 'slate');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('ad', 'card', 'spotify', 'placeholder', 'twitch');--> statement-breakpoint
CREATE TABLE "ad_profile_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"display_duration" integer DEFAULT 10 NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "item_type" NOT NULL,
	"creator_id" uuid,
	"headline" text,
	"subtext" text,
	"brand_url" text,
	"image_url" text,
	"subtext2" text,
	"color_theme" "color_theme" DEFAULT 'blue' NOT NULL,
	"color_style" "color_style" DEFAULT 'matched' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
ALTER TABLE "ad_profile_items" ADD CONSTRAINT "ad_profile_items_profile_id_ad_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."ad_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_profile_items" ADD CONSTRAINT "ad_profile_items_item_id_marketplace_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."marketplace_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_profiles" ADD CONSTRAINT "ad_profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_items" ADD CONSTRAINT "marketplace_items_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;