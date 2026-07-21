import { NextRequest, NextResponse } from "next/server";
import { reverseGeocodePoint } from "@/lib/geo";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "maps-reverse",
    limit: 60,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many location requests." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { ok: false, error: "Valid lat and lng are required." },
      { status: 400 },
    );
  }

  const area = await reverseGeocodePoint({ lat, lng });
  return NextResponse.json({ ok: true, ...area });
}
