import { NextRequest, NextResponse } from "next/server";
import { db, ensureMigrated, applications } from "@/db";
import { eq } from "drizzle-orm";

interface Ctx { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  await ensureMigrated();
  const { id } = await params;

  const [app] = await db.select({ id: applications.id, status: applications.status })
    .from(applications).where(eq(applications.id, id)).limit(1);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.status !== "pending") return NextResponse.json({ error: "Already handled" }, { status: 409 });

  await db.update(applications).set({ status: "rejected" }).where(eq(applications.id, id));
  return NextResponse.json({ ok: true });
}
