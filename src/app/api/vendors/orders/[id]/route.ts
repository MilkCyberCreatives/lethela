import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";
import { pusherServer } from "@/lib/pusher-server";

const StatusSchema = z.object({
  status: z.enum(["PLACED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendor("STAFF");
    const { id } = await params;
    const cleanId = String(id || "").trim();
    const body = await req.json().catch(() => ({}));
    const parsed = StatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid order status payload" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        vendorId,
        OR: [{ publicId: cleanId }, { ozowReference: cleanId }],
      },
      select: { id: true, publicId: true, ozowReference: true },
    });
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: parsed.data.status },
    });

    try {
      const channel = `order-${order.ozowReference || order.publicId}`;
      await pusherServer.trigger(channel, "status", {
        status: parsed.data.status,
        at: new Date().toISOString(),
      });
    } catch {
      // realtime may be disabled in local environments
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
