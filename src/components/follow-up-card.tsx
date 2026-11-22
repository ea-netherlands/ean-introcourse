/**
 * Invitation to the follow-up form for participants who finished the Intro Course
 * (EAN Fellowship sign-up, a Typeform run by the programme team). Shown on /graduated,
 * on /account once someone is done, and under the final lesson.
 */
export const FOLLOW_UP_FORM_URL = "https://d5a0gq2daer.typeform.com/EANfellowship";

export function FollowUpCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card-ean p-5 sm:p-6 text-left ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Finished the Intro Course?</p>
      <h2 className="mt-1 font-serif text-xl" style={{ color: "var(--text-primary)" }}>
        Take the next step
      </h2>
      <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
        Fill in the short follow-up form to tell us how it went and whether you would like to
        continue with the EA Netherlands Fellowship.
      </p>
      <a
        href={FOLLOW_UP_FORM_URL}
        target="_blank"
        rel="noreferrer"
        className="btn-pill btn-pill-primary mt-4 inline-flex w-full items-center justify-center px-5 py-2.5 text-sm font-semibold sm:w-auto"
      >
        Fill in the follow-up form ↗
      </a>
    </div>
  );
}
