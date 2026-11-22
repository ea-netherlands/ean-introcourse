/**
 * Slot booking. A slot is a group with booking details (dates, facilitator,
 * language, format, capacity) and bookable = true. An application books a
 * place in its first-choice slot immediately (applications.slot_id); choices 2
 * and 3 are back-ups for the admin. Places taken = applications with that
 * slot_id whose status is not "rejected", so rejecting or deleting an
 * application frees the place.
 */
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { applications, cohorts, db, ensureMigrated, groups, participants } from "@/db";
import { effectiveDates } from "@/lib/cohort-dates";
import type * as schema from "@/db/schema";
import { formatGroupTiming } from "@/lib/availability";

export const SLOT_FORMATS = [
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
  { value: "in_person", label: "In person" },
] as const;
export const SLOT_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "nl", label: "Dutch" },
  { value: "both", label: "Dutch or English" },
] as const;

export interface SlotView {
  id: string;
  name: string;
  timing: string | null;
  timingLabel: string;
  /** The dates the group meets: its own exceptions, or computed from the cohort start. */
  dates: string[];
  /** true when the group has its own dates instead of following the cohort start. */
  customDates: boolean;
  cohortStart: string | null;
  language: string | null;
  format: string | null;
  location: string | null;
  capacity: number | null;
  booked: number;
  remaining: number | null; // null = no capacity set (unlimited)
  bookable: boolean;
  active: boolean;
  cohort: string | null;
  facilitator: { id: string; name: string; avatarUrl: string | null } | null;
}

type Tx = PgDatabase<PgQueryResultHKT, typeof schema>;

export function labelOf(list: readonly { value: string; label: string }[], v: string | null) {
  return list.find((x) => x.value === v)?.label ?? null;
}

/** Applications currently holding a place, per slot. */
async function bookedCounts(slotIds: string[]): Promise<Map<string, number>> {
  if (slotIds.length === 0) return new Map();
  const rows = await db
    .select({ slotId: applications.slotId, n: sql<number>`cast(count(*) as int)` })
    .from(applications)
    .where(and(inArray(applications.slotId, slotIds), ne(applications.status, "rejected")))
    .groupBy(applications.slotId);
  return new Map(rows.map((r) => [r.slotId as string, r.n]));
}

/**
 * Slots for the admin page (all active groups; with includeClosed also closed ones) or for
 * /apply (bookable only).
 */
export async function listSlots(opts: { bookableOnly: boolean; includeClosed?: boolean }): Promise<SlotView[]> {
  await ensureMigrated();
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      timing: groups.timing,
      dates: groups.dates,
      language: groups.language,
      format: groups.format,
      location: groups.location,
      capacity: groups.capacity,
      bookable: groups.bookable,
      active: groups.active,
      cohort: groups.cohort,
      createdAt: groups.createdAt,
      facilitatorId: participants.id,
      facilitatorName: participants.name,
      facilitatorAvatar: participants.avatarUrl,
      cohortStart: cohorts.startDate,
    })
    .from(groups)
    .leftJoin(participants, eq(participants.id, groups.facilitatorId))
    .leftJoin(cohorts, eq(cohorts.name, groups.cohort))
    .where(
      opts.bookableOnly
        ? and(eq(groups.active, true), eq(groups.bookable, true))
        : opts.includeClosed
          ? undefined
          : eq(groups.active, true)
    )
    .orderBy(groups.createdAt);
  const counts = await bookedCounts(rows.map((r) => r.id));
  return rows.map((r) => {
    const booked = counts.get(r.id) ?? 0;
    const eff = effectiveDates(r, r.cohortStart);
    return {
      id: r.id,
      name: r.name,
      timing: r.timing,
      timingLabel: formatGroupTiming(r.timing),
      dates: eff.dates,
      customDates: eff.custom,
      cohortStart: r.cohortStart ?? null,
      language: r.language,
      format: r.format,
      location: r.location,
      capacity: r.capacity,
      booked,
      remaining: r.capacity == null ? null : Math.max(0, r.capacity - booked),
      bookable: r.bookable,
      active: r.active,
      cohort: r.cohort,
      facilitator: r.facilitatorId ? { id: r.facilitatorId, name: r.facilitatorName ?? "", avatarUrl: r.facilitatorAvatar } : null,
    };
  });
}

/**
 * Inside a transaction: lock the slot row and check it can take one more
 * booking. Locking serialises concurrent applicants for the same slot, so the
 * last place can only be taken once.
 */
export async function claimPlace(tx: Tx, slotId: string): Promise<"ok" | "full" | "unavailable"> {
  const locked = await tx.execute(
    sql`select id, capacity, bookable, active from groups where id = ${slotId} for update`
  );
  const row = (locked as unknown as { rows: { capacity: number | null; bookable: boolean; active: boolean }[] }).rows[0];
  if (!row || !row.bookable || !row.active) return "unavailable";
  if (row.capacity == null) return "ok";
  const [{ n }] = await tx
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(applications)
    .where(and(eq(applications.slotId, slotId), ne(applications.status, "rejected")));
  return n < row.capacity ? "ok" : "full";
}

/** Run fn in a transaction on whichever driver is active (PGlite locally, Postgres in production). */
export function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (db as unknown as Tx).transaction(fn);
}

const DATE_FMT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

export function formatDates(dates: string[]): string {
  return dates
    .filter(Boolean)
    .map((d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", DATE_FMT))
    .join(", ");
}

/** One-line description for emails and admin lists. */
export function describeSlot(s: Pick<SlotView, "timingLabel" | "dates" | "language" | "format" | "location" | "facilitator">): string {
  const parts = [s.timingLabel];
  if (s.dates.length) parts.push(formatDates(s.dates));
  const fmt = labelOf(SLOT_FORMATS, s.format);
  if (fmt) parts.push(s.location && s.format !== "online" ? `${fmt} (${s.location})` : fmt);
  const lang = labelOf(SLOT_LANGUAGES, s.language);
  if (lang) parts.push(lang);
  if (s.facilitator?.name) parts.push(`facilitator ${s.facilitator.name}`);
  return parts.join(" · ");
}

/** A single slot by id (any state), for emails after booking or acceptance. */
export async function getSlot(id: string | null | undefined): Promise<SlotView | null> {
  if (!id) return null;
  const all = await listSlots({ bookableOnly: false });
  return all.find((s) => s.id === id) ?? null;
}
