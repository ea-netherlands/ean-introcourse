"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Group { id: string; name: string }
interface Facilitator { id: string; name: string }

export function NewSessionForm({
  groups,
  facilitators,
}: {
  groups: Group[];
  facilitators: Facilitator[];
}) {
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState("");
  const [facilitatorId, setFacilitatorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [agenda, setAgenda] = useState("");
  const [repeatWeeks, setRepeatWeeks] = useState(1); // 1 = no repeat, up to 8
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Build array of dates to create
    const baseDt = new Date(scheduledAt);
    const dates: string[] = [];
    for (let i = 0; i < repeatWeeks; i++) {
      const dt = new Date(baseDt.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      dates.push(dt.toISOString());
    }

    try {
      let lastId = "";
      for (let i = 0; i < dates.length; i++) {
        const sessionTitle = repeatWeeks > 1 ? `${title.trim()} (${i + 1}/${repeatWeeks})` : title.trim();
        const res = await fetch("/api/admin/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: sessionTitle,
            groupId: groupId || null,
            facilitatorId: facilitatorId || null,
            scheduledAt: dates[i],
            meetLink: meetLink.trim() || null,
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
      router.push(`/admin/sessions/${lastId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <label className="block text-xs font-medium text-slate-600 mb-1">Group</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">— All groups / no group —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
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
          <label className="block text-xs font-medium text-slate-600 mb-1">Meeting link (Google Meet / Zoom / Teams)</label>
          <input
            type="url"
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Tip: use a permanent Zoom or Teams link, or a Google Workspace Meet link (sessions run 75 min; free Meet cuts groups off at 60 min).
          </p>
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
              Will create {repeatWeeks} sessions every Tuesday from the selected date, titled "{title || "Session"} (1/{repeatWeeks})", "(2/{repeatWeeks})", …
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
