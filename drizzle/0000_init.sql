CREATE TABLE IF NOT EXISTS "groups" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "cohort" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participants" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "role" text DEFAULT 'participant' NOT NULL,
  "password_hash" text,
  "group_id" text REFERENCES "groups"("id"),
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "participants_email_idx" ON "participants" ("email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modules" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "modules_slug_unique" ON "modules" ("slug");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_progress" (
  "id" text PRIMARY KEY NOT NULL,
  "participant_id" text NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "lesson_id" text NOT NULL,
  "progress_pct" integer DEFAULT 0 NOT NULL,
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lp_participant_lesson_idx" ON "lesson_progress" ("participant_id", "lesson_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lp_participant_idx" ON "lesson_progress" ("participant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "progress" (
  "id" text PRIMARY KEY NOT NULL,
  "participant_id" text NOT NULL REFERENCES "participants"("id"),
  "module_id" text NOT NULL REFERENCES "modules"("id"),
  "opened_at" timestamp with time zone,
  "completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "progress_participant_module_idx" ON "progress" ("participant_id", "module_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_participant_idx" ON "progress" ("participant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exercise_responses" (
  "id" text PRIMARY KEY NOT NULL,
  "participant_id" text NOT NULL REFERENCES "participants"("id"),
  "module_id" text NOT NULL REFERENCES "modules"("id"),
  "question_key" text NOT NULL,
  "response" text,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercise_responses_participant_module_idx" ON "exercise_responses" ("participant_id", "module_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "motivation" text,
  "availability" jsonb,
  "status" text DEFAULT 'pending' NOT NULL,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
  "attended" boolean
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_attendance_pk" ON "session_attendance" ("session_id", "participant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "participant_id" text NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "login_tokens_hash_unique" ON "login_tokens" ("token_hash");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "http_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "participant_id" text NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "http_sessions_hash_unique" ON "http_sessions" ("token_hash");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_log" (
  "id" text PRIMARY KEY NOT NULL,
  "to_email" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "kind" text NOT NULL,
  "delivered" boolean DEFAULT false NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
