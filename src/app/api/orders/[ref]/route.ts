import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDemoOrderDetails, isDemoOrderRef } from "@/lib/demo-order";
import { withQueryTimeout } from "@/lib/query-timeout";

type Params = { params: Promise<{ ref: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { ref } = await params;
  const cleanRef = String(ref || "").trim();
  const normalizedRef = cleanRef.toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
  if (!cleanRef) {
    return NextResponse.json({ ok: false, error: "Order reference is required." }, { status: 400 });
  }

  if (isDemoOrderRef(normalizedRef)) {
    return NextResponse.json({ ok: true, order: getDemoOrderDetails() });
  }

  const order = await withQueryTimeout(
    prisma.order.findFirst({
      where: {
        OR: [
          { ozowReference: cleanRef },
          { ozowReference: normalizedRef },
          { publicId: cleanRef },
          { publicId: normalizedRef },
        ],
      },
      select: {
        publicId: true,
        ozowReference: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        customerLat: true,
        customerLng: true,
        totalCents: true,
        vendor: {
          select: {
            name: true,
            latitude: true,
            longitude: true,
            suburb: true,
            city: true,
          },
        },
      },
    }),
    null
  );

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      id: order.ozowReference || order.publicId,
      publicId: order.publicId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      totalCents: order.totalCents,
      vendor: order.vendor,
      destination:
        order.customerLat != null && order.customerLng != null ? { lat: order.customerLat, lng: order.customerLng } : null,
    },
  });
}
