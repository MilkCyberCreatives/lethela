import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDemoOrderSummary, isDemoOrderRef } from "@/lib/demo-order";
import { buildTrackingSnapshot, getTrackingEta } from "@/lib/order-tracking";
import { verifyOrderTrackingToken } from "@/lib/order-tracking-access";
import { runBoundedDbQuery } from "@/lib/query-timeout";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "order-status-lookup",
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

  const id = String(req.nextUrl.searchParams.get("id") || "")
    .trim()
    .toUpperCase();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Order id is required" },
      { status: 400, headers: privateHeaders },
    );
  }

  if (isDemoOrderRef(id)) {
    return NextResponse.json(
      { ok: true, order: getDemoOrderSummary() },
      { headers: privateHeaders },
    );
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
    }),
  ).catch(() => null);

  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Order not found" },
      { status: 404, headers: privateHeaders },
    );
  }

  const trackingToken =
    req.nextUrl.searchParams.get("t")?.trim() || req.headers.get("x-tracking-token")?.trim() || "";
  const session = await auth().catch(() => null);
  const resolvedRef = order.ozowReference || order.publicId;
  const allowed =
    verifyOrderTrackingToken(trackingToken, resolvedRef) ||
    Boolean(session?.user?.id && session.user.id === order.userId);

  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Order not found" },
      { status: 404, headers: privateHeaders },
    );
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
      order.riderLat != null && order.riderLng != null
        ? { lat: order.riderLat, lng: order.riderLng }
        : null,
  });

  return NextResponse.json(
    {
      ok: true,
      order: {
        id: resolvedRef,
        status: order.status,
        eta: tracking.etaLabel || getTrackingEta(order.status),
        vendor: order.vendor?.name ?? "Unknown vendor",
        progressPct: tracking.progressPct,
      },
    },
    { headers: privateHeaders },
  );
}
