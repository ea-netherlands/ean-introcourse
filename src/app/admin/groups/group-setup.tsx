"use client";

/**
 * "Set up" tab of /admin/groups: one card per group in the chosen cohort, with everything
 * applicants see on the apply form (day & time, dates, facilitator, language, format, places,
 * open for booking) plus name, close/reactivate and delete. Places taken = non-rejected
 * applications that booked the group as their first choice (see src/lib/slots.ts).
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GROUP_TIMESLOTS, formatGroupTiming } from "@/lib/availability";
import { NO_COHORT, cohortKey } from "./cohort";

const NEW_COHORT = "__new__";

interface Slot {
  id: string;
  name: string;
  cohort: string | null;
  timing: string | null;
  dates: string[];
  language: string | null;
  format: string | null;
  location: string | null;
  capacity: number | null;
  booked: number;
  bookable: boolean;
  active: boolean;
  memberCount: number;
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

async function patchGroup(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/groups/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  return { ok: !!res?.ok, status: res?.status ?? 0, note: data.note as string | undefined, error: data.error as string | undefined };
}

function GroupCard({
  slot,
  facilitators,
  cohorts,
  onChanged,
  onMoved,
}: {
  slot: Slot;
  facilitators: Facilitator[];
  cohorts: string[];
  onChanged: () => void;
  onMoved: (groupName: string, cohort: string) => void;
}) {
  const currentCohort = cohortKey(slot.cohort);
  const [cohortChoice, setCohortChoice] = useState(currentCohort);
  const [newCohort, setNewCohort] = useState("");
  const targetCohort = cohortChoice === NEW_COHORT ? newCohort.trim() : cohortChoice;
  const moving = targetCohort !== currentCohort && !(cohortChoice === NEW_COHORT && !newCohort.trim());
  const [form, setForm] = useState({
    name: slot.name,
    timing: slot.timing ?? "",
    dates: Array.from({ length: SESSION_COUNT }, (_, i) => slot.dates[i] ?? ""),
    facilitatorId: slot.facilitator?.id ?? "",
    language: slot.language ?? "",
    format: slot.format ?? "online",
    location: slot.location ?? "",
    capacity: slot.capacity == null ? "" : String(slot.capacity),
    bookable: slot.bookable,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "warn" | "error" } | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setForm((f) => ({ ...f, [k]: v })); setMessage(null); };

  const missing: string[] = [];
  if (!form.timing) missing.push("day & time");
  if (!form.dates.some(Boolean)) missing.push("dates");
  if (form.capacity === "") missing.push("number of places");
  const full = slot.capacity != null && slot.booked >= slot.capacity;

  function fail(status: number, error?: string) {
    setMessage({ text: status === 401 ? "Not saved: your admin session expired. Reload the page and sign in again." : error ?? "Could not save.", tone: "error" });
  }

  async function save() {
    if (cohortChoice === NEW_COHORT && !newCohort.trim()) {
      setMessage({ text: "Type a name for the new cohort, or pick an existing one.", tone: "error" });
      return;
    }
    setBusy(true);
    const r = await patchGroup(slot.id, {
      name: form.name,
      ...(moving ? { cohort: targetCohort || null } : {}),
      timing: form.timing || null,
      dates: form.dates.filter(Boolean),
      facilitatorId: form.facilitatorId || null,
      language: form.language || null,
      format: form.format || null,
      location: form.format === "online" ? null : form.location,
      capacity: form.capacity === "" ? null : Number(form.capacity),
      bookable: form.bookable,
    });
    setBusy(false);
    if (!r.ok) return fail(r.status, r.error);
    setMessage(r.note ? { text: `Saved. ${r.note}`, tone: "warn" } : { text: "Saved", tone: "ok" });
    if (moving) onMoved(form.name, targetCohort);
    onChanged();
  }

  async function close() {
    const people = slot.memberCount;
    const ok = window.confirm(
      people > 0
        ? `Close "${slot.name}"? Its participants are marked as finished (they then see the graduation page and the follow-up form). The facilitator stays active.`
        : `Close "${slot.name}"? It disappears from the apply form and moves to "Closed groups".`
    );
    if (!ok) return;
    setBusy(true);
    const r = await patchGroup(slot.id, { active: false, bookable: false });
    setBusy(false);
    if (!r.ok) return fail(r.status, r.error);
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`Delete "${slot.name}" for good?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/groups/${slot.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      return fail(res?.status ?? 0, data.error);
    }
    onChanged();
  }

  return (
    <div className="card-ean space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[12rem] flex-1">
          <span className={label}>Group name (applicants see it when two open groups share a day &amp; time)</span>
          <input className={`${input} font-medium`} value={form.name} onChange={(e) => set("name", e.target.value)} />
          <p className="mt-1 text-xs text-slate-500">
            {slot.memberCount} in the group · {slot.booked} booked{slot.capacity != null ? ` of ${slot.capacity} places` : ""}
            {full && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">Full</span>}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={form.bookable} onChange={(e) => set("bookable", e.target.checked)} />
          Open for booking on the apply form
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <span className={label}>Cohort</span>
          <select className={input} value={cohortChoice} onChange={(e) => { setCohortChoice(e.target.value); setMessage(null); }}>
            {[...new Set([currentCohort, ...cohorts])].map((c) => (
              <option key={c || NO_COHORT} value={c}>{c || "No cohort"}{c === currentCohort ? " (current)" : ""}</option>
            ))}
            <option value={NEW_COHORT}>+ New cohort…</option>
          </select>
          {cohortChoice === NEW_COHORT && (
            <input
              className={`${input} mt-2`}
              autoFocus
              value={newCohort}
              onChange={(e) => { setNewCohort(e.target.value); setMessage(null); }}
              placeholder="e.g. Spring 2027"
            />
          )}
          {moving && (
            <p className="mt-1 text-xs text-amber-700">
              Saving moves this group{slot.memberCount ? ` and its ${slot.memberCount} ${slot.memberCount === 1 ? "person" : "people"}` : ""} to {targetCohort || "No cohort"}.
            </p>
          )}
        </div>
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
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
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

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button type="button" onClick={close} disabled={busy} className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50">
          Close group
        </button>
        {slot.memberCount === 0 && (
          <button type="button" onClick={remove} disabled={busy} className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50">
            Delete
          </button>
        )}
        <div className="flex-1" />
        {form.bookable && missing.length > 0 && (
          <span className="text-xs text-amber-700">Applicants will see this group without: {missing.join(", ")}.</span>
        )}
        {message && (
          <span className={`text-sm ${message.tone === "ok" ? "text-teal-700" : message.tone === "warn" ? "text-amber-700" : "text-red-600"}`}>
            {message.text}
          </span>
        )}
        <button type="button" onClick={save} disabled={busy} className="btn-pill btn-pill-primary h-9 px-4 text-sm disabled:opacity-50">
          {busy ? "Saving…" : "Save group"}
        </button>
      </div>
    </div>
  );
}

export function GroupSetup({ cohort, cohorts = [] }: { cohort: string; cohorts?: string[] }) {
  const [moved, setMoved] = useState<{ name: string; cohort: string } | null>(null);
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/slots", { cache: "no-store" });
    if (!res.ok) {
      setError(res.status === 401 ? "Your admin session expired. Reload the page and sign in again." : "Could not load the groups.");
      return;
    }
    const data = await res.json();
    setSlots(data.slots);
    setFacilitators(data.facilitators);
  }, []);
  useEffect(() => { load(); }, [load]);

  const changed = useCallback(() => { load(); router.refresh(); }, [load, router]);

  async function createGroup() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), cohort }),
    }).catch(() => null);
    setCreating(false);
    if (!res?.ok) { setError("Could not create the group."); return; }
    setNewName("");
    changed();
  }

  async function reactivate(id: string) {
    const r = await patchGroup(id, { active: true });
    if (!r.ok) { setError("Could not reactivate the group."); return; }
    changed();
  }

  const inCohort = (slots ?? []).filter((s) => cohortKey(s.cohort) === cohort);
  const open = inCohort.filter((s) => s.active);
  const closed = inCohort.filter((s) => !s.active);
  const bookable = open.filter((s) => s.bookable);
  const totalPlaces = bookable.reduce((n, s) => n + (s.capacity ?? 0), 0);
  const totalBooked = bookable.reduce((n, s) => n + s.booked, 0);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Each group is a time slot applicants can book on the apply form. Their 1st choice reserves a place straight
        away; rejecting the application frees it again. {open.length} active group{open.length === 1 ? "" : "s"} ·{" "}
        {bookable.length} open for booking · {totalBooked} of {totalPlaces} places booked.
      </p>

      <div className="card-ean flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[14rem] flex-1">
          <span className={label}>New group in {cohort || "(no cohort)"}</span>
          <input
            className={input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createGroup(); }}
            placeholder="e.g. Monday evening"
          />
        </div>
        <button type="button" onClick={createGroup} disabled={creating || !newName.trim()} className="btn-pill btn-pill-secondary h-9 px-4 text-sm disabled:opacity-50">
          {creating ? "Creating…" : "+ Add group"}
        </button>
      </div>

      {moved && (
        <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-slate-700">
          Moved <strong>{moved.name}</strong> to <strong>{moved.cohort || "No cohort"}</strong>.{" "}
          <a className="font-medium text-teal-700 underline" href={`/admin/groups?cohort=${encodeURIComponent(moved.cohort || NO_COHORT)}&tab=setup`}>
            Go to that cohort
          </a>
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {slots === null ? (
        !error && <p className="text-sm text-slate-500">Loading…</p>
      ) : open.length === 0 ? (
        <p className="text-sm text-slate-500">No active groups in this cohort yet. Add one above.</p>
      ) : (
        open.map((s) => <GroupCard
            key={s.id}
            slot={s}
            facilitators={facilitators}
            cohorts={cohorts}
            onChanged={changed}
            onMoved={(name, c) => setMoved({ name, cohort: c })}
          />)
      )}

      {closed.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowClosed((v) => !v)} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            {showClosed ? "▾" : "▸"} Closed groups ({closed.length})
          </button>
          {showClosed && (
            <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {closed.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="font-medium text-slate-700">{s.name}</span>
                  <span className="text-slate-400">{formatGroupTiming(s.timing) ?? "No time set"} · {s.memberCount} people</span>
                  <div className="flex-1" />
                  <button type="button" onClick={() => reactivate(s.id)} className="text-teal-700 hover:underline">Reactivate</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
