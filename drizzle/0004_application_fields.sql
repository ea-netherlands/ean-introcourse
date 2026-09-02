ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "ea_background" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "heard_about" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "language" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "extra_info" text;
