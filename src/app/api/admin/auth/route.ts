import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const ADMIN_COOKIE = "ean_admin_auth";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: NextRequest) {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) {
    return NextResponse.json({ error: "Server misconfiguration: ADMIN_PASSWORD not set" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const submitted = typeof body.password === "string" ? body.password : "";

  const submittedHash = createHash("sha256").update(submitted).digest("hex");
  const correctHash = createHash("sha256").update(adminPw).digest("hex");

  if (submittedHash !== correctHash) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // Store SHA-256(ADMIN_PASSWORD) — middleware re-derives this from env to verify
  res.cookies.set(ADMIN_COOKIE, correctHash, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
