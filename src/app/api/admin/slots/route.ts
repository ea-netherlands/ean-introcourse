/**
 * GET /api/admin/slots — every group (active and closed) with its slot settings, bookings and
 * member count,
 * plus the active facilitators to choose from. Admin only (middleware).
 * Slot settings are saved with PATCH /api/admin/groups/[id].
 */
import { NextResponse } from "next/server";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { db, ensureMigrated, participants } from "@/db";
import { listSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureMigrated();
  const [slots, facilitators, members] = await Promise.all([
    listSlots({ bookableOnly: false, includeClosed: true }),
    db
      .select({ id: participants.id, name: participants.name })
      .from(participants)
      .where(and(eq(participants.role, "facilitator"), eq(participants.status, "active")))
      .orderBy(participants.name),
    db
      .select({ groupId: participants.groupId, n: count() })
      .from(participants)
      .where(isNotNull(participants.groupId))
      .groupBy(participants.groupId),
  ]);
  const memberCount = new Map(members.map((m) => [m.groupId, Number(m.n)]));
  return NextResponse.json({
    slots: slots.map((s) => ({ ...s, memberCount: memberCount.get(s.id) ?? 0 })),
    facilitators,
  });
}
