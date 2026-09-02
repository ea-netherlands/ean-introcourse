-- Make group_posts.group_id nullable (general channel when null)
ALTER TABLE "group_posts" ALTER COLUMN "group_id" DROP NOT NULL;
--> statement-breakpoint
-- Add availability to participants
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "availability" jsonb;
--> statement-breakpoint
-- Onboarding tokens table
CREATE TABLE IF NOT EXISTS "onboarding_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "participant_id" text NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_tokens_hash_unique" ON "onboarding_tokens" ("token_hash");
