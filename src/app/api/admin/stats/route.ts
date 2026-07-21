import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { withQueryTimeout } from "@/lib/query-timeout";

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth() {
  const value = new Date();
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function paidOrderWhere(from: Date) {
  return {
    createdAt: { gte: from },
    paymentStatus: { in: ["PAID", "SUCCESS"] },
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const today = startOfToday();
  const month = startOfMonth();
  const [
    ordersToday,
    revenueToday,
    revenueMonth,
    activeVendors,
    activeRiders,
    pendingDeliveries,
    delayedOrders,
    failedDeliveries,
    cancelledOrders,
    customerCount,
    reviewStats,
    topProducts,
    topVendors,
  ] = await Promise.all([
    withQueryTimeout(prisma.order.count({ where: { createdAt: { gte: today } } }), 0),
    withQueryTimeout(
      prisma.order.aggregate({ where: paidOrderWhere(today), _sum: { totalCents: true } }),
      { _sum: { totalCents: 0 } },
    ),
    withQueryTimeout(
      prisma.order.aggregate({ where: paidOrderWhere(month), _sum: { totalCents: true } }),
      { _sum: { totalCents: 0 } },
    ),
    withQueryTimeout(
      prisma.vendor.count({ where: { status: { in: ["APPROVED", "ACTIVE"] }, isActive: true } }),
      0,
    ),
    withQueryTimeout(prisma.riderApplication.count({ where: { status: "APPROVED" } }), 0),
    withQueryTimeout(
      prisma.order.count({
        where: {
          status: {
            in: [
              "NEW",
              "VENDOR_ACCEPTED",
              "PREPARING",
              "READY_FOR_PICKUP",
              "RIDER_ASSIGNED",
              "PICKED_UP",
              "ON_THE_WAY",
              "PLACED",
              "OUT_FOR_DELIVERY",
            ],
          },
        },
      }),
      0,
    ),
    withQueryTimeout(prisma.lateOrderFlag.count({ where: { resolved: false } }), 0),
    withQueryTimeout(
      prisma.order.count({ where: { status: { in: ["FAILED", "DELIVERY_FAILED"] } } }),
      0,
    ),
    withQueryTimeout(
      prisma.order.count({ where: { status: { in: ["CANCELED", "CANCELLED"] } } }),
      0,
    ),
    withQueryTimeout(prisma.user.count({ where: { role: { in: ["CUSTOMER", "USER"] } } }), 0),
    withQueryTimeout(prisma.userProductReview.aggregate({ _avg: { rating: true }, _count: true }), {
      _avg: { rating: 0 },
      _count: 0,
    }),
    withQueryTimeout(
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { qty: true },
        orderBy: { _sum: { qty: "desc" } },
        take: 5,
      }),
      [],
    ),
    withQueryTimeout(
      prisma.order.groupBy({
        by: ["vendorId"],
        _sum: { totalCents: true },
        orderBy: { _sum: { totalCents: "desc" } },
        take: 5,
      }),
      [],
    ),
  ]);

  const [productNames, vendorNames] = await Promise.all([
    withQueryTimeout(
      prisma.product.findMany({
        where: {
          id: { in: topProducts.map((item) => item.productId).filter(Boolean) as string[] },
        },
        select: { id: true, name: true },
      }),
      [],
    ),
    withQueryTimeout(
      prisma.vendor.findMany({
        where: { id: { in: topVendors.map((item) => item.vendorId) } },
        select: { id: true, name: true },
      }),
      [],
    ),
  ]);

  const productNameMap = new Map(productNames.map((item) => [item.id, item.name]));
  const vendorNameMap = new Map(vendorNames.map((item) => [item.id, item.name]));

  return NextResponse.json({
    ok: true,
    stats: {
      ordersToday,
      revenueTodayCents: revenueToday._sum.totalCents || 0,
      revenueMonthCents: revenueMonth._sum.totalCents || 0,
      activeVendors,
      activeRiders,
      pendingDeliveries,
      averageDeliveryTimeMins: 0,
      customerSatisfactionScore: Number((reviewStats._avg.rating || 0).toFixed(1)),
      delayedOrders,
      failedDeliveries,
      cancelledOrders,
      customerCount,
      reviewCount: reviewStats._count,
      topProducts: topProducts.map((item) => ({
        id: item.productId,
        name: item.productId
          ? productNameMap.get(item.productId) || "Unknown product"
          : "Unknown product",
        qty: item._sum.qty || 0,
      })),
      topVendors: topVendors.map((item) => ({
        id: item.vendorId,
        name: vendorNameMap.get(item.vendorId) || "Unknown vendor",
        revenueCents: item._sum.totalCents || 0,
      })),
    },
  });
}
