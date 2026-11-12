"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui";

export interface ParticipantRow {
  id: string;
  name: string;
  email: string;
  role: "participant" | "facilitator";
  status: string;
  groupName: string | null;
  done: number;
}

const statusVariant = (s: string): "default" | "success" | "warning" | "teal" => {
  if (s === "active") return "teal";
  if (s === "completed") return "success";
  if (s === "pending") return "warning";
  return "default";
};

export function ParticipantsTable({
  rows,
  totalLessons,
}: {
  rows: ParticipantRow[];
  totalLessons: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
    setConfirmingBulk(false);
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirmingBulk(false);
  }

  async function deleteOne(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/participants/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  async function deleteSelected() {
    setBulkDeleting(true);
    try {
      await Promise.all(
        [...selected].map((id) => fetch(`/api/admin/participants/${id}`, { method: "DELETE" }))
      );
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkDeleting(false);
      setConfirmingBulk(false);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 border-b border-red-100">
          <span className="text-sm text-red-700">
            {confirmingBulk
              ? `Permanently delete ${selected.size} participant(s)? This cannot be undone.`
              : `${selected.size} selected`}
          </span>
          {confirmingBulk ? (
            <span className="flex items-center gap-2 shrink-0">
              <button
                onClick={deleteSelected}
                disabled={bulkDeleting}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {bulkDeleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmingBulk(false)}
                disabled={bulkDeleting}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingBulk(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition shrink-0"
            >
              Delete selected
            </button>
          )}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 accent-teal-600 cursor-pointer"
              />
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Group</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((p) => {
            const pct = totalLessons > 0 ? Math.round((p.done / totalLessons) * 100) : 0;
            return (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    className="w-4 h-4 accent-teal-600 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {p.groupName ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                  {p.role === "facilitator" && (
                    <span className="ml-1"><Badge variant="teal">facilitator</Badge></span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 max-w-[80px]">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {p.done}/{totalLessons}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {confirmingId === p.id ? (
                    <span className="inline-flex items-center gap-2">
                      <button
                        onClick={() => deleteOne(p.id)}
                        disabled={deletingId === p.id}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        {deletingId === p.id ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="text-xs text-slate-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <>
                      <Link href={`/admin/participants/${p.id}`} className="text-xs text-teal-600 hover:underline mr-3">
                        View →
                      </Link>
                      <button
                        onClick={() => setConfirmingId(p.id)}
                        className="text-xs text-slate-300 hover:text-red-600 transition"
                        title="Delete participant"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
