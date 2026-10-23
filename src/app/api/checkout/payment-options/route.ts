import { NextResponse } from "next/server";
import { onlinePaymentConfigured } from "@/lib/payment-status";

export const dynamic = "force-dynamic";

// Tells checkout whether online payment (Ozow) is ready, so customers never press a button
// that fails. Orders are paid online only, so cash is always false. testMode shows whether
// Ozow is still in test mode (the live site check reads it; no keys are revealed).
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      online: onlinePaymentConfigured(),
      testMode: process.env.OZOW_IS_TEST?.trim() === "true",
      cash: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
