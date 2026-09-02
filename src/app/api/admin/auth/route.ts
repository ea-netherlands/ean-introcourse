import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const ADMIN_COOKIE = "ean_admin_auth";
const CORRECT_HASH = createHash("sha256").update("DoingGoodBetter").digest("hex");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const submitted = typeof body.password === "string" ? body.password : "";
  const hash = createHash("sha256").update(submitted).digest("hex");

  if (hash !== CORRECT_HASH) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, CORRECT_HASH, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });
  return res;
}
