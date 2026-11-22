"use client";

/**
 * Slot choice on /apply. Applicants click slots in order of preference:
 * the first click is their 1st choice (which reserves a place when they
 * submit), then 2nd and 3rd as back-ups. Clicking a chosen slot removes it.
 * "None of these times work for me" stays possible, with a free-text answer.
 * Several groups can share a day & time: they are shown side by side and then
 * also carry their group name so applicants can tell them apart.
 */

export interface PublicSlot {
  id: string;
  name?: string;
  timing: string | null;
  timingLabel: string;
  dates: string[];
  language: string | null;
  format: string | null;
  location: string | null;
  remaining: number | null;
  full: boolean;
  facilitator: { name: string; avatarUrl: string | null } | null;
}

const ORDINAL = ["1st choice", "2nd choice", "3rd choice"];
const FORMAT_LABEL: Record<string, string> = { online: "Online", hybrid: "Hybrid", in_person: "In person" };
const LANGUAGE_LABEL: Record<string, string> = { en: "English", nl: "Dutch", both: "Dutch or English" };

function shortDate(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function SlotPicker({
  slots,
  choices,
  onChoicesChange,
  noneFit,
  onNoneFitChange,
  noneText,
  onNoneTextChange,
}: {
  slots: PublicSlot[];
  choices: string[];
  onChoicesChange: (next: string[]) => void;
  noneFit: boolean;
  onNoneFitChange: (v: boolean) => void;
  noneText: string;
  onNoneTextChange: (v: string) => void;
}) {
  function toggle(slot: PublicSlot) {
    if (choices.includes(slot.id)) {
      onChoicesChange(choices.filter((c) => c !== slot.id));
      return;
    }
    // A full slot can still be a back-up, but not the 1st choice (that one books a place).
    if (slot.full && choices.length === 0) return;
    if (choices.length >= 3) return;
    onChoicesChange([...choices, slot.id]);
  }

  // Same day & time next to each other; name the groups when a time has more than one.
  const perTiming = new Map<string, number>();
  for (const s of slots) perTiming.set(s.timingLabel, (perTiming.get(s.timingLabel) ?? 0) + 1);
  const firstSeen = new Map<string, number>();
  slots.forEach((s, i) => { if (!firstSeen.has(s.timingLabel)) firstSeen.set(s.timingLabel, i); });
  const grouped = [...slots].sort(
    (a, b) =>
      firstSeen.get(a.timingLabel)! - firstSeen.get(b.timingLabel)! ||
      (a.dates[0] ?? "").localeCompare(b.dates[0] ?? "")
  );

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Click the times that work for you, in order of preference. Your <strong>1st choice reserves a place</strong> right
        away; your 2nd and 3rd choices help us if we need to move people around.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {grouped.map((s) => {
          const shared = (perTiming.get(s.timingLabel) ?? 0) > 1;
          const rank = choices.indexOf(s.id);
          const chosen = rank >= 0;
          const disabled = !chosen && ((s.full && choices.length === 0) || choices.length >= 3);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s)}
              disabled={disabled}
              aria-pressed={chosen}
              className="relative rounded-xl p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: chosen ? "rgba(22,135,156,0.08)" : "var(--bg-page)",
                border: `1.5px solid ${chosen ? "var(--color-ea-teal)" : "var(--border)"}`,
              }}
            >
              {chosen && (
                <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: "var(--color-ea-teal)" }}>
                  {ORDINAL[rank]}
                </span>
              )}
              <p className="pr-20 font-serif text-lg" style={{ color: "var(--text-primary)" }}>{s.timingLabel}</p>
              {shared && s.name && (
                <p className="text-sm font-medium" style={{ color: "var(--color-ea-teal)" }}>{s.name}</p>
              )}
              {s.dates.length > 0 && (
                <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {s.dates.length} sessions: {s.dates.map(shortDate).join(", ")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {s.format && (
                  <span className="rounded-full px-2 py-0.5" style={{ background: "var(--bg-sidebar)", color: "var(--text-secondary)" }}>
                    {FORMAT_LABEL[s.format] ?? s.format}
                    {s.location && s.format !== "online" ? ` · ${s.location}` : ""}
                  </span>
                )}
                {s.language && (
                  <span className="rounded-full px-2 py-0.5" style={{ background: "var(--bg-sidebar)", color: "var(--text-secondary)" }}>
                    {LANGUAGE_LABEL[s.language] ?? s.language}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                {s.facilitator ? (
                  <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {s.facilitator.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.facilitator.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--color-ea-teal)" }}>
                        {s.facilitator.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {s.facilitator.name}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Facilitator to be announced</span>
                )}
                <span className={`text-xs font-medium ${s.full ? "text-amber-700" : ""}`} style={s.full ? undefined : { color: "var(--text-muted)" }}>
                  {s.full ? "Full" : s.remaining == null ? "" : `${s.remaining} ${s.remaining === 1 ? "place" : "places"} left`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-teal-600"
          checked={noneFit}
          onChange={(e) => onNoneFitChange(e.target.checked)}
        />
        None of these times work for me
      </label>
      {noneFit && (
        <input
          type="text"
          value={noneText}
          onChange={(e) => onNoneTextChange(e.target.value)}
          placeholder="Which days and times would work for you? (e.g. Wednesday evenings)"
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--bg-hover)", border: "1px solid var(--color-ea-teal)", color: "var(--text-primary)" }}
        />
      )}
    </div>
  );
}
