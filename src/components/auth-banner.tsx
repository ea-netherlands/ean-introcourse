"use client";

/**
 * AuthBanner — shown at the top of the materials area when the user is not
 * signed in. Explains that progress is saved once they log in.
 */

import Link from "next/link";

interface Props {
  /** When true, the banner is hidden (user is signed in). */
  hidden?: boolean;
}

export function AuthBanner({ hidden }: Props) {
  if (hidden) return null;

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
      style={{
        background: "rgba(22,135,156,0.08)",
        borderBottom: "1px solid rgba(22,135,156,0.2)",
      }}
    >
      <span style={{ color: "var(--text-secondary)" }}>
        Sign in to save your progress and let facilitators follow along.
      </span>
      <Link
        href="/auth/login"
        className="shrink-0 rounded-lg bg-ea-teal px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
      >
        Sign in
      </Link>
    </div>
  );
}

/**
 * UserChip — shown in the sidebar footer when the user IS signed in.
 * Displays their name and a sign-out button.
 */
export function UserChip({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shrink-0"
          style={{ background: "var(--color-ea-teal)" }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span
          className="text-xs truncate font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {name}
        </span>
      </div>
      <form action="/auth/logout" method="POST">
        <button
          type="submit"
          className="text-xs hover:opacity-70 transition shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
