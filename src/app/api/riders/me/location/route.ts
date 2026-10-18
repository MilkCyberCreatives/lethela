import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRider } from "@/lib/rider-session";
import { saveRiderLocation } from "@/lib/rider-offers";
import { shareRiderLocationWithDeliveries } from "@/lib/rider-tracking";

const BodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).max(100).nullable().optional(),
});

// While a rider is online their phone shares where they are, so the nearest
// riders hear about a delivery first and admins see them on the live map. Only
// the latest position is kept. While they have a delivery, the position is also
// put on the order so the customer can follow them.
export async function POST(req: NextRequest) {
  const rider = await currentRider();
  if (!rider) {
    return NextResponse.json({ ok: false, error: "Rider access required." }, { status: 401 });
  }
  const limited = await checkRateLimit({
    key: `rider-location:${rider.id}`,
    limit: 150,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many updates." }, { status: 429 });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid location." }, { status: 400 });
  }
  if (rider.status !== "APPROVED") {
    return NextResponse.json({ ok: true, saved: false, activeDelivery: false });
  }
  const { lat, lng, speed } = parsed.data;
  if (rider.availableNow) {
    await saveRiderLocation(rider.id, lat, lng);
  }
  const deliveries = await shareRiderLocationWithDeliveries(rider.id, { lat, lng, speed });
  return NextResponse.json({
    ok: true,
    saved: rider.availableNow || deliveries > 0,
    activeDelivery: deliveries > 0,
  });
}
