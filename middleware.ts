// /middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const VISITOR_COOKIE_NAME = "lethela_visitor_id";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

function withVisitorCookie(req: NextRequest, response: NextResponse) {
  const existingVisitorId = req.cookies.get(VISITOR_COOKIE_NAME)?.value?.trim();
  if (existingVisitorId) return response;

  response.cookies.set(VISITOR_COOKIE_NAME, crypto.randomUUID(), {
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isVendorDashboard = pathname.startsWith("/vendors/dashboard");
  const isVendorApi = pathname.startsWith("/api/vendor");
  const isVendorArea = isVendorDashboard || isVendorApi;
  const isPublicVendorApi =
    pathname === "/api/vendor/login" ||
    pathname === "/api/vendor/logout" ||
    pathname === "/api/vendor/apply";

  if (isVendorArea && !isPublicVendorApi) {
    const token = req.cookies.get("vendor_session")?.value;
    if (!token) {
      if (isVendorApi) {
        return withVisitorCookie(req, NextResponse.json({ ok: false, error: "Not signed in as vendor." }, { status: 401 }));
      }
      const url = req.nextUrl.clone();
      url.pathname = "/vendors/register";
      url.searchParams.set("next", pathname);
      return withVisitorCookie(req, NextResponse.redirect(url));
    }
  }
  return withVisitorCookie(req, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml|webmanifest)$).*)"],
};
