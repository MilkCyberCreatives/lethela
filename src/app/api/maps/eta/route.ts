import { NextRequest, NextResponse } from "next/server";
import { distanceMatrixETA, geocodeSuburb } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const originRaw = req.nextUrl.searchParams.get("origin");
  const destinationQuery = req.nextUrl.searchParams.get("dest");

  if (!originRaw || !destinationQuery) {
    return NextResponse.json({ ok: false, error: "Missing origin or dest parameter." }, { status: 400 });
  }

  const [latRaw, lngRaw] = originRaw.split(",");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "Invalid origin coordinates." }, { status: 400 });
  }

  let destination = null;
  if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(destinationQuery)) {
    const [dLatRaw, dLngRaw] = destinationQuery.split(",");
    const dLat = Number(dLatRaw);
    const dLng = Number(dLngRaw);
    if (Number.isFinite(dLat) && Number.isFinite(dLng)) {
      destination = { lat: dLat, lng: dLng };
    }
  }

  if (!destination) {
    destination = await geocodeSuburb(destinationQuery);
  }
  if (!destination) {
    return NextResponse.json({ ok: false, error: "Destination not found." }, { status: 404 });
  }

  const eta = await distanceMatrixETA({ lat, lng }, destination);
  return NextResponse.json({ ok: true, eta, dest: destination });
}
