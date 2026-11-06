import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyOrderTrackingToken } from "@/lib/order-tracking-access";
import { createNotificationForUsers, notifyStaff } from "@/lib/notifications";
import { parseOrderPayload } from "@/lib/order-notifications";
import { settleWithin } from "@/lib/notification-channels";
import {
  LOW_RATING,
  ORDER_FEEDBACK_TYPE,
  canRateOrderStatus,
  firstName,
  getOrderFeedback,
  orderFeedbackId,
} from "@/lib/order-feedback";

type Params = { params: Promise<{ ref: string }> };

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

const BodySchema = z.object({
  storeRating: z.number().int().min(1).max(5),
  riderRating: z.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().trim().max(500).optional().default(""),
  t: z.string().trim().max(500).optional().default(""),
});

function normalizeRef(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// A customer rates a delivered order once: the store, the rider and an optional comment.
// Only the customer who can open the order's tracking page (signed in, or holding the
// tracking link) can rate it.
export async function POST(req: NextRequest, { params }: Params) {
  const limited = await checkRateLimit({
    key: "order-feedback",
    limit: 10,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many tries. Please try again later." },
      { status: 429, headers: { ...privateHeaders, "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Choose a star rating from 1 to 5." },
      { status: 400, headers: privateHeaders },
    );
  }

  const { ref } = await params;
  const cleanRef = String(ref || "").trim();
  const normalizedRef = normalizeRef(cleanRef);
  const order = await prisma.order
    .findFirst({
      where: {
        OR: [
          { ozowReference: cleanRef },
          { ozowReference: normalizedRef },
          { publicId: cleanRef },
          { publicId: normalizedRef },
        ],
      },
      select: {
        id: true,
        publicId: true,
        ozowReference: true,
        status: true,
        userId: true,
        vendorId: true,
        assignedRiderId: true,
        itemsJson: true,
        user: { select: { name: true } },
        vendor: { select: { name: true, ownerId: true, members: { select: { userId: true } } } },
        assignedRider: { select: { userId: true } },
      },
    })
    .catch(() => null);

  const notFound = NextResponse.json(
    { ok: false, error: "Order not found." },
    { status: 404, headers: privateHeaders },
  );
  if (!order) return notFound;

  const session = await auth().catch(() => null);
  const trackingToken = parsed.data.t || req.headers.get("x-tracking-token")?.trim() || "";
  const allowed =
    verifyOrderTrackingToken(trackingToken, order.ozowReference || order.publicId) ||
    Boolean(session?.user?.id && session.user.id === order.userId);
  if (!allowed) return notFound;

  if (!canRateOrderStatus(order.status)) {
    return NextResponse.json(
      { ok: false, error: "You can rate this order once it has been delivered." },
      { status: 409, headers: privateHeaders },
    );
  }

  if (await getOrderFeedback(order.publicId)) {
    return NextResponse.json(
      { ok: false, error: "This order has already been rated. Thank you!" },
      { status: 409, headers: privateHeaders },
    );
  }

  const deliveryDetails = parseOrderPayload(order.itemsJson).deliveryDetails;
  const customerName = firstName(order.user?.name || deliveryDetails?.customerName || "");
  const riderRating = order.assignedRiderId ? (parsed.data.riderRating ?? null) : null;
  const feedback = {
    orderRef: order.ozowReference || order.publicId,
    storeRating: parsed.data.storeRating,
    riderRating,
    riderId: order.assignedRiderId,
    comment: parsed.data.comment,
    customerName,
    submittedAt: new Date().toISOString(),
  };

  try {
    await prisma.platformMessage.create({
      data: {
        id: orderFeedbackId(order.publicId),
        recipientType: ORDER_FEEDBACK_TYPE,
        recipientId: order.vendorId,
        subject: `Order ${feedback.orderRef} rated ${feedback.storeRating}/5`,
        body: JSON.stringify(feedback),
        channel: "ORDER_PAGE",
        status: "OPEN",
        createdBy: order.userId || "GUEST_CUSTOMER",
      },
    });
  } catch {
    // The fixed id makes a second rating of the same order fail here.
    return NextResponse.json(
      { ok: false, error: "This order has already been rated. Thank you!" },
      { status: 409, headers: privateHeaders },
    );
  }

  const storeUserIds = [
    order.vendor?.ownerId || "",
    ...(order.vendor?.members ?? []).map((member) => member.userId),
  ];
  const stars = (value: number) => `${value} star${value === 1 ? "" : "s"}`;
  const low =
    feedback.storeRating <= LOW_RATING ||
    (feedback.riderRating != null && feedback.riderRating <= LOW_RATING);

  await settleWithin(
    Promise.allSettled([
      createNotificationForUsers(storeUserIds, {
        type: "order_rating",
        title: `A customer gave you ${stars(feedback.storeRating)}`,
        body: feedback.comment || `Order ${feedback.orderRef}`,
        href: "/vendors/dashboard?tab=experience",
      }),
      feedback.riderRating != null && order.assignedRider?.userId
        ? createNotificationForUsers([order.assignedRider.userId], {
            type: "order_rating",
            title: `A customer gave your delivery ${stars(feedback.riderRating)}`,
            body: `Order ${feedback.orderRef}`,
            href: "/rider/dashboard",
          })
        : Promise.resolve(null),
      low
        ? notifyStaff({
            type: "order_rating_low",
            title: `Low rating on order ${feedback.orderRef}`,
            body: [
              `Store ${order.vendor?.name || ""}: ${feedback.storeRating}/5`,
              feedback.riderRating != null ? `Rider: ${feedback.riderRating}/5` : "",
              feedback.comment,
            ]
              .filter(Boolean)
              .join(" · "),
            href: "/admin?view=messages",
          })
        : Promise.resolve(null),
    ]),
    3_000,
  );

  return NextResponse.json({ ok: true, feedback }, { headers: privateHeaders });
}
