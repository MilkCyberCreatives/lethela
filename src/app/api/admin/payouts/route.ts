import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { logAdminAudit } from "@/lib/admin-audit";

const PayoutSchema = z.object({
  orderRef: z.string().trim().min(3).max(120),
  kind: z.enum(["VENDOR", "RIDER"]),
  reference: z.string().trim().min(3).max(160),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req, "payouts:manage");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  const orders = await prisma.order.findMany({
    where: { paymentStatus: "PAID", status: "DELIVERED" },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      publicId: true,
      ozowReference: true,
      subtotalCents: true,
      deliveryFeeCents: true,
      riderTipCents: true,
      riderPayoutCents: true,
      riderPayoutStatus: true,
      riderPayoutReference: true,
      riderPayoutDate: true,
      vendorPayoutCents: true,
      platformFeeCents: true,
      vendorPayoutStatus: true,
      vendorPayoutReference: true,
      vendorPayoutDate: true,
      vendor: { select: { name: true } },
      assignedRider: { select: { fullName: true } },
    },
  });
  return NextResponse.json({ ok: true, orders });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRequest(req, "payouts:manage");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  const parsed = PayoutSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payout payload." }, { status: 400 });
  }
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ publicId: parsed.data.orderRef }, { ozowReference: parsed.data.orderRef }],
    },
    select: {
      id: true,
      publicId: true,
      paymentStatus: true,
      status: true,
      assignedRiderId: true,
      riderPayoutStatus: true,
      vendorPayoutStatus: true,
    },
  });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  if (order.paymentStatus !== "PAID" || order.status !== "DELIVERED") {
    return NextResponse.json(
      { ok: false, error: "Only delivered, verified-paid orders can be paid out." },
      { status: 409 },
    );
  }
  if (parsed.data.kind === "RIDER" && !order.assignedRiderId) {
    return NextResponse.json(
      { ok: false, error: "No rider is assigned to this order." },
      { status: 409 },
    );
  }
  const alreadyPaid =
    parsed.data.kind === "RIDER"
      ? order.riderPayoutStatus === "PAID"
      : order.vendorPayoutStatus === "PAID";
  if (alreadyPaid) {
    return NextResponse.json(
      { ok: false, error: "This payout is already marked paid." },
      { status: 409 },
    );
  }

  const paidAt = new Date();
  const result = await prisma.order.updateMany({
    where: {
      id: order.id,
      ...(parsed.data.kind === "RIDER"
        ? { riderPayoutStatus: { not: "PAID" } }
        : { vendorPayoutStatus: { not: "PAID" } }),
    },
    data:
      parsed.data.kind === "RIDER"
        ? {
            riderPayoutStatus: "PAID",
            riderPayoutReference: parsed.data.reference,
            riderPayoutDate: paidAt,
          }
        : {
            vendorPayoutStatus: "PAID",
            vendorPayoutReference: parsed.data.reference,
            vendorPayoutDate: paidAt,
          },
  });
  if (result.count !== 1) {
    return NextResponse.json(
      { ok: false, error: "This payout was already processed." },
      { status: 409 },
    );
  }
  await logAdminAudit({
    actor: guard.actor,
    action: `mark_${parsed.data.kind.toLowerCase()}_payout_paid`,
    targetType: "order",
    targetId: order.id,
    before: {
      status: parsed.data.kind === "RIDER" ? order.riderPayoutStatus : order.vendorPayoutStatus,
    },
    after: { status: "PAID", reference: parsed.data.reference, publicId: order.publicId },
  });
  return NextResponse.json({ ok: true, paidAt, reference: parsed.data.reference });
}
