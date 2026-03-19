import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { hasWebPushConfig, sendPushToSubscription } from "@/lib/web-push";

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
  };

  const title = String(body.title || "").trim();
  const message = String(body.body || "").trim();
  const url = String(body.url || "/").trim() || "/";
  if (!title || !message) {
    return NextResponse.json({ ok: false, error: "Missing title or body." }, { status: 400 });
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: body.visitorId ? { visitorId: body.visitorId.trim() } : undefined,
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

  return NextResponse.json({ ok: true, sent, failed, total: subscriptions.length });
}
