import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEMO_ORDER_REF, isDemoOrderRef } from "@/lib/demo-order";
import { getOrderRealtimeChannel } from "@/lib/order-tracking-access";
import { pusherServer } from "@/lib/pusher-server";
import { runBoundedDbQuery } from "@/lib/query-timeout";
import { requireVendor } from "@/lib/authz";
import { readRiderConsoleToken } from "@/lib/rider-console";

const BodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().optional(),
});

type Params = { params: Promise<{ ref: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { ref } = await params;
  const cleanRef = String(ref || "").trim();
  if (!cleanRef) {
    return NextResponse.json({ ok: false, error: "Order reference is required." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid location payload." }, { status: 400 });
  }

  let vendorSession: Awaited<ReturnType<typeof requireVendor>> | null = null;
  try {
    vendorSession = await requireVendor("STAFF");
  } catch {
    vendorSession = null;
  }

  const url = new URL(req.url);
  const riderToken = readRiderConsoleToken(
    req.headers.get("x-rider-token")?.trim() || url.searchParams.get("token")?.trim() || null
  );

  if (!vendorSession && !riderToken) {
    return NextResponse.json(
      { ok: false, error: "Authorized rider or vendor access required." },
      { status: 401 }
    );
  }

  if (isDemoOrderRef(cleanRef)) {
    if (!vendorSession && riderToken?.ref !== DEMO_ORDER_REF) {
      return NextResponse.json(
        { ok: false, error: "Authorized rider or vendor access required." },
        { status: 401 }
      );
    }

    try {
      await pusherServer.trigger(`order-${DEMO_ORDER_REF}`, "location", { ...parsed.data, at: new Date().toISOString() });
    } catch {
      // realtime may be disabled locally
    }
    return NextResponse.json({ ok: true });
  }

  const order = await runBoundedDbQuery((db) =>
    db.order.findFirst({
      where: riderToken
        ? {
            OR: [{ ozowReference: cleanRef }, { publicId: cleanRef }, { publicId: cleanRef.toUpperCase() }],
          }
        : {
            vendorId: vendorSession?.vendorId,
            OR: [{ ozowReference: cleanRef }, { publicId: cleanRef }, { publicId: cleanRef.toUpperCase() }],
      },
      select: { id: true, vendorId: true, ozowReference: true, publicId: true },
    })
  ).catch(() => null);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  const riderRef = riderToken?.ref;
  const publicRef = String(order.publicId || "").trim().toUpperCase();
  const ozowRef = String(order.ozowReference || "").trim().toUpperCase();
  const isVendorAuthorized = vendorSession?.vendorId === order.vendorId;
  const isRiderAuthorized = Boolean(riderRef && (riderRef === publicRef || riderRef === ozowRef));

  if (!isVendorAuthorized && !isRiderAuthorized) {
    return NextResponse.json(
      { ok: false, error: "Authorized rider or vendor access required." },
      { status: 401 }
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      riderLat: parsed.data.lat,
      riderLng: parsed.data.lng,
      riderSpeed: parsed.data.speed ?? null,
      riderLocatedAt: new Date(),
    },
  });

  try {
    const channel = getOrderRealtimeChannel(order.ozowReference || order.publicId);
    await pusherServer.trigger(channel, "location", { ...parsed.data, at: new Date().toISOString() });
  } catch {
    // realtime may be disabled in local environments
  }

  return NextResponse.json({ ok: true });
}
