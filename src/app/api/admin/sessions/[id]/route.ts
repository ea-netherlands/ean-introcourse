/**
 * PATCH  /api/admin/sessions/[id] — update session fields
 * DELETE /api/admin/sessions/[id] — delete session
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureMigrated, fellowshipSessions, sessionAttendance } from "@/db";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if ("title" in body)        update.title        = body.title;
  if ("scheduledAt" in body)  update.scheduledAt  = new Date(body.scheduledAt as string);
  if ("meetLink" in body)     update.meetLink     = body.meetLink || null;
  if ("agenda" in body)       update.agenda       = body.agenda   || null;
  if ("groupId" in body)      update.groupId      = body.groupId  || null;
  if ("facilitatorId" in body) update.facilitatorId = body.facilitatorId || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.update(fellowshipSessions).set(update).where(eq(fellowshipSessions.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { id } = await params;
  // Delete attendance rows first (FK constraint)
  await db.delete(sessionAttendance).where(eq(sessionAttendance.sessionId, id));
  await db.delete(fellowshipSessions).where(eq(fellowshipSessions.id, id));
  return NextResponse.json({ ok: true });
}
