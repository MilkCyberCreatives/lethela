// /src/app/api/vendors/orders/track/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

/**
 * GET ?id=LET-12345
 * Returns a mock position between vendor and customer using time since creation.
 */
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
    if (!o || o.customerLat == null || o.customerLng == null) {
      return NextResponse.json({ ok: false, error: "No coordinates" }, { status: 404 });
    }

    if (o.riderLat != null && o.riderLng != null) {
      return NextResponse.json({
        ok: true,
        driver: {
          lat: o.riderLat,
          lng: o.riderLng,
          progress: o.status === "DELIVERED" ? 1 : o.status === "OUT_FOR_DELIVERY" ? 0.86 : 0.42,
          live: true,
        },
      });
    }

    const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!v || v.latitude == null || v.longitude == null) {
      return NextResponse.json({ ok: false, error: "Vendor has no coordinates" }, { status: 400 });
    }

    const start = new Date(o.createdAt).getTime();
    const now = Date.now();
    const t = Math.min(1, Math.max(0, (now - start) / (25 * 60 * 1000))); // arrive ~25min
    const lat = v.latitude + (o.customerLat - v.latitude) * t;
    const lng = v.longitude + (o.customerLng - v.longitude) * t;

    return NextResponse.json({ ok: true, driver: { lat, lng, progress: t } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Auth error";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
