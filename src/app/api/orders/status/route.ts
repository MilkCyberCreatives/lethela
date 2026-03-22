import { NextResponse } from "next/server";
import { getDemoOrderSummary, isDemoOrderRef } from "@/lib/demo-order";
import { buildTrackingSnapshot, getTrackingEta } from "@/lib/order-tracking";
import { runBoundedDbQuery } from "@/lib/query-timeout";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") || "").trim().toUpperCase();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Order id is required" }, { status: 400 });
  }

  if (isDemoOrderRef(id)) {
    return NextResponse.json({ ok: true, order: getDemoOrderSummary() });
  }

  const order = await runBoundedDbQuery((db) =>
    db.order.findFirst({
      where: {
        OR: [{ publicId: id }, { ozowReference: id }],
      },
      include: {
        vendor: {
          select: { name: true, latitude: true, longitude: true },
        },
      },
    })
  ).catch(() => null);

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const tracking = buildTrackingSnapshot({
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    riderLocatedAt: order.riderLocatedAt,
    vendor:
      order.vendor?.latitude != null && order.vendor?.longitude != null
        ? { lat: order.vendor.latitude, lng: order.vendor.longitude }
        : null,
    destination:
      order.customerLat != null && order.customerLng != null
        ? { lat: order.customerLat, lng: order.customerLng }
        : null,
    rider:
      order.riderLat != null && order.riderLng != null ? { lat: order.riderLat, lng: order.riderLng } : null,
  });

  return NextResponse.json({
    ok: true,
    order: {
      id: order.ozowReference || order.publicId,
      status: order.status,
      eta: tracking.etaLabel || getTrackingEta(order.status),
      vendor: order.vendor?.name ?? "Unknown vendor",
      progressPct: tracking.progressPct,
    },
  });
}
