"use client";

/**
 * Site header in the style of effectiefaltruisme.nl: white, sticky, EAN logo on the
 * left, then the course navigation, theme toggle and a pill button on the right.
 * Used on every participant/facilitator page and on the public pages.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";

export interface HeaderUser {
  name: string;
  role: "participant" | "facilitator" | "admin";
  groupId: string | null;
}

function navItems(user: HeaderUser | null) {
  if (!user) return [{ href: "/materials", label: "Materials" }];
  const items = [
    { href: "/materials", label: "Materials" },
    { href: "/account", label: "My account" },
  ];
  // One chat for everyone (/chat), opened on your group's channel when you have one.
  if (user.groupId) items.push({ href: "/chat?channel=group", label: "Group chat" });
  else items.push({ href: "/chat", label: "Chat" });
  if (user.role === "facilitator" || user.role === "admin") {
    items.push({ href: "/sessions", label: "Sessions" });
    if (user.groupId) items.push({ href: `/group/${user.groupId}/overview`, label: "Overview" });
    items.push({ href: "/facilitator-guide", label: "Guide" });
  }
  return items;
}

function isActive(pathname: string, href: string) {
  href = href.split("?")[0];
  if (href === "/materials") return pathname.startsWith("/materials");
  if (href.endsWith("/overview")) return pathname.endsWith("/overview");
  if (href.startsWith("/group/")) return pathname === href;
  return pathname.startsWith(href);
}

export function SiteHeader({ user, fullWidth = false }: { user: HeaderUser | null; fullWidth?: boolean }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const items = navItems(user);

  // EAN navbar items: 36px tall, 8px radius, 14px/500, stone-600; hover stone-900 on
  // stone-50; active teal-700 on teal-50 (ean-website header-menu/pillar-menu.tsx).
  const linkClass = (href: string) =>
    `inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
      isActive(pathname, href) ? "nav-item-active" : "nav-item"
    }`;

  return (
    <header
      className="sticky top-0 z-30"
      style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--header-border)" }}
    >
      <div className={`mx-auto flex h-[68px] items-center gap-2 px-4 md:px-6 lg:px-8 ${fullWidth ? "" : "max-w-[64rem]"}`}>
        <Link href="/materials" className="flex shrink-0 items-center gap-3" aria-label="Intro Course home">
          {/* Light/dark logos: the white one on dark backgrounds. */}
          <img src="/images/logos/ean-logo.svg" alt="Effectief Altruïsme Nederland" className="logo-light h-8 w-auto" />
          <img src="/images/logos/ean-logo-white.svg" alt="" aria-hidden="true" className="logo-dark h-8 w-auto" />
          <span
            className="hidden border-l pl-3 font-serif text-base font-medium sm:inline"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            Intro Course
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className={linkClass(it.href)}>
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <form action="/auth/logout" method="POST" className="hidden sm:block">
              <button type="submit" className="btn-pill btn-pill-secondary h-9 px-3.5 text-sm">
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/auth/login" className="btn-pill btn-pill-primary h-9 px-3.5 text-sm">
              Sign in
            </Link>
          )}
          {user && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="rounded-lg p-2 lg:hidden"
              aria-expanded={open}
              aria-label="Menu"
              style={{ color: "var(--text-primary)" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {user && open && (
        <nav
          className="flex flex-col gap-0.5 px-4 pb-3 pt-2 lg:hidden"
          style={{ borderTop: "1px dashed var(--rule)" }}
        >
          {items.map((it) => (
            <Link key={it.href} href={it.href} className={linkClass(it.href)} onClick={() => setOpen(false)}>
              {it.label}
            </Link>
          ))}
          <form action="/auth/logout" method="POST">
            <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium">
              Sign out
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
