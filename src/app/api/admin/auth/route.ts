import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  issueAdminSession,
  passwordMatches,
} from "@/lib/admin-session";

/** A wrong password costs this long, which makes guessing in bulk impractical. */
const WRONG_PASSWORD_DELAY_MS = 750;

export async function POST(req: NextRequest) {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) {
    return NextResponse.json({ error: "Server misconfiguration: ADMIN_PASSWORD not set" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const submitted = typeof body.password === "string" ? body.password.slice(0, 500) : "";

  if (!(await passwordMatches(submitted, adminPw))) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // A signed, expiring session; see src/lib/admin-session.ts.
  res.cookies.set(ADMIN_COOKIE, await issueAdminSession(adminPw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/",
  });
  return res;
}

/** Log out: forget the session in this browser. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
