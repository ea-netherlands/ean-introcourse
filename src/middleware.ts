import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "ean_admin_auth";

// Admin-facing routes that must stay reachable without the admin cookie —
// the login page/endpoint itself, and the "forgot password" emailer.
const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/api/admin/auth",
  "/api/admin/forgot-password",
]);

async function sha256hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api/admin");
  const isAdminRoute = pathname.startsWith("/admin") || isApiRoute;

  // Facilitators create sessions via POST /api/admin/sessions; the route
  // itself verifies the facilitator's session (needs the DB, not available here).
  const facilitatorSessionCreate =
    pathname === "/api/admin/sessions" && req.method === "POST";

  // Protect all /admin/* pages and /api/admin/* routes, except the
  // handful that must stay public (login page/endpoint, forgot-password).
  if (isAdminRoute && !PUBLIC_ADMIN_PATHS.has(pathname) && !facilitatorSessionCreate) {
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
    const adminPw = process.env.ADMIN_PASSWORD;

    const unauthorized = !adminPw || !cookie || cookie !== (await sha256hex(adminPw));
    if (unauthorized) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
