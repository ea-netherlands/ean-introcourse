import Link from "next/link";
import Image from "next/image";

/**
 * Admin layout — shared shell for all /admin/* pages.
 * Stage 1: no authentication guard (add in Stage 2 once magic links are wired).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/ean-logo-mark.svg" alt="EAN" width={24} height={24} />
            <span className="font-serif text-slate-700 text-sm">Admin</span>
          </Link>
          <nav className="flex items-center gap-1 flex-wrap">
            {[
              { href: "/admin/participants", label: "Participants" },
              { href: "/admin/groups", label: "Groups" },
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
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  );
}
