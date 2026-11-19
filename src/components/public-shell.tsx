/**
 * Page frame for public pages (login, apply, onboarding, facilitator sign-up,
 * graduated): the EAN site header on top and the dark-teal footer below.
 */
import type { ReactNode } from "react";
import { SiteHeader, type HeaderUser } from "./site-header";
import { SiteFooter } from "./site-footer";

export function PublicShell({ children, user = null }: { children: ReactNode; user?: HeaderUser | null }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg-page)" }}>
      <SiteHeader user={user} />
      <main className="graph-paper flex-1">
        <div className="page-column">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
