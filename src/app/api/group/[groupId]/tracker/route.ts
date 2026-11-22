/**
 * PUT /api/group/[groupId]/tracker — update the facilitator tracker of a group.
 *   { kind: "attendance", participantId, week: 1-5, status: "present" | "partly" | "absent" | null }
 *   { kind: "checklist", itemKey: "<task>@<phase>", done: boolean }
 * Allowed: an active facilitator of this group, a participant with role admin, or the admin
 * (signed admin cookie, from /admin/tracker). Participants can't change it.
 */
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureMigrated, groups, participants } from "@/db";
import { getCurrentParticipant, canAccessGroup } from "@/lib/auth";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";
import { ALL_ITEM_KEYS, ATTENDANCE_STATUSES, WEEKS, setAttendance, setChecklistItem, type AttendanceStatus } from "@/lib/tracker";

interface Context { params: Promise<{ groupId: string }> }

async function editor(req: NextRequest, groupId: string): Promise<string | null> {
  const me = await getCurrentParticipant().catch(() => null);
  if (me && me.status === "active" && (me.role === "admin" || (me.role === "facilitator" && (await canAccessGroup(me, groupId))))) {
    return me.id;
  }
  if (await verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_PASSWORD)) return "admin";
  return null;
}

export async function PUT(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { groupId } = await params;
  const by = await editor(req, groupId);
  if (!by) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const [group] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  if (body.kind === "attendance") {
    const week = Number(body.week);
    const status = body.status === null ? null : (body.status as AttendanceStatus);
    if (!WEEKS.includes(week as (typeof WEEKS)[number])) return NextResponse.json({ error: "Invalid week" }, { status: 400 });
    if (status !== null && !ATTENDANCE_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (typeof body.participantId !== "string") return NextResponse.json({ error: "participantId required" }, { status: 400 });
    const [member] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(and(eq(participants.id, body.participantId), eq(participants.groupId, groupId)))
      .limit(1);
    if (!member) return NextResponse.json({ error: "Not a member of this group" }, { status: 400 });
    await setAttendance(groupId, member.id, week, status, by);
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "checklist") {
    if (typeof body.itemKey !== "string" || !ALL_ITEM_KEYS.has(body.itemKey)) {
      return NextResponse.json({ error: "Unknown checklist item" }, { status: 400 });
    }
    await setChecklistItem(groupId, body.itemKey, Boolean(body.done), by);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
}
