import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

function isPaid(paymentStatus: string) {
  const payment = String(paymentStatus || "").toUpperCase();
  return payment === "PAID" || payment === "SUCCESS";
}

function isFailed(paymentStatus: string, orderStatus: string) {
  const payment = String(paymentStatus || "").toUpperCase();
  const status = String(orderStatus || "").toUpperCase();
  return payment === "FAILED" || payment === "CANCELLED" || status === "CANCELED";
}

function nextPayoutDate() {
  const next = new Date();
  next.setDate(next.getDate() + 2);
  next.setHours(10, 0, 0, 0);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function GET() {
  try {
    const session = await requireVendor("STAFF");
    const vendorId = session.vendorId;

    const since30 = new Date();
    since30.setDate(since30.getDate() - 29);
    since30.setHours(0, 0, 0, 0);

    const since7 = new Date();
    since7.setDate(since7.getDate() - 6);
    since7.setHours(0, 0, 0, 0);

    const [vendor, orders, products, sections, items, hours, specials, lateFlags, members] = await Promise.all([
      prisma.vendor.findUnique({
        where: { id: vendorId },
        select: {
          id: true,
          slug: true,
        name: true,
        status: true,
        isActive: true,
        ownerId: true,
        phone: true,
          address: true,
          suburb: true,
          city: true,
          province: true,
          latitude: true,
          longitude: true,
          rating: true,
          kycIdUrl: true,
          kycProofUrl: true,
        },
      }),
      prisma.order.findMany({
        where: { vendorId, createdAt: { gte: since30 } },
        orderBy: { createdAt: "desc" },
        select: {
          publicId: true,
          status: true,
          paymentStatus: true,
          subtotalCents: true,
          deliveryFeeCents: true,
          totalCents: true,
          createdAt: true,
          items: { select: { qty: true } },
        },
      }),
      prisma.product.findMany({
        where: { vendorId },
        select: { id: true, name: true, inStock: true, updatedAt: true },
      }),
      prisma.menuSection.findMany({
        where: { vendorId },
        select: { id: true, title: true },
      }),
      prisma.item.findMany({
        where: { vendorId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, draft: true, updatedAt: true },
      }),
      prisma.operatingHour.findMany({
        where: { vendorId, closed: false },
        select: { day: true },
      }),
      prisma.special.findMany({
        where: { vendorId },
        orderBy: { startsAt: "asc" },
        select: { id: true, title: true, draft: true, startsAt: true, endsAt: true },
      }),
      prisma.lateOrderFlag.findMany({
        where: { vendorId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderPublic: true,
          etaMinutes: true,
          createdAt: true,
          resolved: true,
          aiMessage: true,
        },
      }),
      prisma.vendorMember.findMany({
        where: { vendorId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          createdAt: true,
          userId: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
    ]);

    if (!vendor) {
      return NextResponse.json({ ok: false, error: "Vendor not found." }, { status: 404 });
    }

    const completedOrders = orders.filter((order) => !isFailed(order.paymentStatus, order.status));
    const paidOrders = completedOrders.filter((order) => isPaid(order.paymentStatus));
    const pendingSettlementOrders = completedOrders.filter((order) => !isPaid(order.paymentStatus));
    const failedOrders = orders.filter((order) => isFailed(order.paymentStatus, order.status));
    const recentPaidOrders = paidOrders.filter((order) => new Date(order.createdAt) >= since7);
    const latestPaidOrder = paidOrders[0] || null;

    const payouts = {
      availableCents: paidOrders.reduce((sum, order) => sum + order.totalCents, 0),
      pendingCents: pendingSettlementOrders.reduce((sum, order) => sum + order.totalCents, 0),
      failedCents: failedOrders.reduce((sum, order) => sum + order.totalCents, 0),
      last7DaysCents: recentPaidOrders.reduce((sum, order) => sum + order.totalCents, 0),
      averagePaidOrderCents: paidOrders.length
        ? Math.round(paidOrders.reduce((sum, order) => sum + order.totalCents, 0) / paidOrders.length)
        : 0,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount: pendingSettlementOrders.length,
      failedOrdersCount: failedOrders.length,
      nextEstimatedPayoutAt: nextPayoutDate().toISOString(),
      latestPaidAt: latestPaidOrder ? latestPaidOrder.createdAt.toISOString() : null,
      recentSettlements: paidOrders.slice(0, 6).map((order) => ({
        publicId: order.publicId,
        createdAt: order.createdAt.toISOString(),
        amountCents: order.totalCents,
        itemsCount: order.items.reduce((sum, item) => sum + item.qty, 0),
      })),
    };

    const missingProfile = !vendor.phone || !vendor.address || !vendor.city || !vendor.suburb || !vendor.province;
    const lowStockProducts = products.filter((product) => !product.inStock);
    const draftItems = items.filter((item) => item.draft);
    const upcomingDraftSpecials = specials.filter((special) => special.draft);
    const unresolvedLateFlags = lateFlags.filter((flag) => !flag.resolved);

    const notifications = [
      missingProfile
        ? {
            id: "profile",
            tone: "warning",
            title: "Complete your store profile",
            body: "Missing phone, address, or suburb details can block orders and support.",
            href: "/vendors/dashboard?tab=profile",
          }
        : null,
      vendor.latitude == null || vendor.longitude == null
        ? {
            id: "maps",
            tone: "warning",
            title: "Store coordinates missing",
            body: "Add map coordinates so tracking and delivery estimates work correctly.",
            href: "/vendors/dashboard?tab=profile",
          }
        : null,
      hours.length === 0
        ? {
            id: "hours",
            tone: "warning",
            title: "Trading hours not set",
            body: "Customers need to know when the store is open.",
            href: "/vendors/dashboard?tab=hours",
          }
        : null,
      sections.length === 0
        ? {
            id: "sections",
            tone: "warning",
            title: "Create menu sections",
            body: "Your public menu needs sections like Meals, Drinks, Mogodu, or Specials.",
            href: "/vendors/dashboard?tab=menu",
          }
        : null,
      draftItems.length > 0
        ? {
            id: "draft-items",
            tone: "info",
            title: `${draftItems.length} draft menu item(s) still hidden`,
            body: "Publish draft items when they are ready to appear on the customer-facing menu.",
            href: "/vendors/dashboard?tab=menu",
          }
        : null,
      lowStockProducts.length > 0
        ? {
            id: "stock",
            tone: "danger",
            title: `${lowStockProducts.length} product(s) marked out of stock`,
            body: "Update stock or customer-facing menu items so shoppers do not hit dead ends.",
            href: "/vendors/dashboard?tab=menu",
          }
        : null,
      unresolvedLateFlags.length > 0
        ? {
            id: "late-orders",
            tone: "danger",
            title: `${unresolvedLateFlags.length} late order flag(s) need attention`,
            body: unresolvedLateFlags[0]?.aiMessage || "Recent deliveries have exceeded ETA and need follow-up.",
            href: "/vendors/dashboard?tab=orders",
          }
        : null,
      pendingSettlementOrders.length > 0
        ? {
            id: "pending-payments",
            tone: "info",
            title: `${pendingSettlementOrders.length} payment(s) still pending`,
            body: "Review recent orders and confirm payment status with support where necessary.",
            href: "/vendors/dashboard?tab=payouts",
          }
        : null,
      upcomingDraftSpecials.length > 0
        ? {
            id: "draft-specials",
            tone: "info",
            title: `${upcomingDraftSpecials.length} special(s) still in draft`,
            body: "Publish promotions before they start so customers can see them in time.",
            href: "/vendors/dashboard?tab=specials",
          }
        : null,
      !vendor.isActive
        ? {
            id: "paused",
            tone: "warning",
            title: "Store is currently paused",
            body: "Resume the store when you are ready to accept new orders again.",
            href: "/vendors/dashboard?tab=profile",
          }
        : null,
    ].filter(Boolean);

    const onTimeRate =
      completedOrders.length > 0
        ? Math.max(0, Math.round(((completedOrders.length - unresolvedLateFlags.length) / completedOrders.length) * 100))
        : 100;
    const paymentSuccessRate =
      orders.length > 0 ? Math.round((paidOrders.length / orders.length) * 100) : 100;
    const menuReadinessChecks = [
      Boolean(sections.length),
      Boolean(items.length),
      Boolean(items.some((item) => !item.draft)),
      Boolean(hours.length),
      Boolean(vendor.phone && vendor.address && vendor.city && vendor.suburb),
    ];
    const menuReadinessPct = Math.round(
      (menuReadinessChecks.filter(Boolean).length / menuReadinessChecks.length) * 100
    );

    const experience = {
      rating: vendor.rating,
      orderCount30: completedOrders.length,
      onTimeRate,
      paymentSuccessRate,
      menuReadinessPct,
      publicReadiness: vendor.isActive && vendor.status.toUpperCase() !== "PENDING",
      highlights: [
        paidOrders.length > 0
          ? `${paidOrders.length} paid order(s) cleared in the last 30 days.`
          : "No paid orders yet. Focus on menu completeness and launch readiness.",
        onTimeRate >= 90
          ? `On-time delivery signal is ${onTimeRate}%.`
          : `On-time delivery signal is ${onTimeRate}%, so order operations need attention.`,
        menuReadinessPct >= 80
          ? `Menu readiness is ${menuReadinessPct}% with the main storefront pieces in place.`
          : `Menu readiness is ${menuReadinessPct}%, so some storefront essentials are still missing.`,
      ],
      concerns: [
        unresolvedLateFlags.length > 0 ? `${unresolvedLateFlags.length} late delivery flag(s) are unresolved.` : null,
        pendingSettlementOrders.length > 0 ? `${pendingSettlementOrders.length} order(s) still show pending payment.` : null,
        lowStockProducts.length > 0 ? `${lowStockProducts.length} product(s) are out of stock.` : null,
        draftItems.length > 0 ? `${draftItems.length} customer-facing item(s) are still in draft.` : null,
      ].filter(Boolean),
    };

    const team = {
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        email: member.user.email,
        name: member.user.name,
        role: member.role,
        joinedAt: member.createdAt.toISOString(),
        isOwner: member.userId === vendor.ownerId,
      })),
      canManage: session.role === "OWNER",
      ownerId: vendor.ownerId,
    };

    return NextResponse.json({
      ok: true,
      storefront: {
        slug: vendor.slug,
        name: vendor.name,
        status: vendor.status,
        isActive: vendor.isActive,
      },
      payouts,
      notifications,
      experience,
      team,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load vendor operations.";
    const status = /vendor|sign in|membership|approval|role|access/i.test(message) ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
