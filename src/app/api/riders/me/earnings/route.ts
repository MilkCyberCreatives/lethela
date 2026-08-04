import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const start = startOfDay(date);
  const day = start.getDay();
  const offset = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - offset);
  return start;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function orderEarnings(order: {
  riderPayoutCents: number;
  deliveryFeeCents: number;
  riderTipCents: number;
}) {
  return order.riderPayoutCents || order.deliveryFeeCents + order.riderTipCents;
}

function sumOrders(
  orders: Array<{
    riderPayoutCents: number;
    deliveryFeeCents: number;
    riderTipCents: number;
  }>,
) {
  return orders.reduce(
    (totals, order) => ({
      totalCents: totals.totalCents + orderEarnings(order),
      deliveryCents: totals.deliveryCents + order.deliveryFeeCents,
      tipCents: totals.tipCents + order.riderTipCents,
      deliveries: totals.deliveries + 1,
    }),
    { totalCents: 0, deliveryCents: 0, tipCents: 0, deliveries: 0 },
  );
}

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id || (session.user.role !== "RIDER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ ok: false, error: "Rider access required." }, { status: 401 });
  }

  const sessionEmail = session.user.email?.trim().toLowerCase() || null;
  const application = await prisma.riderApplication.findFirst({
    where: {
      OR: [{ userId: session.user.id }, ...(sessionEmail ? [{ email: sessionEmail }] : [])],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true },
  });
  if (!application) {
    return NextResponse.json({ ok: false, error: "Rider profile not found." }, { status: 404 });
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const orders = await prisma.order.findMany({
    where: {
      assignedRiderId: application.id,
      status: "DELIVERED",
      paymentStatus: { in: ["PAID", "SUCCESS"] },
      updatedAt: { gte: monthStart },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      publicId: true,
      ozowReference: true,
      riderPayoutCents: true,
      deliveryFeeCents: true,
      riderTipCents: true,
      updatedAt: true,
      vendor: { select: { name: true } },
    },
  });

  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const todayOrders = orders.filter((order) => order.updatedAt >= todayStart);
  const weekOrders = orders.filter((order) => order.updatedAt >= weekStart);

  return NextResponse.json({
    ok: true,
    approvalStatus: application.status,
    today: sumOrders(todayOrders),
    week: sumOrders(weekOrders),
    month: sumOrders(orders),
    recent: orders.slice(0, 8).map((order) => ({
      ref: order.ozowReference || order.publicId,
      vendor: order.vendor?.name || "Vendor",
      totalCents: orderEarnings(order),
      deliveryCents: order.deliveryFeeCents,
      tipCents: order.riderTipCents,
      deliveredAt: order.updatedAt,
    })),
    settlementNote:
      "These totals show completed rider earnings. Lethela operations must still reconcile the actual bank settlement.",
  });
}
