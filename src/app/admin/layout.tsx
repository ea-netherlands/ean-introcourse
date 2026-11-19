import Link from "next/link";

/**
 * Admin layout — shared shell for all /admin/* pages (guarded by src/middleware.ts).
 * Same EAN logo and warm-grey palette as the rest of the site, but kept plain.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-3">
            <img src="/images/logos/ean-logo.svg" alt="Effectief Altruïsme Nederland" className="h-9 w-auto" />
            <span className="border-l border-slate-200 pl-3 font-serif text-base font-semibold text-slate-800">Admin</span>
          </Link>
          <nav className="flex items-center gap-1 flex-wrap">
            {[
              { href: "/admin/participants", label: "Participants" },
              { href: "/admin/groups", label: "Groups" },
              { href: "/admin/slots", label: "Slots" },
              { href: "/admin/applications", label: "Applications" },
              { href: "/admin/form-groups", label: "Form Groups" },
              { href: "/admin/facilitators", label: "Facilitators" },
              { href: "/admin/sessions", label: "Sessions" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-slate-500 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex-1" />
          <Link
            href="/materials"
            className="text-xs text-slate-400 hover:text-teal-600 transition-colors"
          >
            ← View materials
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  );
}
