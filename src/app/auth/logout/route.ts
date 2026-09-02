/**
 * POST /auth/logout
 *
 * Signs the current participant out: deletes the DB session and clears
 * the cookie, then redirects to the login page.
 */

import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";
import { appUrl } from "@/lib/url";

export async function POST() {
  await logout();
  return NextResponse.redirect(appUrl("/auth/login"));
}
