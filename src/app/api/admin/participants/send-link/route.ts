/**
 * POST /api/admin/participants/send-link
 *
 * Generates a magic-link token for a participant and emails it to them.
 * Called from the admin participant detail page.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, participants, ensureMigrated } from "@/db";
import { createLoginToken } from "@/lib/auth";
import { sendEmail, btn, escapeHtml } from "@/lib/email";
import { appUrl } from "@/lib/url";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { participantId?: string };
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json({ error: "participantId required." }, { status: 400 });
    }

    await ensureMigrated();

    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, participantId))
      .limit(1);

    if (!participant) {
      return NextResponse.json({ error: "Participant not found." }, { status: 404 });
    }

    const raw = await createLoginToken(participant.id);
    const verifyUrl = appUrl(`/auth/verify?token=${raw}`);

    await sendEmail({
      to: participant.email,
      subject: "Your EA Fellowship sign-in link",
      html: `
        <p>Hi ${escapeHtml(participant.name)},</p>
        <p>A facilitator has sent you a sign-in link for the EA Fellowship platform.
           Click the button below to access your materials. The link expires in 30&nbsp;minutes
           and can only be used once.</p>
        ${btn(verifyUrl, "Sign in to Fellowship →")}
        <p style="color:#888;font-size:12px;margin-top:16px;">
          If you weren't expecting this, you can safely ignore it.<br>
          Or copy this link: ${verifyUrl}
        </p>
      `,
      kind: "magic_link",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-link]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
