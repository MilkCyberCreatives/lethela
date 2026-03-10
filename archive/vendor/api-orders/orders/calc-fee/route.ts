// src/app/api/orders/calc-fee/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deliveryFeeZAR } from "@/lib/pricing";
import { haversineKm } from "@/lib/geo";

export async function POST(req: Request) {
  const { vendorId, customerLat, customerLng } = await req.json().catch(() => ({})) as {
    vendorId: string; customerLat?: number; customerLng?: number;
  };
  if (!vendorId) return NextResponse.json({ ok: false, error: "vendorId required" }, { status: 400 });

  const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!v) return NextResponse.json({ ok: false, error: "Vendor not found" }, { status: 404 });

  let distanceKm: number | null = null;
  if (typeof v.latitude === "number" && typeof v.longitude === "number" && typeof customerLat === "number" && typeof customerLng === "number") {
    distanceKm = haversineKm(v.latitude, v.longitude, customerLat, customerLng);
  }

  const fee = deliveryFeeZAR(distanceKm ?? 0);
  return NextResponse.json({ ok: true, distanceKm, deliveryFeeCents: fee * 100 });
}
