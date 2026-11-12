/**
 * Shared time-slot vocabulary for the public application form
 * (`/apply`) and anywhere that needs to display an applicant's
 * chosen availability in a human-readable way (e.g. the admin
 * applications list).
 */

export const TIMESLOTS = [
  { value: "monday_1730", label: "Monday 17:30" },
  { value: "monday_1930", label: "Monday 19:30" },
  { value: "thursday_1730", label: "Thursday 17:30" },
  { value: "thursday_1930", label: "Thursday 19:30" },
  { value: "other", label: "Other" },
] as const;

const TIMESLOT_LABELS: Record<string, string> = Object.fromEntries(
  TIMESLOTS.map(({ value, label }) => [value, label])
);

/** Maps a single stored slot value (e.g. "monday_1930", or "other: Fridays only") to a readable label. */
export function formatAvailabilitySlot(value: string): string {
  if (value in TIMESLOT_LABELS) return TIMESLOT_LABELS[value];
  // "other: <custom text>" — keep the custom text, drop the raw prefix.
  const otherMatch = value.match(/^other:\s*(.+)$/i);
  if (otherMatch) return otherMatch[1];
  return value;
}

/** Formats a full availability array (or unknown legacy value) as a comma-separated readable string. */
export function formatAvailability(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.map((v) => formatAvailabilitySlot(String(v))).join(", ");
  return formatAvailabilitySlot(String(value));
}
