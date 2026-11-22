"use client";

/**
 * Facilitator tracker for one group: attendance per week (click a cell to cycle
 * — → P → ½ → A) and the facilitator checklist per moment of the course, with links into
 * the facilitator guide. Used on /group/[groupId]/overview and /admin/tracker.
 * Saves each change straight away via PUT /api/group/[groupId]/tracker.
 */
import { useState } from "react";
import type { AttendanceStatus } from "@/lib/tracker";

export interface TrackerItem {
  key: string;
  label: string;
  hint?: string;
  optional?: boolean;
  phaseKey: string;
  phaseLabel: string;
  guideUrl?: string;
}

const NEXT: Record<string, AttendanceStatus | null> = { none: "present", present: "partly", partly: "absent", absent: null };
const CELL: Record<AttendanceStatus, { label: string; title: string; cls: string }> = {
  present: { label: "P", title: "Present", cls: "bg-teal-600 text-white" },
  partly: { label: "½", title: "Partly present", cls: "bg-amber-100 text-amber-800" },
  absent: { label: "A", title: "Absent", cls: "bg-rose-100 text-rose-700" },
};
const SCORE: Record<AttendanceStatus, number> = { present: 1, partly: 0.5, absent: 0 };
const WEEKS = [1, 2, 3, 4, 5];

function pct(marks: Partial<Record<number, AttendanceStatus>>) {
  const v = Object.values(marks).filter((x): x is AttendanceStatus => !!x);
  return v.length ? Math.round((v.reduce((n, s) => n + SCORE[s], 0) / v.length) * 100) : null;
}
function level(p: number | null) {
  if (p == null) return { label: "—", cls: "text-slate-400" };
  if (p >= 80) return { label: "Strong", cls: "bg-teal-50 text-teal-800 border border-teal-200" };
  if (p >= 60) return { label: "Moderate", cls: "bg-amber-50 text-amber-800 border border-amber-200" };
  return { label: "Weak", cls: "bg-rose-50 text-rose-700 border border-rose-200" };
}

async function save(groupId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/group/${groupId}/tracker`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return res?.ok ?? false;
}

export function GroupTracker({
  groupId,
  members,
  initialAttendance,
  items,
  initialDone,
  editable = true,
  compact = false,
}: {
  groupId: string;
  members: { id: string; name: string }[];
  initialAttendance: Record<string, Partial<Record<number, AttendanceStatus>>>;
  items: TrackerItem[];
  initialDone: string[];
  editable?: boolean;
  compact?: boolean;
}) {
  const [attendance, setAttendanceState] = useState(initialAttendance);
  const [done, setDone] = useState(() => new Set(initialDone));
  const [error, setError] = useState("");

  async function cycle(pid: string, week: number) {
    if (!editable) return;
    const cur = attendance[pid]?.[week] ?? "none";
    const next = NEXT[cur];
    const before = attendance;
    setAttendanceState((a) => ({ ...a, [pid]: { ...(a[pid] ?? {}), [week]: next ?? undefined } }));
    setError("");
    if (!(await save(groupId, { kind: "attendance", participantId: pid, week, status: next }))) {
      setAttendanceState(before);
      setError("Not saved. Reload the page and try again (are you still signed in?).");
    }
  }

  async function toggle(key: string) {
    if (!editable) return;
    const isDone = done.has(key);
    setDone((d) => { const n = new Set(d); if (isDone) n.delete(key); else n.add(key); return n; });
    setError("");
    if (!(await save(groupId, { kind: "checklist", itemKey: key, done: !isDone }))) {
      setDone((d) => { const n = new Set(d); if (isDone) n.add(key); else n.delete(key); return n; });
      setError("Not saved. Reload the page and try again (are you still signed in?).");
    }
  }

  const perWeek = WEEKS.map((w) => {
    let present = 0, partly = 0, absent = 0;
    for (const m of members) {
      const s = attendance[m.id]?.[w];
      if (s === "present") present++; else if (s === "partly") partly++; else if (s === "absent") absent++;
    }
    return { present, partly, absent };
  });
  const levels = members.map((m) => level(pct(attendance[m.id] ?? {})).label);
  const required = items.filter((i) => !i.optional);
  const requiredDone = required.filter((i) => done.has(i.key)).length;
  const phases = [...new Map(items.map((i) => [i.phaseKey, i.phaseLabel])).entries()];

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Attendance */}
      <section className="card-ean p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-lg" style={{ color: "var(--text-primary)" }}>Attendance</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {editable ? "Click a cell: P = present, ½ = partly, A = absent, click again to clear." : "P = present, ½ = partly, A = absent."}{" "}
            Strong ≥ 80% · Moderate ≥ 60%
          </p>
        </div>
        {members.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No participants in this group yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
                  <th className="py-1.5 pr-3 font-medium">Participant</th>
                  {WEEKS.map((w) => <th key={w} className="px-1 py-1.5 text-center font-medium">W{w}</th>)}
                  <th className="px-2 py-1.5 text-right font-medium">%</th>
                  <th className="py-1.5 pl-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const p = pct(attendance[m.id] ?? {});
                  const lv = level(p);
                  return (
                    <tr key={m.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="max-w-[12rem] truncate py-1.5 pr-3" style={{ color: "var(--text-primary)" }}>{m.name}</td>
                      {WEEKS.map((w) => {
                        const s = attendance[m.id]?.[w];
                        const c = s ? CELL[s] : null;
                        return (
                          <td key={w} className="px-1 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => cycle(m.id, w)}
                              disabled={!editable}
                              title={`${m.name}, week ${w}: ${c ? c.title : "not marked"}`}
                              aria-label={`${m.name}, week ${w}: ${c ? c.title : "not marked"}`}
                              className={`h-8 w-8 rounded-md text-xs font-semibold transition ${c ? c.cls : "border border-dashed border-slate-300 text-slate-300"} ${editable ? "hover:ring-2 hover:ring-teal-300" : "cursor-default"}`}
                            >
                              {c ? c.label : "·"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{p == null ? "—" : `${p}%`}</td>
                      <td className="py-1.5 pl-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lv.cls}`}>{lv.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <td className="py-1.5 pr-3">Present / absent</td>
                  {perWeek.map((w, i) => (
                    <td key={i} className="px-1 py-1.5 text-center tabular-nums">
                      {w.present + w.partly + w.absent === 0 ? "—" : `${w.present + w.partly}/${w.absent}`}
                    </td>
                  ))}
                  <td colSpan={2} className="py-1.5 pl-2 text-right">
                    {(["Strong", "Moderate", "Weak"] as const).map((l) => `${levels.filter((x) => x === l).length} ${l.toLowerCase()}`).join(" · ")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Checklist */}
      <section className="card-ean p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-lg" style={{ color: "var(--text-primary)" }}>Facilitator checklist</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {requiredDone} of {required.length} done{items.some((i) => i.optional) ? " (optional tasks not counted)" : ""}
          </p>
        </div>
        <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {phases.map(([phaseKey, phaseLabel]) => {
            const its = items.filter((i) => i.phaseKey === phaseKey);
            const n = its.filter((i) => !i.optional && done.has(i.key)).length;
            const total = its.filter((i) => !i.optional).length;
            return (
              <div key={phaseKey} className="rounded-xl p-3" style={{ border: "1px solid var(--border)", background: "var(--bg-page)" }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{phaseLabel}</p>
                  <span className={`text-xs ${n === total ? "font-medium text-teal-700" : ""}`} style={n === total ? undefined : { color: "var(--text-muted)" }}>
                    {n}/{total}
                  </span>
                </div>
                <ul className="space-y-2">
                  {its.map((i) => (
                    <li key={i.key} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id={`${groupId}-${i.key}`}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600"
                        checked={done.has(i.key)}
                        onChange={() => toggle(i.key)}
                        disabled={!editable}
                      />
                      <div className="min-w-0 text-sm">
                        <label htmlFor={`${groupId}-${i.key}`} className={`cursor-pointer ${done.has(i.key) ? "line-through opacity-60" : ""}`} style={{ color: "var(--text-primary)" }}>
                          {i.label}
                          {i.optional && <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>(optional)</span>}
                        </label>
                        {!compact && i.hint && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{i.hint}</p>}
                        {i.guideUrl && (
                          <a href={i.guideUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-teal-700 hover:underline">
                            In the guide ↗
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
