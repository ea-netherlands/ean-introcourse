import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------- groups ----------
// A fellowship cohort (e.g. "Cohort 2025-Q3"). Participants belong to one group.

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  cohort: text("cohort"), // e.g. "Cohort 2025-Q3"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- participants ----------
// A fellowship participant or facilitator.

export const participants = pgTable(
  "participants",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),

    // "participant" = fellowship participant; "facilitator" = can access /admin
    role: text("role", { enum: ["participant", "facilitator"] })
      .notNull()
      .default("participant"),

    // Password (set during onboarding for participants, at signup for facilitators)
    passwordHash: text("password_hash"),

    // Timeslot availability e.g. ["early_monday","late_thursday"]
    availability: jsonb("availability").$type<string[]>(),

    groupId: text("group_id").references(() => groups.id),
    status: text("status", { enum: ["pending", "active", "completed"] })
      .notNull()
      .default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("participants_email_idx").on(t.email)]
);

// ---------- modules ----------
// A content module (one week of reading materials + exercises).

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  slug: text("slug").unique().notNull(), // e.g. "week-1-intro"
  title: text("title").notNull(),
  orderIndex: integer("order_index").notNull(),
});

// ---------- lesson_progress ----------
// Per-lesson reading progress for an authenticated participant.
// lessonId is the scraped Circle content ID (e.g. "3644621").

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(), // scraped ID
    progressPct: integer("progress_pct").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("lp_participant_lesson_idx").on(t.participantId, t.lessonId),
    index("lp_participant_idx").on(t.participantId),
  ]
);

// ---------- progress ----------
// (Module-level, kept for future use)

export const progress = pgTable(
  "progress",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("progress_participant_module_idx").on(
      t.participantId,
      t.moduleId
    ),
    index("progress_participant_idx").on(t.participantId),
  ]
);

// ---------- exercise_responses ----------
// A participant's saved answers to module exercises.

export const exerciseResponses = pgTable(
  "exercise_responses",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id),
    questionKey: text("question_key").notNull(),
    response: text("response"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("exercise_responses_participant_module_idx").on(
      t.participantId,
      t.moduleId
    ),
  ]
);

// ---------- applications ----------
// Stage 4: public sign-up applications for the fellowship.

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  // Contact
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  city: text("city"),
  // Motivation & background (Typeform Q1, Q7, Q8)
  mainReason: jsonb("main_reason").$type<string[]>(),   // multi-select: why sign up
  promptedBy: text("prompted_by"),                       // Q7: short "what prompted you"
  motivation: text("motivation"),                        // Q8: long answer ~120 words
  // Background demographics (Q3–Q6)
  educationLevel: text("education_level"),
  careerStage: text("career_stage"),
  occupation: text("occupation"),
  workArea: text("work_area"),
  // Schedule preferences (Q9, Q10)
  availability: jsonb("availability"),                   // array of selected timeslot strings
  onlinePreference: text("online_preference"),           // "online"|"in_person"|"no_preference"
  language: text("language"),                            // "nl" | "en" | "both"
  // Discovery & consent (Q16, Q17)
  heardAbout: text("heard_about"),
  privacyConsent: boolean("privacy_consent"),
  // Legacy fields
  eaBackground: text("ea_background"),
  extraInfo: text("extra_info"),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .notNull()
    .default("pending"),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- fellowship_sessions ----------
// Stage 5: scheduled group discussion sessions.

export const fellowshipSessions = pgTable("fellowship_sessions", {
  id: text("id").primaryKey(),
  groupId: text("group_id").references(() => groups.id),
  facilitatorId: text("facilitator_id").references(() => participants.id),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  meetLink: text("meet_link"),
  agenda: text("agenda"),
  prepModuleId: text("prep_module_id").references(() => modules.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- session_attendance ----------
// Stage 5: who was invited and attended a session.

export const sessionAttendance = pgTable(
  "session_attendance",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => fellowshipSessions.id),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id),
    inviteSentAt: timestamp("invite_sent_at", { withTimezone: true }),
    attended: boolean("attended"),
  },
  (t) => [
    uniqueIndex("session_attendance_pk").on(t.sessionId, t.participantId),
  ]
);

// ---------- login_tokens ----------
// Short-lived magic-link tokens (SHA-256 hashed, 30-min expiry, single-use).

export const loginTokens = pgTable("login_tokens", {
  id: text("id").primaryKey(),
  participantId: text("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- http_sessions ----------
// Long-lived session tokens stored in httpOnly cookies.

export const httpSessions = pgTable("http_sessions", {
  id: text("id").primaryKey(),
  participantId: text("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- group_posts ----------
// Stage 3: async discussion board per group, or general channel (groupId = null).

export const groupPosts = pgTable(
  "group_posts",
  {
    id: text("id").primaryKey(),
    // null = general channel visible to all participants
    groupId: text("group_id")
      .references(() => groups.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => participants.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("group_posts_group_idx").on(t.groupId)]
);

// ---------- group_post_replies ----------

export const groupPostReplies = pgTable(
  "group_post_replies",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => groupPosts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => participants.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("group_post_replies_post_idx").on(t.postId)]
);

// ---------- onboarding_tokens ----------
// Single-use tokens for completing the onboarding form after application acceptance.

export const onboardingTokens = pgTable("onboarding_tokens", {
  id: text("id").primaryKey(),
  participantId: text("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- email_log ----------
// Audit log of all outgoing emails.

export const emailLog = pgTable("email_log", {
  id: text("id").primaryKey(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  kind: text("kind").notNull(),
  delivered: boolean("delivered").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
});
