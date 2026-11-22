/**
 * POST /api/admin/participants/send-link
 *
 * Emails a participant a way in, from the admin participant detail page:
 * - active/completed: a magic sign-in link (30 min);
 * - pending participant (accepted but never registered, e.g. the 7-day link expired):
 *   a new registration link (/onboard, 7 days) instead, because pending accounts can't sign in;
 * - pending facilitator: refused (approve them first).
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, participants, onboardingTokens, ensureMigrated } from "@/db";
import { newId } from "@/lib/ids";
import { createLoginToken } from "@/lib/auth";
import { sendEmail, btn, escapeHtml } from "@/lib/email";
import { appUrl } from "@/lib/url";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { participantId?: string };
    const { participantId } = body;

    if (typeof participantId !== "string" || !participantId) {
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

    if (participant.status === "pending") {
      if (participant.role !== "participant") {
        return NextResponse.json({ error: "This facilitator is still pending: approve them first." }, { status: 409 });
      }
      const raw = randomBytes(32).toString("base64url");
      await db.insert(onboardingTokens).values({
        id: newId("ot"),
        participantId: participant.id,
        tokenHash: createHash("sha256").update(raw).digest("hex"),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      const onboardUrl = appUrl(`/onboard?token=${raw}`);
      await sendEmail({
        to: participant.email,
        subject: "Complete your registration for the EA Netherlands Intro Course",
        html: `
          <p>Hi ${escapeHtml(participant.name)},</p>
          <p>You were accepted to the EA Netherlands Intro Course, but your registration isn't complete yet.
             Use the button below to confirm your availability and choose a password. This link is valid for 7 days.</p>
          ${btn(onboardUrl, "Complete registration →")}
          <p style="color:#888;font-size:12px;margin-top:16px;">Questions? Reply to this email or write to programmes@effectiefaltruisme.nl.</p>
        `,
        kind: "onboarding",
        replyTo: "programmes@effectiefaltruisme.nl",
      });
      return NextResponse.json({ ok: true, sent: "registration" });
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

    return NextResponse.json({ ok: true, sent: "sign-in" });
  } catch (err) {
    console.error("[send-link]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
