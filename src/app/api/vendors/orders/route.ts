import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";
import { normalizeOrderStatus } from "@/lib/order-state";

export async function GET(req: Request) {
  try {
    const { vendorId } = await requireVendor("STAFF");
    const url = new URL(req.url);
    const take = Math.min(150, Math.max(10, Number(url.searchParams.get("take") ?? 60)));

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
        itemsJson: true,
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
      orders: orders.map((order) => {
        const { itemsJson, ...safeOrder } = order;
        return {
          ...safeOrder,
          status: normalizeOrderStatus(safeOrder.status) || "FAILED",
          deliveryDetails: (() => {
            try {
              const parsed = JSON.parse(itemsJson || "[]");
              return !Array.isArray(parsed) && typeof parsed?.deliveryDetails === "object"
                ? parsed.deliveryDetails
                : null;
            } catch {
              return null;
            }
          })(),
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Not signed in as vendor" },
      { status: 401 },
    );
  }
}
