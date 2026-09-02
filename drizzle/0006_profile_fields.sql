ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "bio" text;
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "avatar_url" text;
