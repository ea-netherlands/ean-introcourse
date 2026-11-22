/**
 * Group session dates from the cohort start (no database access, safe in the browser too).
 * A group meets weekly on its day & time (groups.timing, e.g. "monday_1930"); week 1 is the
 * first such weekday on or after the cohort start date. groups.dates, when set, are exceptions
 * that replace the computed dates for that group.
 */
export const COURSE_WEEKS = 5;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "monday_1930" → 1 (Monday); null when unknown. */
export function weekdayOf(timing: string | null | undefined): number | null {
  const day = timing?.split("_")[0];
  const i = day ? WEEKDAYS.indexOf(day) : -1;
  return i >= 0 ? i : null;
}

/** "monday_1930" → "19:30"; null when unknown. */
export function timeOf(timing: string | null | undefined): string | null {
  const m = timing?.match(/_(\d{2})(\d{2})$/);
  return m ? `${m[1]}:${m[2]}` : null;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The 5 weekly dates for a group with this day & time in a cohort starting on `start`. */
export function cohortDates(start: string | null | undefined, timing: string | null | undefined): string[] {
  const wd = weekdayOf(timing);
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start) || wd == null) return [];
  const startDay = new Date(`${start}T12:00:00Z`).getUTCDay();
  const first = addDays(start, (wd - startDay + 7) % 7);
  return Array.from({ length: COURSE_WEEKS }, (_, i) => addDays(first, 7 * i));
}

/** The dates a group actually uses: its own exceptions if set, otherwise the cohort's. */
export function effectiveDates(
  group: { dates?: unknown; timing?: string | null },
  cohortStart: string | null | undefined
): { dates: string[]; custom: boolean } {
  const own = Array.isArray(group.dates) ? (group.dates as unknown[]).filter((d): d is string => typeof d === "string") : [];
  if (own.length) return { dates: [...own].sort(), custom: true };
  return { dates: cohortDates(cohortStart, group.timing), custom: false };
}
