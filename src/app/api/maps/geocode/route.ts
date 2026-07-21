import { NextRequest, NextResponse } from "next/server";
import { geocodeSuburb } from "@/lib/geo";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "maps-geocode",
    limit: 30,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many location searches." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2 || query.length > 160) {
    return NextResponse.json({ ok: false, error: "Missing q parameter." }, { status: 400 });
  }

  const point = await geocodeSuburb(query);
  if (!point) {
    return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, point });
}
