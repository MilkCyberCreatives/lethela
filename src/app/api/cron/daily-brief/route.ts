import { NextResponse } from "next/server";
import { sendDailyBrief } from "@/lib/daily-brief";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called each morning by .github/workflows/daily-agents.yml. It needs no secret: it only reads
// data, sends the brief to the admins at most once per South African day (from 06:00) and
// returns nothing about the numbers.
export async function GET() {
  const result = await sendDailyBrief().catch((error) => {
    console.error("Daily brief failed.", error);
    return null;
  });
  return NextResponse.json(
    { ok: Boolean(result), status: result?.status || "error" },
    { status: result ? 200 : 500, headers: { "cache-control": "no-store" } },
  );
}
