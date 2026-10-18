import { NextResponse } from "next/server";
import { cashOnDeliverySettings, onlinePaymentConfigured } from "@/lib/payment-status";

export const dynamic = "force-dynamic";

// Tells checkout which ways to pay are open, so customers never press a button that fails.
export async function GET() {
  const cash = cashOnDeliverySettings();
  return NextResponse.json(
    {
      ok: true,
      online: onlinePaymentConfigured(),
      cash: cash.enabled,
      cashMaxCents: cash.maxCents,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
