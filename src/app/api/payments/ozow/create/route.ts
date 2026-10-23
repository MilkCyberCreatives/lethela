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
import { rememberGuestCustomer } from "@/lib/guest-customers";
import {
  CASH_PAYMENT_STATUS,
  cashOnDeliverySettings,
  isCashOnDelivery,
} from "@/lib/payment-status";
import { notifyAdminsOfOrder, notifyVendorOfPaidOrder } from "@/lib/order-notifications";
import { settleWithin } from "@/lib/notification-channels";
import { recordOrderEvent } from "@/lib/order-operations";

const BodySchema = z
  .object({
    vendorId: z.string().min(1),
    checkoutKey: z.string().uuid(),
    vendorSlug: z.string().trim().max(140).optional().default(""),
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
    // "CASH" places the order straight away and the rider collects the money at the door.
    paymentMethod: z.enum(["OZOW", "CASH"]).optional().default("OZOW"),
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

// The checkout page shows this text as it is, so it must be a plain sentence, never zod's
// error object (an object there crashed the page).
function checkoutProblem(error: z.ZodError) {
  const field = String(error.issues[0]?.path[0] ?? "");
  if (field === "customerName") return "Please enter your name (2 to 120 characters).";
  if (field === "customerPhone") return "Please enter a phone number we can call.";
  if (field === "whatsappNumber") return "Please check the WhatsApp number.";
  if (["standNumber", "streetSection", "landmark"].includes(field)) {
    return "Please shorten the address details.";
  }
  if (field === "deliveryNotes") return "Please keep delivery notes under 500 characters.";
  if (field.startsWith("destination")) return "Please check your delivery area.";
  if (field === "items") {
    return "Your cart could not be read. Please refresh the page and try again.";
  }
  return "Please check your order details and try again.";
}

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
    return NextResponse.json({ ok: false, error: checkoutProblem(parsed.error) }, { status: 400 });
  }

  const payCash = parsed.data.paymentMethod === "CASH";
  const cashSettings = cashOnDeliverySettings();
  if (payCash && !cashSettings.enabled) {
    return NextResponse.json(
      { ok: false, error: "Lethela takes online payments only. Please pay online." },
      { status: 409 },
    );
  }
  if (payCash) {
    // A cash order costs nothing to place, so limit how many one device can place.
    const cashLimited = await checkRateLimit({
      key: "cash-order",
      limit: 4,
      windowMs: 60 * 60_000,
      headers: req.headers,
    });
    if (!cashLimited.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "You have placed several cash orders. Please wait a while or pay online.",
        },
        { status: 429, headers: { "Retry-After": String(cashLimited.retryAfterSec) } },
      );
    }
  }

  const siteCode = process.env.OZOW_SITE_CODE || "";
  const privateKey = process.env.OZOW_PRIVATE_KEY || "";
  if (!payCash && (!siteCode || !privateKey)) {
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

  if (payCash && totalCents > cashSettings.maxCents) {
    return NextResponse.json(
      {
        ok: false,
        error: `Cash on delivery is for orders up to ${formatRand(cashSettings.maxCents)}. Please pay online for this order.`,
      },
      { status: 409 },
    );
  }

  // Guests keep checking out without an account; their name and phone are kept as a
  // customer record so the order history stays together.
  const customerUserId =
    userId ?? (await rememberGuestCustomer({ name: customerName, phone: customerPhone }));

  if (payCash) {
    return placeCashOrder({
      baseUrl,
      checkoutKey,
      userId: customerUserId,
      vendorId,
      normalizedItems,
      deliveryDetails: { ...deliveryDetails, paymentMethod: "CASH" },
      subtotalCents: calcSubtotal,
      deliveryFeeCents: resolvedDeliveryCents,
      distanceKm: deliveryQuote.distanceKm,
      riderTipCents: resolvedRiderTipCents,
      riderPayoutCents,
      vendorPayoutCents,
      platformFeeCents,
      totalCents,
      destinationPoint,
    });
  }

  const ozowReference = createOrderReference();
  const existingOrder = await prisma.order.findUnique({
    where: { checkoutKey },
    select: {
      publicId: true,
      ozowReference: true,
      totalCents: true,
      vendorId: true,
      paymentStatus: true,
    },
  });
  if (existingOrder) {
    if (isCashOnDelivery(existingOrder.paymentStatus)) {
      return NextResponse.json(
        { ok: false, error: "This order was already placed as cash on delivery." },
        { status: 409 },
      );
    }
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
      userId: customerUserId,
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

function formatRand(cents: number) {
  return `R${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

type CashOrderInput = {
  baseUrl: string;
  checkoutKey: string;
  userId: string | null;
  vendorId: string;
  normalizedItems: Array<{ productId: string | null; qty: number; priceCents: number }>;
  deliveryDetails: Record<string, unknown>;
  subtotalCents: number;
  deliveryFeeCents: number;
  distanceKm: number | null;
  riderTipCents: number;
  riderPayoutCents: number;
  vendorPayoutCents: number;
  platformFeeCents: number;
  totalCents: number;
  destinationPoint: { lat: number; lng: number };
};

// Cash on delivery skips Ozow: the order goes to the store at once, exactly as a paid order
// does after Ozow's callback, and the rider collects the total at the door.
async function placeCashOrder(input: CashOrderInput) {
  const existing = await prisma.order.findUnique({
    where: { checkoutKey: input.checkoutKey },
    select: { id: true, publicId: true, vendorId: true, totalCents: true, paymentStatus: true },
  });
  if (existing) {
    if (
      !isCashOnDelivery(existing.paymentStatus) ||
      existing.vendorId !== input.vendorId ||
      existing.totalCents !== input.totalCents
    ) {
      return NextResponse.json(
        { ok: false, error: "This checkout request no longer matches the cart." },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      redirectUrl: cashSuccessUrl(input.baseUrl, existing.publicId),
      ref: existing.publicId,
      idempotent: true,
    });
  }

  const reference = createOrderReference();
  const order = await prisma.order.create({
    data: {
      publicId: reference,
      checkoutKey: input.checkoutKey,
      userId: input.userId,
      vendorId: input.vendorId,
      itemsJson: JSON.stringify({
        items: input.normalizedItems,
        deliveryDetails: input.deliveryDetails,
      }),
      subtotalCents: input.subtotalCents,
      deliveryFeeCents: input.deliveryFeeCents,
      distanceKm: input.distanceKm,
      riderTipCents: input.riderTipCents,
      riderPayoutCents: input.riderPayoutCents,
      vendorPayoutCents: input.vendorPayoutCents,
      platformFeeCents: input.platformFeeCents,
      totalCents: input.totalCents,
      amountCents: input.totalCents,
      status: "NEW",
      paymentStatus: CASH_PAYMENT_STATUS,
      customerLat: input.destinationPoint.lat,
      customerLng: input.destinationPoint.lng,
      items: {
        create: input.normalizedItems.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          priceCents: item.priceCents,
        })),
      },
    },
    select: { id: true, publicId: true },
  });

  await recordOrderEvent({
    orderId: order.id,
    publicId: order.publicId,
    type: "PAYMENT_CASH_ON_DELIVERY",
    actor: "checkout",
    note: "Customer pays the rider in cash on delivery.",
  });
  await settleWithin(
    Promise.all([notifyVendorOfPaidOrder(order.id), notifyAdminsOfOrder(order.id, "paid")]),
    4_000,
  );

  return NextResponse.json({
    ok: true,
    redirectUrl: cashSuccessUrl(input.baseUrl, order.publicId),
    ref: order.publicId,
  });
}

function cashSuccessUrl(baseUrl: string, reference: string) {
  const trackingToken = createOrderTrackingToken(reference);
  return `${baseUrl}/checkout/success?ref=${encodeURIComponent(reference)}&t=${encodeURIComponent(trackingToken)}`;
}
