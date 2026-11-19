/**
 * /facilitator-guide — facilitators (and role admin) only.
 * Shows the living Google Doc with the facilitator guide, embedded, plus links to
 * open it in Google Docs or download it as PDF.
 */
import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { facilitatorGuideUrls } from "@/lib/facilitator-guide";

export const dynamic = "force-dynamic";

export const metadata = { title: "Facilitator guide — EA Netherlands Intro Course" };

export default async function FacilitatorGuidePage() {
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) redirect("/auth/login?next=/facilitator-guide");
  const isFacilitator = me.role === "facilitator" || me.role === "admin";
  if (!isFacilitator || me.status !== "active") redirect("/materials");

  const urls = facilitatorGuideUrls();

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
