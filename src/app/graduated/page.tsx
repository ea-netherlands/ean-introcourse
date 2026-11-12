import Link from "next/link";
import { getCurrentParticipant } from "@/lib/auth";

export default async function GraduatedPage() {
  const participant = await getCurrentParticipant().catch(() => null);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg-page)" }}
    >
      <div
        className="max-w-lg w-full rounded-2xl border p-10 text-center"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        {/* Graduation cap */}
        <div className="text-6xl mb-5">🎓</div>

        <h1
          className="text-2xl font-semibold mb-2"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading, inherit)" }}
        >
          {participant ? `Congratulations, ${participant.name.split(" ")[0]}!` : "Congratulations!"}
        </h1>

        <p className="text-base mb-6" style={{ color: "var(--text-muted)" }}>
          You have completed the EA Netherlands Intro Fellowship.
          Your group has graduated — we hope the programme was valuable and that
          you continue exploring effective ways to do good.
        </p>

        <div
          className="rounded-xl border p-5 mb-6 text-left"
          style={{ background: "var(--bg-page)", borderColor: "var(--border)" }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            What&apos;s next?
          </p>
          <ul className="space-y-1.5">
            {[
              "Stay in touch with your group members",
              "Join the EA Netherlands community events",
              "Explore the EA Forum for ongoing discussion",
              "Consider giving effectively or pursuing high-impact career paths",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <span className="text-teal-500 mt-0.5 shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://effectiefaltruisme.nl"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition"
            style={{ background: "var(--color-ea-teal, #0d9488)" }}
          >
            EA Netherlands website
          </a>
          <Link
            href="https://forum.effectivealtruism.org"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border px-5 py-2.5 text-sm font-medium transition"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            EA Forum →
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
        You can still read the{" "}
        <Link href="/materials" className="underline hover:text-teal-600 transition">
          programme materials
        </Link>{" "}
        any time.
      </p>
    </div>
  );
}
