import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "ean_admin_auth";

async function sha256hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Admin API endpoints that must stay reachable without being logged in
const PUBLIC_ADMIN_API = new Set(["/api/admin/auth", "/api/admin/forgot-password"]);

async function isAdmin(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw || !cookie) return false;
  return cookie === (await sha256hex(adminPw));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /api/admin/* endpoints (participant data, exports, mutations)
  if (pathname.startsWith("/api/admin") && !PUBLIC_ADMIN_API.has(pathname)) {
    // Facilitators create sessions via POST /api/admin/sessions; the route
    // itself verifies the facilitator's session (needs the DB, not available here).
    const facilitatorSessionCreate =
      pathname === "/api/admin/sessions" && req.method === "POST";
    if (!facilitatorSessionCreate && !(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protect all /admin/* routes except /admin/login itself
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
    const adminPw = process.env.ADMIN_PASSWORD;

    if (!adminPw || !cookie) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const expectedHash = await sha256hex(adminPw);
    if (cookie !== expectedHash) {
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
