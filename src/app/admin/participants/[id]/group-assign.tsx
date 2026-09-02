"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Group { id: string; name: string }

export function GroupAssign({
  participantId,
  currentGroupId,
  groups,
}: {
  participantId: string;
  currentGroupId: string | null;
  groups: Group[];
}) {
  const [value, setValue] = useState(currentGroupId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/admin/participants/${participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: value || null }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <select
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        className="rounded-lg border border-slate-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        <option value="">— No group —</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={saving || value === (currentGroupId ?? "")}
        className="text-sm px-3 py-1.5 rounded-lg bg-teal-600 text-white disabled:opacity-40 hover:bg-teal-700 transition"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Assign group"}
      </button>
    </div>
  );
}
