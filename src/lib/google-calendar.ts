/**
 * google-calendar.ts — server-only
 *
 * Creates a Google Calendar event with an auto-generated Google Meet link.
 * Uses a Google service account + Node.js built-in `crypto` (no external package).
 *
 * Required environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL   — the service account's client_email
 *   GOOGLE_SERVICE_ACCOUNT_KEY     — the service account's private_key (PEM, literal \n OK)
 *   GOOGLE_CALENDAR_ID             — calendar to create events on (EA account email)
 *
 * One-time setup:
 *   1. console.cloud.google.com → enable Google Calendar API
 *   2. IAM & Admin → Service Accounts → Create → JSON key → download
 *   3. Set GOOGLE_SERVICE_ACCOUNT_EMAIL = client_email  from JSON
 *      Set GOOGLE_SERVICE_ACCOUNT_KEY   = private_key   from JSON
 *      Set GOOGLE_CALENDAR_ID           = programmes@effectiefaltruisme.nl
 *   4. In Google Calendar: share the EA calendar with the service account email,
 *      grant "Make changes to events" permission.
 */

import { createSign } from "crypto";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

/** Mint a signed JWT and exchange it for an OAuth access token. */
async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  // Allow both literal \n (env var) and real newlines
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");

  const claimSet = Buffer.from(
    JSON.stringify({
      iss: email,
      sub: process.env.GOOGLE_CALENDAR_ID, // impersonate calendar owner (domain-wide delegation)
      scope: SCOPES,
      aud: TOKEN_ENDPOINT,
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const sigInput = `${header}.${claimSet}`;
  const signer = createSign("RSA-SHA256");
  signer.update(sigInput);
  const sig = signer.sign(key, "base64url");

  const jwt = `${sigInput}.${sig}`;

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed ${res.status}: ${text}`);
  }

  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface CreatedMeetEvent {
  eventId: string;
  meetLink: string;
  calendarLink: string;
}

/** Default session duration from env (falls back to 90 min). */
const DEFAULT_DURATION = Number(process.env.DEFAULT_SESSION_DURATION_MINUTES ?? 90);

/**
 * Create a Google Calendar event with a unique Google Meet link.
 * Returns null when Google credentials are not configured (graceful no-op).
 */
export async function createMeetEvent(opts: {
  title: string;
  startAt: Date;
  durationMinutes?: number;
  description?: string;
}): Promise<CreatedMeetEvent | null> {
  if (!googleCalendarConfigured()) return null;

  const { title, startAt, durationMinutes = DEFAULT_DURATION, description } = opts;
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  const accessToken = await getAccessToken();

  const calendarId = process.env.GOOGLE_CALENDAR_ID!;
  const requestId = `ean-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const body = {
    summary: title,
    ...(description ? { description } : {}),
    start: { dateTime: startAt.toISOString() },
    end: { dateTime: endAt.toISOString() },
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/` +
    `${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    id: string;
    htmlLink: string;
    conferenceData?: {
      entryPoints?: Array<{ entryPointType: string; uri: string }>;
    };
  };

  const meetEntry = data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  );

  return {
    eventId: data.id,
    meetLink: meetEntry?.uri ?? "",
    calendarLink: data.htmlLink,
  };
}

/** True when all three Google env vars are present. */
export function googleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
    process.env.GOOGLE_CALENDAR_ID
  );
}
