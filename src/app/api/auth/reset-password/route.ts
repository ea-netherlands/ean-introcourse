/**
 * POST /api/auth/reset-password  { token, password }
 *
 * Uses the one-time token from the reset email, sets the new password, signs the person
 * out everywhere else (old sessions deleted) and signs them in here.
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import { db, participants, httpSessions, ensureMigrated } from "@/db";
import { consumeLoginToken, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: string; password?: string };
    const { token, password } = body;
    if (!token) return NextResponse.json({ error: "This reset link is incomplete." }, { status: 400 });
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    await ensureMigrated();
    const participantId = await consumeLoginToken(token);
    if (!participantId) {
      return NextResponse.json(
        { error: "This reset link has expired or was already used. Request a new one." },
        { status: 400 }
      );
    }

    const [participant] = await db
      .select({ id: participants.id, status: participants.status })
      .from(participants)
      .where(eq(participants.id, participantId))
      .limit(1);
    if (!participant || participant.status === "pending") {
      return NextResponse.json({ error: "Your account is pending approval." }, { status: 403 });
    }

    const passwordHash = await bcryptjs.hash(password, 12);
    await db.update(participants).set({ passwordHash }).where(eq(participants.id, participant.id));
    await db.delete(httpSessions).where(eq(httpSessions.participantId, participant.id));

    const raw = await createSession(participant.id);
    await setSessionCookie(raw);
    return NextResponse.json({ ok: true, redirect: "/materials" });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
