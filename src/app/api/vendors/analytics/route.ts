// src/app/api/vendors/analytics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

export async function GET() {
  try {
    const { vendorId } = await requireVendor("STAFF");

    // last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { vendorId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: {
        publicId: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        subtotalCents: true,
        deliveryFeeCents: true,
        totalCents: true,
        items: {
          select: {
            qty: true,
          },
        },
      },
    });

    const days: Record<
      string,
      {
        date: string;
        orders: number;
        revenueCents: number;
        subtotalCents: number;
        deliveryFeeCents: number;
        paidRevenueCents: number;
        pendingRevenueCents: number;
      }
    > = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      days[key] = {
        date: key,
        orders: 0,
        revenueCents: 0,
        subtotalCents: 0,
        deliveryFeeCents: 0,
        paidRevenueCents: 0,
        pendingRevenueCents: 0,
      };
    }

    const paymentSummary = {
      paidOrders: 0,
      pendingOrders: 0,
      failedOrders: 0,
      paidRevenueCents: 0,
      pendingRevenueCents: 0,
      failedRevenueCents: 0,
    };

    const weekdayMap: Record<
      string,
      { weekday: string; orders: number; revenueCents: number; avgOrderCents: number }
    > = {
      Sun: { weekday: "Sun", orders: 0, revenueCents: 0, avgOrderCents: 0 },
      Mon: { weekday: "Mon", orders: 0, revenueCents: 0, avgOrderCents: 0 },
      Tue: { weekday: "Tue", orders: 0, revenueCents: 0, avgOrderCents: 0 },
      Wed: { weekday: "Wed", orders: 0, revenueCents: 0, avgOrderCents: 0 },
      Thu: { weekday: "Thu", orders: 0, revenueCents: 0, avgOrderCents: 0 },
      Fri: { weekday: "Fri", orders: 0, revenueCents: 0, avgOrderCents: 0 },
      Sat: { weekday: "Sat", orders: 0, revenueCents: 0, avgOrderCents: 0 },
    };

    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (!days[key]) continue;
      days[key].orders += 1;
      days[key].revenueCents += o.totalCents;
      days[key].subtotalCents += o.subtotalCents;
      days[key].deliveryFeeCents += o.deliveryFeeCents;

      const payment = String(o.paymentStatus || "").toUpperCase();
      if (payment === "PAID" || payment === "SUCCESS") {
        days[key].paidRevenueCents += o.totalCents;
        paymentSummary.paidOrders += 1;
        paymentSummary.paidRevenueCents += o.totalCents;
      } else if (payment === "FAILED" || payment === "CANCELLED") {
        paymentSummary.failedOrders += 1;
        paymentSummary.failedRevenueCents += o.totalCents;
      } else {
        days[key].pendingRevenueCents += o.totalCents;
        paymentSummary.pendingOrders += 1;
        paymentSummary.pendingRevenueCents += o.totalCents;
      }

      const weekday = o.createdAt.toLocaleDateString("en-US", { weekday: "short" });
      if (weekdayMap[weekday]) {
        weekdayMap[weekday].orders += 1;
        weekdayMap[weekday].revenueCents += o.totalCents;
      }
    }

    const series = Object.values(days);
    const weekdaySeries = Object.values(weekdayMap).map((entry) => ({
      ...entry,
      avgOrderCents: entry.orders > 0 ? Math.round(entry.revenueCents / entry.orders) : 0,
    }));
    const recentOrders = [...orders]
      .slice(-8)
      .reverse()
      .map((order) => ({
        publicId: order.publicId,
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotalCents: order.subtotalCents,
        deliveryFeeCents: order.deliveryFeeCents,
        totalCents: order.totalCents,
        itemsCount: order.items.reduce((sum, item) => sum + item.qty, 0),
      }));

    return NextResponse.json({
      ok: true,
      series,
      weekdaySeries,
      paymentSummary,
      recentOrders,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Auth error" },
      { status: 401 }
    );
  }
}
