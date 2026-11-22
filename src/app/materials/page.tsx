/**
 * /materials — "Start here": the course entry page (what used to redirect straight
 * to the first lesson). Modelled on the "Start Here (Intro Course)" space on Circle:
 * a welcome, how to get started, where everything is, and where to go with
 * questions and feedback.
 */
import Link from "next/link";
import { getAllWeeksWithLessons } from "@/lib/lessons";
import { getCurrentParticipant } from "@/lib/auth";

export const metadata = { title: "Start here — EA Netherlands Intro Course" };

const CONTACT = "programmes@effectiefaltruisme.nl";
const FEEDBACK = "info@effectiefaltruisme.nl";

function Step({ n, title, children, href, cta }: { n: number; title: string; children: React.ReactNode; href: string; cta: string }) {
  return (
    <li className="flex gap-4">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ background: "var(--color-ea-teal)" }}
        aria-hidden="true"
      >
        {n}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{title}</p>
        <p className="text-[0.9375rem]" style={{ color: "var(--text-secondary)" }}>{children}</p>
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-ea-teal hover:underline">
          {cta} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </li>
  );
}

function Place({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--callout-bg)", border: "1px dashed var(--rule)" }}>
      <p className="mb-1 text-sm font-semibold" style={{ color: "var(--eyebrow)" }}>{title}</p>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{children}</p>
    </div>
  );
}

export default async function StartHerePage() {
  const weeks = getAllWeeksWithLessons();
  const me = await getCurrentParticipant().catch(() => null);
  const firstLesson = weeks[0]?.lessons[0];
  const firstLessonHref = firstLesson ? `/materials/${weeks[0].slug}/${firstLesson.id}` : "/materials/week-1";
  const chatHref = me?.groupId ? "/chat?channel=group" : "/chat";

  return (
    <main className="flex-1 min-w-0">
      <article className="card-ean mx-auto w-full max-w-[52rem] space-y-10 px-5 py-8 sm:px-10 md:px-14 md:py-12">
        {/* Welcome */}
        <header className="space-y-4">
          <span className="badge-ean">Start here</span>
          <h1 className="font-serif text-[1.875rem] leading-[1.2] md:text-[2.25rem]" style={{ color: "var(--text-primary)" }}>
            {me ? `Welcome, ${me.name.split(" ")[0]}!` : "Welcome to the Intro Course"}
          </h1>
          <p className="prose-content" style={{ color: "var(--text-secondary)" }}>
            This is the online home of the EA Netherlands Intro Course. Over five weeks you&apos;ll explore how to do
            the most good with your time, money and career: each week you prepare with a few lessons, a short quiz and
            some exercises, and then meet your group for a 75-minute online discussion with your facilitator.
            Expect about 3.5 hours of preparation a week.
          </p>
        </header>

        {/* Getting started */}
        <section className="space-y-5">
          <h2 className="font-serif text-2xl" style={{ color: "var(--text-primary)" }}>How to get started</h2>
          <ol className="space-y-6">
            {me ? (
              <Step n={1} title="Finish your profile" href="/account" cta="Go to My account">
                Add a short bio and a photo so your group knows who you are. You&apos;ll also find your upcoming
                sessions there, with buttons to add them to your calendar.
              </Step>
            ) : (
              <Step n={1} title="Sign in" href="/auth/login" cta="Sign in">
                Sign in with the email address you applied with, so your progress is saved and your facilitator can
                follow along. Not applied yet? You can <Link href="/apply" className="underline">apply here</Link>.
              </Step>
            )}
            <Step n={2} title="Say hello to your group" href={chatHref} cta="Open the group chat">
              Introduce yourself in the group chat: who you are, where you live and what brought you to the course.
            </Step>
            <Step n={3} title="Start with Week 1" href={firstLessonHref} cta="Go to the first lesson">
              Begin with &ldquo;{firstLesson?.title ?? "Welcome & course overview"}&rdquo; and work through the week
              before your first session.
            </Step>
          </ol>
        </section>

        {/* The five weeks */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl" style={{ color: "var(--text-primary)" }}>The five weeks</h2>
          <ul className="divide-y rounded-xl border" style={{ borderColor: "var(--border)" }}>
            {weeks.map((w) => (
              <li key={w.slug} style={{ borderColor: "var(--border)" }}>
                <Link
                  href={w.lessons[0] ? `/materials/${w.slug}/${w.lessons[0].id}` : `/materials/${w.slug}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--bg-sidebar)]"
                >
                  <span className="text-[0.9375rem]" style={{ color: "var(--text-primary)" }}>{w.title}</span>
                  <span className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>{w.lessons.length} lessons</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Where to find everything */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl" style={{ color: "var(--text-primary)" }}>Where to find everything</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Place title="Materials">
              All lessons, quizzes and exercises, week by week. The menu on the left (or the week buttons on your
              phone) shows where you are and what you&apos;ve completed.
            </Place>
            <Place title="Discussion">
              Under every lesson you can ask questions and share thoughts with everyone in your cohort, including the
              facilitators.
            </Place>
            <Place title="Group chat">
              Your group&apos;s own space for introductions, practical questions and anything you want to continue
              after a session.
            </Place>
            <Place title="My account">
              Your profile, your progress per week, and your upcoming sessions with the meeting link and calendar
              buttons.
            </Place>
          </div>
        </section>

        {/* Questions, feedback, safety */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl" style={{ color: "var(--text-primary)" }}>Questions, feedback and safety</h2>
          <div className="prose-content space-y-3" style={{ color: "var(--text-secondary)" }}>
            <p>
              <strong>Questions or problems?</strong> Ask your facilitator first. For practical matters or anything
              your facilitator can&apos;t answer, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. All matters are
              handled confidentially.
            </p>
            <p>
              <strong>Feedback</strong> about the course or anything else is always welcome at{" "}
              <a href={`mailto:${FEEDBACK}`}>{FEEDBACK}</a>.
            </p>
            <p>
              <strong>Safety first.</strong> Our facilitators aim to create a warm and safe space where everyone feels
              comfortable sharing what&apos;s on their mind. If something makes you feel uncomfortable or unsafe, let
              your facilitator know as soon as possible. If it concerns your facilitator, contact us at{" "}
              <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 border-t pt-6" style={{ borderColor: "var(--border)", borderTopStyle: "dashed" }}>
          <Link href={firstLessonHref} className="btn-pill btn-pill-primary h-11 px-5 text-sm">
            Start Week 1 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </article>
    </main>
  );
}
