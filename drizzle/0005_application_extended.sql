ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "main_reason" jsonb;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "education_level" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "career_stage" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "occupation" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "work_area" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "prompted_by" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "online_preference" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "linkedin_url" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "city" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "privacy_consent" boolean;
