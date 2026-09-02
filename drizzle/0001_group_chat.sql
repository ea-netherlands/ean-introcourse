CREATE TABLE IF NOT EXISTS "group_posts" (
  "id" text PRIMARY KEY NOT NULL,
  "group_id" text NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
  "author_id" text NOT NULL REFERENCES "participants"("id"),
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_posts_group_idx" ON "group_posts" ("group_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_post_replies" (
  "id" text PRIMARY KEY NOT NULL,
  "post_id" text NOT NULL REFERENCES "group_posts"("id") ON DELETE CASCADE,
  "author_id" text NOT NULL REFERENCES "participants"("id"),
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_post_replies_post_idx" ON "group_post_replies" ("post_id");
