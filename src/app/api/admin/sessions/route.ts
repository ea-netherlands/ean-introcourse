/**
 * GET  /api/admin/sessions      — list all fellowship sessions
 * POST /api/admin/sessions      — create a new session
 */
import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import {
  db,
  ensureMigrated,
  fellowshipSessions,
  groups,
  participants,
  sessionAttendance,
} from "@/db";
import { newId } from "@/lib/ids";
import { createHash } from "node:crypto";
import { getCurrentParticipant } from "@/lib/auth";

/** Admin cookie check, mirroring src/middleware.ts. */
function isAdminRequest(req: NextRequest): boolean {
  const cookie = req.cookies.get("ean_admin_auth")?.value;
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw || !cookie) return false;
  return cookie === createHash("sha256").update(adminPw).digest("hex");
}

export async function GET() {
  await ensureMigrated();
  const sessions = await db
    .select({
      id: fellowshipSessions.id,
      title: fellowshipSessions.title,
      scheduledAt: fellowshipSessions.scheduledAt,
      meetLink: fellowshipSessions.meetLink,
      agenda: fellowshipSessions.agenda,
      groupId: fellowshipSessions.groupId,
      groupName: groups.name,
      facilitatorId: fellowshipSessions.facilitatorId,
      facilitatorName: participants.name,
      createdAt: fellowshipSessions.createdAt,
    })
    .from(fellowshipSessions)
    .leftJoin(groups, eq(groups.id, fellowshipSessions.groupId))
    .leftJoin(participants, eq(participants.id, fellowshipSessions.facilitatorId))
    .orderBy(desc(fellowshipSessions.scheduledAt));

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  await ensureMigrated();

  // Only admins and active facilitators may create sessions.
  const admin = isAdminRequest(req);
  const me = admin ? null : await getCurrentParticipant().catch(() => null);
  if (!admin && !(me && me.role === "facilitator" && me.status === "active")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const { title, groupId, scheduledAt, meetLink, agenda } = body as {
    title?: string;
    groupId?: string;
    facilitatorId?: string;
    scheduledAt?: string;
    meetLink?: string;
    agenda?: string;
  };
  // Facilitators can only create sessions under their own name.
  const facilitatorId = admin
    ? (body as { facilitatorId?: string }).facilitatorId
    : me!.id;

  if (!title?.trim() || !scheduledAt) {
    return NextResponse.json({ error: "title and scheduledAt are required" }, { status: 400 });
  }

  const id = newId("fs");
  await db.insert(fellowshipSessions).values({
    id,
    title: title.trim(),
    groupId: groupId || null,
    facilitatorId: facilitatorId || null,
    scheduledAt: new Date(scheduledAt),
    meetLink: meetLink?.trim() || null,
    agenda: agenda?.trim() || null,
  });

  // Auto-create attendance rows for all group members
  if (groupId) {
    const members = await db
      .select({ id: participants.id })
      .from(participants)
      .where(eq(participants.groupId, groupId));

    if (members.length > 0) {
      await db.insert(sessionAttendance).values(
        members.map((m) => ({ sessionId: id, participantId: m.id }))
      );
    }
  }

  return NextResponse.json({ ok: true, id });
}
