"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Group { id: string; name: string }
interface Facilitator { id: string; name: string }

export function FacilitatorSessionForm({
  groups,
  facilitators,
  defaultGroupId,
  defaultFacilitatorId,
}: {
  groups: Group[];
  facilitators: Facilitator[];
  defaultGroupId?: string;
  defaultFacilitatorId?: string;
}) {
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState(defaultGroupId ?? "");
  const [facilitatorId, setFacilitatorId] = useState(defaultFacilitatorId ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [agenda, setAgenda] = useState("");
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string[]>([]);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const baseDt = new Date(scheduledAt);
    const dates: string[] = [];
    for (let i = 0; i < repeatWeeks; i++) {
      const dt = new Date(baseDt.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      dates.push(dt.toISOString());
    }

    try {
      const ids: string[] = [];
      for (let i = 0; i < dates.length; i++) {
        const sessionTitle = repeatWeeks > 1
          ? `${title.trim()} (${i + 1}/${repeatWeeks})`
          : title.trim();
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
        ids.push(id);
      }
      setCreated(ids);
      setTitle("");
      setScheduledAt("");
      setMeetLink("");
      setAgenda("");
      setRepeatWeeks(1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {created.length > 0 && (
        <div
          className="rounded-xl p-3 text-sm font-medium"
          style={{ background: "rgba(22,163,74,0.1)", color: "#15803d", border: "1px solid rgba(22,163,74,0.2)" }}
        >
          ✓ {created.length} session{created.length > 1 ? "s" : ""} created successfully!
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Session title *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Week 1 — Reasoning Transparency"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Date & time *</label>
          <input
            required
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        {groups.length > 1 && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="">— No group —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Meeting link</label>
          <input
            type="url"
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/…"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Use Zoom/Teams for sessions over 60 min. Free Google Meet limits groups to 60 min.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            Repeat weekly — {repeatWeeks} session{repeatWeeks > 1 ? "s" : ""}
          </label>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range"
              min={1}
              max={8}
              value={repeatWeeks}
              onChange={(e) => setRepeatWeeks(Number(e.target.value))}
              className="flex-1 accent-teal-600"
            />
            <span className="text-lg font-bold w-6 text-center" style={{ color: "var(--color-ea-teal)" }}>{repeatWeeks}</span>
          </div>
          {repeatWeeks > 1 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Creates {repeatWeeks} sessions on the same weekday, 1 week apart.
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Agenda / notes (optional)</label>
        <textarea
          rows={3}
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="Discussion topics, prep reading, …"
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
          style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition"
        style={{ background: "var(--color-ea-teal)" }}
      >
        {saving
          ? `Creating…`
          : repeatWeeks > 1
          ? `Create ${repeatWeeks} weekly sessions`
          : "Create session"}
      </button>
    </form>
  );
}
