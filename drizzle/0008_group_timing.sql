ALTER TABLE "groups" ADD COLUMN "timing" text;
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "active" boolean DEFAULT true NOT NULL;
