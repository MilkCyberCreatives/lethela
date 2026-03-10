import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEMO_ORDER_REF, isDemoOrderRef } from "@/lib/demo-order";
import { pusherServer } from "@/lib/pusher-server";
import { withQueryTimeout } from "@/lib/query-timeout";

const BodySchema = z.object({
  status: z.enum(["PLACED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED", "ACCEPTED", "PICKED_UP", "ON_THE_WAY"]),
});

const STATUS_MAP: Record<string, "PLACED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED"> = {
  PLACED: "PLACED",
  ACCEPTED: "PREPARING",
  PREPARING: "PREPARING",
  PICKED_UP: "OUT_FOR_DELIVERY",
  ON_THE_WAY: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELED: "CANCELED",
};

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
    return NextResponse.json({ ok: false, error: "Invalid status payload." }, { status: 400 });
  }

  const canonicalStatus = STATUS_MAP[parsed.data.status] ?? "PLACED";

  if (isDemoOrderRef(cleanRef)) {
    try {
      await pusherServer.trigger(`order-${DEMO_ORDER_REF}`, "status", { status: canonicalStatus, at: new Date().toISOString() });
    } catch {
      // realtime may be disabled locally
    }
    return NextResponse.json({ ok: true, status: canonicalStatus });
  }

  const order = await withQueryTimeout(
    prisma.order.findFirst({
      where: {
        OR: [{ ozowReference: cleanRef }, { publicId: cleanRef }, { publicId: cleanRef.toUpperCase() }],
      },
      select: { id: true, ozowReference: true, publicId: true },
    }),
    null
  );
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: canonicalStatus },
  });

  try {
    const channel = `order-${order.ozowReference || order.publicId}`;
    await pusherServer.trigger(channel, "status", { status: canonicalStatus, at: new Date().toISOString() });
  } catch {
    // do not block successful updates when realtime is not configured
  }

  return NextResponse.json({ ok: true, status: canonicalStatus });
}
