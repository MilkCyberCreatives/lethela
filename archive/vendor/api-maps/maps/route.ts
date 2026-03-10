// /src/app/api/maps/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { geocodeSuburb } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q");
  if (!q) return NextResponse.json({ ok: false, error: "Missing q" }, { status: 400 });

  const point = await geocodeSuburb(q);
  if (!point) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, point });
}
