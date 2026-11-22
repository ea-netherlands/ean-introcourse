/**
 * /admin/sessions — plan and follow the sessions of each group.
 *   ?group=<id>  one group: its details, a form filled in for that group (incl. "plan from the
 *                group's dates") and only its sessions. Without it: all sessions, per group.
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
import { SessionGroupPicker } from "./group-picker";
import { googleCalendarConfigured } from "@/lib/google-calendar";
import { formatGroupTiming } from "@/lib/availability";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  await ensureMigrated();
  const sp = await searchParams;

  const allSessions = await db
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
    .select({
      id: groups.id,
      name: groups.name,
      cohort: groups.cohort,
      active: groups.active,
      timing: groups.timing,
      dates: groups.dates,
      facilitatorId: groups.facilitatorId,
    })
    .from(groups)
    .orderBy(groups.name);
  const activeGroups = allGroups.filter((g) => g.active);
  const selected = sp.group ? allGroups.find((g) => g.id === sp.group) ?? null : null;
  const sessions = selected ? allSessions.filter((s) => s.groupId === selected.id) : allSessions;

  const facilitators = await db
    .select({ id: participants.id, name: participants.name })
    .from(participants)
    .where(eq(participants.role, "facilitator"))
    .orderBy(participants.name);
  const facName = (id: string | null) => facilitators.find((f) => f.id === id)?.name ?? null;

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selected ? <>Sessions of <strong className="text-slate-700">{selected.name}</strong></> : "All groups"} ·{" "}
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <SessionGroupPicker
          current={selected?.id ?? ""}
          groups={activeGroups.map((g) => ({ id: g.id, label: g.cohort ? `${g.name} · ${g.cohort}` : g.name }))}
        />
      </div>

      {selected && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">{selected.name}{selected.cohort ? ` · ${selected.cohort}` : ""}</p>
          <p className="mt-0.5 text-slate-600">
            {formatGroupTiming(selected.timing)} · facilitator {facName(selected.facilitatorId) ?? "not set"} ·{" "}
            {Array.isArray(selected.dates) && selected.dates.length
              ? `dates ${(selected.dates as string[]).map((d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })).join(", ")}`
              : "no dates set"}
            {" · "}
            <Link href="/admin/groups?tab=setup" className="text-teal-700 underline">change in Groups</Link>
          </p>
        </div>
      )}

      {/* Create form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          {selected ? `Schedule sessions for ${selected.name}` : "Schedule a new session"}
        </h2>
        <NewSessionForm
          key={selected?.id ?? "all"}
          groups={activeGroups.map((g) => ({
            id: g.id,
            name: g.cohort ? `${g.name} · ${g.cohort}` : g.name,
            timing: g.timing,
            dates: Array.isArray(g.dates) ? (g.dates as string[]) : [],
            facilitatorId: g.facilitatorId,
          }))}
          fixedGroupId={selected?.id ?? null}
          existingDates={sessions.map((x) => x.scheduledAt.toISOString())}
          facilitators={facilitators}
          googleConfigured={googleCalendarConfigured()}
        />
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
                  {!selected && <Badge variant="default">{s.groupName ?? "No group"}</Badge>}
                  {s.facilitatorName && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <span>👤</span>{s.facilitatorName}
                    </span>
                  )}
                  {s.meetLink && (
                    <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full">
                      Meet ✓
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
                  {!selected && <Badge variant="default">{s.groupName ?? "No group"}</Badge>}
                  {s.facilitatorName && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <span>👤</span>{s.facilitatorName}
                    </span>
                  )}
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
