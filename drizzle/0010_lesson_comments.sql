-- lesson_comments: discussion under each lesson, shared by the whole cohort.
-- "cohort" is groups.cohort of the author's group (or the group id when the
-- group has no cohort set). Replies point at their parent via parent_id.

CREATE TABLE IF NOT EXISTS "lesson_comments" (
  "id" text PRIMARY KEY NOT NULL,
  "lesson_id" text NOT NULL,
  "cohort" text NOT NULL,
  "author_id" text NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "parent_id" text REFERENCES "lesson_comments"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lc_lesson_cohort_idx"
  ON "lesson_comments" ("lesson_id", "cohort", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lc_cohort_created_idx"
  ON "lesson_comments" ("cohort", "created_at");
