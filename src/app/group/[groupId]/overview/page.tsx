/**
 * /group/[groupId]/overview — Facilitator view of their group
 *
 * Shows each student's progress through the 54-lesson curriculum,
 * their contact info, and application background.
 * Access: facilitators and admins only.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentParticipant } from "@/lib/auth";
import {
  db, ensureMigrated,
  groups, participants, lessonProgress, applications, fellowshipSessions,
} from "@/db";
import { eq, inArray, and, gte } from "drizzle-orm";
import { ThemeToggle } from "@/components/theme-toggle";
import { WEEK_DEFS } from "@/lib/lessons";

export const dynamic = "force-dynamic";

// Total lessons & lesson→week lookup built once at module level
const ALL_LESSON_IDS = WEEK_DEFS.flatMap((w) => w.lessonIds);
const TOTAL_LESSONS = ALL_LESSON_IDS.length;

const LESSON_TO_WEEK: Record<string, number> = {};
WEEK_DEFS.forEach((w, i) => {
  w.lessonIds.forEach((id) => { LESSON_TO_WEEK[id] = i; });
});

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function FacilitatorGroupOverviewPage({ params }: Props) {
  await ensureMigrated();
  const { groupId } = await params;

  const me = await getCurrentParticipant().catch(() => null);
  if (!me) redirect(`/auth/login?next=/group/${groupId}/overview`);
  if (me.role !== "facilitator" && me.role !== "admin") redirect("/materials");

  // Fetch group
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) notFound();

  // Fetch members
  const members = await db
    .select({
      id: participants.id,
      name: participants.name,
      email: participants.email,
      status: participants.status,
      availability: participants.availability,
      createdAt: participants.createdAt,
    })
    .from(participants)
    .where(and(eq(participants.groupId, groupId), eq(participants.role, "participant")));

  // Fetch all lesson progress rows for these members
  const memberIds = members.map((m) => m.id);
  const progressRows =
    memberIds.length > 0
      ? await db
          .select({
            participantId: lessonProgress.participantId,
            lessonId: lessonProgress.lessonId,
            progressPct: lessonProgress.progressPct,
            completedAt: lessonProgress.completedAt,
          })
          .from(lessonProgress)
          .where(inArray(lessonProgress.participantId, memberIds))
      : [];

  // Fetch application data (for background info) keyed by email
  const memberEmails = members.map((m) => m.email);
  const appRows =
    memberEmails.length > 0
      ? await db
          .select({
            email: applications.email,
            city: applications.city,
            careerStage: applications.careerStage,
            occupation: applications.occupation,
            educationLevel: applications.educationLevel,
            language: applications.language,
            mainReason: applications.mainReason,
          })
          .from(applications)
          .where(inArray(applications.email, memberEmails))
      : [];
  const appByEmail = Object.fromEntries(appRows.map((a) => [a.email, a]));

  // Fetch upcoming sessions for this group
  const now = new Date();
  const upcomingSessions = await db
    .select({
      id: fellowshipSessions.id,
      title: fellowshipSessions.title,
      scheduledAt: fellowshipSessions.scheduledAt,
      meetLink: fellowshipSessions.meetLink,
    })
    .from(fellowshipSessions)
    .where(and(eq(fellowshipSessions.groupId, groupId), gte(fellowshipSessions.scheduledAt, now)));

  // Build progress map per participant
  const progressByParticipant: Record<string, { completedCount: number; weekCounts: number[]; weekTotals: number[] }> = {};
  for (const m of members) {
    progressByParticipant[m.id] = {
      completedCount: 0,
      weekCounts: WEEK_DEFS.map(() => 0),
      weekTotals: WEEK_DEFS.map((w) => w.lessonIds.length),
    };
  }
  for (const row of progressRows) {
    const p = progressByParticipant[row.participantId];
    if (!p) continue;
    const weekIdx = LESSON_TO_WEEK[row.lessonId];
    if (weekIdx === undefined) continue;
    if (row.completedAt || (row.progressPct ?? 0) >= 100) {
      p.completedCount++;
      p.weekCounts[weekIdx]++;
    }
  }

  // Group stats
  const avgCompletion =
    members.length === 0
      ? 0
      : Math.round(
          members.reduce((sum, m) => sum + progressByParticipant[m.id].completedCount, 0) /
            (members.length * TOTAL_LESSONS) *
            100
        );

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });

  const langLabel = (l: string | null | undefined) => {
    if (!l) return null;
    return l === "nl" ? "🇳🇱 NL" : l === "en" ? "🇬🇧 EN" : "🌐 both";
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex h-14 items-center px-6 gap-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-sidebar)" }}
      >
        <Link href="/materials" className="flex items-center gap-2">
          <span className="text-ea-teal font-bold">◆</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Fellowship</span>
        </Link>
        <nav className="flex items-center gap-1 ml-4">
          <Link href="/materials" className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Materials</Link>
          <Link href="/account" className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>My account</Link>
          <Link href={`/group/${groupId}`} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Group chat</Link>
          <Link href="/sessions" className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Sessions</Link>
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "rgba(22,135,156,0.1)", color: "var(--color-ea-teal)" }}
          >
            Overview
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <form action="/auth/logout" method="POST">
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg transition" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Title */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {group.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {group.cohort && <span className="mr-2">{group.cohort} ·</span>}
              {members.length} student{members.length !== 1 ? "s" : ""} ·{" "}
              {TOTAL_LESSONS} lessons total
            </p>
          </div>
          <Link
            href="/sessions"
            className="text-sm px-4 py-2 rounded-xl font-medium text-white"
            style={{ background: "var(--color-ea-teal)" }}
          >
            + Schedule session
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Students" value={String(members.length)} icon="👥" />
          <StatCard label="Avg. completion" value={`${avgCompletion}%`} icon="📊" />
          <StatCard label="Upcoming sessions" value={String(upcomingSessions.length)} icon="📅" />
        </div>

        {/* Upcoming sessions strip */}
        {upcomingSessions.length > 0 && (
          <section
            className="rounded-2xl p-4 space-y-2"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              Upcoming sessions
            </h2>
            {upcomingSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span>📅</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.title}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(s.scheduledAt)}</p>
                  </div>
                </div>
                {s.meetLink && (
                  <a
                    href={s.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                    style={{ background: "var(--color-ea-teal)" }}
                  >
                    Join →
                  </a>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Students */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-muted)" }}>
            Students ({members.length})
          </h2>

          {members.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No students assigned to this group yet.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Coordinators assign students on the{" "}
                <a href="/admin/form-groups" className="text-ea-teal underline">Form Groups</a> page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const prog = progressByParticipant[member.id];
                const app = appByEmail[member.email];
                const overallPct = Math.round((prog.completedCount / TOTAL_LESSONS) * 100);

                return (
                  <div
                    key={member.id}
                    className="rounded-2xl p-5"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    {/* Top row: name + meta */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ background: "var(--color-ea-teal)" }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                            {member.name}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                            {member.email}
                          </p>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {app?.city && (
                          <Badge icon="📍">{app.city}</Badge>
                        )}
                        {app?.language && (
                          <Badge>{langLabel(app.language) ?? app.language}</Badge>
                        )}
                        {app?.careerStage && (
                          <Badge>{app.careerStage}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Application info */}
                    {app && (
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
                        {app.occupation && (
                          <span><span className="font-medium" style={{ color: "var(--text-secondary)" }}>Occupation:</span> {app.occupation}</span>
                        )}
                        {app.educationLevel && (
                          <span><span className="font-medium" style={{ color: "var(--text-secondary)" }}>Education:</span> {app.educationLevel}</span>
                        )}
                        {app.mainReason && app.mainReason.length > 0 && (
                          <span><span className="font-medium" style={{ color: "var(--text-secondary)" }}>Joined for:</span> {app.mainReason.join(" · ")}</span>
                        )}
                      </div>
                    )}

                    {/* Overall progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Overall progress</span>
                        <span className="text-xs font-semibold" style={{ color: overallPct >= 80 ? "#16a34a" : "var(--text-muted)" }}>
                          {prog.completedCount}/{TOTAL_LESSONS} lessons · {overallPct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${overallPct}%`,
                            background: overallPct >= 80
                              ? "#16a34a"
                              : overallPct >= 40
                              ? "var(--color-ea-teal)"
                              : "#94a3b8",
                          }}
                        />
                      </div>
                    </div>

                    {/* Per-week progress */}
                    <div className="flex gap-2 flex-wrap">
                      {WEEK_DEFS.map((week, i) => {
                        const done = prog.weekCounts[i];
                        const total = prog.weekTotals[i];
                        const pct = Math.round((done / total) * 100);
                        const isComplete = done === total;
                        const started = done > 0;

                        return (
                          <div key={week.slug} className="flex items-center gap-1.5 text-xs">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center font-semibold text-[10px]"
                              style={{
                                background: isComplete
                                  ? "#16a34a"
                                  : started
                                  ? "rgba(22,135,156,0.15)"
                                  : "var(--border)",
                                color: isComplete
                                  ? "#fff"
                                  : started
                                  ? "var(--color-ea-teal)"
                                  : "var(--text-muted)",
                              }}
                            >
                              {isComplete ? "✓" : i + 1}
                            </span>
                            <span style={{ color: "var(--text-muted)" }}>
                              W{i + 1}{" "}
                              <span style={{ color: isComplete ? "#16a34a" : started ? "var(--color-ea-teal)" : "var(--text-muted)" }}>
                                {done}/{total}
                              </span>
                            </span>
                            {i < WEEK_DEFS.length - 1 && (
                              <span className="mx-1" style={{ color: "var(--border)" }}>·</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      </div>
    </div>
  );
}

function Badge({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{ background: "var(--border)", color: "var(--text-secondary)" }}
    >
      {icon && <span className="mr-1">{icon}</span>}{children}
    </span>
  );
}
