/**
 * PATCH  /api/admin/participants/[id] — update group assignment or status
 * DELETE /api/admin/participants/[id] — permanently remove a participant/facilitator
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { syncGroupSessions } from "@/lib/session-sync";
import {
  db,
  participants,
  ensureMigrated,
  sessionAttendance,
  groupPosts,
  groupPostReplies,
  fellowshipSessions,
} from "@/db";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if ("groupId" in body) update.groupId = body.groupId || null;
  if ("status" in body) {
    if (!["pending", "active", "completed"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if ("role" in body) {
    if (!["participant", "facilitator", "admin"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    update.role = body.role;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [existing] = await db.select({ id: participants.id }).from(participants).where(eq(participants.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.update(participants).set(update).where(eq(participants.id, id));
  // Moved into a group: add them to its upcoming sessions (reminders).
  if (typeof update.groupId === "string") await syncGroupSessions(update.groupId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { id } = await params;

  const [existing] = await db.select({ id: participants.id }).from(participants).where(eq(participants.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // lessonProgress, lessonResponses, loginTokens, httpSessions and
  // onboardingTokens cascade automatically (onDelete: "cascade" in schema).
  // These don't, so clean them up explicitly first to avoid FK violations.
  await db.delete(sessionAttendance).where(eq(sessionAttendance.participantId, id));
  await db.delete(groupPostReplies).where(eq(groupPostReplies.authorId, id));
  await db.delete(groupPosts).where(eq(groupPosts.authorId, id));
  await db
    .update(fellowshipSessions)
    .set({ facilitatorId: null })
    .where(eq(fellowshipSessions.facilitatorId, id));

  await db.delete(participants).where(eq(participants.id, id));
  return NextResponse.json({ ok: true });
}
