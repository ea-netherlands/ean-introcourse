-- lesson_responses: stores quiz and exercise answers keyed by Circle lessonId,
-- replacing the unused exercise_responses table (which required a modules FK).

CREATE TABLE IF NOT EXISTS "lesson_responses" (
  "id" text PRIMARY KEY NOT NULL,
  "participant_id" text NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "lesson_id" text NOT NULL,
  "question_key" text NOT NULL,
  "response" text,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lr_participant_lesson_key_idx"
  ON "lesson_responses" ("participant_id", "lesson_id", "question_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lr_participant_idx"
  ON "lesson_responses" ("participant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lr_lesson_idx"
  ON "lesson_responses" ("lesson_id");
