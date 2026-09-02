import { NextRequest, NextResponse } from "next/server";
import { db, ensureMigrated, participants } from "@/db";
import { eq } from "drizzle-orm";
import { newId } from "@/lib/ids";
import bcryptjs from "bcryptjs";

export async function POST(req: NextRequest) {
  await ensureMigrated();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { name, email, password } = body as { name?: string; email?: string; password?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const normalEmail = email.trim().toLowerCase();

  // Check duplicate email
  const existing = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.email, normalEmail))
    .limit(1);
  if (existing.length) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcryptjs.hash(password, 12);

  await db.insert(participants).values({
    id: newId("f"),
    name: name.trim(),
    email: normalEmail,
    role: "facilitator",
    passwordHash,
    status: "pending", // admin must approve
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
