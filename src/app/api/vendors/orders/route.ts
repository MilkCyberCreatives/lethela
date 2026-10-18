import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";
import { vendorApiErrorMessage, vendorApiErrorStatus } from "@/lib/vendor-api-error";
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
        const parsed = (() => {
          try {
            const value = JSON.parse(itemsJson || "[]");
            return Array.isArray(value) ? null : value;
          } catch {
            return null;
          }
        })();
        // Menu items have no product row, so their names come from the saved cart. Order
        // lines are created in cart order, so the two lists line up.
        const cartItems: Array<{ name?: unknown }> = Array.isArray(parsed?.items)
          ? parsed.items
          : [];
        return {
          ...safeOrder,
          items: safeOrder.items.map((item, index) => {
            const cartName = cartItems[index]?.name;
            return item.product || typeof cartName !== "string" || !cartName.trim()
              ? item
              : { ...item, product: { name: cartName.trim() } };
          }),
          status: normalizeOrderStatus(safeOrder.status) || "FAILED",
          deliveryDetails:
            parsed && typeof parsed.deliveryDetails === "object" ? parsed.deliveryDetails : null,
        };
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: vendorApiErrorMessage(error, "Failed to load vendor orders.") },
      { status: vendorApiErrorStatus(error) },
    );
  }
}
