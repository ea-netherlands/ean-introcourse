/**
 * GET  /api/admin/groups — list all groups with participant counts
 * POST /api/admin/groups — create a new group
 */

import { NextRequest, NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db, groups, participants, ensureMigrated } from "@/db";
import { newId } from "@/lib/ids";

export async function GET() {
  try {
    await ensureMigrated();
    const rows = await db
      .select({
        id: groups.id,
        name: groups.name,
        cohort: groups.cohort,
        timing: groups.timing,
        active: groups.active,
        createdAt: groups.createdAt,
        participantCount: sql<number>`cast(count(${participants.id}) as int)`,
      })
      .from(groups)
      .leftJoin(participants, eq(participants.groupId, groups.id))
      .groupBy(groups.id)
      .orderBy(groups.createdAt);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[admin/groups GET]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name?: string; cohort?: string; timing?: string };
    const name = body.name?.trim();
    const cohort = body.cohort?.trim() || null;
    const timing = body.timing?.trim() || null;

    if (!name) {
      return NextResponse.json({ error: "Group name is required." }, { status: 400 });
    }

    await ensureMigrated();
    const id = newId("g");
    await db.insert(groups).values({ id, name, cohort, timing, active: true });
    return NextResponse.json({ id, name, cohort, timing, active: true });
  } catch (err) {
    console.error("[admin/groups POST]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
