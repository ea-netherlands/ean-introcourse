/**
 * PATCH /api/admin/sessions/[id]/attendance — mark attended for a participant
 * Body: { participantId: string, attended: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureMigrated, sessionAttendance } from "@/db";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { id: sessionId } = await params;
  const body = await req.json().catch(() => ({}));
  const { participantId, attended } = body as { participantId?: string; attended?: boolean };

  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }

  // Upsert attendance row
  await db
    .insert(sessionAttendance)
    .values({ sessionId, participantId, attended: attended ?? null })
    .onConflictDoUpdate({
      target: [sessionAttendance.sessionId, sessionAttendance.participantId],
      set: { attended: attended ?? null },
    });

  return NextResponse.json({ ok: true });
}
