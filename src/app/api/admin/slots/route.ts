/**
 * GET /api/admin/slots — every active group with its slot settings and bookings,
 * plus the active facilitators to choose from. Admin only (middleware).
 * Slot settings are saved with PATCH /api/admin/groups/[id].
 */
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureMigrated, participants } from "@/db";
import { listSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureMigrated();
  const [slots, facilitators] = await Promise.all([
    listSlots({ bookableOnly: false }),
    db
      .select({ id: participants.id, name: participants.name })
      .from(participants)
      .where(and(eq(participants.role, "facilitator"), eq(participants.status, "active")))
      .orderBy(participants.name),
  ]);
  return NextResponse.json({ slots, facilitators });
}
