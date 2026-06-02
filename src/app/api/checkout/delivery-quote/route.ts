import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  DEFAULT_DELIVERY_FEE_CENTS,
  EXTRA_DELIVERY_FEE_PER_KM_CENTS,
  INCLUDED_DELIVERY_RADIUS_KM,
  quoteDelivery,
} from "@/lib/pricing";

const QuerySchema = z.object({
  vendorId: z.string().trim().min(1),
  destinationSuburb: z.string().trim().min(2).max(140).optional(),
  destinationLat: z.coerce.number().min(-90).max(90).optional(),
  destinationLng: z.coerce.number().min(-180).max(180).optional(),
}).refine(
  (data) =>
    Boolean(data.destinationSuburb?.trim()) ||
    (typeof data.destinationLat === "number" && typeof data.destinationLng === "number"),
  {
    message: "Destination suburb or coordinates are required.",
    path: ["destinationSuburb"],
  }
);

function isLocalSqliteRuntime() {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.DATABASE_PROVIDER?.trim().toLowerCase() === "sqlite" ||
      process.env.DATABASE_URL?.trim().toLowerCase().startsWith("file:"))
  );
}

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({
    vendorId: req.nextUrl.searchParams.get("vendorId"),
    destinationSuburb: req.nextUrl.searchParams.get("destinationSuburb") || undefined,
    destinationLat: req.nextUrl.searchParams.get("destinationLat") || undefined,
    destinationLng: req.nextUrl.searchParams.get("destinationLng") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid delivery quote request." }, { status: 400 });
  }

  if (isLocalSqliteRuntime() && parsed.data.vendorId.startsWith("vendor-")) {
    return NextResponse.json({
      ok: true,
      originResolved: true,
      destinationResolved: true,
      locationResolved: false,
      baseFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
      deliveryCents: DEFAULT_DELIVERY_FEE_CENTS,
      distanceKm: null,
      includedRadiusKm: INCLUDED_DELIVERY_RADIUS_KM,
      extraPerKmCents: EXTRA_DELIVERY_FEE_PER_KM_CENTS,
    });
  }

  const vendor = await prisma.vendor.findFirst({
    where: {
      id: parsed.data.vendorId,
      isActive: true,
      status: "ACTIVE",
    },
    select: {
      id: true,
      deliveryFee: true,
      latitude: true,
      longitude: true,
      address: true,
      suburb: true,
      city: true,
    },
  });

  if (!vendor) {
    return NextResponse.json({ ok: false, error: "Vendor is unavailable." }, { status: 404 });
  }

  const quote = await quoteDelivery({
    vendor,
    destinationSuburb: parsed.data.destinationSuburb,
    destinationPoint:
      parsed.data.destinationLat != null && parsed.data.destinationLng != null
        ? { lat: parsed.data.destinationLat, lng: parsed.data.destinationLng }
        : null,
    baseFeeCents: vendor.deliveryFee,
  });

  if (!quote.originResolved) {
    return NextResponse.json(
      { ok: false, error: "Vendor delivery location is incomplete." },
      { status: 422 }
    );
  }

  if (!quote.destinationResolved) {
    return NextResponse.json(
      { ok: false, error: "We could not verify that delivery address. Please choose a supported location." },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, ...quote });
}
