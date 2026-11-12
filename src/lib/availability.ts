/**
 * The ONE time-slot vocabulary for the whole app: the application form
 * (`/apply`), onboarding (`/onboard`), group timing (`groups.timing`),
 * the Form Groups matcher and every admin display.
 *
 * Sessions are 75 minutes (see SESSION_DURATION_MINUTES in ./calendar).
 */

export const TIMESLOTS = [
  { value: "monday_1730", label: "Monday 17:30–18:45", short: "Mon 17:30" },
  { value: "monday_1930", label: "Monday 19:30–20:45", short: "Mon 19:30" },
  { value: "thursday_1730", label: "Thursday 17:30–18:45", short: "Thu 17:30" },
  { value: "thursday_1930", label: "Thursday 19:30–20:45", short: "Thu 19:30" },
  { value: "other", label: "Other", short: "Other" },
] as const;

/** The slots a group can be scheduled in (everything except "other"). */
export const GROUP_TIMESLOTS = TIMESLOTS.filter((t) => t.value !== "other");

/**
 * Older onboarding forms stored "early_monday" etc., and early seed data used
 * "monday_early". Map those onto the canonical values so matching still works.
 */
const LEGACY_SLOTS: Record<string, string> = {
  early_monday: "monday_1730",
  late_monday: "monday_1930",
  early_thursday: "thursday_1730",
  late_thursday: "thursday_1930",
  monday_early: "monday_1730",
  monday_late: "monday_1930",
  thursday_early: "thursday_1730",
  thursday_late: "thursday_1930",
};

/** Canonical slot value for a stored value (legacy values are translated). */
export function normalizeSlot(value: string): string {
  return LEGACY_SLOTS[value] ?? value;
}

/** Canonical, de-duplicated availability list from whatever is stored. */
export function normalizeAvailability(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => normalizeSlot(String(v))))];
}

const LABELS: Record<string, string> = Object.fromEntries(
  TIMESLOTS.map(({ value, label }) => [value, label])
);
const SHORT_LABELS: Record<string, string> = Object.fromEntries(
  TIMESLOTS.map(({ value, short }) => [value, short])
);

/** Maps a single stored slot value (e.g. "monday_1930", or "other: Fridays only") to a readable label. */
export function formatAvailabilitySlot(value: string, opts: { short?: boolean } = {}): string {
  const v = normalizeSlot(value);
  const table = opts.short ? SHORT_LABELS : LABELS;
  if (v in table) return table[v];
  // "other: <custom text>" — keep the custom text, drop the raw prefix.
  const otherMatch = v.match(/^other:\s*(.+)$/i);
  if (otherMatch) return otherMatch[1];
  return v;
}

/** Formats a full availability array (or unknown legacy value) as a comma-separated readable string. */
export function formatAvailability(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.map((v) => formatAvailabilitySlot(String(v))).join(", ");
  return formatAvailabilitySlot(String(value));
}

/** Readable label for a group's timing value. */
export function formatGroupTiming(value: string | null | undefined, opts: { short?: boolean } = {}): string {
  if (!value) return "Not scheduled";
  return formatAvailabilitySlot(value, opts);
}
