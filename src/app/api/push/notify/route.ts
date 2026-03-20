import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { hasWebPushConfig, sendPushToSubscription } from "@/lib/web-push";

type CampaignSegment = "ALL" | "ENGAGED" | "LOYAL" | "NO_ORDER_YET";

async function resolveSegmentVisitorIds(segment: CampaignSegment) {
  if (segment === "ALL") {
    return null;
  }

  if (segment === "LOYAL") {
    const rows = await prisma.visitor.findMany({
      where: {
        events: {
          some: {
            type: { in: ["recommendation_click", "vendor_click", "product_add", "push_opt_in"] },
          },
        },
      },
      select: { id: true },
      take: 500,
    }).catch(() => []);
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
  const orderedUserIds = visitorsWithOrders.map((row) => row.userId).filter((value): value is string => Boolean(value));
  const rows = await prisma.pushPreference.findMany({
    where: orderedUserIds.length > 0 ? { userId: { notIn: orderedUserIds } } : undefined,
    select: { visitorId: true },
    take: 500,
  });
  return rows.map((row) => row.visitorId);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRequest(req);
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
  const segment = (String(body.segment || "ALL").trim().toUpperCase() || "ALL") as CampaignSegment;
  if (!title || !message) {
    return NextResponse.json({ ok: false, error: "Missing title or body." }, { status: 400 });
  }

  const segmentedVisitorIds = body.visitorId ? [body.visitorId.trim()] : await resolveSegmentVisitorIds(segment);
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      ...(segmentedVisitorIds ? { visitorId: { in: segmentedVisitorIds } } : {}),
      visitor: {
        pushPreferences: {
          some: {
            marketingEnabled: true,
          },
        },
      },
    },
    select: {
      endpoint: true,
      p256dh: true,
      auth: true,
    },
    take: 500,
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendPushToSubscription(subscription, {
          title,
          body: message,
          url,
          tag: "lethela-marketing",
        });
        sent += 1;
      } catch (error: unknown) {
        failed += 1;
        const statusCode =
          typeof error === "object" &&
          error &&
          "statusCode" in error &&
          typeof (error as { statusCode?: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: subscription.endpoint },
          });
        }
      }
    })
  );

  await prisma.pushCampaign.create({
    data: {
      title,
      body: message,
      url,
      segment,
      sentCount: sent,
      failedCount: failed,
    },
  });

  return NextResponse.json({ ok: true, sent, failed, total: subscriptions.length, segment });
}
