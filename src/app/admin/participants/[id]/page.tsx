import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  db,
  participants,
  lessonProgress,
  groups,
  ensureMigrated,
} from "@/db";
import { getAllWeeksWithLessons } from "@/lib/lessons";
import { Badge } from "@/components/ui";
import { SendLinkButton } from "./send-link-button";
import { GroupAssign } from "./group-assign";
import { StatusChange } from "./status-change";
import { DeleteParticipantButton } from "./delete-button";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ParticipantDetailPage({ params }: Props) {
  const { id } = await params;
  await ensureMigrated();

  const [participant] = await db
    .select({
      id: participants.id,
      name: participants.name,
      email: participants.email,
      role: participants.role,
      status: participants.status,
      groupId: participants.groupId,
      groupName: groups.name,
      createdAt: participants.createdAt,
    })
    .from(participants)
    .leftJoin(groups, eq(groups.id, participants.groupId))
    .where(eq(participants.id, id))
    .limit(1);

  if (!participant) notFound();

  // Prev / next navigation — same order as the participants list (createdAt asc)
  const allIds = await db
    .select({ id: participants.id })
    .from(participants)
    .orderBy(participants.createdAt);
  const idx = allIds.findIndex((r) => r.id === id);
  const prevId = idx > 0 ? allIds[idx - 1].id : null;
  const nextId = idx < allIds.length - 1 ? allIds[idx + 1].id : null;

  // All groups (for assignment dropdown)
  const allGroups = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .orderBy(groups.name);

  // Load lesson-level progress for this participant
  const progressRows = await db
    .select({
      lessonId: lessonProgress.lessonId,
      progressPct: lessonProgress.progressPct,
      completedAt: lessonProgress.completedAt,
      updatedAt: lessonProgress.updatedAt,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.participantId, id));

  const progressMap = new Map(
    progressRows.map((r) => [r.lessonId, r])
  );

  const allWeeks = getAllWeeksWithLessons();
  const totalLessons = allWeeks.reduce((sum, w) => sum + w.lessons.length, 0);
  const completedCount = progressRows.filter((r) => r.completedAt).length;
  const overallPct =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="max-w-2xl">
      {/* Back link + prev/next navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/admin/participants"
          className="text-sm text-slate-400 hover:text-teal-600 transition"
        >
          ← Participants
        </Link>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-1">
            {idx + 1} / {allIds.length}
          </span>
          {prevId ? (
            <Link
              href={`/admin/participants/${prevId}`}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 hover:text-teal-600 transition"
              title="Previous participant"
            >
              ← Prev
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded-lg border border-slate-100 text-sm text-slate-300 cursor-not-allowed">
              ← Prev
            </span>
          )}
          {nextId ? (
            <Link
              href={`/admin/participants/${nextId}`}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 hover:text-teal-600 transition"
              title="Next participant"
            >
              Next →
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded-lg border border-slate-100 text-sm text-slate-300 cursor-not-allowed">
              Next →
            </span>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold text-lg">
              {participant.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {participant.name}
              </h1>
              <p className="text-sm text-slate-500">{participant.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge
              variant={
                participant.status === "active"
                  ? "teal"
                  : participant.status === "completed"
                  ? "success"
                  : "warning"
              }
            >
              {participant.status}
            </Badge>
            {participant.role === "facilitator" && (
              <Badge variant="default">facilitator</Badge>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-6 text-sm text-slate-500">
          <span>
            Group:{" "}
            <strong className="text-slate-700">
              {participant.groupName ?? "—"}
            </strong>
          </span>

          <span>
            Joined:{" "}
            <strong className="text-slate-700">
              {participant.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </strong>
          </span>
          <span>
            Progress:{" "}
            <strong className="text-slate-700">
              {completedCount}/{totalLessons} lessons ({overallPct}%)
            </strong>
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        {/* Group assignment */}
        <GroupAssign
          participantId={participant.id}
          currentGroupId={participant.groupId}
          groups={allGroups}
        />

        {/* Status change */}
        <StatusChange
          participantId={participant.id}
          currentStatus={participant.status}
        />

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <SendLinkButton participantId={participant.id} email={participant.email} />
          <DeleteParticipantButton participantId={participant.id} name={participant.name} />
        </div>
      </div>

      {/* Per-lesson breakdown */}
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
        Lesson progress
      </h2>

      <div className="space-y-4">
        {allWeeks.map((week) => (
          <div
            key={week.slug}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Week {week.weekNumber} — {week.shortTitle}
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {week.lessons.map((lesson) => {
                const prog = progressMap.get(lesson.id);
                const pct = prog?.progressPct ?? 0;
                const done = !!prog?.completedAt;
                return (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span
                      className="text-xs w-5 text-center shrink-0"
                      style={{ color: done ? "#16a34a" : "#94a3b8" }}
                    >
                      {done ? "✓" : lesson.lessonNumber}
                    </span>
                    <span className="flex-1 text-sm text-slate-700 truncate">
                      {lesson.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: done ? "#16a34a" : "#14b8a6",
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
