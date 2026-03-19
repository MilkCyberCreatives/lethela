import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDemoOrderDetails, isDemoOrderRef } from "@/lib/demo-order";
import { buildTrackingSnapshot } from "@/lib/order-tracking";
import { withQueryTimeout } from "@/lib/query-timeout";

type Params = { params: Promise<{ ref: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { ref } = await params;
  const cleanRef = String(ref || "").trim();
  const normalizedRef = cleanRef.toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
  if (!cleanRef) {
    return NextResponse.json({ ok: false, error: "Order reference is required." }, { status: 400 });
  }

  if (isDemoOrderRef(normalizedRef)) {
    return NextResponse.json({ ok: true, order: getDemoOrderDetails() });
  }

  const order = await withQueryTimeout(
    prisma.order.findFirst({
      where: {
        OR: [
          { ozowReference: cleanRef },
          { ozowReference: normalizedRef },
          { publicId: cleanRef },
          { publicId: normalizedRef },
        ],
      },
      select: {
        publicId: true,
        ozowReference: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
        customerLat: true,
        customerLng: true,
        riderLat: true,
        riderLng: true,
        riderSpeed: true,
        riderLocatedAt: true,
        totalCents: true,
        itemsJson: true,
        vendor: {
          select: {
            name: true,
            latitude: true,
            longitude: true,
            suburb: true,
            city: true,
          },
        },
      },
    }),
    null
  );

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  const destination =
    order.customerLat != null && order.customerLng != null ? { lat: order.customerLat, lng: order.customerLng } : null;
  const vendorPoint =
    order.vendor?.latitude != null && order.vendor?.longitude != null
      ? { lat: order.vendor.latitude, lng: order.vendor.longitude }
      : null;
  const riderPoint =
    order.riderLat != null && order.riderLng != null ? { lat: order.riderLat, lng: order.riderLng } : null;

  const items = (() => {
    try {
      const parsed = JSON.parse(order.itemsJson || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const tracking = buildTrackingSnapshot({
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    riderLocatedAt: order.riderLocatedAt,
    vendor: vendorPoint,
    destination,
    rider: riderPoint,
  });

  return NextResponse.json({
    ok: true,
    order: {
      id: order.ozowReference || order.publicId,
      publicId: order.publicId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      totalCents: order.totalCents,
      items,
      vendor: order.vendor,
      destination,
      rider:
        riderPoint || tracking.rider
          ? {
              lat: (riderPoint || tracking.rider)!.lat,
              lng: (riderPoint || tracking.rider)!.lng,
              speed: order.riderSpeed,
              locatedAt: order.riderLocatedAt,
              simulated: !riderPoint,
            }
          : null,
      tracking,
    },
  });
}
