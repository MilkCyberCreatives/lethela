import { NextResponse } from "next/server";
import { runOrderSweep } from "@/lib/order-automation";
import { autoApproveReadyAccounts } from "@/lib/auto-approval";

export const dynamic = "force-dynamic";

// Called every few minutes by .github/workflows/order-sweep.yml so stuck orders
// are chased even when nobody has a Lethela page open. It needs no secret: the
// sweep runs at most once a minute, only sends messages that are due (each once
// per order) and returns nothing about any order.
export async function GET() {
  // Stores and riders who finished their profile without pressing Submit go live here.
  const approvals = autoApproveReadyAccounts().catch(() => null);
  await runOrderSweep().catch(() => null);
  await approvals;
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
