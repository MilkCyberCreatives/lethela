import { NextResponse } from "next/server";
import { getOperatingSummary } from "@/lib/profile-nudges";

export const dynamic = "force-dynamic";

// Public and harmless: counts only (no names, emails or phone numbers) of stores that can take
// orders, riders that can deliver, and what unfinished profiles are missing. The live site check
// prints it so progress towards real orders is visible without signing in to /admin.
export async function GET() {
  try {
    const summary = await getOperatingSummary();
    return NextResponse.json(
      { ok: true, ...summary },
      { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
