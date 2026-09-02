/**
 * /sessions — session planning for facilitators (and admins)
 *
 * Facilitators can schedule sessions for their own group.
 * Admins see all groups.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc, and } from "drizzle-orm";
import {
  db,
  ensureMigrated,
  fellowshipSessions,
  groups,
  participants,
} from "@/db";
import { getCurrentParticipant } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { FacilitatorSessionForm } from "./facilitator-session-form";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  await ensureMigrated();
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) redirect("/auth/login?next=/sessions");
  if (me.role !== "facilitator" && me.role !== "admin") redirect("/materials");

  const isAdmin = me.role === "admin";

  // Get all groups (admin) or just the facilitator's group(s)
  const allGroups = await db.select({ id: groups.id, name: groups.name }).from(groups);

  // Get all facilitators for the form
  const facilitators = await db
    .select({ id: participants.id, name: participants.name })
    .from(participants)
    .where(eq(participants.role, "facilitator"));

  // Sessions: admin sees all, facilitator sees sessions for their group
  const sessionRows = await db
    .select({
      id: fellowshipSessions.id,
      title: fellowshipSessions.title,
      scheduledAt: fellowshipSessions.scheduledAt,
      meetLink: fellowshipSessions.meetLink,
      groupId: fellowshipSessions.groupId,
      groupName: groups.name,
      facilitatorId: fellowshipSessions.facilitatorId,
    })
    .from(fellowshipSessions)
    .leftJoin(groups, eq(groups.id, fellowshipSessions.groupId))
    .orderBy(desc(fellowshipSessions.scheduledAt));

  // Filter to facilitator's group unless admin
  const relevantSessions = isAdmin
    ? sessionRows
    : sessionRows.filter((s) => s.groupId === me.groupId || s.facilitatorId === me.id);

  const now = new Date();
  const upcoming = relevantSessions.filter((s) => s.scheduledAt >= now);
  const past = relevantSessions.filter((s) => s.scheduledAt < now);

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <header
        className="flex h-14 items-center px-6 gap-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-sidebar)" }}
      >
        <Link href="/materials" className="flex items-center gap-2">
          <span className="text-ea-teal font-bold">◆</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Fellowship</span>
        </Link>
        <nav className="flex items-center gap-1 ml-4">
          <Link href="/materials" className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Materials</Link>
          <Link href="/account" className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>My account</Link>
          {me.groupId && (
            <Link href={`/group/${me.groupId}`} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Group chat</Link>
          )}
          <span className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "rgba(22,135,156,0.1)", color: "var(--color-ea-teal)" }}>
            Sessions
          </span>
          {me.groupId && (
            <Link href={`/group/${me.groupId}/overview`} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Overview</Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {isAdmin && (
            <Link href="/admin/sessions" className="text-xs px-3 py-1.5 rounded-lg border transition" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
              Admin view →
            </Link>
          )}
          <form action="/auth/logout" method="POST">
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg transition" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>Sign out</button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Sessions</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Schedule and manage group sessions.
          </p>
        </div>

        {/* Schedule new session */}
        <section
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Schedule a new session
          </h2>
          <FacilitatorSessionForm
            groups={isAdmin ? allGroups : allGroups.filter((g) => g.id === me.groupId)}
            facilitators={facilitators}
            defaultGroupId={me.groupId ?? ""}
            defaultFacilitatorId={me.id}
          />
        </section>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Upcoming ({upcoming.length})
            </h2>
            <div className="space-y-2">
              {upcoming.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{fmt(s.scheduledAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.groupName && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(22,135,156,0.1)", color: "var(--color-ea-teal)" }}>
                        {s.groupName}
                      </span>
                    )}
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
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Past ({past.length})
            </h2>
            <div className="space-y-2">
              {past.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl p-4 flex items-center justify-between gap-3 opacity-60"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{fmt(s.scheduledAt)}</p>
                    </div>
                  </div>
                  {s.groupName && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
                      {s.groupName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
            <p className="text-sm">No sessions yet. Schedule your first one above.</p>
          </div>
        )}
      </main>
    </div>
  );
}
