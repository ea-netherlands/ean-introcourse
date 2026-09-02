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
  const body = await req.json().catch(() => ({}));

  const { title, groupId, facilitatorId, scheduledAt, meetLink, agenda } = body as {
    title?: string;
    groupId?: string;
    facilitatorId?: string;
    scheduledAt?: string;
    meetLink?: string;
    agenda?: string;
  };

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
