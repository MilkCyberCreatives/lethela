import { NextResponse } from "next/server";
import { runOrderSweep } from "@/lib/order-automation";
import { autoApproveReadyAccounts } from "@/lib/auto-approval";
import { runApprovalBroadcast } from "@/lib/approval-broadcast";
import { runProfileNudges } from "@/lib/profile-nudges";

export const dynamic = "force-dynamic";
// The one-off approval emails send in small, spaced batches.
export const maxDuration = 60;

// Called every few minutes by .github/workflows/order-sweep.yml so stuck orders
// are chased even when nobody has a Lethela page open. It needs no secret: the
// sweep runs at most once a minute, only sends messages that are due (each once
// per order) and returns nothing about any order.
export async function GET() {
  // Stores and riders who finished their profile without pressing Submit go live here.
  const approvals = autoApproveReadyAccounts().catch(() => null);
  await runOrderSweep().catch(() => null);
  await approvals;
  // Tells everyone who already had an account that it is approved (once each).
  await runApprovalBroadcast().catch(() => null);
  // Reminds unfinished stores and riders what is still missing (daytime, at most 3 times).
  await runProfileNudges().catch(() => null);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
