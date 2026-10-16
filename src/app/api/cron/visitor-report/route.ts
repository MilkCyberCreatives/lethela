import { NextResponse } from "next/server";
import { sendDailyVisitorReport } from "@/lib/visitor-report-data";

export const dynamic = "force-dynamic";

// Called each morning by .github/workflows/visitor-report.yml. It needs no secret:
// it sends yesterday's report to the admins at most once per day, only from 06:00
// South African time, and returns nothing about the numbers.
export async function GET() {
  const result = await sendDailyVisitorReport().catch((error) => {
    console.error("Daily visitor report failed.", error);
    return null;
  });
  return NextResponse.json(
    { ok: Boolean(result), status: result?.status || "error" },
    { status: result ? 200 : 500, headers: { "cache-control": "no-store" } },
  );
}
