import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";
import { createRiderConsoleToken } from "@/lib/rider-console";

function buildRiderConsoleUrl(origin: string, orderRef: string) {
  const cleanOrderRef = String(orderRef || "").trim();
  if (!cleanOrderRef) {
    return null;
  }

  try {
    const token = createRiderConsoleToken(cleanOrderRef);
    return `${origin}/rider/${encodeURIComponent(cleanOrderRef)}?token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { vendorId } = await requireVendor("STAFF");
    const url = new URL(req.url);
    const take = Math.min(150, Math.max(10, Number(url.searchParams.get("take") ?? 60)));
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || url.origin;

    const orders = await prisma.order.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        publicId: true,
        status: true,
        paymentStatus: true,
        subtotalCents: true,
        deliveryFeeCents: true,
        totalCents: true,
        createdAt: true,
        customerLat: true,
        customerLng: true,
        riderLat: true,
        riderLng: true,
        riderSpeed: true,
        riderLocatedAt: true,
        ozowReference: true,
        items: {
          select: {
            id: true,
            qty: true,
            product: {
              select: { name: true },
            },
          },
        },
        vendor: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      orders: orders.map((order) => ({
        ...order,
        riderConsoleUrl: buildRiderConsoleUrl(origin, order.publicId || order.ozowReference || ""),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Not signed in as vendor" }, { status: 401 });
  }
}
