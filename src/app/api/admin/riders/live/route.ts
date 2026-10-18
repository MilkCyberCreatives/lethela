import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { liveTrackingSnapshot } from "@/lib/rider-tracking";

// Read-only: where riders are now and which deliveries are open. Sends nothing.
export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  try {
    const snapshot = await liveTrackingSnapshot();
    return NextResponse.json(
      { ok: true, ...snapshot },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not load the live map right now." },
      { status: 500 },
    );
  }
}
