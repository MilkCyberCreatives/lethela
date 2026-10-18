import { NextResponse } from "next/server";
import { z } from "zod";
import { optionalReason } from "@/lib/review-reason";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";
import { vendorApiErrorMessage, vendorApiErrorStatus } from "@/lib/vendor-api-error";
import { pusherServer } from "@/lib/pusher-server";
import { notifyOrderStatusPush } from "@/lib/order-notifications";
import { settleWithin } from "@/lib/notification-channels";
import { canTransitionOrderStatus, normalizeOrderStatus } from "@/lib/order-state";
import { recordOrderEvent } from "@/lib/order-operations";
import { dispatchReadyOrder } from "@/lib/order-automation";
import { isConfirmedPayment } from "@/lib/payment-status";

const StatusSchema = z
  .object({
    status: z.enum(["VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "CANCELLED"]),
    reason: optionalReason(),
  })
  .refine((value) => value.status !== "CANCELLED" || Boolean(value.reason), {
    message: "A cancellation reason is required.",
    path: ["reason"],
  });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendor("STAFF");
    const { id } = await params;
    const cleanId = String(id || "").trim();
    const body = await req.json().catch(() => ({}));
    const parsed = StatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid order status payload" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        vendorId,
        OR: [{ publicId: cleanId }, { ozowReference: cleanId }],
      },
      select: {
        id: true,
        publicId: true,
        ozowReference: true,
        status: true,
        paymentStatus: true,
      },
    });
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    if (!isConfirmedPayment(order.paymentStatus)) {
      return NextResponse.json(
        { ok: false, error: "This order has not been verified as paid." },
        { status: 409 },
      );
    }
    const currentStatus = normalizeOrderStatus(order.status);
    if (!currentStatus || !canTransitionOrderStatus(currentStatus, parsed.data.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Order cannot move from ${currentStatus} to ${parsed.data.status}.`,
        },
        { status: 409 },
      );
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: parsed.data.status,
        statusReason: parsed.data.reason || null,
        ...(parsed.data.status === "CANCELLED"
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
      type: "STATUS_CHANGED",
      actor: `vendor:${vendorId}`,
      note: parsed.data.reason || `${currentStatus} -> ${parsed.data.status}`,
      meta: { from: currentStatus, to: parsed.data.status },
    });

    try {
      const channel = `order-${order.ozowReference || order.publicId}`;
      await pusherServer.trigger(channel, "status", {
        status: parsed.data.status,
        at: new Date().toISOString(),
      });
    } catch {
      // realtime may be disabled in local environments
    }

    // A ready order goes straight to a free rider; the messages follow the outcome.
    if (parsed.data.status === "READY_FOR_PICKUP") {
      await dispatchReadyOrder(order.id);
    } else {
      await settleWithin(notifyOrderStatusPush(order.id, parsed.data.status), 3000);
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: vendorApiErrorMessage(error, "Failed to update the vendor order.") },
      { status: vendorApiErrorStatus(error) },
    );
  }
}
