import { NextResponse } from "next/server";
import { currentRider } from "@/lib/rider-session";
import { listRiderOffers } from "@/lib/rider-offers";
import { scheduleOrderSweep } from "@/lib/order-automation";

export const dynamic = "force-dynamic";

export async function GET() {
  const rider = await currentRider();
  if (!rider) {
    return NextResponse.json({ ok: false, error: "Rider access required." }, { status: 401 });
  }
  // Riders waiting online keep this open, which also keeps the order sweep running.
  scheduleOrderSweep();
  const offers = rider.status === "APPROVED" ? await listRiderOffers(rider.id) : [];
  return NextResponse.json(
    { ok: true, offers },
    { headers: { "cache-control": "private, no-store" } },
  );
}
