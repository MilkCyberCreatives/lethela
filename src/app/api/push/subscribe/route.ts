import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertPushPreference } from "@/lib/customer-experience";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

export async function POST(req: Request) {
  const limited = checkRateLimit({
    key: "push-subscribe",
    limit: 20,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many subscription attempts." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    subscription?: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
  };

  const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value?.trim() || "";
  const endpoint = String(body.subscription?.endpoint || "").trim();
  const p256dh = String(body.subscription?.keys?.p256dh || "").trim();
  const authKey = String(body.subscription?.keys?.auth || "").trim();

  if (!visitorId || !endpoint || !p256dh || !authKey) {
    return NextResponse.json({ ok: false, error: "Invalid push subscription payload." }, { status: 400 });
  }

  let userId: string | undefined;
  try {
    const session = await auth();
    if (typeof session?.user?.id === "string" && session.user.id) {
      userId = session.user.id;
    }
  } catch {
    // ignore auth lookup issues
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 240) || null;
  await prisma.visitor.upsert({
    where: { id: visitorId },
    create: {
      id: visitorId,
      userAgent,
    },
    update: {
      userAgent: userAgent || undefined,
    },
  });

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      visitorId,
      userId,
      endpoint,
      p256dh,
      auth: authKey,
      userAgent,
    },
    update: {
      visitorId,
      userId,
      p256dh,
      auth: authKey,
      userAgent: userAgent || undefined,
    },
  });

  await upsertPushPreference(visitorId, userId, {
    orderUpdatesEnabled: true,
    recommendationsEnabled: true,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value?.trim() || "";
  if (!visitorId) {
    return NextResponse.json({ ok: false, error: "No active visitor session." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    endpoint?: string;
  };
  const endpoint = String(body.endpoint || "").trim();

  await prisma.pushSubscription.deleteMany({
    where: endpoint ? { visitorId, endpoint } : { visitorId },
  });

  return NextResponse.json({ ok: true });
}
