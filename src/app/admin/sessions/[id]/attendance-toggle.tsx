"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AttendanceToggle({
  sessionId,
  participantId,
  attended,
}: {
  sessionId: string;
  participantId: string;
  attended: boolean | null;
}) {
  const [value, setValue] = useState<boolean | null>(attended);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function mark(val: boolean) {
    setSaving(true);
    const next = value === val ? null : val; // toggle off if same
    setValue(next);
    await fetch(`/api/admin/sessions/${sessionId}/attendance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, attended: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => mark(true)}
        disabled={saving}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
          value === true
            ? "bg-green-100 text-green-700 ring-1 ring-green-400"
            : "bg-slate-100 text-slate-500 hover:bg-green-50 hover:text-green-600"
        }`}
      >
        ✓ Attended
      </button>
      <button
        onClick={() => mark(false)}
        disabled={saving}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
          value === false
            ? "bg-red-100 text-red-600 ring-1 ring-red-300"
            : "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500"
        }`}
      >
        ✗ Absent
      </button>
    </div>
  );
}
