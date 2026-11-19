"use client";

/**
 * /admin/slots — set up the slots applicants can book on /apply.
 * Each active group can be offered as a slot: day/time, the session dates,
 * facilitator, language, format (+ location), number of places, and whether
 * it is open for booking. Places taken = non-rejected applications that
 * booked it as their first choice.
 */
import { useCallback, useEffect, useState } from "react";
import { GROUP_TIMESLOTS } from "@/lib/availability";

interface Slot {
  id: string;
  name: string;
  timing: string | null;
  dates: string[];
  language: string | null;
  format: string | null;
  location: string | null;
  capacity: number | null;
  booked: number;
  remaining: number | null;
  bookable: boolean;
  facilitator: { id: string; name: string } | null;
}
interface Facilitator { id: string; name: string }

const SESSION_COUNT = 5;
const FORMATS = [
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
  { value: "in_person", label: "In person" },
];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "nl", label: "Dutch" },
  { value: "both", label: "Dutch or English" },
];

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600";
const label = "mb-1 block text-xs font-medium text-slate-600";

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function SlotEditor({ slot, facilitators, onSaved }: { slot: Slot; facilitators: Facilitator[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    timing: slot.timing ?? "",
    dates: Array.from({ length: SESSION_COUNT }, (_, i) => slot.dates[i] ?? ""),
    facilitatorId: slot.facilitator?.id ?? "",
    language: slot.language ?? "",
    format: slot.format ?? "online",
    location: slot.location ?? "",
    capacity: slot.capacity == null ? "" : String(slot.capacity),
    bookable: slot.bookable,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setForm((f) => ({ ...f, [k]: v })); setMessage(""); };

  const missing: string[] = [];
  if (!form.timing) missing.push("day & time");
  if (!form.dates.some(Boolean)) missing.push("dates");
  if (form.capacity === "") missing.push("number of places");

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/admin/groups/${slot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timing: form.timing || null,
        dates: form.dates.filter(Boolean),
        facilitatorId: form.facilitatorId || null,
        language: form.language || null,
        format: form.format || null,
        location: form.format === "online" ? null : form.location,
        capacity: form.capacity === "" ? null : Number(form.capacity),
        bookable: form.bookable,
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "Saved" : "Could not save");
    if (res.ok) onSaved();
  }

  const full = slot.capacity != null && slot.booked >= slot.capacity;

  return (
    <div className="card-ean space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-slate-900">{slot.name}</h2>
          <p className="text-sm text-slate-500">
            {slot.booked} booked{slot.capacity != null ? ` of ${slot.capacity} places` : ""}
            {full && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Full</span>}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={form.bookable} onChange={(e) => set("bookable", e.target.checked)} />
          Open for booking on the apply form
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <span className={label}>Day &amp; time</span>
          <select className={input} value={form.timing} onChange={(e) => set("timing", e.target.value)}>
            <option value="">Not set</option>
            {GROUP_TIMESLOTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>Facilitator</span>
          <select className={input} value={form.facilitatorId} onChange={(e) => set("facilitatorId", e.target.value)}>
            <option value="">Not set</option>
            {facilitators.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>Number of places</span>
          <input className={input} type="number" min={0} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="e.g. 6" />
        </div>
        <div>
          <span className={label}>Language</span>
          <select className={input} value={form.language} onChange={(e) => set("language", e.target.value)}>
            <option value="">Not set</option>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>Format</span>
          <select className={input} value={form.format} onChange={(e) => set("format", e.target.value)}>
            {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        {form.format !== "online" && (
          <div>
            <span className={label}>Location</span>
            <input className={input} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. EAN office, Amsterdam" />
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className={label}>Session dates</span>
          <button
            type="button"
            disabled={!form.dates[0]}
            onClick={() => set("dates", form.dates.map((d, i) => (i === 0 ? d : addDays(form.dates[0], 7 * i))))}
            className="text-xs font-medium text-teal-700 hover:underline disabled:opacity-40"
          >
            Fill weekly from the first date
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {form.dates.map((d, i) => (
            <input
              key={i}
              type="date"
              aria-label={`Session ${i + 1} date`}
              className={input}
              value={d}
              onChange={(e) => set("dates", form.dates.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {form.bookable && missing.length > 0 && (
          <span className="mr-auto text-xs text-amber-700">Applicants will see this slot without: {missing.join(", ")}.</span>
        )}
        {message && <span className={`text-sm ${message === "Saved" ? "text-teal-700" : "text-red-600"}`}>{message}</span>}
        <button type="button" onClick={save} disabled={saving} className="btn-pill btn-pill-primary h-9 px-4 text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save slot"}
        </button>
      </div>
    </div>
  );
}

export default function SlotsPage() {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/slots", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setSlots(data.slots);
    setFacilitators(data.facilitators);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createSlot() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setCreating(false);
    await load();
  }

  const open = (slots ?? []).filter((s) => s.bookable);
  const totalPlaces = open.reduce((n, s) => n + (s.capacity ?? 0), 0);
  const totalBooked = open.reduce((n, s) => n + s.booked, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Slots</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          The groups applicants can choose on the apply form. Their first choice reserves a place straight away;
          rejecting the application frees it again. {open.length} open · {totalBooked} of {totalPlaces} places booked.
        </p>
      </div>

      <div className="card-ean flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[14rem] flex-1">
          <span className={label}>New slot (creates a group)</span>
          <input className={input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Monday evening — spring 2027" />
        </div>
        <button type="button" onClick={createSlot} disabled={creating || !newName.trim()} className="btn-pill btn-pill-secondary h-9 px-4 text-sm disabled:opacity-50">
          {creating ? "Creating…" : "+ Add slot"}
        </button>
      </div>

      {slots === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-slate-500">No active groups yet. Add a slot above.</p>
      ) : (
        slots.map((s) => <SlotEditor key={s.id} slot={s} facilitators={facilitators} onSaved={load} />)
      )}
    </div>
  );
}
