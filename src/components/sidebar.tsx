"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./theme-toggle";
import { UserChip } from "./auth-banner";
import type { SidebarWeek } from "@/lib/lessons";

const TYPE_ICON: Record<string, string> = {
  objectives: "🎯",
  quiz: "❓",
  exercise: "✏️",
  reading: "📖",
  wrap: "✅",
  appendix: "📎",
};

interface SidebarProps {
  weeks: SidebarWeek[];
  participant?: { name: string; groupId?: string | null; role?: string } | null;
}

export function Sidebar({ weeks, participant }: SidebarProps) {
  const pathname = usePathname();

  // Determine the active week slug from the URL
  const activeWeekSlug = weeks.find((w) =>
    pathname.startsWith(`/materials/${w.slug}`)
  )?.slug ?? null;

  // Track which weeks are open (default: active week is open)
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(
    () => new Set(activeWeekSlug ? [activeWeekSlug] : [weeks[0]?.slug])
  );

  // Open active week automatically when navigating
  useEffect(() => {
    if (activeWeekSlug) {
      setOpenWeeks((prev) => new Set([...prev, activeWeekSlug]));
    }
  }, [activeWeekSlug]);

  // Track completed lessons from localStorage
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const load = () => {
      try {
        const ids = new Set<string>();
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("lesson_progress_")) {
            const val = parseInt(localStorage.getItem(key) ?? "0", 10);
            if (val >= 100) ids.add(key.replace("lesson_progress_", ""));
          }
        }
        setCompletedIds(ids);
      } catch {}
    };
    load();
    // Re-read when storage changes (e.g. quiz submitted in this tab)
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [pathname]); // refresh on navigation so newly-completed lessons update

  const toggleWeek = (slug: string) => {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  return (
    <aside className="sidebar hidden lg:flex w-72 shrink-0 flex-col">
      {/* Header */}
      <div
        className="flex h-16 items-center justify-between px-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-ea-teal text-xl font-bold">◆</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Fellowship
          </span>
        </Link>
        <ThemeToggle />
      </div>

      {/* User name bar — shown at top when logged in */}
      {participant && (
        <div
          className="px-4 py-2.5 flex items-center gap-2.5"
          style={{ background: "rgba(22,135,156,0.07)", borderBottom: "1px solid var(--border)" }}
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "var(--color-ea-teal)" }}
          >
            {participant.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {participant.name}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Account / Group quick links */}
        {participant && (
          <div className="mb-4 space-y-0.5">
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                background: pathname === "/account" ? "rgba(22,135,156,0.1)" : "transparent",
                color: pathname === "/account" ? "var(--color-ea-teal)" : "var(--text-secondary)",
              }}
            >
              <span>My account</span>
            </Link>
            {participant.groupId ? (
              <Link
                href={`/group/${participant.groupId}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  background: pathname === `/group/${participant.groupId}` ? "rgba(22,135,156,0.1)" : "transparent",
                  color: pathname === `/group/${participant.groupId}` ? "var(--color-ea-teal)" : "var(--text-secondary)",
                }}
              >
                <span>Group chat</span>
              </Link>
            ) : (
              <Link
                href="/chat"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  background: pathname.startsWith("/chat") ? "rgba(22,135,156,0.1)" : "transparent",
                  color: pathname.startsWith("/chat") ? "var(--color-ea-teal)" : "var(--text-secondary)",
                }}
              >
                <span>Chat</span>
              </Link>
            )}
            {(participant.role === "facilitator" || participant.role === "admin") && (
              <Link
                href="/sessions"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  background: pathname.startsWith("/sessions") ? "rgba(22,135,156,0.1)" : "transparent",
                  color: pathname.startsWith("/sessions") ? "var(--color-ea-teal)" : "var(--text-secondary)",
                }}
              >
                <span>Sessions</span>
              </Link>
            )}
            {(participant.role === "facilitator" || participant.role === "admin") && participant.groupId && (
              <Link
                href={`/group/${participant.groupId}/overview`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  background: pathname.endsWith("/overview") ? "rgba(22,135,156,0.1)" : "transparent",
                  color: pathname.endsWith("/overview") ? "var(--color-ea-teal)" : "var(--text-secondary)",
                }}
              >
                <span>Group overview</span>
              </Link>
            )}
          </div>
        )}

        <p
          className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Materials
        </p>

        <div className="space-y-0.5">
          {weeks.map((week) => {
            const isOpen = openWeeks.has(week.slug);
            const isActiveWeek = activeWeekSlug === week.slug;

            return (
              <div key={week.slug}>
                {/* Week header button */}
                <button
                  onClick={() => toggleWeek(week.slug)}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left"
                  style={{
                    background: isActiveWeek
                      ? "rgba(22,135,156,0.1)"
                      : "transparent",
                    color: isActiveWeek
                      ? "var(--color-ea-teal)"
                      : "var(--text-secondary)",
                  }}
                >
                  {/* Number circle */}
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{
                      background: isActiveWeek
                        ? "var(--color-ea-teal)"
                        : "var(--bg-card)",
                      color: isActiveWeek ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {week.weekNumber}
                  </span>
                  <span className="flex-1 truncate">{week.shortTitle}</span>
                  {/* Chevron */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      opacity: 0.6,
                    }}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {/* Lesson list (collapsible) */}
                {isOpen && (
                  <div className="ml-3 mt-0.5 mb-1 pl-5 space-y-0.5"
                    style={{ borderLeft: "1px solid var(--border)" }}
                  >
                    {week.lessons.map((lesson) => {
                      const href = `/materials/${week.slug}/${lesson.id}`;
                      const isActive = pathname === href;
                      const isDone = completedIds.has(lesson.id);

                      return (
                        <Link
                          key={lesson.id}
                          href={href}
                          className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors leading-snug"
                          style={{
                            background: isActive
                              ? "rgba(22,135,156,0.12)"
                              : isDone
                              ? "rgba(34,197,94,0.07)"
                              : "transparent",
                            color: isActive
                              ? "var(--color-ea-teal)"
                              : isDone
                              ? "#16a34a"
                              : "var(--text-muted)",
                            fontWeight: isActive || isDone ? 500 : 400,
                          }}
                        >
                          {/* Number or checkmark */}
                          <span
                            className="shrink-0 mt-0.5 text-[10px] w-5 text-center"
                            style={{ color: isDone && !isActive ? "#16a34a" : "inherit" }}
                          >
                            {isDone ? "✓" : lesson.lessonNumber}
                          </span>
                          <span className="flex-1">{lesson.title}</span>
                          <span className="shrink-0 text-[10px]">
                            {TYPE_ICON[lesson.type] ?? ""}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {participant ? (
          <UserChip name={participant.name} />
        ) : (
          <Link
            href="/auth/login"
            className="text-xs hover:opacity-80 transition"
            style={{ color: "var(--text-muted)" }}
          >
            Sign in →
          </Link>
        )}
      </div>
    </aside>
  );
}

/* ── Mobile top bar ─────────────────────────────────────────── */
export function MobileBar({ weeks }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className="lg:hidden flex h-14 items-center px-4 gap-3"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-sidebar)" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <span className="text-ea-teal text-lg font-bold">◆</span>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Fellowship
        </span>
      </Link>
      <div className="ml-auto flex items-center gap-1 overflow-x-auto">
        {weeks.map((week) => {
          const isActive = pathname.startsWith(`/materials/${week.slug}`);
          return (
            <Link
              key={week.slug}
              href={`/materials/${week.slug}`}
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                background: isActive ? "rgba(22,135,156,0.12)" : "transparent",
                color: isActive ? "var(--color-ea-teal)" : "var(--text-muted)",
              }}
            >
              W{week.weekNumber}
            </Link>
          );
        })}
        <ThemeToggle />
      </div>
    </div>
  );
}
