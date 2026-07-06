import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in to view your orders." }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      publicId: true,
      ozowReference: true,
      status: true,
      paymentStatus: true,
      totalCents: true,
      createdAt: true,
      vendor: { select: { name: true, slug: true } },
      items: {
        select: {
          id: true,
          qty: true,
          priceCents: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    orders: orders.map((order) => ({
      publicId: order.publicId,
      trackingRef: order.ozowReference || order.publicId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      vendor: order.vendor,
      items: order.items.map((item) => ({
        id: item.id,
        qty: item.qty,
        priceCents: item.priceCents,
        name: item.product?.name || "Item",
      })),
    })),
  });
}
