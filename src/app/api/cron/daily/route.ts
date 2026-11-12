import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, isNull, lt } from "drizzle-orm";
import {
  db,
  ensureMigrated,
  fellowshipSessions,
  participants,
  sessionAttendance,
} from "@/db";
import { sendEmail, btn, escapeHtml } from "@/lib/email";
import { googleCalendarUrl } from "@/lib/calendar";
import { appUrl } from "@/lib/url";

/**
 * GET /api/cron/daily
 * Triggered daily at 06:00 UTC by Vercel Cron (vercel.json).
 * Authenticates via Authorization: Bearer <CRON_SECRET> (required in production).
 *
 * Sends one reminder email per participant for every session starting in the
 * next 24 hours. `session_attendance.invite_sent_at` records that the reminder
 * went out, so a re-run never sends duplicates.
 *
 * Not built yet: nudges for participants behind on materials, and
 * post-fellowship emails.
 */
const REMINDER_WINDOW_HOURS = 24;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    console.error("[cron:daily] CRON_SECRET is not set — refusing to run");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureMigrated();
  const now = new Date();
  const until = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const due = await db
    .select({
      sessionId: fellowshipSessions.id,
      title: fellowshipSessions.title,
      scheduledAt: fellowshipSessions.scheduledAt,
      meetLink: fellowshipSessions.meetLink,
      agenda: fellowshipSessions.agenda,
      participantId: participants.id,
      name: participants.name,
      email: participants.email,
      status: participants.status,
    })
    .from(sessionAttendance)
    .innerJoin(fellowshipSessions, eq(fellowshipSessions.id, sessionAttendance.sessionId))
    .innerJoin(participants, eq(participants.id, sessionAttendance.participantId))
    .where(
      and(
        isNull(sessionAttendance.inviteSentAt),
        gte(fellowshipSessions.scheduledAt, now),
        lt(fellowshipSessions.scheduledAt, until)
      )
    );

  let sent = 0;
  for (const row of due) {
    if (row.status !== "active") continue;
    const when = row.scheduledAt.toLocaleString("en-GB", {
      timeZone: "Europe/Amsterdam",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const calUrl = googleCalendarUrl({
      title: row.title,
      startAt: row.scheduledAt,
      location: row.meetLink,
      description: row.agenda,
    });
    try {
      await sendEmail({
        to: row.email,
        subject: `Reminder: ${row.title} — ${when}`,
        kind: "session_reminder",
        replyTo: "programmes@effectiefaltruisme.nl",
        html: `
          <p>Hi ${escapeHtml(row.name)},</p>
          <p>A reminder that your fellowship session <strong>${escapeHtml(row.title)}</strong>
             starts <strong>${when}</strong> (Amsterdam time) and runs for 75 minutes.</p>
          ${row.agenda ? `<p style="white-space:pre-line">${escapeHtml(row.agenda)}</p>` : ""}
          ${row.meetLink ? btn(row.meetLink, "Join the session →") : ""}
          ${btn(appUrl("/materials"), "Prepare: open the materials")}
          <p style="font-size:13px;"><a href="${calUrl}" style="color:#16879c;">Add to Google Calendar</a></p>
        `,
      });
      await db
        .update(sessionAttendance)
        .set({ inviteSentAt: new Date() })
        .where(
          and(
            eq(sessionAttendance.sessionId, row.sessionId),
            eq(sessionAttendance.participantId, row.participantId)
          )
        );
      sent++;
    } catch (err) {
      console.error(`[cron:daily] reminder failed for ${row.participantId}/${row.sessionId}:`, err);
    }
  }

  console.log(`[cron:daily] ran at ${now.toISOString()}, reminders sent: ${sent}`);
  return NextResponse.json({ ok: true, ran: now.toISOString(), remindersSent: sent });
}
