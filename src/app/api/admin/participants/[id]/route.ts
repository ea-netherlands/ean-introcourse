/**
 * PATCH /api/admin/participants/[id] — update group assignment or status
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, participants, ensureMigrated } from "@/db";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if ("groupId" in body) update.groupId = body.groupId || null;
  if ("status" in body) update.status = body.status;
  if ("role" in body) update.role = body.role;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.update(participants).set(update).where(eq(participants.id, id));
  return NextResponse.json({ ok: true });
}
