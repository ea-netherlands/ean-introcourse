/**
 * GET /auth/verify?token=RAW
 *
 * Route Handler — consumes the magic-link token, creates a session,
 * sets the httpOnly session cookie on the redirect response, then
 * redirects to /materials.
 *
 * Must be a Route Handler (not a page) so we can both set cookies AND redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { consumeLoginToken, createSession } from "@/lib/auth";
import { appUrl } from "@/lib/url";

const SESSION_COOKIE = "ean_fellowship_session";
const SESSION_DAYS = 7;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(appUrl("/auth/login?error=missing"));
  }

  const participantId = await consumeLoginToken(token).catch(() => null);

  if (!participantId) {
    return NextResponse.redirect(appUrl("/auth/login?error=invalid"));
  }

  const sessionToken = await createSession(participantId);

  // Set the cookie directly on the redirect response so Next.js includes it
  // in the same round-trip (setting cookies via cookies() in Route Handlers
  // requires Next.js 15.1+ and can be unreliable with redirect responses).
  const response = NextResponse.redirect(appUrl("/materials"));
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
