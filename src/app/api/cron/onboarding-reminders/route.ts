import { NextRequest, NextResponse } from "next/server";
import { runProfileNudges } from "@/lib/profile-nudges";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  return Boolean(cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`);
}

// Vercel's daily cron (vercel.json). Unfinished stores and riders get reminders that list exactly
// what is still missing (src/lib/profile-nudges.ts); the order sweep sends the same reminders, and
// each one goes out once.
export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const result = await runProfileNudges().catch(() => ({ sent: 0 }));
  return NextResponse.json({ ok: true, sent: result.sent });
}
