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
  // Authorization is intentionally enforced in Server Components and Route Handlers.
  // Middleware only assigns the anonymous visitor identifier, so it cannot become a
  // single authorization gate that is vulnerable to middleware-bypass attacks.
  return withVisitorCookie(req, NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml|webmanifest)$).*)",
  ],
};
