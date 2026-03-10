import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDemoOrderSummary, isDemoOrderRef } from "@/lib/demo-order";
import { withQueryTimeout } from "@/lib/query-timeout";

export const dynamic = "force-dynamic";

const statusEta: Record<string, string> = {
  PLACED: "35-45 min",
  PREPARING: "25-35 min",
  OUT_FOR_DELIVERY: "8-15 min",
  DELIVERED: "Delivered",
  CANCELED: "Canceled",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") || "").trim().toUpperCase();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Order id is required" }, { status: 400 });
  }

  if (isDemoOrderRef(id)) {
    return NextResponse.json({ ok: true, order: getDemoOrderSummary() });
  }

  const order = await withQueryTimeout(
    prisma.order.findFirst({
      where: {
        OR: [{ publicId: id }, { ozowReference: id }],
      },
      include: {
        vendor: {
          select: { name: true },
        },
      },
    }),
    null
  );

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      id: order.ozowReference || order.publicId,
      status: order.status,
      eta: statusEta[order.status] ?? "20-30 min",
      vendor: order.vendor?.name ?? "Unknown vendor",
    },
  });
}
