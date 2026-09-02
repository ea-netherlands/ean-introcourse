import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureMigrated, participants } from "@/db";
import { getCurrentParticipant } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  await ensureMigrated();
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: { bio?: string; avatarUrl?: string; name?: string } = {};

  if (typeof body.bio === "string") updates.bio = body.bio.trim().slice(0, 500);
  if (typeof body.avatarUrl === "string") {
    // Only allow http/https URLs or empty string
    const url = body.avatarUrl.trim();
    if (url === "" || /^https?:\/\//.test(url)) updates.avatarUrl = url || null;
  }
  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    updates.name = body.name.trim().slice(0, 100);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.update(participants).set(updates).where(eq(participants.id, me.id));
  return NextResponse.json({ ok: true });
}
