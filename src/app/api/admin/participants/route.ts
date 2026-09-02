/**
 * POST /api/admin/participants
 * Creates a new participant record.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, participants, ensureMigrated } from "@/db";
import { newId } from "@/lib/ids";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name?: string;
      email?: string;
      role?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.toLowerCase().trim();
    const role = body.role === "facilitator" ? "facilitator" : "participant";

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    await ensureMigrated();

    // Check for duplicate email
    const [existing] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(eq(participants.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "A participant with that email already exists." },
        { status: 409 }
      );
    }

    const id = newId("p");
    await db.insert(participants).values({
      id,
      name,
      email,
      role,
      status: "pending",
    });

    return NextResponse.json({ id });
  } catch (err) {
    console.error("[admin/participants POST]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
