/**
 * /facilitator-guide — facilitators (and role admin) only.
 * Shows the living Google Doc with the facilitator guide, embedded, plus links to
 * open it in Google Docs or download it as PDF.
 */
import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { facilitatorGuideUrls } from "@/lib/facilitator-guide";
import { db, groups } from "@/db";
import { CHECKLIST_PHASES, getGroupTrackers, trackerItems } from "@/lib/tracker";

export const dynamic = "force-dynamic";

export const metadata = { title: "Facilitator guide — EA Netherlands Intro Course" };

export default async function FacilitatorGuidePage() {
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) redirect("/auth/login?next=/facilitator-guide");
  const isFacilitator = me.role === "facilitator" || me.role === "admin";
  if (!isFacilitator || me.status !== "active") redirect("/materials");

  const urls = facilitatorGuideUrls();

  // The facilitator's own checklist: open tasks for the current moment of the course
  // (by the group's session dates: before session n+1 once n dates have passed).
  let todo: { groupId: string; groupName: string; phaseLabel: string; open: ReturnType<typeof trackerItems>; doneCount: number; total: number } | null = null;
  if (me.groupId) {
    const [g] = await db.select({ id: groups.id, dates: groups.dates }).from(groups).where(eq(groups.id, me.groupId)).limit(1);
    const [t] = g ? await getGroupTrackers([g.id]) : [];
    if (g && t) {
      const items = trackerItems();
      const done = new Set(t.doneItems);
      const today = new Date().toISOString().slice(0, 10);
      const dates = Array.isArray(g.dates) ? (g.dates as string[]) : [];
      const passed = dates.filter((d) => d < today).length;
      const byDate = dates.length ? CHECKLIST_PHASES[Math.min(passed, CHECKLIST_PHASES.length - 1)].key : null;
      // Without dates: the first moment that still has open required tasks.
      const phaseKey =
        byDate ?? CHECKLIST_PHASES.find((p) => items.some((i) => i.phaseKey === p.key && !i.optional && !done.has(i.key)))?.key ?? "after";
      const required = items.filter((i) => !i.optional);
      todo = {
        groupId: t.groupId,
        groupName: t.groupName,
        phaseLabel: CHECKLIST_PHASES.find((p) => p.key === phaseKey)!.label,
        open: items.filter((i) => i.phaseKey === phaseKey && !done.has(i.key)),
        doneCount: required.filter((i) => done.has(i.key)).length,
        total: required.length,
      };
    }
  }

  return (
    <div className="min-h-screen graph-paper">
      <SiteHeader user={{ name: me.name, role: me.role, groupId: me.groupId }} />
      <div className="page-column">
        <main className="space-y-5 px-4 py-8 md:px-6 md:py-10 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <span className="badge-ean">For facilitators</span>
              <h1 className="font-serif text-[1.875rem] leading-[1.2] md:text-[2.25rem]" style={{ color: "var(--text-primary)" }}>
                Facilitator guide
              </h1>
              <p className="max-w-[42rem] text-base" style={{ color: "var(--text-muted)" }}>
                How we run the sessions, week by week. This is a living document: it updates as soon as the guide
                is edited in Google Docs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={urls.open} target="_blank" rel="noopener noreferrer" className="btn-pill btn-pill-primary h-10 px-4 text-sm">
                Open in Google Docs <span aria-hidden="true">↗</span>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <a href={urls.pdf} className="btn-pill btn-pill-secondary h-10 px-4 text-sm">
                Download PDF
              </a>
            </div>
          </div>

          {todo && (
            <div className="card-ean p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-lg" style={{ color: "var(--text-primary)" }}>
                  Your checklist · {todo.groupName}
                </h2>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{todo.doneCount} of {todo.total} done</span>
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {todo.open.length ? <>Still to do <strong>{todo.phaseLabel.toLowerCase()}</strong>:</> : <>Everything for <strong>{todo.phaseLabel.toLowerCase()}</strong> is done.</>}
              </p>
              {todo.open.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--text-primary)" }}>
                  {todo.open.map((i) => (
                    <li key={i.key} className="flex flex-wrap items-baseline gap-x-2">
                      <span>• {i.label}{i.optional ? " (optional)" : ""}</span>
                      {i.guideUrl && (
                        <a href={i.guideUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-teal-700 hover:underline">
                          In the guide ↗
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <Link href={`/group/${todo.groupId}/overview#tracker`} className="btn-pill btn-pill-secondary mt-3 inline-flex h-9 items-center px-4 text-sm">
                Open checklist &amp; attendance →
              </Link>
            </div>
          )}

          <div className="card-ean overflow-hidden p-0">
            <iframe
              src={urls.embed}
              title="Facilitator guide"
              className="block h-[78vh] min-h-[520px] w-full border-0 bg-white"
              loading="lazy"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
