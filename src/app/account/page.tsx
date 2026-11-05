/**
 * /account — participant profile + progress overview (Stage 3)
 *
 * Server component; redirects to /auth/login when not signed in.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentParticipant } from "@/lib/auth";
import {
  db,
  ensureMigrated,
  lessonProgress,
  groups,
  participants,
  fellowshipSessions,
  sessionAttendance,
} from "@/db";
import { and, eq, gte, or, isNull } from "drizzle-orm";
import { getAllWeeksWithLessons } from "@/lib/lessons";
import { ThemeToggle } from "@/components/theme-toggle";
import { googleCalendarUrl, outlookCalendarUrl, SESSION_DURATION_MINUTES } from "@/lib/calendar";
import { ProfileEditForm } from "./profile-edit-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  await ensureMigrated();
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) redirect("/auth/login?next=/account");

  const weeks = getAllWeeksWithLessons();
  const totalLessons = weeks.reduce((s, w) => s + w.lessons.length, 0);

  // Fetch all my lesson progress rows
  const progressRows = await db
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.participantId, me.id));

  const progressMap = new Map(
    progressRows.map((r) => [r.lessonId, r])
  );
  const completedCount = progressRows.filter((r) => r.completedAt !== null).length;
  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Group info
  let groupName: string | null = null;
  if (me.groupId) {
    const [g] = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, me.groupId));
    groupName = g?.name ?? null;
  }

  // Upcoming sessions for this participant's group (or ungrouped sessions)
  const upcomingSessions = me.groupId
    ? await db
        .select({
          id: fellowshipSessions.id,
          title: fellowshipSessions.title,
          scheduledAt: fellowshipSessions.scheduledAt,
          meetLink: fellowshipSessions.meetLink,
        })
        .from(fellowshipSessions)
        .where(
          and(
            gte(fellowshipSessions.scheduledAt, new Date()),
            or(
              eq(fellowshipSessions.groupId, me.groupId),
              isNull(fellowshipSessions.groupId)
            )
          )
        )
        .orderBy(fellowshipSessions.scheduledAt)
        .limit(5)
    : [];

  const initials = me.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      {/* Top bar */}
      <header
        className="flex h-14 items-center px-6 gap-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-sidebar)" }}
      >
        <Link href="/materials" className="flex items-center gap-2 group">
          <span className="text-ea-teal font-bold">◆</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Fellowship
          </span>
        </Link>
        <nav className="flex items-center gap-1 ml-4">
          <Link
            href="/materials"
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Materials
          </Link>
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "rgba(22,135,156,0.1)", color: "var(--color-ea-teal)" }}
          >
            My account
          </span>
          {me.groupId && (
            <Link
              href={`/group/${me.groupId}`}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Group chat
            </Link>
          )}
          {(me.role === "facilitator" || me.role === "admin") && (
            <Link
              href="/sessions"
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Sessions
            </Link>
          )}
          {(me.role === "facilitator" || me.role === "admin") && me.groupId && (
            <Link
              href={`/group/${me.groupId}/overview`}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Overview
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Completion banner */}
        {me.status === "completed" && (
          <div
            className="rounded-2xl p-5 flex items-start gap-4"
            style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}
          >
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-semibold" style={{ color: "#15803d" }}>
                Congratulations — you've completed the fellowship!
              </p>
              <p className="text-sm mt-0.5" style={{ color: "#166534" }}>
                Thank you for participating in the EA Netherlands Introductory Fellowship.
                We hope it gave you new perspectives and a network of people who care about
                doing the most good.
              </p>
            </div>
          </div>
        )}

        {/* Profile card */}
        <div
          className="rounded-2xl p-6 flex items-start gap-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {me.avatarUrl ? (
            <img
              src={me.avatarUrl}
              alt={me.name}
              className="w-14 h-14 rounded-full object-cover shrink-0"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
              style={{ background: "var(--color-ea-teal)" }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {me.name}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {me.email}
            </p>
            {me.bio && (
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {me.bio}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: "rgba(22,135,156,0.12)", color: "var(--color-ea-teal)" }}
              >
                {me.role}
              </span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
              >
                {me.status}
              </span>
              {groupName && (
                <Link
                  href={`/group/${me.groupId}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition"
                  style={{ background: "rgba(22,135,156,0.08)", color: "var(--color-ea-teal)" }}
                >
                  {groupName}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Profile edit */}
        <ProfileEditForm
          currentName={me.name}
          currentBio={me.bio ?? null}
          currentAvatarUrl={me.avatarUrl ?? null}
        />

        {/* Upcoming sessions */}
        {upcomingSessions.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Upcoming sessions
            </h2>
            <div className="space-y-3">
              {upcomingSessions.map((s) => {
                const calEvent = {
                  title: s.title,
                  startAt: s.scheduledAt,
                  durationMinutes: SESSION_DURATION_MINUTES,
                  location: s.meetLink ?? null,
                };
                const googleUrl = googleCalendarUrl(calEvent);
                const outlookUrl = outlookCalendarUrl(calEvent);
                const icsUrl = `/api/sessions/${s.id}/ics`;
                return (
                  <div
                    key={s.id}
                    className="rounded-xl p-4"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📅</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {s.title}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {s.scheduledAt.toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      {s.meetLink && (
                        <a
                          href={s.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition hover:opacity-90"
                          style={{ background: "var(--color-ea-teal)" }}
                        >
                          Join →
                        </a>
                      )}
                    </div>
                    {/* Calendar add links */}
                    <div className="flex flex-wrap gap-2 mt-3 ml-11">
                      <span className="text-xs self-center" style={{ color: "var(--text-muted)" }}>Add to:</span>
                      <a
                        href={googleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-2.5 py-1 rounded-lg border transition hover:opacity-80"
                        style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      >
                        Google Calendar
                      </a>
                      <a
                        href={outlookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-2.5 py-1 rounded-lg border transition hover:opacity-80"
                        style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      >
                        Outlook
                      </a>
                      <a
                        href={icsUrl}
                        className="text-xs px-2.5 py-1 rounded-lg border transition hover:opacity-80"
                        style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      >
                        Apple Calendar (.ics)
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Progress overview */}
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Progress overview
          </h2>

          {/* Overall bar */}
          <div
            className="rounded-xl p-5 mb-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-end justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Overall
              </span>
              <span className="text-sm tabular-nums" style={{ color: "var(--text-muted)" }}>
                {completedCount} / {totalLessons} lessons
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${overallPct}%`, background: "var(--color-ea-teal)" }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              {overallPct}% complete
            </p>
          </div>

          {/* Per-week breakdown */}
          <div className="space-y-3">
            {weeks.map((week) => {
              const weekDone = week.lessons.filter((l) => progressMap.get(l.id)?.completedAt).length;
              const weekPct = week.lessons.length > 0 ? Math.round((weekDone / week.lessons.length) * 100) : 0;
              return (
                <div
                  key={week.slug}
                  className="rounded-xl p-4"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      href={`/materials/${week.slug}`}
                      className="text-sm font-medium hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Week {week.weekNumber}: {week.shortTitle}
                    </Link>
                    <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {weekDone}/{week.lessons.length}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${weekPct}%`,
                        background: weekPct === 100 ? "#22c55e" : "var(--color-ea-teal)",
                      }}
                    />
                  </div>
                  {/* Lesson pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {week.lessons.map((lesson) => {
                      const row = progressMap.get(lesson.id);
                      const done = !!row?.completedAt;
                      const started = (row?.progressPct ?? 0) > 0;
                      return (
                        <Link
                          key={lesson.id}
                          href={`/materials/${week.slug}/${lesson.id}`}
                          title={lesson.title}
                          className="px-2 py-0.5 rounded text-xs transition-colors"
                          style={{
                            background: done
                              ? "rgba(34,197,94,0.12)"
                              : started
                              ? "rgba(22,135,156,0.1)"
                              : "var(--bg-hover)",
                            color: done ? "#16a34a" : started ? "var(--color-ea-teal)" : "var(--text-muted)",
                          }}
                        >
                          {done ? "✓ " : ""}{lesson.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        {/* Contact */}
        <div className="text-center pt-4 pb-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Questions about the fellowship?{" "}
            <a
              href="mailto:programmes@effectiefaltruisme.nl"
              className="underline hover:opacity-80 transition"
              style={{ color: "var(--color-ea-teal)" }}
            >
              programmes@effectiefaltruisme.nl
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
