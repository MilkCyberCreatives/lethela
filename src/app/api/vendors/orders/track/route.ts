// /src/app/api/vendors/orders/track/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const publicId = url.searchParams.get("id") || "";
  try {
    const { vendorId } = await requireVendor("STAFF");
    const o = await prisma.order.findFirst({
      where: {
        vendorId,
        OR: [{ publicId }, { ozowReference: publicId }],
      },
    });
    if (!o) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    if (o.riderLat != null && o.riderLng != null) {
      return NextResponse.json({
        ok: true,
        driver: {
          lat: o.riderLat,
          lng: o.riderLng,
          progress:
            o.status === "DELIVERED"
              ? 1
              : o.status === "ON_THE_WAY"
                ? 0.86
                : o.status === "PICKED_UP"
                  ? 0.55
                  : 0.15,
          live: true,
          locatedAt: o.riderLocatedAt,
        },
      });
    }
    return NextResponse.json({ ok: true, driver: null, live: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Auth error";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
