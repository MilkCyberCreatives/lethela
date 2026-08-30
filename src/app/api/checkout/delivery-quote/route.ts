import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { quoteDelivery } from "@/lib/pricing";
import { checkRateLimit } from "@/lib/rate-limit";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { getFallbackDeliveryVendor } from "@/lib/catalog-fallback";

const QuerySchema = z
  .object({
    vendorId: z.string().trim().min(1),
    destinationSuburb: z.string().trim().min(2).max(140).optional(),
    destinationLat: z.coerce.number().min(-90).max(90).optional(),
    destinationLng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine(
    (data) =>
      Boolean(data.destinationSuburb?.trim()) ||
      (typeof data.destinationLat === "number" && typeof data.destinationLng === "number"),
    {
      message: "Destination suburb or coordinates are required.",
      path: ["destinationSuburb"],
    },
  );

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "checkout-delivery-quote",
    limit: 40,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many delivery quote requests. Please try again shortly." },
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const parsed = QuerySchema.safeParse({
    vendorId: req.nextUrl.searchParams.get("vendorId"),
    destinationSuburb: req.nextUrl.searchParams.get("destinationSuburb") || undefined,
    destinationLat: req.nextUrl.searchParams.get("destinationLat") || undefined,
    destinationLng: req.nextUrl.searchParams.get("destinationLng") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid delivery quote request." },
      { status: 400 },
    );
  }

  // In demo-catalogue mode the storefront serves fallback vendors that have no
  // database row, so quote from the curated fallback vendor instead of 404ing.
  let vendor = shouldPreferCatalogFallback()
    ? null
    : await prisma.vendor
        .findFirst({
          where: {
            id: parsed.data.vendorId,
            isActive: true,
            status: { in: ["APPROVED", "ACTIVE"] },
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
        })
        .catch(() => null);

  if (!vendor) {
    vendor = getFallbackDeliveryVendor(parsed.data.vendorId);
  }

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
      { status: 422 },
    );
  }

  if (!quote.destinationResolved) {
    return NextResponse.json(
      {
        ok: false,
        error: "We could not verify that delivery address. Please choose a supported location.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true, ...quote });
}
