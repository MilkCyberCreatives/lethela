// /src/app/api/payments/ozow/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";
import { buildOzowRedirectUrl, createOrderReference } from "@/lib/ozow";
import { geocodeSuburb } from "@/lib/geo";
import { createOrderTrackingToken } from "@/lib/order-tracking-access";
import { quoteDelivery } from "@/lib/pricing";
import { z } from "zod";
import { withSentryRoute } from "@/server/withSentryRoute";
import { checkRateLimit } from "@/lib/rate-limit";
import { calculateOrderFinancials } from "@/lib/order-financials";
import { isStoreOpenNow } from "@/lib/store-availability";

const BodySchema = z
  .object({
    vendorId: z.string().min(1),
    checkoutKey: z.string().uuid(),
    vendorSlug: z.string().min(1).optional().default(""),
    destinationSuburb: z.string().trim().min(2).max(140).optional(),
    destinationLat: z.number().min(-90).max(90).optional(),
    destinationLng: z.number().min(-180).max(180).optional(),
    items: z
      .array(
        z.object({
          itemId: z.string(),
          name: z.string(),
          priceCents: z.number().int().nonnegative(),
          qty: z.number().int().positive().max(99),
          image: z.string().trim().max(1000).optional().nullable(),
          isAlcohol: z.boolean().optional().default(false),
        }),
      )
      .min(1)
      .max(50),
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z.string().trim().min(8).max(40),
    whatsappNumber: z.string().trim().max(40).optional().default(""),
    standNumber: z.string().trim().max(120).optional().default(""),
    streetSection: z.string().trim().max(120).optional().default(""),
    landmark: z.string().trim().max(180).optional().default(""),
    deliveryNotes: z.string().trim().max(500).optional().default(""),
    ageConfirmed: z.boolean().optional().default(false),
    subtotalCents: z.number().int().nonnegative(),
    deliveryCents: z.number().int().nonnegative(),
    riderTipCents: z.number().int().nonnegative().optional().default(0),
    totalCents: z.number().int().positive(),
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

export const POST = withSentryRoute(async (req: NextRequest) => {
  const limited = await checkRateLimit({
    key: "ozow-create",
    limit: 20,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many checkout requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const requestOrigin = req.nextUrl.origin;
  const baseUrl =
    requestOrigin ||
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const siteCode = process.env.OZOW_SITE_CODE || "";
  const privateKey = process.env.OZOW_PRIVATE_KEY || "";
  if (!siteCode || !privateKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Online payment is temporarily unavailable. Please use the supported offline order option.",
      },
      { status: 503 },
    );
  }
  const {
    vendorId,
    checkoutKey,
    destinationSuburb,
    destinationLat,
    destinationLng,
    items,
    customerName,
    customerPhone,
    whatsappNumber,
    standNumber,
    streetSection,
    landmark,
    deliveryNotes,
    ageConfirmed,
    subtotalCents,
    deliveryCents,
    riderTipCents,
    totalCents: requestedTotalCents,
  } = parsed.data;
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Cart is empty." }, { status: 400 });
  }

  if (items.some((item) => item.isAlcohol) && !ageConfirmed) {
    return NextResponse.json(
      { ok: false, error: "Confirm that you are 18 or older before paying for liquor." },
      { status: 400 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const vendor = await prisma.vendor.findFirst({
    where: {
      id: vendorId,
      isActive: true,
      status: { in: ["ACTIVE", "APPROVED"] },
      temporaryClosed: false,
    },
    select: {
      id: true,
      slug: true,
      deliveryFee: true,
      latitude: true,
      longitude: true,
      address: true,
      suburb: true,
      city: true,
      temporaryClosed: true,
      hours: true,
      liquorLicenceUrl: true,
      liquorLicenceExpiry: true,
      liquorVerificationStatus: true,
    },
  });
  if (!vendor) {
    return NextResponse.json({ ok: false, error: "Vendor is unavailable." }, { status: 400 });
  }
  if (!isStoreOpenNow(vendor.hours, { temporaryClosed: vendor.temporaryClosed })) {
    return NextResponse.json(
      { ok: false, error: "This store is currently closed." },
      { status: 409 },
    );
  }

  const itemIds = [...new Set(items.map((item) => item.itemId))];
  const products = await prisma.product.findMany({
    where: { vendorId, id: { in: itemIds }, inStock: true, status: "APPROVED" },
    select: { id: true, name: true, priceCents: true, isAlcohol: true },
  });
  const menuItems = await prisma.item.findMany({
    where: { vendorId, id: { in: itemIds }, draft: false },
    select: { id: true, name: true, priceCents: true, isAlcohol: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

  const unresolvedIds = itemIds.filter((id) => !productById.has(id) && !menuItemById.has(id));
  if (unresolvedIds.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Some cart items are unavailable. Please refresh your cart." },
      { status: 409 },
    );
  }

  const normalizedItems = items.map((item) => {
    const product = productById.get(item.itemId);
    const menuItem = menuItemById.get(item.itemId);
    const resolved = product || menuItem;
    return {
      ...item,
      productId: product?.id ?? null,
      name: resolved!.name,
      priceCents: resolved!.priceCents,
      isAlcohol: Boolean(product?.isAlcohol || menuItem?.isAlcohol),
    };
  });

  const containsAlcohol = normalizedItems.some((item) => item.isAlcohol);
  if (containsAlcohol && !ageConfirmed) {
    return NextResponse.json(
      { ok: false, error: "Confirm that you are 18 or older before paying for liquor." },
      { status: 400 },
    );
  }
  if (
    containsAlcohol &&
    (vendor.liquorVerificationStatus !== "APPROVED" ||
      !vendor.liquorLicenceUrl ||
      !vendor.liquorLicenceExpiry ||
      vendor.liquorLicenceExpiry.getTime() <= Date.now())
  ) {
    return NextResponse.json(
      { ok: false, error: "This vendor is not currently approved for liquor orders." },
      { status: 409 },
    );
  }

  const calcSubtotal = normalizedItems.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
  const deliveryQuote = await quoteDelivery({
    vendor,
    destinationSuburb,
    destinationPoint:
      destinationLat != null && destinationLng != null
        ? { lat: destinationLat, lng: destinationLng }
        : null,
    baseFeeCents: vendor.deliveryFee,
  });
  const resolvedDeliveryCents = deliveryQuote.deliveryCents;
  const commissionBps = Number(process.env.PLATFORM_COMMISSION_BPS || 0);
  const financials = calculateOrderFinancials({
    subtotalCents: calcSubtotal,
    deliveryFeeCents: resolvedDeliveryCents,
    riderTipCents,
    platformCommissionBps: commissionBps,
  });
  const {
    riderTipCents: resolvedRiderTipCents,
    riderPayoutCents,
    vendorPayoutCents,
    platformFeeCents,
    totalCents,
  } = financials;

  const deliveryDetails = {
    customerName,
    customerPhone,
    whatsappNumber,
    standNumber,
    streetSection,
    landmark,
    destinationSuburb: destinationSuburb || "",
    deliveryNotes,
    ageConfirmed,
    containsAlcohol,
    deliveryDistanceKm: deliveryQuote.distanceKm,
    riderTipCents: resolvedRiderTipCents,
    riderPayoutCents,
    vendorPayoutCents,
    platformFeeCents,
    payoutNote: "Lethela delivery fee and customer tip go fully to the assigned rider.",
  };

  if (!deliveryQuote.originResolved) {
    return NextResponse.json(
      { ok: false, error: "Vendor delivery location is incomplete." },
      { status: 422 },
    );
  }

  if (!deliveryQuote.destinationResolved) {
    return NextResponse.json(
      {
        ok: false,
        error: "We could not verify that delivery address. Please review checkout before paying.",
      },
      { status: 422 },
    );
  }

  if (deliveryQuote.manualQuoteRequired) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This address is outside the current delivery zone. Please use WhatsApp for a manual quote.",
      },
      { status: 422 },
    );
  }

  if (
    Math.abs(calcSubtotal - subtotalCents) > 5 ||
    Math.abs(resolvedDeliveryCents - deliveryCents) > 5 ||
    Math.abs(resolvedRiderTipCents - riderTipCents) > 5 ||
    Math.abs(totalCents - requestedTotalCents) > 5
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Cart totals changed. Please review checkout before paying.",
        subtotalCents: calcSubtotal,
        deliveryCents: resolvedDeliveryCents,
        riderTipCents: resolvedRiderTipCents,
        totalCents,
      },
      { status: 409 },
    );
  }

  const destinationPoint =
    destinationLat != null && destinationLng != null
      ? { lat: destinationLat, lng: destinationLng }
      : destinationSuburb
        ? await geocodeSuburb(destinationSuburb)
        : null;

  if (!destinationPoint) {
    return NextResponse.json(
      {
        ok: false,
        error: "We could not verify that delivery address. Please review checkout before paying.",
      },
      { status: 422 },
    );
  }

  const ozowReference = createOrderReference();
  const existingOrder = await prisma.order.findUnique({
    where: { checkoutKey },
    select: { publicId: true, ozowReference: true, totalCents: true, vendorId: true },
  });
  if (existingOrder) {
    if (existingOrder.vendorId !== vendorId || existingOrder.totalCents !== totalCents) {
      return NextResponse.json(
        { ok: false, error: "This checkout request no longer matches the cart." },
        { status: 409 },
      );
    }
    const reference = existingOrder.ozowReference || existingOrder.publicId;
    const trackingToken = createOrderTrackingToken(reference);
    const redirectUrl = buildOzowRedirectUrl({
      siteCode,
      privateKey,
      amountCents: totalCents,
      transactionReference: reference,
      bankReference: `Lethela ${vendor.slug}`,
      successUrl: `${baseUrl}/checkout/success?ref=${encodeURIComponent(reference)}&t=${encodeURIComponent(trackingToken)}`,
      cancelUrl: `${baseUrl}/checkout/cancel?ref=${encodeURIComponent(reference)}`,
      notifyUrl: `${baseUrl}/api/payments/ozow/notify`,
      isTest: process.env.OZOW_IS_TEST === "true",
    });
    return NextResponse.json({ ok: true, redirectUrl, ref: reference, idempotent: true });
  }
  const order = await prisma.order.upsert({
    where: { checkoutKey },
    update: {},
    create: {
      publicId: ozowReference,
      checkoutKey,
      userId,
      vendorId,
      itemsJson: JSON.stringify({
        items: normalizedItems,
        deliveryDetails,
      }),
      subtotalCents: calcSubtotal,
      deliveryFeeCents: resolvedDeliveryCents,
      distanceKm: deliveryQuote.distanceKm,
      riderTipCents: resolvedRiderTipCents,
      riderPayoutCents,
      vendorPayoutCents,
      platformFeeCents,
      totalCents,
      amountCents: totalCents,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      ozowReference,
      customerLat: destinationPoint?.lat ?? null,
      customerLng: destinationPoint?.lng ?? null,
      items: {
        create: normalizedItems.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          priceCents: item.priceCents,
        })),
      },
    },
    select: {
      id: true,
      ozowReference: true,
      publicId: true,
      vendorId: true,
      totalCents: true,
    },
  });
  if (order.vendorId !== vendorId || order.totalCents !== totalCents) {
    return NextResponse.json(
      { ok: false, error: "This checkout request no longer matches the cart." },
      { status: 409 },
    );
  }
  const reference = order.ozowReference ?? order.publicId ?? ozowReference;
  const trackingToken = createOrderTrackingToken(reference);

  const successUrl = `${baseUrl}/checkout/success?ref=${encodeURIComponent(reference)}&t=${encodeURIComponent(trackingToken)}`;
  const cancelUrl = `${baseUrl}/checkout/cancel?ref=${encodeURIComponent(reference)}`;
  const errorUrl = cancelUrl;
  const notifyUrl = `${baseUrl}/api/payments/ozow/notify`;

  const redirectUrl = buildOzowRedirectUrl({
    siteCode,
    privateKey,
    amountCents: totalCents,
    transactionReference: reference,
    bankReference: `Lethela ${vendor.slug}`,
    successUrl,
    cancelUrl,
    errorUrl,
    notifyUrl,
    isTest: process.env.OZOW_IS_TEST === "true",
  });

  return NextResponse.json({ ok: true, redirectUrl, ref: reference });
});
