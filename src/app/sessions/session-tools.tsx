"use client";

/**
 * Facilitator tools on /sessions for the automatically created sessions:
 * - GroupMeetLink: one meeting link for all upcoming sessions of a group;
 * - EditSession: add a link to one session or move it (moving keeps it out of the automatic sync).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

const field = "w-full rounded-xl px-3 py-2 text-sm outline-none";
const fieldStyle = { background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" };

export function GroupMeetLink({ groupId, groupName, current }: { groupId: string; groupName: string; current: string }) {
  const router = useRouter();
  const [link, setLink] = useState(current);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/sessions/meet-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, meetLink: link }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) { setMsg({ text: data.error ?? "Could not save.", ok: false }); return; }
    setMsg({ text: `Saved on ${data.updated} upcoming session${data.updated === 1 ? "" : "s"}.`, ok: true });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-1.5">
      <label className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        Meeting link for {groupName}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          value={link}
          onChange={(e) => { setLink(e.target.value); setMsg(null); }}
          placeholder="https://meet.google.com/… (used for all upcoming sessions)"
          className={`${field} min-w-0 flex-1`}
          style={fieldStyle}
        />
        <button type="submit" disabled={busy} className="btn-pill btn-pill-primary h-9 px-4 text-sm disabled:opacity-50">
          {busy ? "Saving…" : "Save for all"}
        </button>
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-teal-700" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}

/** datetime-local value for a moment, in the browser's time zone. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EditSession({ id, scheduledAt, meetLink }: { id: string; scheduledAt: string; meetLink: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(toLocalInput(scheduledAt));
  const [link, setLink] = useState(meetLink ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    // Only send what changed (so an unchanged form never clears a link set elsewhere).
    const body: Record<string, string> = {};
    if (link.trim() !== (meetLink ?? "")) body.meetLink = link;
    if (when !== toLocalInput(scheduledAt)) body.scheduledAt = new Date(when).toISOString();
    if (!Object.keys(body).length) { setBusy(false); setOpen(false); return; }
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) { setError(data.error ?? "Could not save."); return; }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium underline" style={{ color: "var(--color-ea-teal)" }}>
        Edit
      </button>
    );
  }
  return (
    <div className="mt-3 w-full space-y-2 rounded-xl p-3" style={{ border: "1px solid var(--border)" }}>
      <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        Date &amp; time
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${field} mt-1`} style={fieldStyle} />
      </label>
      <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        Meeting link
        <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className={`${field} mt-1`} style={fieldStyle} />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={busy} className="btn-pill btn-pill-primary h-8 px-3 text-xs disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs" style={{ color: "var(--text-muted)" }}>Cancel</button>
      </div>
    </div>
  );
}
