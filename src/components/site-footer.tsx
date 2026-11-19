/**
 * Footer in the style of effectiefaltruisme.nl: dark teal (ea_teal 800), white logo,
 * light-teal links. Kept short: the course only needs contact and a way back to EAN.
 */
import Link from "next/link";

const CONTACT = "programmes@effectiefaltruisme.nl";

const linkClass = "hover:text-white hover:underline";

export function SiteFooter() {
  return (
    <footer style={{ background: "var(--footer-bg)", color: "var(--footer-text)" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
        <div className="space-y-3">
          <img src="/images/logos/ean-logo-white.svg" alt="Effectief Altruïsme Nederland" className="h-11 w-auto" />
          <p className="max-w-xs text-sm">
            The EA Netherlands Intro Course: five weeks on how to do the most good with your time and money.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Course</p>
          <ul className="space-y-1.5">
            <li><Link href="/materials" className={linkClass}>Materials</Link></li>
            <li><Link href="/apply" className={linkClass}>Apply</Link></li>
            <li><Link href="/auth/login" className={linkClass}>Sign in</Link></li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">EA Netherlands</p>
          <ul className="space-y-1.5">
            <li><a href="https://effectiefaltruisme.nl/en" className={linkClass}>effectiefaltruisme.nl</a></li>
            <li><a href="https://effectiefaltruisme.nl/privacy" className={linkClass}>Privacy</a></li>
            <li><a href={`mailto:${CONTACT}`} className={linkClass}>{CONTACT}</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-6 text-xs sm:px-6" style={{ opacity: 0.8 }}>
        © {new Date().getFullYear()} Effectief Altruïsme Nederland
      </div>
    </footer>
  );
}
