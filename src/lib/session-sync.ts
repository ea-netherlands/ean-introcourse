/**
 * Automatic sessions: every active group with a facilitator and a day & time gets one session
 * per course week on its dates (cohort start + weekday, or the group's own exception dates),
 * at the group's time in Dutch time. Runs after group/cohort changes and daily from the cron.
 *
 * - A session that already exists for that week is kept; its time follows the group unless
 *   someone moved it by hand (time_locked), and its facilitator follows the group.
 * - A hand-made session of the group on the same day is adopted as that week's session.
 * - Extra future automatic sessions without attendance are removed when there are fewer dates.
 * - Every current group member gets an attendance row for upcoming sessions, so reminders
 *   (cron/daily) also reach people who joined after the session was created.
 */
import { and, eq, gt, inArray, isNotNull } from "drizzle-orm";
import { cohorts, db, ensureMigrated, fellowshipSessions, groups, participants, sessionAttendance } from "@/db";
import { effectiveDates, timeOf } from "@/lib/cohort-dates";
import { newId } from "@/lib/ids";

const TZ = "Europe/Amsterdam";

/** "2027-02-01" + "19:30" in Dutch time → the exact moment (Date, UTC). */
export function amsterdamToUtc(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const offsetAt = (t: number) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - t;
  };
  let t = wanted - offsetAt(wanted);
  t = wanted - offsetAt(t); // second pass for the DST switch days
  return new Date(t);
}

/** Dutch calendar day of a moment, YYYY-MM-DD. */
export function amsterdamDay(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}

export async function syncGroupSessions(groupId: string): Promise<{ created: number; moved: number }> {
  await ensureMigrated();
  const [g] = await db
    .select({
      id: groups.id, active: groups.active, timing: groups.timing, dates: groups.dates,
      facilitatorId: groups.facilitatorId, cohortStart: cohorts.startDate,
    })
    .from(groups)
    .leftJoin(cohorts, eq(cohorts.name, groups.cohort))
    .where(eq(groups.id, groupId))
    .limit(1);
  const result = { created: 0, moved: 0 };
  if (!g || !g.active) return result;

  const time = timeOf(g.timing);
  const { dates } = effectiveDates(g, g.cohortStart);
  const existing = await db.select().from(fellowshipSessions).where(eq(fellowshipSessions.groupId, g.id));

  if (g.facilitatorId && time && dates.length) {
    for (let i = 0; i < dates.length; i++) {
      const week = i + 1;
      const when = amsterdamToUtc(dates[i], time);
      let s = existing.find((x) => x.week === week);
      if (!s) {
        // Adopt a hand-made session of this group on the same day.
        s = existing.find((x) => x.week == null && amsterdamDay(x.scheduledAt) === dates[i]);
        if (s) {
          await db.update(fellowshipSessions).set({ week, timeLocked: true }).where(eq(fellowshipSessions.id, s.id));
          s.week = week;
          continue;
        }
        await db.insert(fellowshipSessions).values({
          id: newId("fs"),
          title: `Week ${week}`,
          groupId: g.id,
          facilitatorId: g.facilitatorId,
          scheduledAt: when,
          week,
        });
        result.created++;
        continue;
      }
      const update: Partial<typeof fellowshipSessions.$inferInsert> = {};
      if (!s.timeLocked && s.scheduledAt.getTime() !== when.getTime()) update.scheduledAt = when;
      if (s.facilitatorId !== g.facilitatorId) update.facilitatorId = g.facilitatorId;
      if (Object.keys(update).length) {
        await db.update(fellowshipSessions).set(update).where(eq(fellowshipSessions.id, s.id));
        if (update.scheduledAt) result.moved++;
      }
    }

    // Fewer dates than before: drop extra future automatic sessions nobody attended yet.
    const extra = existing.filter((x) => x.week != null && x.week > dates.length && x.scheduledAt > new Date());
    for (const x of extra) {
      const [att] = await db
        .select({ id: sessionAttendance.sessionId })
        .from(sessionAttendance)
        .where(and(eq(sessionAttendance.sessionId, x.id), isNotNull(sessionAttendance.attended)))
        .limit(1);
      if (!att) {
        await db.delete(sessionAttendance).where(eq(sessionAttendance.sessionId, x.id));
        await db.delete(fellowshipSessions).where(eq(fellowshipSessions.id, x.id));
      }
    }
  }

  // Attendance rows (used for reminders) for every current member and every upcoming session.
  const upcoming = await db
    .select({ id: fellowshipSessions.id })
    .from(fellowshipSessions)
    .where(and(eq(fellowshipSessions.groupId, g.id), gt(fellowshipSessions.scheduledAt, new Date())));
  const members = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.groupId, g.id), eq(participants.role, "participant")));
  if (upcoming.length && members.length) {
    const have = await db
      .select({ s: sessionAttendance.sessionId, p: sessionAttendance.participantId })
      .from(sessionAttendance)
      .where(inArray(sessionAttendance.sessionId, upcoming.map((u) => u.id)));
    const key = new Set(have.map((h) => `${h.s}|${h.p}`));
    const missing = upcoming.flatMap((u) => members.filter((m) => !key.has(`${u.id}|${m.id}`)).map((m) => ({ sessionId: u.id, participantId: m.id })));
    for (const row of missing) await db.insert(sessionAttendance).values(row);
  }
  return result;
}

/** Sync every active group of a cohort ("" = groups without a cohort). */
export async function syncCohortSessions(cohort: string) {
  await ensureMigrated();
  const rows = await db.select({ id: groups.id, cohort: groups.cohort, active: groups.active }).from(groups);
  for (const r of rows) if (r.active && (r.cohort ?? "") === cohort) await syncGroupSessions(r.id);
}

/** Sync every active group (daily cron). */
export async function syncAllSessions() {
  await ensureMigrated();
  const rows = await db.select({ id: groups.id }).from(groups).where(eq(groups.active, true));
  let created = 0, moved = 0;
  for (const r of rows) {
    const x = await syncGroupSessions(r.id);
    created += x.created;
    moved += x.moved;
  }
  return { groups: rows.length, created, moved };
}
