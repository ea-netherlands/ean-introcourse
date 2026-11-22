-- Cohort start date: one shared start for all groups of a cohort (groups.cohort = cohorts.name).
-- Group dates follow it (first matching weekday on/after the start, then weekly); groups.dates now
-- only holds exceptions. Sessions are created automatically per group and course week.
CREATE TABLE IF NOT EXISTS "cohorts" (
  "name" text PRIMARY KEY NOT NULL,
  "start_date" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fellowship_sessions" ADD COLUMN IF NOT EXISTS "week" integer;
--> statement-breakpoint
ALTER TABLE "fellowship_sessions" ADD COLUMN IF NOT EXISTS "time_locked" boolean DEFAULT false NOT NULL;
