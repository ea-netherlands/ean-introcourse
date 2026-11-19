/**
 * PATCH  /api/admin/groups/[id] — update group timing, name, cohort, or active status.
 * When active is set to false, all participants in the group are marked as "completed" (graduated).
 * DELETE /api/admin/groups/[id] — permanently remove an empty group.
 */
import { NextRequest, NextResponse } from "next/server";
import { eq, count } from "drizzle-orm";
import { db, groups, participants, fellowshipSessions, ensureMigrated } from "@/db";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if ("name" in body && body.name?.trim()) update.name = body.name.trim();
  if ("cohort" in body) update.cohort = body.cohort || null;
  if ("timing" in body) update.timing = body.timing || null;
  // Slot booking settings (see src/lib/slots.ts)
  if ("dates" in body) {
    const dates = Array.isArray(body.dates) ? body.dates.filter((d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
    update.dates = dates.length ? [...dates].sort() : null;
  }
  if ("facilitatorId" in body) update.facilitatorId = body.facilitatorId || null;
  if ("language" in body) update.language = ["nl", "en", "both"].includes(body.language) ? body.language : null;
  if ("format" in body) update.format = ["online", "hybrid", "in_person"].includes(body.format) ? body.format : null;
  if ("location" in body) update.location = typeof body.location === "string" && body.location.trim() ? body.location.trim() : null;
  if ("capacity" in body) {
    const n = Number(body.capacity);
    update.capacity = body.capacity === null || body.capacity === "" || !Number.isFinite(n) ? null : Math.max(0, Math.floor(n));
  }
  if ("bookable" in body) update.bookable = Boolean(body.bookable);
  if ("active" in body) {
    update.active = Boolean(body.active);
    // Deactivating a group graduates all its participants
    if (body.active === false) {
      await db
        .update(participants)
        .set({ status: "completed" })
        .where(eq(participants.groupId, id));
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.update(groups).set(update).where(eq(groups.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { id } = await params;

  const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(participants)
    .where(eq(participants.groupId, id));

  if (memberCount > 0) {
    return NextResponse.json(
      { error: `Move or remove this group's ${memberCount} participant(s) before deleting it.` },
      { status: 409 }
    );
  }

  // Sessions aren't deleted, just detached (fellowshipSessions.groupId has no cascade).
  await db.update(fellowshipSessions).set({ groupId: null }).where(eq(fellowshipSessions.groupId, id));

  await db.delete(groups).where(eq(groups.id, id));
  return NextResponse.json({ ok: true });
}
