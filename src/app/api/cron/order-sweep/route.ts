import { NextResponse } from "next/server";
import { runOrderSweep } from "@/lib/order-automation";

export const dynamic = "force-dynamic";

// Called every few minutes by .github/workflows/order-sweep.yml so stuck orders
// are chased even when nobody has a Lethela page open. It needs no secret: the
// sweep runs at most once a minute, only sends messages that are due (each once
// per order) and returns nothing about any order.
export async function GET() {
  await runOrderSweep().catch(() => null);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
