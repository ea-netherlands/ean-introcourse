-- Tracker (was the "Checklists & trackers" spreadsheet):
-- group_attendance: per participant, per course week (1-5): present / partly / absent.
-- group_checklist:  facilitator tasks ticked off per group (task@phase keys, see src/lib/tracker.ts).

CREATE TABLE IF NOT EXISTS "group_attendance" (
  "group_id" text NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
  "participant_id" text NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "week" integer NOT NULL,
  "status" text NOT NULL,
  "updated_by" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_attendance_pk" ON "group_attendance" ("group_id", "participant_id", "week");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_checklist" (
  "group_id" text NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
  "item_key" text NOT NULL,
  "done_by" text,
  "done_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_checklist_pk" ON "group_checklist" ("group_id", "item_key");
