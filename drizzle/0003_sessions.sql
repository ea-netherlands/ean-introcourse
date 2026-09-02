-- Stage 5: fellowship_sessions and session_attendance tables
CREATE TABLE IF NOT EXISTS "fellowship_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "group_id" text REFERENCES "groups"("id"),
  "facilitator_id" text REFERENCES "participants"("id"),
  "title" text NOT NULL,
  "scheduled_at" timestamp with time zone NOT NULL,
  "meet_link" text,
  "agenda" text,
  "prep_module_id" text REFERENCES "modules"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_attendance" (
  "session_id" text NOT NULL REFERENCES "fellowship_sessions"("id"),
  "participant_id" text NOT NULL REFERENCES "participants"("id"),
  "invite_sent_at" timestamp with time zone,
  "attended" boolean,
  PRIMARY KEY ("session_id", "participant_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_attendance_pk" ON "session_attendance" ("session_id", "participant_id");
