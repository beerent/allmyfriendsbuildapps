ALTER TABLE "users" ADD COLUMN "spotify_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "spotify_refresh_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "spotify_token_expiry" timestamp;