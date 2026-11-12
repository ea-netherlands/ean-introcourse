"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AddFacilitatorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, role: "facilitator", status: "active" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setSaving(false);
        return;
      }
      router.push(`/admin/participants/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition"
      >
        + Add facilitator
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 flex flex-wrap items-end gap-3"
    >
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">Full name *</label>
        <input
          type="text"
          required
          autoFocus
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Jane Smith"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          style={{ width: "180px", color: "#334155" }}
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">Email address *</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="jane@example.com"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          style={{ width: "220px", color: "#334155" }}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition"
        >
          {saving ? "Adding..." : "Add facilitator"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setForm({ name: "", email: "" }); setError(""); }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 bg-white transition"
        >
          Cancel
        </button>
      </div>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
