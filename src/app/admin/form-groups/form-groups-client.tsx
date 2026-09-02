"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Person {
  id: string; name: string; email: string;
  groupId: string | null; availability: string[];
}
interface Group { id: string; name: string; cohort: string }

export default function FormGroupsClient({
  participants, facilitators, groups, slotLabels,
}: {
  participants: Person[];
  facilitators: Person[];
  groups: Group[];
  slotLabels: Record<string, string>;
}) {
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of [...participants, ...facilitators]) {
      if (p.groupId) init[p.id] = p.groupId;
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function assign(personId: string, groupId: string) {
    setAssignments((prev) => ({ ...prev, [personId]: groupId || "" }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const entries = Object.entries(assignments);
    await Promise.all(
      entries.map(([id, groupId]) =>
        fetch(`/api/admin/participants/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: groupId || null }),
        })
      )
    );
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  function slotPills(slots: string[]) {
    if (!slots.length) return <span className="text-xs text-slate-400">No availability set</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {slots.map((s) => (
          <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-teal-50 text-teal-700 border border-teal-200">
            {slotLabels[s] ?? s}
          </span>
        ))}
      </div>
    );
  }

  function PersonRow({ person, label }: { person: Person; label?: string }) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{person.name}
            {label && <span className="ml-1.5 text-xs text-teal-600 font-normal">{label}</span>}
          </p>
          <div className="mt-0.5">{slotPills(person.availability)}</div>
        </div>
        {/* Styled select to avoid white-on-white in dark OS mode */}
        <select
          value={assignments[person.id] ?? ""}
          onChange={(e) => assign(person.id, e.target.value)}
          className="rounded-lg border border-slate-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 shrink-0"
          style={{ backgroundColor: "#fff", color: "#334155", minWidth: "130px" }}
        >
          <option value="">— No group —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout: Facilitators LEFT, Participants RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* LEFT — Facilitators */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Facilitators ({facilitators.length})
          </h2>
          {facilitators.length === 0 ? (
            <p className="text-sm text-slate-400">No facilitators yet.</p>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {facilitators.map((f) => <PersonRow key={f.id} person={f} label="facilitator" />)}
            </div>
          )}
        </section>

        {/* RIGHT — Participants */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Active participants ({participants.length})
          </h2>
          {participants.length === 0 ? (
            <p className="text-sm text-slate-400">No active participants yet.</p>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
              {participants.map((p) => <PersonRow key={p.id} person={p} />)}
            </div>
          )}
        </section>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Confirm group assignments"}
        </button>
        {saved && <span className="text-sm text-green-600">✓ All assignments saved</span>}
      </div>
    </div>
  );
}
