import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/cron/daily
 * Triggered daily at 06:00 UTC by Vercel Cron (vercel.json).
 * Authenticates via Authorization: Bearer <CRON_SECRET>.
 *
 * Stage 2 will add: nudge emails for participants who haven't opened this week's module.
 * Stage 5 will add: session reminder emails (24h before a scheduled session).
 * Stage 6 will add: post-fellowship completion emails.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // TODO (Stage 2): send nudge emails to participants behind on materials.
  // TODO (Stage 5): send 24h reminders before upcoming sessions.
  // TODO (Stage 6): send post-fellowship emails to newly-completed participants.

  console.log(`[cron:daily] ran at ${new Date().toISOString()}`);
  return NextResponse.json({ ok: true, ran: new Date().toISOString() });
}
