// /src/app/api/maps/eta/route.ts
import { NextRequest, NextResponse } from "next/server";
import { distanceMatrixETA, geocodeSuburb } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.searchParams.get("origin"); // "lat,lng"
  const destSuburb = url.searchParams.get("dest");
  if (!origin || !destSuburb) {
    return NextResponse.json({ ok: false, error: "Missing origin or dest" }, { status: 400 });
  }

  const [latStr, lngStr] = origin.split(",");
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 400 });
  }

  const destPoint = await geocodeSuburb(destSuburb);
  if (!destPoint) return NextResponse.json({ ok: false, error: "Dest not found" }, { status: 404 });

  const eta = await distanceMatrixETA({ lat, lng }, destPoint);
  if (!eta) return NextResponse.json({ ok: false, error: "ETA failed" }, { status: 502 });

  return NextResponse.json({ ok: true, eta, dest: destPoint });
}
