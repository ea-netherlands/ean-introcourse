"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Group { id: string; name: string }
interface Facilitator { id: string; name: string }

export function FacilitatorSessionForm({
  groups,
  facilitators,
  defaultGroupId,
  defaultFacilitatorId,
  googleConfigured = false,
}: {
  groups: Group[];
  facilitators: Facilitator[];
  defaultGroupId?: string;
  defaultFacilitatorId?: string;
  googleConfigured?: boolean;
}) {
  const [title, setTitle] = useState("EA intro course - online meeting");
  const [groupId, setGroupId] = useState(defaultGroupId ?? "");
  const [facilitatorId, setFacilitatorId] = useState(defaultFacilitatorId ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [createMeet, setCreateMeet] = useState(googleConfigured);
  const [meetLink, setMeetLink] = useState("");
  const [agenda, setAgenda] = useState(""); // used when repeatWeeks === 1
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  // Per-session agendas used when repeatWeeks > 1
  const [sessionAgendas, setSessionAgendas] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string[]>([]);
  const router = useRouter();

  // Keep sessionAgendas array length in sync with repeatWeeks
  useEffect(() => {
    setSessionAgendas((prev) => {
      const next = Array.from({ length: repeatWeeks }, (_, i) => prev[i] ?? "");
      return next;
    });
  }, [repeatWeeks]);

  function setSessionAgenda(index: number, value: string) {
    setSessionAgendas((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

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
        const sessionAgenda = repeatWeeks > 1
          ? sessionAgendas[i]?.trim() || null
          : agenda.trim() || null;
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
            agenda: sessionAgenda,
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
      setSessionAgendas([""]);
      setRepeatWeeks(1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setSaving(false);
    }
  }

  // Compute preview dates for the per-session section
  const previewDates: Date[] = [];
  if (scheduledAt) {
    const baseDt = new Date(scheduledAt);
    for (let i = 0; i < repeatWeeks; i++) {
      previewDates.push(new Date(baseDt.getTime() + i * 7 * 24 * 60 * 60 * 1000));
    }
  }

  const dateLabel = (d?: Date) =>
    d
      ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) +
        " " +
        d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "";

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

          {/* Auto-create via EA Google account */}
          <label
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition"
            style={{
              background: createMeet ? "rgba(22,135,156,0.08)" : "var(--bg-hover)",
              border: createMeet ? "1px solid rgba(22,135,156,0.4)" : "1px solid var(--border)",
              opacity: googleConfigured ? 1 : 0.5,
              cursor: googleConfigured ? "pointer" : "not-allowed",
            }}
          >
            <input
              type="checkbox"
              checked={createMeet}
              disabled={!googleConfigured}
              onChange={(e) => setCreateMeet(e.target.checked)}
              className="accent-teal-600 w-4 h-4"
            />
            <div>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Auto-create Google Meet via EA account
              </span>
              {!googleConfigured && (
                <p className="text-xs mt-0.5" style={{ color: "#d97706" }}>
                  GOOGLE_* env vars not set — configure them to enable this.
                </p>
              )}
              {googleConfigured && createMeet && (
                <p className="text-xs mt-0.5" style={{ color: "var(--color-ea-teal)" }}>
                  A unique Meet link will be created on the EA calendar for each session.
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
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                A single static link is shared for all sessions. Sessions run 75 min, so use Zoom or Teams. Free Google Meet cuts groups off at 60 min.
              </p>
            </div>
          )}
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

      {/* Single agenda when not repeating */}
      {repeatWeeks === 1 && (
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
      )}

      {/* Per-session agendas when repeating */}
      {repeatWeeks > 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Session agendas / notes — each session can have its own description
          </p>
          {Array.from({ length: repeatWeeks }, (_, i) => (
            <div key={i} className="rounded-xl p-3" style={{ border: "1px solid var(--border)", background: "var(--bg-page)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium" style={{ color: "var(--color-ea-teal)" }}>
                  Session {i + 1}/{repeatWeeks}
                  {title && (
                    <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>
                      — {title.trim()} ({i + 1}/{repeatWeeks})
                    </span>
                  )}
                </span>
                {previewDates[i] && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {dateLabel(previewDates[i])}
                  </span>
                )}
              </div>
              <textarea
                rows={2}
                value={sessionAgendas[i] ?? ""}
                onChange={(e) => setSessionAgenda(i, e.target.value)}
                placeholder={`Discussion topics, prep reading for session ${i + 1}…`}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          ))}
        </div>
      )}

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
