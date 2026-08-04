import { NextRequest, NextResponse } from "next/server";
import { getDemoOrderDetails, isDemoOrderRef } from "@/lib/demo-order";
import { getOrderRealtimeChannel, verifyOrderTrackingToken } from "@/lib/order-tracking-access";
import { buildTrackingSnapshot } from "@/lib/order-tracking";
import { runBoundedDbQuery } from "@/lib/query-timeout";
import { checkRateLimit } from "@/lib/rate-limit";
import { auth } from "@/auth";

type Params = { params: Promise<{ ref: string }> };

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function GET(req: NextRequest, { params }: Params) {
  const limited = await checkRateLimit({
    key: "order-tracking-details",
    limit: 60,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many tracking requests. Please try again later." },
      {
        status: 429,
        headers: { ...privateHeaders, "retry-after": String(limited.retryAfterSec) },
      },
    );
  }

  const { ref } = await params;
  const cleanRef = String(ref || "").trim();
  const normalizedRef = cleanRef.toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
  if (!cleanRef) {
    return NextResponse.json(
      { ok: false, error: "Order reference is required." },
      { status: 400, headers: privateHeaders },
    );
  }

  if (isDemoOrderRef(normalizedRef)) {
    return NextResponse.json(
      { ok: true, order: getDemoOrderDetails() },
      { headers: privateHeaders },
    );
  }

  const order = await runBoundedDbQuery((db) =>
    db.order.findFirst({
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
        userId: true,
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
  ).catch(() => null);

  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Order not found." },
      { status: 404, headers: privateHeaders },
    );
  }

  const trackingToken =
    req.nextUrl.searchParams.get("t")?.trim() || req.headers.get("x-tracking-token")?.trim() || "";
  const session = await auth().catch(() => null);
  const hasDetailedTracking =
    verifyOrderTrackingToken(trackingToken, order.ozowReference || order.publicId) ||
    Boolean(session?.user?.id && session.user.id === order.userId);

  if (!hasDetailedTracking) {
    return NextResponse.json(
      { ok: false, error: "Order not found." },
      { status: 404, headers: privateHeaders },
    );
  }

  const destination =
    order.customerLat != null && order.customerLng != null
      ? { lat: order.customerLat, lng: order.customerLng }
      : null;
  const vendorPoint =
    order.vendor?.latitude != null && order.vendor?.longitude != null
      ? { lat: order.vendor.latitude, lng: order.vendor.longitude }
      : null;
  const riderPoint =
    order.riderLat != null && order.riderLng != null
      ? { lat: order.riderLat, lng: order.riderLng }
      : null;

  const parsedOrderPayload = (() => {
    try {
      return JSON.parse(order.itemsJson || "[]");
    } catch {
      return [];
    }
  })();
  const items = Array.isArray(parsedOrderPayload)
    ? parsedOrderPayload
    : Array.isArray(parsedOrderPayload?.items)
      ? parsedOrderPayload.items
      : [];
  const deliveryDetails =
    !Array.isArray(parsedOrderPayload) && typeof parsedOrderPayload?.deliveryDetails === "object"
      ? parsedOrderPayload.deliveryDetails
      : null;

  const tracking = buildTrackingSnapshot({
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    riderLocatedAt: order.riderLocatedAt,
    vendor: vendorPoint,
    destination,
    rider: riderPoint,
  });

  return NextResponse.json(
    {
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
        deliveryDetails,
        vendor: {
          name: order.vendor?.name,
          suburb: order.vendor?.suburb,
          city: order.vendor?.city,
          latitude: order.vendor?.latitude,
          longitude: order.vendor?.longitude,
        },
        destination,
        rider: riderPoint
          ? {
              lat: riderPoint.lat,
              lng: riderPoint.lng,
              speed: order.riderSpeed,
              locatedAt: order.riderLocatedAt,
              simulated: false,
            }
          : null,
        channel: getOrderRealtimeChannel(order.ozowReference || order.publicId),
        tracking,
      },
    },
    { headers: privateHeaders },
  );
}
