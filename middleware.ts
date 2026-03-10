// /middleware.ts
import { NextResponse, type NextRequest } from "next/server";

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
        return NextResponse.json({ ok: false, error: "Not signed in as vendor." }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/vendors/register";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/vendors/dashboard/:path*", "/api/vendor/:path*"],
};
