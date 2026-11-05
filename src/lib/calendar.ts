/**
 * Helpers for generating calendar add links (Google, Outlook, Apple/ICS)
 */

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** Format date as YYYYMMDDTHHmmssZ for Google Calendar */
function googleFmt(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
}

/** Format date as ISO without milliseconds for Outlook */
function outlookFmt(d: Date) {
  return d.toISOString().replace(".000Z", "");
}

/** Fellowship discussion sessions run 1 hour 15 minutes. */
export const SESSION_DURATION_MINUTES = 75;

export interface CalendarEvent {
  title: string;
  startAt: Date;
  durationMinutes?: number;
  location?: string | null;
  description?: string | null;
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const end = new Date(event.startAt.getTime() + (event.durationMinutes ?? SESSION_DURATION_MINUTES) * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${googleFmt(event.startAt)}/${googleFmt(end)}`,
    details: event.description ?? "",
    location: event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookCalendarUrl(event: CalendarEvent): string {
  const end = new Date(event.startAt.getTime() + (event.durationMinutes ?? SESSION_DURATION_MINUTES) * 60_000);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: outlookFmt(event.startAt),
    enddt: outlookFmt(end),
    body: event.description ?? "",
    location: event.location ?? "",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export function buildIcsContent(event: CalendarEvent, uid: string): string {
  const end = new Date(event.startAt.getTime() + (event.durationMinutes ?? SESSION_DURATION_MINUTES) * 60_000);
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@introcourse.effectiefaltruisme.nl`,
    `DTSTAMP:${googleFmt(now)}`,
    `DTSTART:${googleFmt(event.startAt)}`,
    `DTEND:${googleFmt(end)}`,
    `SUMMARY:${event.title}`,
    event.location ? `LOCATION:${event.location}` : null,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  return lines;
}
