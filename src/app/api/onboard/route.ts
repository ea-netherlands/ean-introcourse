import { NextRequest, NextResponse } from "next/server";
import { db, ensureMigrated, onboardingTokens, participants } from "@/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import bcryptjs from "bcryptjs";

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json().catch(() => ({}));
  const raw: string = body.token ?? "";
  const password: string = body.password ?? "";
  const availability: string[] = Array.isArray(body.availability) ? body.availability : [];

  if (!raw || !password || availability.length === 0) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const hash = createHash("sha256").update(raw).digest("hex");
  const [token] = await db
    .select()
    .from(onboardingTokens)
    .where(eq(onboardingTokens.tokenHash, hash))
    .limit(1);

  if (!token || token.expiresAt < new Date()) {
    return NextResponse.json({ error: "This link has expired or is invalid. Please contact us for a new one." }, { status: 400 });
  }

  const passwordHash = await bcryptjs.hash(password, 12);

  await db.update(participants)
    .set({ passwordHash, availability, status: "active" })
    .where(eq(participants.id, token.participantId));

  // Delete the token (single-use)
  await db.delete(onboardingTokens).where(eq(onboardingTokens.id, token.id));

  return NextResponse.json({ ok: true });
}
