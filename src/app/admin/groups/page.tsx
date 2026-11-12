"use client";

import { useState, useEffect, FormEvent } from "react";

interface Group {
  id: string;
  name: string;
  cohort: string | null;
  timing: string | null;
  active: boolean;
  participantCount: number;
  createdAt: string;
}

const TIMESLOT_LABELS: Record<string, string> = {
  monday_1730: "Mon 17:30",
  monday_1930: "Mon 19:30",
  thursday_1730: "Thu 17:30",
  thursday_1930: "Thu 19:30",
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", cohort: "" });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadGroups() {
    try {
      const res = await fetch("/api/admin/groups");
      if (res.ok) setGroups(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGroups(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      setForm({ name: "", cohort: "" });
      setShowForm(false);
      await loadGroups();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(g: Group) {
    const deactivating = g.active;
    if (deactivating) {
      const msg = g.participantCount > 0
        ? `Deactivate "${g.name}"? This will mark all ${g.participantCount} participants as graduates.`
        : `Deactivate "${g.name}"? The group will be archived.`;
      if (!window.confirm(msg)) return;
    }
    setToggling(g.id);
    try {
      await fetch(`/api/admin/groups/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !g.active }),
      });
      await loadGroups();
    } finally {
      setToggling(null);
    }
  }

  async function deleteGroup(g: Group) {
    setDeleting(g.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/groups/${g.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to delete group.");
        return;
      }
      await loadGroups();
    } finally {
      setDeleting(null);
      setConfirmingDelete(null);
    }
  }

  const activeGroups = groups.filter((g) => g.active);
  const inactiveGroups = groups.filter((g) => !g.active);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Groups</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeGroups.length} active · {inactiveGroups.length} archived
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition"
        >
          {showForm ? "Cancel" : "+ New group"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-200 rounded-xl p-5 mb-6 max-w-md"
        >
          <h2 className="text-sm font-semibold text-slate-700 mb-4">New group</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Group name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Spring 2025"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Cohort label <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={form.cohort}
                onChange={(e) => setForm((f) => ({ ...f, cohort: e.target.value }))}
                placeholder="e.g. Cohort 2025-Q1"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {saving ? "Creating…" : "Create group"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No groups yet.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Active groups ─────────────────────────────────────────── */}
          {activeGroups.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Active ({activeGroups.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeGroups.map((g) => (
                  <div
                    key={g.id}
                    className="bg-white border border-slate-200 rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-semibold text-slate-800">{g.name}</div>
                      <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium shrink-0 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        Active
                      </span>
                    </div>
                    {g.cohort && <div className="text-xs text-slate-400">{g.cohort}</div>}
                    {g.timing && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        🕐 {TIMESLOT_LABELS[g.timing] ?? g.timing}
                      </div>
                    )}
                    <div className="text-sm text-slate-500 mt-2 mb-3">
                      {g.participantCount}{" "}
                      {g.participantCount === 1 ? "participant" : "participants"}
                    </div>
                    {confirmingDelete === g.id ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs text-red-700 mb-2">Permanently delete &ldquo;{g.name}&rdquo;?</p>
                        {deleteError && <p className="text-xs text-red-600 mb-2">{deleteError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteGroup(g)}
                            disabled={deleting === g.id}
                            className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
                          >
                            {deleting === g.id ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => { setConfirmingDelete(null); setDeleteError(null); }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-white transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(g)}
                          disabled={toggling === g.id}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50 transition"
                        >
                          {toggling === g.id ? "Updating…" : "Deactivate group"}
                        </button>
                        {g.participantCount === 0 && (
                          <button
                            onClick={() => setConfirmingDelete(g.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                            title="Delete group"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Inactive / archived groups ────────────────────────────── */}
          {inactiveGroups.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Archived / graduated ({inactiveGroups.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inactiveGroups.map((g) => (
                  <div
                    key={g.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-5 opacity-80"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-semibold text-slate-500">{g.name}</div>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium shrink-0 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                        Inactive
                      </span>
                    </div>
                    {g.cohort && <div className="text-xs text-slate-400">{g.cohort}</div>}
                    <div className="text-sm text-slate-400 mt-2 mb-3">
                      {g.participantCount}{" "}
                      {g.participantCount === 1 ? "participant" : "participants"}
                    </div>
                    {confirmingDelete === g.id ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs text-red-700 mb-2">Permanently delete &ldquo;{g.name}&rdquo;?</p>
                        {deleteError && <p className="text-xs text-red-600 mb-2">{deleteError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteGroup(g)}
                            disabled={deleting === g.id}
                            className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
                          >
                            {deleting === g.id ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => { setConfirmingDelete(null); setDeleteError(null); }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-white transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(g)}
                          disabled={toggling === g.id}
                          className="flex-1 rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-50 transition"
                        >
                          {toggling === g.id ? "Updating…" : "Reactivate group"}
                        </button>
                        {g.participantCount === 0 && (
                          <button
                            onClick={() => setConfirmingDelete(g.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                            title="Delete group"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
