/**
 * POST /api/auth/forgot-password  { email }
 *
 * Emails a one-time link to /auth/reset-password (same token store as magic links:
 * 30 minutes, single use). Answers { ok, status } with the same statuses as
 * /api/auth/send-link — "sent", "unknown", "pending", "rate_limited" — so the page can
 * explain what happened (revealing unknown addresses is the programme team's choice).
 */
import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gt } from "drizzle-orm";
import { db, participants, emailLog, ensureMigrated } from "@/db";
import { createLoginToken } from "@/lib/auth";
import { sendEmail, btn, escapeHtml } from "@/lib/email";
import { appUrl } from "@/lib/url";

const MAX_LINKS = 3;
const RATE_WINDOW_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.toLowerCase().trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    await ensureMigrated();
    const [participant] = await db.select().from(participants).where(eq(participants.email, email)).limit(1);
    if (!participant) return NextResponse.json({ ok: true, status: "unknown" });
    if (participant.status === "pending") return NextResponse.json({ ok: true, status: "pending" });

    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000);
    const [{ recent }] = await db
      .select({ recent: count() })
      .from(emailLog)
      .where(and(eq(emailLog.toEmail, participant.email), eq(emailLog.kind, "password_reset"), gt(emailLog.sentAt, since)));
    if (recent >= MAX_LINKS) return NextResponse.json({ ok: true, status: "rate_limited" });

    const raw = await createLoginToken(participant.id);
    const resetUrl = appUrl(`/auth/reset-password?token=${raw}`);

    await sendEmail({
      to: participant.email,
      subject: "Reset your EA Netherlands Intro Course password",
      html: `
        <p>Hi ${escapeHtml(participant.name)},</p>
        <p>Someone (hopefully you) asked to reset the password for your Intro Course account.
           Click the button below to choose a new password. The link expires in 30&nbsp;minutes
           and can only be used once.</p>
        ${btn(resetUrl, "Choose a new password →")}
        <p style="color:#888;font-size:12px;margin-top:16px;">
          Didn't ask for this? Then you can ignore this email; your password stays the same.<br>
          Or copy this link: ${resetUrl}
        </p>
      `,
      kind: "password_reset",
    });

    return NextResponse.json({ ok: true, status: "sent" });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
