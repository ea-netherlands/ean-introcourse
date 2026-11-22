// Absolute URL helper — reads APP_URL in production, falls back to localhost.

export function appUrl(path: string = ""): string {
  const base =
    process.env.APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}${path}`;
}

/**
 * A safe "return to" path after signing in (from ?next=): only paths on this site,
 * never another host ("//evil.example", "/\evil", "https://…") or the auth pages themselves.
 */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (next.startsWith("/auth/") || next.length > 300) return null;
  return next;
}
