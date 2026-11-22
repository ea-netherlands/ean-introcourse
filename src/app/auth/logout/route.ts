/**
 * POST /auth/logout
 *
 * Signs the current participant out: deletes the DB session and clears
 * the cookie, then redirects to the login page.
 *
 * The redirect must be 303 (See Other): the default 307 makes the browser repeat the POST
 * to /auth/login, which is a static page in production and answers 405.
 */

import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";
import { appUrl } from "@/lib/url";

export async function POST() {
  await logout();
  const res = NextResponse.redirect(appUrl("/auth/login"), 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** A plain link or a refresh on /auth/logout also signs out instead of showing an error. */
export const GET = POST;
