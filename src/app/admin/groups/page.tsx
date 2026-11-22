/**
 * /admin/groups — everything about groups, per cohort (replaces the old Groups, Slots and
 * Form Groups pages, which now redirect here).
 *   ?cohort=<label>  which cohort (groups.cohort; "_none" = groups without a cohort label)
 *   ?tab=setup       group cards: time slot, dates, facilitator, places, open for booking, close
 *   ?tab=assign      put participants and facilitators into this cohort's groups
 * A new cohort exists as soon as its first group is created.
 */
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, participants, groups, applications, ensureMigrated } from "@/db";
import AssignPeople from "./assign-people";
import { GroupSetup } from "./group-setup";
import { CohortPicker } from "./cohort-picker";
import { NO_COHORT, cohortKey } from "./cohort";

export const dynamic = "force-dynamic";

type Tab = "setup" | "assign";

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ cohort?: string; tab?: string }> }) {
  await ensureMigrated();
  const sp = await searchParams;
  const tab: Tab = sp.tab === "assign" ? "assign" : "setup";

  const allGroups = await db
    .select({ id: groups.id, name: groups.name, cohort: groups.cohort, timing: groups.timing, active: groups.active, createdAt: groups.createdAt })
    .from(groups)
    .orderBy(groups.name);

  // Cohorts, most relevant first: those with active groups, newest first.
  const info = new Map<string, { latest: number; active: number }>();
  for (const g of allGroups) {
    const key = cohortKey(g.cohort);
    const cur = info.get(key) ?? { latest: 0, active: 0 };
    cur.latest = Math.max(cur.latest, new Date(g.createdAt).getTime());
    if (g.active) cur.active++;
    info.set(key, cur);
  }
  const cohorts = [...info.entries()]
    .sort((a, b) => Number(b[1].active > 0) - Number(a[1].active > 0) || b[1].latest - a[1].latest)
    .map(([c]) => c);

  const requested = sp.cohort === undefined ? undefined : cohortKey(sp.cohort);
  const cohort = requested ?? cohorts[0] ?? "";
  const qs = (t: Tab) => `/admin/groups?cohort=${encodeURIComponent(cohort || NO_COHORT)}&tab=${t}`;

  let assign: React.ReactNode = null;
  if (tab === "assign") {
    const cohortGroups = allGroups.filter((g) => cohortKey(g.cohort) === cohort);
    const cohortGroupIds = cohortGroups.map((g) => g.id);
    const people = await db
      .select({
        id: participants.id,
        name: participants.name,
        email: participants.email,
        role: participants.role,
        groupId: participants.groupId,
        availability: participants.availability,
        status: participants.status,
        language: applications.language,
        onlinePreference: applications.onlinePreference,
        careerStage: applications.careerStage,
        city: applications.city,
      })
      .from(participants)
      .leftJoin(applications, eq(participants.email, applications.email));

    // People without a group, or already in one of this cohort's groups.
    const relevant = (p: (typeof people)[number]) => !p.groupId || cohortGroupIds.includes(p.groupId);
    const toPerson = (p: (typeof people)[number]) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      groupId: p.groupId ?? null,
      availability: (p.availability as string[] | null) ?? [],
      language: p.language ?? null,
      onlinePreference: p.onlinePreference ?? null,
      careerStage: p.careerStage ?? null,
      city: p.city ?? null,
    });
    // Facilitators: active ones without a group or leading one of this cohort's groups
    // (someone leading a group in another cohort is managed in that cohort).
    const facilitators = people.filter((p) => p.role === "facilitator" && p.status === "active" && relevant(p));
    const members = people.filter(
      (p) => p.role === "participant" && (p.status === "active" || p.status === "pending") && relevant(p)
    );
    assign = (
      <AssignPeople
        key={cohort}
        participants={members.map(toPerson)}
        facilitators={facilitators.map(toPerson)}
        groups={cohortGroups.map((g) => ({ id: g.id, name: g.name, cohort: g.cohort ?? "", timing: g.timing ?? null, active: g.active }))}
      />
    );
  }

  const tabClass = (t: Tab) =>
    `-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
      tab === t ? "border-teal-600 text-teal-800" : "border-transparent text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Groups</h1>
          <p className="mt-0.5 text-sm text-slate-500">Set up the groups of a cohort, then put people into them.</p>
        </div>
        <CohortPicker cohorts={cohorts} current={cohort} tab={tab} />
      </div>

      <nav className="flex gap-1 border-b border-slate-200">
        <Link href={qs("setup")} className={tabClass("setup")}>1. Set up groups</Link>
        <Link href={qs("assign")} className={tabClass("assign")}>2. Assign people</Link>
      </nav>

      {tab === "setup" ? <GroupSetup key={cohort} cohort={cohort} cohorts={cohorts} /> : assign}
    </div>
  );
}
