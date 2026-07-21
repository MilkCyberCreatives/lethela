import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEMO_ORDER_REF, isDemoOrderRef } from "@/lib/demo-order";
import { getOrderRealtimeChannel } from "@/lib/order-tracking-access";
import { pusherServer } from "@/lib/pusher-server";
import { runBoundedDbQuery } from "@/lib/query-timeout";
import { requireVendor } from "@/lib/authz";
import { readRiderConsoleToken } from "@/lib/rider-console";
import { notifyOrderStatusPush } from "@/lib/order-notifications";
import { settleWithin } from "@/lib/notification-channels";
import { canTransitionOrderStatus, ORDER_STATUSES } from "@/lib/order-state";
import { parseOrderPayload } from "@/lib/order-notifications";
import { recordOrderEvent } from "@/lib/order-operations";

const BodySchema = z.object({
  status: z.enum(ORDER_STATUSES),
  reason: z.string().trim().max(500).optional(),
  liquorIdVerified: z.boolean().optional(),
});

type Params = { params: Promise<{ ref: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { ref } = await params;
  const cleanRef = String(ref || "").trim();
  if (!cleanRef) {
    return NextResponse.json({ ok: false, error: "Order reference is required." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid status payload." }, { status: 400 });
  }

  const canonicalStatus = parsed.data.status;
  let vendorSession: Awaited<ReturnType<typeof requireVendor>> | null = null;
  try {
    vendorSession = await requireVendor("STAFF");
  } catch {
    vendorSession = null;
  }

  const url = new URL(req.url);
  const riderToken = readRiderConsoleToken(
    req.headers.get("x-rider-token")?.trim() || url.searchParams.get("token")?.trim() || null,
  );

  if (!vendorSession && !riderToken) {
    return NextResponse.json(
      { ok: false, error: "Authorized rider or vendor access required." },
      { status: 401 },
    );
  }

  if (isDemoOrderRef(cleanRef)) {
    if (!vendorSession && riderToken?.ref !== DEMO_ORDER_REF) {
      return NextResponse.json(
        { ok: false, error: "Authorized rider or vendor access required." },
        { status: 401 },
      );
    }

    try {
      await pusherServer.trigger(`order-${DEMO_ORDER_REF}`, "status", {
        status: canonicalStatus,
        at: new Date().toISOString(),
      });
    } catch {
      // realtime may be disabled locally
    }
    return NextResponse.json({ ok: true, status: canonicalStatus });
  }

  const order = await runBoundedDbQuery((db) =>
    db.order.findFirst({
      where: riderToken
        ? {
            OR: [
              { ozowReference: cleanRef },
              { publicId: cleanRef },
              { publicId: cleanRef.toUpperCase() },
            ],
          }
        : {
            vendorId: vendorSession?.vendorId,
            OR: [
              { ozowReference: cleanRef },
              { publicId: cleanRef },
              { publicId: cleanRef.toUpperCase() },
            ],
          },
      select: {
        id: true,
        vendorId: true,
        ozowReference: true,
        publicId: true,
        assignedRiderId: true,
        status: true,
        itemsJson: true,
      },
    }),
  ).catch(() => null);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  const riderRef = riderToken?.ref;
  const publicRef = String(order.publicId || "")
    .trim()
    .toUpperCase();
  const ozowRef = String(order.ozowReference || "")
    .trim()
    .toUpperCase();
  const isVendorAuthorized = vendorSession?.vendorId === order.vendorId;
  const isRiderAuthorized = Boolean(
    riderRef &&
      (riderRef === publicRef || riderRef === ozowRef) &&
      order.assignedRiderId &&
      riderToken?.riderId === order.assignedRiderId,
  );

  if (!isVendorAuthorized && !isRiderAuthorized) {
    return NextResponse.json(
      { ok: false, error: "Authorized rider or vendor access required." },
      { status: 401 },
    );
  }
  const vendorStatuses = ["VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "CANCELLED"];
  const riderStatuses = ["READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY", "DELIVERED", "CANCELLED"];
  if (
    (isVendorAuthorized && !vendorStatuses.includes(canonicalStatus)) ||
    (isRiderAuthorized && !riderStatuses.includes(canonicalStatus)) ||
    !canTransitionOrderStatus(order.status, canonicalStatus)
  ) {
    return NextResponse.json(
      { ok: false, error: "This status change is not allowed." },
      { status: 409 },
    );
  }
  if (
    ((isRiderAuthorized && canonicalStatus === "READY_FOR_PICKUP") ||
      canonicalStatus === "CANCELLED") &&
    !parsed.data.reason
  ) {
    return NextResponse.json(
      { ok: false, error: "A decline, cancellation, or refusal reason is required." },
      { status: 400 },
    );
  }
  const orderPayload = parseOrderPayload(order.itemsJson);
  const containsAlcohol = Boolean(
    orderPayload.deliveryDetails?.containsAlcohol ||
      orderPayload.items.some((item) => item.isAlcohol),
  );
  if (
    isRiderAuthorized &&
    canonicalStatus === "DELIVERED" &&
    containsAlcohol &&
    !parsed.data.liquorIdVerified
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Confirm that valid adult ID was checked before completing this liquor delivery.",
      },
      { status: 400 },
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: canonicalStatus,
      statusReason: parsed.data.reason || null,
      ...(isRiderAuthorized && canonicalStatus === "DELIVERED" && containsAlcohol
        ? { liquorIdVerifiedAt: new Date() }
        : {}),
      ...(isRiderAuthorized && canonicalStatus === "READY_FOR_PICKUP"
        ? { assignedRiderId: null }
        : {}),
      ...(canonicalStatus === "DELIVERED" || canonicalStatus === "CANCELLED"
        ? {
            riderLat: null,
            riderLng: null,
            riderSpeed: null,
          }
        : {}),
    },
  });

  await recordOrderEvent({
    orderId: order.id,
    publicId: order.publicId,
    type:
      isRiderAuthorized && canonicalStatus === "READY_FOR_PICKUP"
        ? "RIDER_ASSIGNMENT_DECLINED"
        : `STATUS_${canonicalStatus}`,
    actor: isRiderAuthorized ? `rider:${order.assignedRiderId}` : `vendor:${order.vendorId}`,
    note: parsed.data.reason,
    meta: {
      previousStatus: order.status,
      liquorIdVerified: canonicalStatus === "DELIVERED" && containsAlcohol,
    },
  });

  try {
    const channel = getOrderRealtimeChannel(order.ozowReference || order.publicId);
    await pusherServer.trigger(channel, "status", {
      status: canonicalStatus,
      at: new Date().toISOString(),
    });
  } catch {
    // do not block successful updates when realtime is not configured
  }

  await settleWithin(notifyOrderStatusPush(order.id, canonicalStatus), 3000);

  return NextResponse.json({ ok: true, status: canonicalStatus });
}
