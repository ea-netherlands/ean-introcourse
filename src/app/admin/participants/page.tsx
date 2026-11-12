import Link from "next/link";
import { db, participants, lessonProgress, groups, ensureMigrated } from "@/db";
import { eq, sql } from "drizzle-orm";
import { getAllWeeksWithLessons } from "@/lib/lessons";
import { ParticipantsTable } from "./participants-table";

export const dynamic = "force-dynamic";

interface Props { searchParams: Promise<{ status?: string }> }

export default async function ParticipantsPage({ searchParams }: Props) {
  await ensureMigrated();
  const { status: filterStatus } = await searchParams;

  const allWeeks = getAllWeeksWithLessons();
  const totalLessons = allWeeks.reduce((sum, w) => sum + w.lessons.length, 0);

  // All participants with their group name
  const allRows = await db
    .select({
      id: participants.id,
      email: participants.email,
      name: participants.name,
      role: participants.role,
      status: participants.status,
      groupId: participants.groupId,
      groupName: groups.name,
      createdAt: participants.createdAt,
    })
    .from(participants)
    .leftJoin(groups, eq(groups.id, participants.groupId))
    .orderBy(participants.createdAt);

  const rows = filterStatus
    ? allRows.filter((r) => r.status === filterStatus)
    : allRows;

  // Completed lesson counts per participant
  const completionRows = await db
    .select({
      participantId: lessonProgress.participantId,
      completed: sql<number>`cast(count(*) filter (where ${lessonProgress.completedAt} is not null) as int)`,
    })
    .from(lessonProgress)
    .groupBy(lessonProgress.participantId);

  const completionMap = new Map(
    completionRows.map((r) => [r.participantId, r.completed])
  );

  const statusTabs = [
    { label: "All", value: undefined },
    { label: "Active", value: "active" },
    { label: "Pending", value: "pending" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Participants</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {rows.length}{filterStatus ? ` ${filterStatus}` : ""} of {allRows.length} · {totalLessons} lessons total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export/participants"
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-teal-600 transition"
          >
            ⬇ Export CSV
          </a>
          <Link
            href="/admin/participants/new"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition"
          >
            + Add participant
          </Link>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5">
        {statusTabs.map((tab) => {
          const active = filterStatus === tab.value;
          const href = tab.value ? `/admin/participants?status=${tab.value}` : "/admin/participants";
          return (
            <Link
              key={tab.label}
              href={href}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={
                active
                  ? { background: "rgba(13,148,136,0.1)", color: "#0d9488", fontWeight: 500 }
                  : { color: "#64748b" }
              }
            >
              {tab.label}
              {tab.value && (
                <span className="ml-1.5 text-xs text-slate-400">
                  {allRows.filter((r) => r.status === tab.value).length}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No participants yet.</p>
          <Link
            href="/admin/participants/new"
            className="mt-3 inline-block text-teal-600 text-sm underline"
          >
            Add the first one
          </Link>
        </div>
      ) : (
        <ParticipantsTable
          totalLessons={totalLessons}
          rows={rows.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            role: p.role,
            status: p.status,
            groupName: p.groupName,
            done: completionMap.get(p.id) ?? 0,
          }))}
        />
      )}
    </div>
  );
}
