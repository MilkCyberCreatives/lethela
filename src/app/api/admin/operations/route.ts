import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { listAdminAuditLogs, logAdminAudit } from "@/lib/admin-audit";
import {
  createDispatchAssignment,
  createRefundCase,
  listOperationRows,
  recordOrderEvent,
} from "@/lib/order-operations";

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    orderRef: z.string().min(3),
    status: z.enum(["PLACED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"]),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("refund"),
    orderRef: z.string().min(3),
    amountCents: z.number().int().nonnegative(),
    reason: z.string().min(3),
    evidenceUrl: z.string().optional(),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("dispatch"),
    orderRef: z.string().min(3),
    riderApplicationId: z.string().min(3),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("event"),
    orderRef: z.string().min(3),
    type: z.string().min(2),
    note: z.string().optional(),
  }),
]);

async function findOrder(orderRef: string) {
  const clean = orderRef.trim();
  return prisma.order.findFirst({
    where: { OR: [{ publicId: clean }, { ozowReference: clean }] },
    select: {
      id: true,
      publicId: true,
      ozowReference: true,
      status: true,
      paymentStatus: true,
      totalCents: true,
      createdAt: true,
      vendor: { select: { name: true, phone: true } },
      user: { select: { email: true, name: true } },
    },
  });
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok)
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

  const [orders, riders, operations, auditLogs] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        publicId: true,
        ozowReference: true,
        status: true,
        paymentStatus: true,
        totalCents: true,
        createdAt: true,
        vendor: { select: { name: true, phone: true } },
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.riderApplication.findMany({
      where: { status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        fullName: true,
        phone: true,
        suburb: true,
        city: true,
        vehicleType: true,
      },
    }),
    listOperationRows(),
    listAdminAuditLogs(),
  ]);

  return NextResponse.json({
    ok: true,
    orders: orders.map((order) => ({
      id: order.id,
      publicId: order.publicId,
      ozowReference: order.ozowReference,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      vendorName: order.vendor?.name || "Unknown vendor",
      vendorPhone: order.vendor?.phone || null,
      customerName: order.user?.name || null,
      customerEmail: order.user?.email || null,
    })),
    riders,
    auditLogs,
    ...operations,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok)
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid operations payload." }, { status: 400 });
  }

  const order = await findOrder(parsed.data.orderRef);
  if (!order) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });

  const actor = guard.mode;
  if (parsed.data.action === "status") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: parsed.data.status },
    });
    await recordOrderEvent({
      orderId: order.id,
      publicId: order.publicId,
      type: `STATUS_${parsed.data.status}`,
      actor,
      note: parsed.data.note,
      meta: { previousStatus: order.status },
    });
    await logAdminAudit({
      actor,
      action: `set_order_${parsed.data.status.toLowerCase()}`,
      targetType: "order",
      targetId: order.id,
      before: { status: order.status },
      after: { status: parsed.data.status, publicId: order.publicId },
    });
  }

  if (parsed.data.action === "refund") {
    await createRefundCase({
      orderId: order.id,
      publicId: order.publicId,
      amountCents: parsed.data.amountCents,
      reason: parsed.data.reason,
      evidenceUrl: parsed.data.evidenceUrl,
      note: parsed.data.note,
      actor,
    });
    await recordOrderEvent({
      orderId: order.id,
      publicId: order.publicId,
      type: "REFUND_REQUESTED",
      actor,
      note: parsed.data.reason,
      meta: { amountCents: parsed.data.amountCents },
    });
    await logAdminAudit({
      actor,
      action: "create_refund_case",
      targetType: "order",
      targetId: order.id,
      after: {
        publicId: order.publicId,
        amountCents: parsed.data.amountCents,
        reason: parsed.data.reason,
      },
    });
  }

  if (parsed.data.action === "dispatch") {
    const rider = await prisma.riderApplication.findUnique({
      where: { id: parsed.data.riderApplicationId },
      select: { id: true, fullName: true, phone: true, status: true },
    });
    if (!rider || rider.status !== "APPROVED") {
      return NextResponse.json({ ok: false, error: "Choose an approved rider." }, { status: 400 });
    }
    await createDispatchAssignment({
      orderId: order.id,
      publicId: order.publicId,
      riderApplicationId: rider.id,
      riderName: rider.fullName,
      riderPhone: rider.phone,
      note: parsed.data.note,
      actor,
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: "OUT_FOR_DELIVERY" } });
    await recordOrderEvent({
      orderId: order.id,
      publicId: order.publicId,
      type: "RIDER_ASSIGNED",
      actor,
      note: parsed.data.note,
      meta: { riderId: rider.id, riderName: rider.fullName },
    });
    await logAdminAudit({
      actor,
      action: "assign_rider",
      targetType: "order",
      targetId: order.id,
      before: { status: order.status },
      after: { status: "OUT_FOR_DELIVERY", riderId: rider.id, riderName: rider.fullName },
    });
  }

  if (parsed.data.action === "event") {
    await recordOrderEvent({
      orderId: order.id,
      publicId: order.publicId,
      type: parsed.data.type,
      actor,
      note: parsed.data.note,
    });
    await logAdminAudit({
      actor,
      action: "record_order_note",
      targetType: "order",
      targetId: order.id,
      after: { publicId: order.publicId, type: parsed.data.type },
    });
  }

  return NextResponse.json({ ok: true });
}
