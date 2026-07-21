import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { hasWebPushConfig } from "@/lib/web-push";
import {
  sendPushToMarketingSubscribers,
  sendPushToSelectedMarketingVisitors,
} from "@/lib/push-notifications";

type CampaignSegment = "ALL" | "ENGAGED" | "LOYAL" | "NO_ORDER_YET";

async function resolveSegmentVisitorIds(segment: CampaignSegment) {
  if (segment === "ALL") {
    return null;
  }

  if (segment === "LOYAL") {
    const rows = await prisma.visitor
      .findMany({
        where: {
          events: {
            some: {
              type: { in: ["recommendation_click", "vendor_click", "product_add", "push_opt_in"] },
            },
          },
        },
        select: { id: true },
        take: 500,
      })
      .catch(() => []);
    return rows.map((row) => row.id);
  }

  if (segment === "ENGAGED") {
    const rows = await prisma.visitor.findMany({
      where: {
        events: {
          some: {
            type: { in: ["search", "vendor_click", "product_add", "recommendation_click"] },
          },
        },
      },
      select: { id: true },
      take: 500,
    });
    return rows.map((row) => row.id);
  }

  const visitorsWithOrders = await prisma.order.findMany({
    where: {
      paymentStatus: { in: ["PAID", "SUCCESS"] },
      userId: { not: null },
    },
    select: { userId: true },
    distinct: ["userId"],
    take: 500,
  });
  const orderedUserIds = visitorsWithOrders
    .map((row) => row.userId)
    .filter((value): value is string => Boolean(value));
  const rows = await prisma.pushPreference.findMany({
    where: orderedUserIds.length > 0 ? { userId: { notIn: orderedUserIds } } : undefined,
    select: { visitorId: true },
    take: 500,
  });
  return rows.map((row) => row.visitorId);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRequest(req, "notifications:send");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  if (!hasWebPushConfig()) {
    return NextResponse.json({ ok: false, error: "Web push is not configured." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    url?: string;
    visitorId?: string;
    segment?: CampaignSegment;
  };

  const title = String(body.title || "").trim();
  const message = String(body.body || "").trim();
  const url = String(body.url || "/").trim() || "/";
  const segment = (String(body.segment || "ALL")
    .trim()
    .toUpperCase() || "ALL") as CampaignSegment;
  if (!title || !message) {
    return NextResponse.json({ ok: false, error: "Missing title or body." }, { status: 400 });
  }

  const segmentedVisitorIds = body.visitorId
    ? [body.visitorId.trim()]
    : await resolveSegmentVisitorIds(segment);
  const delivery = segmentedVisitorIds
    ? await sendPushToSelectedMarketingVisitors(segmentedVisitorIds, {
        title,
        body: message,
        url,
        tag: "lethela-marketing",
      })
    : await sendPushToMarketingSubscribers({
        title,
        body: message,
        url,
        tag: "lethela-marketing",
      });

  await prisma.pushCampaign.create({
    data: {
      title,
      body: message,
      url,
      segment,
      sentCount: delivery.sent,
      failedCount: delivery.failed,
    },
  });

  return NextResponse.json({
    ok: true,
    sent: delivery.sent,
    failed: delivery.failed,
    total: delivery.total,
    segment,
  });
}
