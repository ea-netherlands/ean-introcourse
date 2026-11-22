"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Group { id: string; name: string; timing?: string | null; dates?: string[]; facilitatorId?: string | null }
interface Facilitator { id: string; name: string }

/** "monday_1930" → "19:30" */
function timeOf(timing?: string | null) {
  const m = timing?.match(/(\d{2})(\d{2})$/);
  return m ? `${m[1]}:${m[2]}` : null;
}

export function NewSessionForm({
  groups,
  facilitators,
  googleConfigured,
  fixedGroupId = null,
  existingDates = [],
}: {
  groups: Group[];
  facilitators: Facilitator[];
  googleConfigured: boolean;
  /** Set when the page shows one group: the form is for that group only. */
  fixedGroupId?: string | null;
  /** ISO times of this group's existing sessions (to skip dates that already have one). */
  existingDates?: string[];
}) {
  const initialGroup = groups.find((g) => g.id === fixedGroupId) ?? null;
  const [title, setTitle] = useState("EA intro course - online meeting");
  const [groupId, setGroupId] = useState(fixedGroupId ?? "");
  const [facilitatorId, setFacilitatorId] = useState(initialGroup?.facilitatorId ?? "");
  const group = groups.find((g) => g.id === groupId) ?? null;
  const groupTime = timeOf(group?.timing);
  const takenDays = new Set(existingDates.map((d) => new Date(d).toLocaleDateString("sv-SE")));
  const plannable = (group?.dates ?? []).filter((d) => !takenDays.has(d));
  const [scheduledAt, setScheduledAt] = useState("");
  const [createMeet, setCreateMeet] = useState(googleConfigured); // auto-create Meet by default
  const [meetLink, setMeetLink] = useState("");
  const [agenda, setAgenda] = useState("");
  const [repeatWeeks, setRepeatWeeks] = useState(1); // 1 = no repeat, up to 8
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Build array of dates to create
    const baseDt = new Date(scheduledAt);
    const dates: string[] = [];
    for (let i = 0; i < repeatWeeks; i++) {
      const dt = new Date(baseDt.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      dates.push(dt.toISOString());
    }
    await create(dates, (i) => (repeatWeeks > 1 ? `${title.trim()} (${i + 1}/${repeatWeeks})` : title.trim()));
  }

  /** One session per remaining date of the group, at the group's time. */
  async function planFromGroup() {
    if (!group || !groupTime || !plannable.length) return;
    const all = group.dates ?? [];
    const dates = plannable.map((d) => new Date(`${d}T${groupTime}`).toISOString());
    await create(dates, (i) => `${title.trim() || "Session"} (week ${all.indexOf(plannable[i]) + 1})`);
  }

  async function create(dates: string[], titleFor: (i: number) => string) {
    if (!groupId) { setError("Choose a group first."); return; }
    setSaving(true);
    setError("");
    try {
      let lastId = "";
      for (let i = 0; i < dates.length; i++) {
        const sessionTitle = titleFor(i);
        const res = await fetch("/api/admin/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: sessionTitle,
            groupId: groupId || null,
            facilitatorId: facilitatorId || null,
            scheduledAt: dates[i],
            meetLink: createMeet ? null : (meetLink.trim() || null),
            createMeet,
            agenda: agenda.trim() || null,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Failed to create session.");
        }
        const { id } = await res.json();
        if (i === 0) lastId = id;
      }
      if (fixedGroupId) router.refresh();
      else router.push(`/admin/sessions/${lastId}`);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!fixedGroupId && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Group *</label>
          <select
            required
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              const g = groups.find((x) => x.id === e.target.value);
              if (g?.facilitatorId) setFacilitatorId(g.facilitatorId);
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Choose the group these sessions are for…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {group && groupTime && (group.dates?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm">
          <span className="text-slate-700">
            {plannable.length
              ? <>Quickest: plan <strong>{plannable.length}</strong> session{plannable.length === 1 ? "" : "s"} on this group&apos;s dates at {groupTime}, with the link and agenda below.</>
              : <>Every date of this group already has a session.</>}
          </span>
          {plannable.length > 0 && (
            <button type="button" onClick={planFromGroup} disabled={saving}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40">
              {saving ? "Planning…" : `Plan ${plannable.length} session${plannable.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Session title *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Week 1 discussion"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date & time of first session *</label>
          <input
            required
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Facilitator</label>
          <select
            value={facilitatorId}
            onChange={(e) => setFacilitatorId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">— Not assigned —</option>
            {facilitators.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Meeting link</label>

          {/* Auto-create via EA Google account */}
          <label className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
            createMeet
              ? "border-teal-300 bg-teal-50"
              : "border-slate-200 bg-white opacity-60"
          } ${!googleConfigured ? "opacity-40 cursor-not-allowed" : ""}`}>
            <input
              type="checkbox"
              checked={createMeet}
              disabled={!googleConfigured}
              onChange={(e) => setCreateMeet(e.target.checked)}
              className="accent-teal-600 w-4 h-4"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">
                Auto-create Google Meet via EA account
              </span>
              {!googleConfigured && (
                <p className="text-[11px] text-amber-600 mt-0.5">
                  GOOGLE_* env vars not configured — set them to enable this.
                </p>
              )}
              {googleConfigured && createMeet && (
                <p className="text-[11px] text-teal-600 mt-0.5">
                  A unique Google Meet link will be created for each session on the EA calendar.
                </p>
              )}
            </div>
          </label>

          {/* Manual link fallback */}
          {!createMeet && (
            <div className="mt-2">
              <input
                type="url"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/… or Zoom/Teams link"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Note: a single static link is shared across all sessions. Sessions run 75 min; free Google Meet cuts groups off at 60 min, so use Zoom, Teams or a Google Workspace Meet link.
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Repeat weekly
            <span className="ml-1.5 font-normal text-slate-400">(creates {repeatWeeks} session{repeatWeeks > 1 ? "s" : ""})</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={8}
              value={repeatWeeks}
              onChange={(e) => setRepeatWeeks(Number(e.target.value))}
              className="flex-1 accent-teal-600"
            />
            <span className="text-sm font-semibold text-slate-700 w-6 text-center">{repeatWeeks}</span>
          </div>
          {repeatWeeks > 1 && (
            <p className="text-xs text-slate-400 mt-1">
              Will create {repeatWeeks} sessions, one a week from the selected date, titled "{title || "Session"} (1/{repeatWeeks})", "(2/{repeatWeeks})", …
            </p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Agenda / notes (optional)</label>
        <textarea
          rows={3}
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="Discussion topics, prep reading, …"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-teal-700 transition"
      >
        {saving
          ? `Creating${repeatWeeks > 1 ? ` ${repeatWeeks} sessions` : ""}…`
          : repeatWeeks > 1
          ? `Create ${repeatWeeks} weekly sessions`
          : "Create session"}
      </button>
    </form>
  );
}
