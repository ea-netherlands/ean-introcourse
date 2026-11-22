/**
 * POST /api/sessions/meet-link  { groupId, meetLink }
 * Sets the same meeting link on all upcoming sessions of a group (facilitator of that group or
 * role admin). Handy because sessions are created automatically without a link.
 */
import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db, ensureMigrated, fellowshipSessions } from "@/db";
import { canAccessGroup, getCurrentParticipant } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const me = await getCurrentParticipant().catch(() => null);
  if (!me || me.status !== "active" || (me.role !== "facilitator" && me.role !== "admin")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  if (!groupId || !(await canAccessGroup(me, groupId))) return NextResponse.json({ error: "Not your group" }, { status: 403 });
  const link = typeof body.meetLink === "string" ? body.meetLink.trim() : "";
  if (link && !/^https?:\/\//i.test(link)) return NextResponse.json({ error: "The link must start with https://" }, { status: 400 });
  const where = and(eq(fellowshipSessions.groupId, groupId), gt(fellowshipSessions.scheduledAt, new Date()));
  const rows = await db.select({ id: fellowshipSessions.id }).from(fellowshipSessions).where(where);
  await db.update(fellowshipSessions).set({ meetLink: link || null }).where(where);
  return NextResponse.json({ ok: true, updated: rows.length });
}
