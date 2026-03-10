import { NextRequest, NextResponse } from "next/server";
import { geocodeSuburb } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ ok: false, error: "Missing q parameter." }, { status: 400 });
  }

  const point = await geocodeSuburb(query);
  if (!point) {
    return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, point });
}
