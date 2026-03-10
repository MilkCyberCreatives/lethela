import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEMO_ORDER_REF, isDemoOrderRef } from "@/lib/demo-order";
import { pusherServer } from "@/lib/pusher-server";
import { withQueryTimeout } from "@/lib/query-timeout";

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

  if (isDemoOrderRef(cleanRef)) {
    try {
      await pusherServer.trigger(`order-${DEMO_ORDER_REF}`, "location", { ...parsed.data, at: new Date().toISOString() });
    } catch {
      // realtime may be disabled locally
    }
    return NextResponse.json({ ok: true });
  }

  const order = await withQueryTimeout(
    prisma.order.findFirst({
      where: {
        OR: [{ ozowReference: cleanRef }, { publicId: cleanRef }, { publicId: cleanRef.toUpperCase() }],
      },
      select: { ozowReference: true, publicId: true },
    }),
    null
  );
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  try {
    const channel = `order-${order.ozowReference || order.publicId}`;
    await pusherServer.trigger(channel, "location", { ...parsed.data, at: new Date().toISOString() });
  } catch {
    // realtime may be disabled in local environments
  }

  return NextResponse.json({ ok: true });
}
