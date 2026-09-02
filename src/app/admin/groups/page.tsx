"use client";

import { useState, useEffect, FormEvent } from "react";

interface Group {
  id: string;
  name: string;
  cohort: string | null;
  participantCount: number;
  createdAt: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", cohort: "" });
  const [saving, setSaving] = useState(false);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Groups</h1>
          <p className="text-sm text-slate-500 mt-0.5">Fellowship cohorts</p>
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
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Group name
              </label>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className="bg-white border border-slate-200 rounded-xl p-5"
            >
              <div className="font-semibold text-slate-800">{g.name}</div>
              {g.cohort && (
                <div className="text-xs text-slate-400 mt-0.5">{g.cohort}</div>
              )}
              <div className="text-sm text-slate-500 mt-2">
                {g.participantCount}{" "}
                {g.participantCount === 1 ? "participant" : "participants"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
