/**
 * PUT /api/admin/cohorts  { name, startDate: "YYYY-MM-DD" | null }
 * Sets a cohort's start date (shared by all its groups) and re-syncs the groups' sessions.
 * Admin only (middleware).
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cohorts, db, ensureMigrated } from "@/db";
import { cohortKey } from "@/app/admin/groups/cohort";
import { syncCohortSessions } from "@/lib/session-sync";

export async function PUT(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json().catch(() => ({}));
  const name = cohortKey(typeof body.name === "string" ? body.name : "");
  if (!name) return NextResponse.json({ error: "Groups without a cohort have no start date." }, { status: 400 });
  const startDate = body.startDate === null || body.startDate === "" ? null : String(body.startDate);
  if (startDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const [existing] = await db.select({ name: cohorts.name }).from(cohorts).where(eq(cohorts.name, name)).limit(1);
  if (existing) await db.update(cohorts).set({ startDate }).where(eq(cohorts.name, name));
  else await db.insert(cohorts).values({ name, startDate });
  await syncCohortSessions(name);
  return NextResponse.json({ ok: true });
}
