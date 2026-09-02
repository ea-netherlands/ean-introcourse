/**
 * POST /api/auth/send-link
 *
 * Finds a participant by email, generates a magic-link token, and sends
 * the link via email. If the email isn't registered, returns a generic
 * success so we don't reveal which addresses exist.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, participants, ensureMigrated } from "@/db";
import { createLoginToken } from "@/lib/auth";
import { sendEmail, btn } from "@/lib/email";
import { appUrl } from "@/lib/url";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string };
    const email = body.email?.toLowerCase().trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    await ensureMigrated();

    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.email, email))
      .limit(1);

    // Always return OK — don't reveal whether the email exists.
    if (!participant) {
      return NextResponse.json({ ok: true });
    }

    const raw = await createLoginToken(participant.id);
    const verifyUrl = appUrl(`/auth/verify?token=${raw}`);

    await sendEmail({
      to: participant.email,
      subject: "Your EA Fellowship sign-in link",
      html: `
        <p>Hi ${participant.name},</p>
        <p>Click the button below to sign in to the EA Fellowship platform.
           The link expires in 30&nbsp;minutes and can only be used once.</p>
        ${btn(verifyUrl, "Sign in to Fellowship →")}
        <p style="color:#888;font-size:12px;margin-top:16px;">
          If you didn't request this, you can safely ignore this email.<br>
          Or copy this link: ${verifyUrl}
        </p>
      `,
      kind: "magic_link",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-link] error", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
