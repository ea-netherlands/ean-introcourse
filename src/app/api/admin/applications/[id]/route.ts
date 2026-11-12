/**
 * DELETE /api/admin/applications/[id] — permanently remove an application record.
 * Does not touch any participant created from an accepted application —
 * delete that separately via /api/admin/participants/[id] if needed.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureMigrated, applications } from "@/db";
import { eq } from "drizzle-orm";

interface Ctx { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  await ensureMigrated();
  const { id } = await params;

  const [existing] = await db.select({ id: applications.id }).from(applications).where(eq(applications.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(applications).where(eq(applications.id, id));
  return NextResponse.json({ ok: true });
}
