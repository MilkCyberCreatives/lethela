import { NextRequest, NextResponse } from "next/server";
import { reverseGeocodePoint } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "Valid lat and lng are required." }, { status: 400 });
  }

  const area = await reverseGeocodePoint({ lat, lng });
  return NextResponse.json({ ok: true, ...area });
}
