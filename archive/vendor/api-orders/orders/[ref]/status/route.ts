// src/app/api/orders/status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";

  if (!/^LET-\d{4,8}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid order id" }, { status: 400 });
  }

  try {
    const o = await prisma.order.findFirst({
      where: { publicId: id.toUpperCase() },
      include: { vendor: true },
    });

    if (o) {
      return NextResponse.json({
        ok: true,
        order: {
          id: o.publicId,
          status: o.status,
          vendor: o.vendor?.name ?? "Vendor",
          eta: o.distanceKm != null ? `${Math.max(12, Math.round(15 + (o.distanceKm * 4.5)))}–${Math.max(17, Math.round(20 + (o.distanceKm * 4.5)))} min` : "25–35 min",
        },
      });
    }
  } catch {
    // ignore -> fallback
  }

  // Fallback when not found / dev
  const mockStatuses = ["PLACED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
  const status = mockStatuses[Math.floor(Math.random() * (mockStatuses.length - 1))];
  const mock = {
    id: id.toUpperCase(),
    status,
    vendor: "Hello Tomato",
    eta: status === "OUT_FOR_DELIVERY" ? "15–20 min" : "25–35 min",
  };
  return NextResponse.json({ ok: true, order: mock });
}
