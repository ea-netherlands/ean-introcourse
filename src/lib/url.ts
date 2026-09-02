// Absolute URL helper — reads APP_URL in production, falls back to localhost.

export function appUrl(path: string = ""): string {
  const base =
    process.env.APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}${path}`;
}
