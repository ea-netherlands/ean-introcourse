/**
 * /admin — dashboard with live stats (Stage 6)
 */
import { Card } from "@/components/ui";
import Link from "next/link";
import { db, ensureMigrated, participants, groups, fellowshipSessions, sessionAttendance } from "@/db";
import { eq, count, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await ensureMigrated();

  // Stats queries in parallel
  const [
    participantStats,
    groupCount,
    sessionStats,
    attendanceStats,
  ] = await Promise.all([
    // Participants by status
    db
      .select({ status: participants.status, n: count() })
      .from(participants)
      .groupBy(participants.status),
    // Group count
    db.select({ n: count() }).from(groups),
    // Session count
    db.select({ n: count() }).from(fellowshipSessions),
    // Attendance: attended vs total rows
    db
      .select({
        attended: count(sql`CASE WHEN ${sessionAttendance.attended} = TRUE THEN 1 END`),
        total: count(),
      })
      .from(sessionAttendance),
  ]);

  const byStatus = Object.fromEntries(participantStats.map((r) => [r.status, r.n]));
  const totalParticipants = participantStats.reduce((s, r) => s + Number(r.n), 0);
  const activeCount = Number(byStatus.active ?? 0);
  const pendingCount = Number(byStatus.pending ?? 0);
  const completedCount = Number(byStatus.completed ?? 0);
  const totalGroups = Number(groupCount[0]?.n ?? 0);
  const totalSessions = Number(sessionStats[0]?.n ?? 0);
  const attendedRows = Number(attendanceStats[0]?.attended ?? 0);
  const totalAttendanceRows = Number(attendanceStats[0]?.total ?? 0);
  const attendanceRate =
    totalAttendanceRows > 0 ? Math.round((attendedRows / totalAttendanceRows) * 100) : null;

  const sections = [
    {
      href: "/admin/participants",
      title: "Participants",
      description: "View progress, exercise answers, and send magic links.",
      stage: "Stage 2",
    },
    {
      href: "/admin/groups",
      title: "Groups",
      description: "Manage cohorts and assign participants to groups.",
      stage: "Stage 2",
    },
    {
      href: "/admin/applications",
      title: "Applications",
      description: "Review sign-up applications and accept or reject them.",
      stage: "Stage 4",
    },
    {
      href: "/admin/sessions",
      title: "Sessions",
      description: "Schedule group sessions, send calendar invites, track attendance.",
      stage: "Stage 5",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl text-slate-900 mb-1">Fellowship Admin</h1>
      <p className="text-sm text-slate-500 mb-6">
        EA Netherlands — Intro Fellowship platform
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Active participants" value={activeCount} sub={`${pendingCount} pending · ${completedCount} completed`} color="teal" />
        <StatCard label="Groups" value={totalGroups} />
        <StatCard label="Sessions scheduled" value={totalSessions} />
        <StatCard
          label="Attendance rate"
          value={attendanceRate !== null ? `${attendanceRate}%` : "—"}
          sub={totalAttendanceRows > 0 ? `${attendedRows}/${totalAttendanceRows} tracked` : "No data yet"}
        />
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group block">
            <Card className="h-full group-hover:border-teal-200 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-base font-medium text-slate-800">{s.title}</h2>
                <span className="text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                  {s.stage}
                </span>
              </div>
              <p className="text-sm text-slate-500">{s.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/export/participants"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
          >
            ⬇ Export participants CSV
          </a>
          <Link
            href="/admin/participants?status=pending"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
          >
            ⏳ Review pending ({pendingCount})
          </Link>
          <Link
            href="/admin/sessions"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
          >
            📅 Schedule a session
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: "teal";
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: color === "teal" ? "#0f766e" : "#1e293b" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
