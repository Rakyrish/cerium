import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Admin gate.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS CHECKS A COOKIE AND NOT THE SESSION
 * ---------------------------------------------------------------------------
 * Middleware runs on the Edge runtime, where `bcryptjs` and the `pg` driver
 * cannot load — importing `@/lib/auth` here would fail the build. So this is a
 * cheap presence check on the session cookie, and it is deliberately NOT the
 * security boundary.
 *
 * THE REAL CHECK IS `requireUser()` IN EVERY ADMIN PAGE AND ACTION. It verifies
 * the signature and the role against the database-backed session. This
 * middleware exists only to redirect a signed-out visitor to the sign-in page
 * instead of rendering a shell they will not be allowed to use — a UX
 * affordance, not authorisation. A forged cookie gets past this and is then
 * rejected by the page.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/sign-in")) return NextResponse.next();

  // Auth.js names the cookie `__Secure-` prefixed over https.
  const token =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!token) {
    const url = new URL("/admin/sign-in", request.url);
    // Preserve where they were going so sign-in can return them there.
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
