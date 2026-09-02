/**
 * /admin/sessions — list and create fellowship sessions (Stage 5)
 */
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import {
  db,
  ensureMigrated,
  fellowshipSessions,
  groups,
  participants,
} from "@/db";
import { Badge } from "@/components/ui";
import { NewSessionForm } from "./new-session-form";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  await ensureMigrated();

  const sessions = await db
    .select({
      id: fellowshipSessions.id,
      title: fellowshipSessions.title,
      scheduledAt: fellowshipSessions.scheduledAt,
      meetLink: fellowshipSessions.meetLink,
      groupId: fellowshipSessions.groupId,
      groupName: groups.name,
      facilitatorName: participants.name,
    })
    .from(fellowshipSessions)
    .leftJoin(groups, eq(groups.id, fellowshipSessions.groupId))
    .leftJoin(participants, eq(participants.id, fellowshipSessions.facilitatorId))
    .orderBy(desc(fellowshipSessions.scheduledAt));

  const allGroups = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .orderBy(groups.name);

  const facilitators = await db
    .select({ id: participants.id, name: participants.name })
    .from(participants)
    .where(eq(participants.role, "facilitator"))
    .orderBy(participants.name);

  const now = new Date();
  const upcoming = sessions.filter((s) => s.scheduledAt >= now);
  const past = sessions.filter((s) => s.scheduledAt < now);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
      </div>

      {/* Create form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Schedule a new session</h2>
        <NewSessionForm groups={allGroups} facilitators={facilitators} />
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Upcoming ({upcoming.length})
          </h2>
          <div className="space-y-2">
            {upcoming.map((s) => (
              <Link
                key={s.id}
                href={`/admin/sessions/${s.id}`}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-teal-300 hover:shadow-sm transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📅</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 group-hover:text-teal-700">
                      {s.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{fmt(s.scheduledAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.groupName && <Badge variant="default">{s.groupName}</Badge>}
                  {s.facilitatorName && (
                    <span className="text-xs text-slate-400">{s.facilitatorName}</span>
                  )}
                  {s.meetLink && (
                    <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full">
                      Meet link
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Past ({past.length})
          </h2>
          <div className="space-y-2">
            {past.map((s) => (
              <Link
                key={s.id}
                href={`/admin/sessions/${s.id}`}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 opacity-70 hover:opacity-100 hover:border-teal-300 transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">✅</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmt(s.scheduledAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.groupName && <Badge variant="default">{s.groupName}</Badge>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm">No sessions yet. Schedule one above.</p>
        </div>
      )}
    </div>
  );
}
