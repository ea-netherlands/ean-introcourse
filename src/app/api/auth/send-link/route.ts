/**
 * POST /api/auth/send-link
 *
 * Finds a participant by email, generates a magic-link token, and sends
 * the link via email. Returns { ok, status } so the login page can explain
 * what happened: "sent", "unknown" (no participant with this email: they
 * should use their application address or apply), "pending" (accepted but
 * registration not completed, or facilitator not yet approved) or
 * "rate_limited". Saying an address is unknown was a deliberate choice by the
 * programme team: clarity for applicants over hiding who is registered.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gt } from "drizzle-orm";
import { db, participants, emailLog, ensureMigrated } from "@/db";
import { createLoginToken } from "@/lib/auth";
import { sendEmail, btn, escapeHtml } from "@/lib/email";
import { appUrl, safeNextPath } from "@/lib/url";

const MAX_LINKS = 3;
const RATE_WINDOW_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; next?: string };
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    await ensureMigrated();

    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.email, email))
      .limit(1);

    if (!participant) {
      return NextResponse.json({ ok: true, status: "unknown" });
    }
    if (participant.status === "pending") {
      return NextResponse.json({ ok: true, status: "pending" });
    }

    // Rate limit: at most MAX_LINKS sign-in emails per address per window.
    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000);
    const [{ recent }] = await db
      .select({ recent: count() })
      .from(emailLog)
      .where(
        and(
          eq(emailLog.toEmail, participant.email),
          eq(emailLog.kind, "magic_link"),
          gt(emailLog.sentAt, since)
        )
      );
    if (recent >= MAX_LINKS) {
      return NextResponse.json({ ok: true, status: "rate_limited" });
    }

    const raw = await createLoginToken(participant.id);
    // Come back to the page they wanted (?next= on the sign-in page), if it is one of ours.
    const next = safeNextPath(body.next);
    const verifyUrl = appUrl(`/auth/verify?token=${raw}${next ? `&next=${encodeURIComponent(next)}` : ""}`);

    await sendEmail({
      to: participant.email,
      subject: "Your EA Fellowship sign-in link",
      html: `
        <p>Hi ${escapeHtml(participant.name)},</p>
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

    return NextResponse.json({ ok: true, status: "sent" });
  } catch (err) {
    console.error("[send-link] error", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
