/**
 * /admin/tracker?cohort=… — every active group of a cohort at a glance: facilitator, checklist
 * progress, attendance per week and Strong/Moderate/Weak counts, plus cohort totals. Each group
 * opens to the same editable tracker facilitators see on their group Overview.
 * (Replaces the "Checklists & trackers" spreadsheet.)
 */
import { db, groups, ensureMigrated } from "@/db";
import { CohortPicker } from "../groups/cohort-picker";
import { NO_COHORT, cohortKey } from "../groups/cohort";
import { GroupTracker } from "@/components/group-tracker";
import {
  REQUIRED_ITEM_KEYS,
  WEEKS,
  attendanceLevel,
  attendancePct,
  getGroupTrackers,
  trackerItems,
} from "@/lib/tracker";

export const dynamic = "force-dynamic";

export default async function TrackerPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  await ensureMigrated();
  const sp = await searchParams;

  const all = await db
    .select({ id: groups.id, name: groups.name, cohort: groups.cohort, active: groups.active, createdAt: groups.createdAt })
    .from(groups)
    .orderBy(groups.name);

  // Cohorts with active groups first, newest first (same order as the Groups page).
  const info = new Map<string, { latest: number; active: number }>();
  for (const g of all) {
    const k = cohortKey(g.cohort);
    const cur = info.get(k) ?? { latest: 0, active: 0 };
    cur.latest = Math.max(cur.latest, new Date(g.createdAt).getTime());
    if (g.active) cur.active++;
    info.set(k, cur);
  }
  const cohorts = [...info.entries()]
    .sort((a, b) => Number(b[1].active > 0) - Number(a[1].active > 0) || b[1].latest - a[1].latest)
    .map(([c]) => c);
  const cohort = sp.cohort === undefined ? cohorts[0] ?? "" : cohortKey(sp.cohort);

  const inCohort = all.filter((g) => cohortKey(g.cohort) === cohort && g.active);
  const trackers = await getGroupTrackers(inCohort.map((g) => g.id));
  const items = trackerItems();

  // Cohort totals
  const weekTotals = WEEKS.map((w) => {
    let present = 0, absent = 0;
    for (const t of trackers) for (const m of t.members) {
      const s = t.attendance[m.id]?.[w];
      if (s === "present" || s === "partly") present++;
      else if (s === "absent") absent++;
    }
    return { present, absent };
  });
  const levelCount = { Strong: 0, Moderate: 0, Weak: 0 };
  let members = 0;
  for (const t of trackers) for (const m of t.members) {
    members++;
    const l = attendanceLevel(attendancePct(t.attendance[m.id] ?? {}));
    if (l !== "—") levelCount[l]++;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tracker</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Attendance and facilitator checklists per group. Facilitators fill this in on their group&apos;s Overview page;
            you can correct it here.
          </p>
        </div>
        <CohortPicker cohorts={cohorts} current={cohort} basePath="/admin/tracker" allowNew={false} />
      </div>

      {inCohort.length === 0 ? (
        <p className="text-sm text-slate-500">No active groups in this cohort.</p>
      ) : (
        <>
          {/* Cohort summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="py-1.5 pr-3 font-medium">Group</th>
                    <th className="py-1.5 pr-3 font-medium">Facilitator</th>
                    <th className="py-1.5 pr-3 font-medium">Checklist</th>
                    {WEEKS.map((w) => <th key={w} className="px-1 py-1.5 text-center font-medium">W{w}</th>)}
                    <th className="py-1.5 pl-2 font-medium">Strong · Moderate · Weak</th>
                  </tr>
                </thead>
                <tbody>
                  {trackers.map((t) => {
                    const done = t.doneItems.filter((k) => REQUIRED_ITEM_KEYS.has(k)).length;
                    const lv = { Strong: 0, Moderate: 0, Weak: 0 };
                    for (const m of t.members) {
                      const l = attendanceLevel(attendancePct(t.attendance[m.id] ?? {}));
                      if (l !== "—") lv[l]++;
                    }
                    return (
                      <tr key={t.groupId} className="border-t border-slate-100">
                        <td className="py-1.5 pr-3">
                          <a href={`#g-${t.groupId}`} className="font-medium text-teal-700 hover:underline">{t.groupName}</a>
                          <span className="ml-1 text-xs text-slate-400">({t.members.length})</span>
                        </td>
                        <td className="py-1.5 pr-3 text-slate-600">{t.facilitatorName ?? <span className="text-slate-400">—</span>}</td>
                        <td className="py-1.5 pr-3 tabular-nums text-slate-600">{done}/{REQUIRED_ITEM_KEYS.size}</td>
                        {WEEKS.map((w) => {
                          const p = t.members.filter((m) => ["present", "partly"].includes(t.attendance[m.id]?.[w] ?? "")).length;
                          const marked = t.members.filter((m) => t.attendance[m.id]?.[w]).length;
                          return <td key={w} className="px-1 py-1.5 text-center tabular-nums text-slate-600">{marked ? `${p}/${t.members.length}` : "—"}</td>;
                        })}
                        <td className="py-1.5 pl-2 tabular-nums text-slate-600">{lv.Strong} · {lv.Moderate} · {lv.Weak}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 text-xs text-slate-500">
                    <td className="py-1.5 pr-3 font-medium" colSpan={3}>Cohort ({members} participants): present / absent</td>
                    {weekTotals.map((w, i) => (
                      <td key={i} className="px-1 py-1.5 text-center tabular-nums">{w.present + w.absent ? `${w.present}/${w.absent}` : "—"}</td>
                    ))}
                    <td className="py-1.5 pl-2 tabular-nums">{levelCount.Strong} · {levelCount.Moderate} · {levelCount.Weak}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Per group, editable */}
          {trackers.map((t) => (
            <details key={t.groupId} id={`g-${t.groupId}`} className="group rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="text-slate-400 transition group-open:rotate-90">▸</span>
                <span className="font-medium text-slate-900">{t.groupName}</span>
                <span className="text-sm text-slate-500">{t.facilitatorName ?? "No facilitator"} · {t.members.length} participants</span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <GroupTracker
                  groupId={t.groupId}
                  members={t.members}
                  initialAttendance={t.attendance}
                  items={items}
                  initialDone={t.doneItems}
                  compact
                />
              </div>
            </details>
          ))}
        </>
      )}
      <p className="text-xs text-slate-400">
        Cohort: {cohort || "No cohort"} · <a className="underline" href={`/admin/groups?cohort=${encodeURIComponent(cohort || NO_COHORT)}`}>Groups of this cohort</a>
      </p>
    </div>
  );
}
