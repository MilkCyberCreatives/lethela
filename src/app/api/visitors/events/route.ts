import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "search",
  "vendor_click",
  "product_add",
  "recommendation_click",
  "location_update",
  "push_opt_in",
  "favorite_toggle",
  "product_rate",
  "whatsapp_click",
  "vendor_application_submit",
  "rider_application_submit",
  "track_order_view",
  "reorder",
]);

const visitorEventState = globalThis as typeof globalThis & {
  __lethelaKnownVisitors?: Map<string, number>;
  __lethelaLinkedVisitors?: Map<string, number>;
};

function getKnownVisitors() {
  if (!visitorEventState.__lethelaKnownVisitors) {
    visitorEventState.__lethelaKnownVisitors = new Map<string, number>();
  }
  return visitorEventState.__lethelaKnownVisitors;
}

function getLinkedVisitors() {
  if (!visitorEventState.__lethelaLinkedVisitors) {
    visitorEventState.__lethelaLinkedVisitors = new Map<string, number>();
  }
  return visitorEventState.__lethelaLinkedVisitors;
}

function markKnownVisitor(visitorId: string, ttlMs = 15 * 60_000) {
  getKnownVisitors().set(visitorId, Date.now() + ttlMs);
}

function isKnownVisitor(visitorId: string) {
  const expiresAt = getKnownVisitors().get(visitorId) || 0;
  return expiresAt > Date.now();
}

function markLinkedVisitor(visitorId: string, userId: string, ttlMs = 15 * 60_000) {
  getLinkedVisitors().set(`${visitorId}:${userId}`, Date.now() + ttlMs);
}

function isLinkedVisitor(visitorId: string, userId: string) {
  const expiresAt = getLinkedVisitors().get(`${visitorId}:${userId}`) || 0;
  return expiresAt > Date.now();
}

async function ensureVisitorRecord(visitorId: string, preferredArea: string | null | undefined, userAgent: string | null) {
  await prisma.visitor.upsert({
    where: { id: visitorId },
    create: {
      id: visitorId,
      preferredArea: preferredArea?.trim() || null,
      userAgent,
    },
    update: {
      preferredArea: preferredArea?.trim() || undefined,
      userAgent: userAgent || undefined,
    },
  });
  markKnownVisitor(visitorId);
}

export async function POST(req: Request) {
  const limited = await checkRateLimit({
    key: "visitor-events",
    limit: 180,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many telemetry events." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    path?: string;
    vendorId?: string;
    vendorSlug?: string;
    productId?: string;
    searchQuery?: string;
    preferredArea?: string | null;
    meta?: Record<string, unknown>;
  };

  const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value?.trim() || "";
  const type = String(body.type || "").trim();
  if (!visitorId || !ALLOWED_EVENT_TYPES.has(type)) {
    return NextResponse.json({ ok: false, error: "Invalid visitor event payload." }, { status: 400 });
  }

  let userId: string | undefined;
  try {
    const session = await auth();
    if (typeof session?.user?.id === "string" && session.user.id) {
      userId = session.user.id;
    }
  } catch {
    // ignore auth lookup issues for anonymous traffic
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 240) || null;
  if (!isKnownVisitor(visitorId) || body.preferredArea?.trim()) {
    await ensureVisitorRecord(visitorId, body.preferredArea, userAgent);
  }

  if (userId && !isLinkedVisitor(visitorId, userId)) {
    await prisma.pushPreference.updateMany({
      where: { visitorId },
      data: { userId },
    });
    markLinkedVisitor(visitorId, userId);
  }

  const eventData = {
    visitorId,
    userId,
    type,
    path: body.path?.slice(0, 240) || null,
    vendorId: body.vendorId?.slice(0, 64) || null,
    vendorSlug: body.vendorSlug?.slice(0, 120) || null,
    productId: body.productId?.slice(0, 64) || null,
    searchQuery: body.searchQuery?.slice(0, 240) || null,
    metaJson: body.meta ? JSON.stringify(body.meta).slice(0, 1800) : null,
  };

  try {
    await prisma.visitorEvent.create({ data: eventData });
  } catch (error) {
    const missingVisitor =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2025");
    if (!missingVisitor) {
      throw error;
    }

    await ensureVisitorRecord(visitorId, body.preferredArea, userAgent);
    await prisma.visitorEvent.create({ data: eventData });
  }

  return NextResponse.json({ ok: true });
}
