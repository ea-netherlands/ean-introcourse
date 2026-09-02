/**
 * GET /api/dev/latest-email — DEV ONLY
 * Returns the URL extracted from the most recent email_log entry.
 */
import { NextResponse } from "next/server";
import { db, emailLog, ensureMigrated } from "@/db";
import { desc } from "drizzle-orm";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  await ensureMigrated();
  const [latest] = await db.select().from(emailLog).orderBy(desc(emailLog.sentAt)).limit(1);
  if (!latest) return NextResponse.json({ error: "No emails" }, { status: 404 });
  const links = [...latest.body.matchAll(/href="(http[^"]+)"/g)].map((m) => m[1]);
  return NextResponse.json({ to: latest.toEmail, subject: latest.subject, links });
}
