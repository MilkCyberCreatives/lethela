import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRider } from "@/lib/rider-session";
import { saveRiderLocation } from "@/lib/rider-offers";

const BodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// While a rider is online their phone shares where they are, so the nearest
// riders hear about a delivery first. Only the latest position is kept.
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "rider-location",
    limit: 60,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many updates." }, { status: 429 });
  }
  const rider = await currentRider();
  if (!rider) {
    return NextResponse.json({ ok: false, error: "Rider access required." }, { status: 401 });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid location." }, { status: 400 });
  }
  if (rider.status !== "APPROVED" || !rider.availableNow) {
    return NextResponse.json({ ok: true, saved: false });
  }
  await saveRiderLocation(rider.id, parsed.data.lat, parsed.data.lng);
  return NextResponse.json({ ok: true, saved: true });
}
