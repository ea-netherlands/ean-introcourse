import Link from "next/link";

/**
 * "How to run an Intro Course round" — the step-by-step guide on the admin homepage.
 * Keep it in step with the actual admin pages when they change.
 */

type Step = {
  title: string;
  when: string;
  body: React.ReactNode;
  links: { href: string; label: string; external?: boolean }[];
};

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-medium text-teal-700 underline underline-offset-2">{children}</Link>
);

const STEPS: Step[] = [
  {
    title: "Find facilitators",
    when: "6–8 weeks before the start",
    body: (
      <>
        <p>
          Ask facilitators to create an account with the sign-up link (or add them yourself with
          &ldquo;+ Add facilitator&rdquo;). New sign-ups appear under <em>Pending approval</em>: click{" "}
          <strong>Approve</strong>. Only approved facilitators can sign in and see the facilitator guide.
        </p>
        <p>Facilitators you added yourself have no password: they sign in with a magic link or use &ldquo;Forgot your password?&rdquo;.</p>
      </>
    ),
    links: [
      { href: "/admin/facilitators", label: "Facilitators" },
      { href: "/facilitator/signup", label: "Facilitator sign-up link", external: true },
    ],
  },
  {
    title: "Start a cohort and set up its groups",
    when: "5–6 weeks before",
    body: (
      <>
        <p>
          A <strong>cohort</strong> is one round of the course (e.g. &ldquo;Spring 2027&rdquo;); it has several{" "}
          <strong>groups</strong>, one per time slot. In <A href="/admin/groups">Groups</A> click &ldquo;+ New cohort&rdquo;,
          then add a group per time slot under <em>1. Set up groups</em>.
        </p>
        <p>
          For each group fill in day &amp; time, the first session date (then &ldquo;Fill weekly from the first
          date&rdquo;), facilitator, language, online/in person and number of places (usually 6–8). Tick{" "}
          <strong>Open for booking</strong> and save. Open groups appear on the application form straight away.
        </p>
      </>
    ),
    links: [{ href: "/admin/groups?tab=setup", label: "Groups → Set up" }],
  },
  {
    title: "Recruit participants",
    when: "4–5 weeks before",
    body: (
      <>
        <p>
          Share the application form (newsletter, WhatsApp groups, LinkedIn, local groups, website).
          Applicants choose up to three groups in order of preference: their <strong>1st choice reserves a
          place</strong> immediately; full groups can&apos;t be chosen. People can also tick &ldquo;None of these
          times work for me&rdquo;.
        </p>
        <p>Keep an eye on the booked/places count per group and add a group if slots fill up.</p>
      </>
    ),
    links: [{ href: "/apply", label: "Application form", external: true }],
  },
  {
    title: "Review applications",
    when: "Continuously, at least weekly",
    body: (
      <>
        <p>
          In <A href="/admin/applications">Applications</A> read each application (View) and{" "}
          <strong>Accept</strong> or <strong>Reject</strong> (one by one or in bulk). Accepting sends an email with a
          registration link (valid 7 days) and puts the person in the group they booked. Rejecting sends a
          kind rejection email and frees their place.
        </p>
      </>
    ),
    links: [{ href: "/admin/applications", label: "Applications" }],
  },
  {
    title: "Check registrations and finish the groups",
    when: "2 weeks before",
    body: (
      <>
        <p>
          Accepted people complete their registration (availability + password). Anyone still{" "}
          <em>pending</em> in <A href="/admin/participants?status=pending">Participants</A> hasn&apos;t done this yet:
          remind them to use the link in their acceptance email.
        </p>
        <p>
          In <A href="/admin/groups?tab=assign">Groups → 2. Assign people</A> place everyone without a group (e.g. those
          who picked &ldquo;None of these times&rdquo;), move people if needed, and press <strong>Save
          assignments</strong>. When a cohort is complete, untick <em>Open for booking</em> so no new bookings come in.
        </p>
      </>
    ),
    links: [
      { href: "/admin/groups?tab=assign", label: "Groups → Assign people" },
      { href: "/admin/participants?status=pending", label: "Pending participants" },
    ],
  },
  {
    title: "Prepare the sessions",
    when: "1 week before",
    body: (
      <>
        <p>
          Facilitators plan their five sessions on their own Sessions page (with a Google Meet link) and
          read the facilitator guide. Check in <A href="/admin/sessions">Sessions</A> that every group has its
          sessions. Participants get an automatic reminder email 24 hours before each session.
        </p>
      </>
    ),
    links: [{ href: "/admin/sessions", label: "Sessions" }],
  },
  {
    title: "Run the five weeks",
    when: "Weeks 1–5",
    body: (
      <>
        <p>
          Each week participants do the materials (about 3.5 hours) before their 75-minute discussion.
          Facilitators follow progress, quiz answers and comments on their group&apos;s Overview page and mark
          attendance in Sessions. Use the participant detail pages to see who is falling behind.
        </p>
      </>
    ),
    links: [
      { href: "/admin/participants", label: "Participants" },
      { href: "/admin/sessions", label: "Attendance" },
    ],
  },
  {
    title: "Close the round",
    when: "After week 5",
    body: (
      <>
        <p>
          In <A href="/admin/groups?tab=setup">Groups</A> click <strong>Close group</strong> for each group. Its
          participants are marked finished: they see the graduation page and are invited to fill in the
          follow-up form (EAN Fellowship). Facilitators stay active for the next round.
        </p>
        <p>Export the participants as CSV for your records, then start the next cohort at step 2.</p>
      </>
    ),
    links: [
      { href: "/admin/groups?tab=setup", label: "Groups" },
      { href: "/api/admin/export/participants", label: "Export participants CSV", external: true },
    ],
  },
];

export function CourseGuide() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
      <h2 className="font-serif text-lg text-slate-900">How to run an Intro Course round</h2>
      <p className="mt-1 text-sm text-slate-500">
        The steps in order, with the page for each. Times are a guide for a 5-week round.
      </p>
      <ol className="mt-5 space-y-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h3 className="font-medium text-slate-900">{s.title}</h3>
                <span className="text-xs text-slate-400">{s.when}</span>
              </div>
              <div className="mt-1 space-y-1.5 text-sm leading-relaxed text-slate-600">{s.body}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.links.map((l) =>
                  l.external ? (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener"
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-teal-200 hover:text-teal-700">
                      {l.label} ↗
                    </a>
                  ) : (
                    <Link key={l.href} href={l.href}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-teal-200 hover:text-teal-700">
                      {l.label} →
                    </Link>
                  )
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
