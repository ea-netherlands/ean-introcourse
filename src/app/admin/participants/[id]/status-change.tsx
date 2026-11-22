"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["pending", "active", "completed"] as const;
type Status = (typeof STATUSES)[number];

export function StatusChange({
  participantId,
  currentStatus,
}: {
  participantId: string;
  currentStatus: string;
}) {
  const [value, setValue] = useState<Status>(currentStatus as Status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");
    // Only say "Saved" when the server really saved it (an expired admin session returns 401).
    const res = await fetch(`/api/admin/participants/${participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) {
      setError(res?.status === 401 ? "Not saved: your admin session expired. Reload the page and sign in again." : "Not saved. Please try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <select
        value={value}
        onChange={(e) => { setValue(e.target.value as Status); setSaved(false); }}
        className="rounded-lg border border-slate-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={saving || value === currentStatus}
        className="text-sm px-3 py-1.5 rounded-lg bg-teal-600 text-white disabled:opacity-40 hover:bg-teal-700 transition"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save status"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
