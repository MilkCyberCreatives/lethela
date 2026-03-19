import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "search",
  "vendor_click",
  "product_add",
  "recommendation_click",
  "location_update",
  "push_opt_in",
]);

export async function POST(req: Request) {
  const limited = checkRateLimit({
    key: "visitor-events",
    limit: 180,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many telemetry events." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    visitorId?: string;
    type?: string;
    path?: string;
    vendorId?: string;
    vendorSlug?: string;
    productId?: string;
    searchQuery?: string;
    preferredArea?: string | null;
    meta?: Record<string, unknown>;
  };

  const visitorId = String(body.visitorId || "").trim();
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
  await prisma.visitor.upsert({
    where: { id: visitorId },
    create: {
      id: visitorId,
      preferredArea: body.preferredArea?.trim() || null,
      userAgent,
    },
    update: {
      preferredArea: body.preferredArea?.trim() || undefined,
      userAgent: userAgent || undefined,
    },
  });

  await prisma.visitorEvent.create({
    data: {
      visitorId,
      userId,
      type,
      path: body.path?.slice(0, 240) || null,
      vendorId: body.vendorId?.slice(0, 64) || null,
      vendorSlug: body.vendorSlug?.slice(0, 120) || null,
      productId: body.productId?.slice(0, 64) || null,
      searchQuery: body.searchQuery?.slice(0, 240) || null,
      metaJson: body.meta ? JSON.stringify(body.meta).slice(0, 1800) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
