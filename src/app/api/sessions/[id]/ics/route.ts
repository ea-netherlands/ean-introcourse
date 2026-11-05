/**
 * GET /api/sessions/[id]/ics — download ICS file for a session (Apple Calendar compatible)
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureMigrated, fellowshipSessions } from "@/db";
import { buildIcsContent, SESSION_DURATION_MINUTES } from "@/lib/calendar";

interface Context { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Context) {
  const { id } = await params;
  await ensureMigrated();

  const [session] = await db
    .select()
    .from(fellowshipSessions)
    .where(eq(fellowshipSessions.id, id))
    .limit(1);

  if (!session) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ics = buildIcsContent(
    {
      title: session.title,
      startAt: session.scheduledAt,
      durationMinutes: SESSION_DURATION_MINUTES,
      location: session.meetLink ?? undefined,
      description: session.agenda ?? undefined,
    },
    id
  );

  const slug = session.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
