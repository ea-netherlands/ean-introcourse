-- Slot booking: a group doubles as a bookable slot on the application form.
-- An application books a place in its first-choice slot (slot_id) right away;
-- second and third choices are recorded as back-ups. Places taken =
-- applications with that slot_id that are not rejected.

ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "dates" jsonb;
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "facilitator_id" text REFERENCES "participants"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "language" text;
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "format" text;
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "location" text;
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "capacity" integer;
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "bookable" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "slot_id" text REFERENCES "groups"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "slot_choice_2" text;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "slot_choice_3" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_slot_idx" ON "applications" ("slot_id");
