import { db, participants, ensureMigrated } from "@/db";
import { eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FacilitatorsPage() {
  await ensureMigrated();

  const facilitators = await db
    .select({
      id: participants.id,
      name: participants.name,
      email: participants.email,
      status: participants.status,
      createdAt: participants.createdAt,
      availability: participants.availability,
    })
    .from(participants)
    .where(eq(participants.role, "facilitator"))
    .orderBy(participants.createdAt);

  const pending = facilitators.filter((f) => f.status === "pending");
  const active = facilitators.filter((f) => f.status === "active");
  const completed = facilitators.filter((f) => f.status === "completed");

  const SLOT_LABELS: Record<string, string> = {
    early_monday: "Mon early",
    late_monday: "Mon late",
    early_thursday: "Thu early",
    late_thursday: "Thu late",
  };

  function SlotPills({ slots }: { slots: string[] }) {
    if (!slots.length) return <span className="text-xs text-slate-400">Not set</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {slots.map((s) => (
          <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-teal-50 text-teal-700 border border-teal-200">
            {SLOT_LABELS[s] ?? s}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Facilitators</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {facilitators.length} facilitator{facilitators.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <a
          href="/facilitator/signup"
          target="_blank"
          rel="noopener"
          className="text-xs text-teal-600 underline"
        >
          Facilitator sign-up link ↗
        </a>
      </div>

      {facilitators.length === 0 && (
        <p className="text-sm text-slate-400">No facilitators yet. Share the sign-up link above.</p>
      )}

      {[
        { title: "Pending approval", items: pending, badge: "pending" },
        { title: "Active", items: active, badge: "active" },
        { title: "Completed", items: completed, badge: "completed" },
      ].map(({ title, items, badge }) =>
        items.length === 0 ? null : (
          <section key={badge} className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {title} ({items.length})
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {items.map((f) => (
                <div key={f.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{f.name}</p>
                    <p className="text-xs text-slate-400">{f.email}</p>
                    <div className="mt-1">
                      <SlotPills slots={(f.availability as string[] | null) ?? []} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      badge === "active" ? "bg-green-50 text-green-700 border border-green-200" :
                      badge === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>
                      {badge}
                    </span>
                    <Link
                      href={`/admin/participants/${f.id}`}
                      className="text-xs text-teal-600 hover:underline"
                    >
                      Edit →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      )}

      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-500">
        <strong className="text-slate-700">Approving a facilitator:</strong>{" "}
        Click "Edit →" next to a pending facilitator and change their status to "active"
        using the participant edit page.
      </div>
    </div>
  );
}
