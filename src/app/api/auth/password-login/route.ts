import { NextRequest, NextResponse } from "next/server";
import { db, ensureMigrated, participants } from "@/db";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import { createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureMigrated();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const [participant] = await db
    .select()
    .from(participants)
    .where(eq(participants.email, email.trim().toLowerCase()))
    .limit(1);

  // Generic error to prevent user enumeration
  if (!participant || !participant.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (participant.status === "pending") {
    return NextResponse.json({ error: "Your account is pending approval." }, { status: 403 });
  }

  const valid = await bcryptjs.compare(password, participant.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Use the same session + cookie helpers as the magic-link flow
  const raw = await createSession(participant.id);
  await setSessionCookie(raw);

  return NextResponse.json({ ok: true, redirect: "/" });
}
