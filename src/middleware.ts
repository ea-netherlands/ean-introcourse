import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "ean_admin_auth";
// SHA-256 of "DoingGoodBetter" — pre-computed so this file stays Edge-compatible
const PASSWORD_HASH = "11339b09b47b01e2d04df590cc10d25793001d0b07f4029283c14697e3f4896c";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin/* routes except /admin/login itself
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
    if (cookie !== PASSWORD_HASH) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
