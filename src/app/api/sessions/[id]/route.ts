/**
 * PATCH /api/sessions/[id]  { meetLink?, agenda?, scheduledAt? }
 * For the facilitator of the session's group (or role admin): add the meeting link or move a
 * session. Moving sets time_locked, so the automatic sync (src/lib/session-sync.ts) keeps it.
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureMigrated, fellowshipSessions } from "@/db";
import { canAccessGroup, getCurrentParticipant } from "@/lib/auth";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { id } = await params;
  const me = await getCurrentParticipant().catch(() => null);
  if (!me || me.status !== "active" || (me.role !== "facilitator" && me.role !== "admin")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const [s] = await db.select().from(fellowshipSessions).where(eq(fellowshipSessions.id, id)).limit(1);
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (me.role !== "admin" && !(s.groupId && (await canAccessGroup(me, s.groupId)))) {
    return NextResponse.json({ error: "Not your group" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Partial<typeof fellowshipSessions.$inferInsert> = {};
  if ("meetLink" in body) {
    const link = typeof body.meetLink === "string" ? body.meetLink.trim() : "";
    if (link && !/^https?:\/\//i.test(link)) return NextResponse.json({ error: "The link must start with https://" }, { status: 400 });
    update.meetLink = link || null;
  }
  if ("agenda" in body) update.agenda = typeof body.agenda === "string" && body.agenda.trim() ? body.agenda.trim() : null;
  if ("scheduledAt" in body) {
    const when = new Date(String(body.scheduledAt));
    if (Number.isNaN(when.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    update.scheduledAt = when;
    update.timeLocked = true;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await db.update(fellowshipSessions).set(update).where(eq(fellowshipSessions.id, id));
  return NextResponse.json({ ok: true });
}
