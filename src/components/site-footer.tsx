/**
 * Footer in the style of effectiefaltruisme.nl (ean-website footer-content.tsx):
 * teal-800 background, white logo, Sentient column headings in white, 14px links
 * in teal-100, a teal-700 rule above the bottom bar.
 */
import Link from "next/link";

const CONTACT = "programmes@effectiefaltruisme.nl";

const linkClass = "text-[#dbf5fa] hover:text-white hover:underline";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="font-serif text-base font-medium text-white">{title}</p>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer style={{ background: "var(--footer-bg)" }}>
      <div className="mx-auto max-w-[64rem] px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="col-span-2 space-y-4 lg:col-span-1">
            <img
              src="/images/logos/ean-logo-white.svg"
              alt="Effectief Altruïsme Nederland"
              className="h-10 w-auto md:h-12"
            />
            <p className="max-w-[30ch] text-sm text-[#aae8f3]">
              The EA Netherlands Intro Course: five weeks on how to do the most good with your time and money.
            </p>
          </div>
          <Column title="Course">
            <li><Link href="/materials" className={linkClass}>Materials</Link></li>
            <li><Link href="/apply" className={linkClass}>Apply</Link></li>
            <li><Link href="/auth/login" className={linkClass}>Sign in</Link></li>
          </Column>
          <Column title="EA Netherlands">
            <li><a href="https://effectiefaltruisme.nl/en" className={linkClass}>effectiefaltruisme.nl</a></li>
            <li><a href="https://effectiefaltruisme.nl/legal/privacy-policy" className={linkClass}>Privacy</a></li>
            <li><a href={`mailto:${CONTACT}`} className={`${linkClass} break-all`}>{CONTACT}</a></li>
          </Column>
        </div>
        <div className="mt-10 border-t border-[#106574] pt-5 text-xs text-[#aae8f3]">
          © {new Date().getFullYear()} Effectief Altruïsme Nederland
        </div>
      </div>
    </footer>
  );
}
