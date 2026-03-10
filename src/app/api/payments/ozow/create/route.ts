// /src/app/api/payments/ozow/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";
import { buildOzowRedirectUrl } from "@/lib/ozow";
import { geocodeSuburb } from "@/lib/geo";
import { z } from "zod";
import { withSentryRoute } from "@/server/withSentryRoute";

const BodySchema = z.object({
  vendorId: z.string().min(1),
  vendorSlug: z.string().min(1).optional().default(""),
  destinationSuburb: z.string().trim().min(2).max(140).optional(),
  items: z.array(
    z.object({
      itemId: z.string(),
      name: z.string(),
      priceCents: z.number().int().nonnegative(),
      qty: z.number().int().positive(),
      image: z.string().trim().max(1000).optional().nullable()
    })
  ),
  subtotalCents: z.number().int().nonnegative(),
  deliveryCents: z.number().int().nonnegative(),
  totalCents: z.number().int().positive()
});

export const POST = withSentryRoute(async (req: NextRequest) => {
  const requestOrigin = req.nextUrl.origin;
  const baseUrl =
    requestOrigin ||
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const siteCode = process.env.OZOW_SITE_CODE || "";
  const privateKey = process.env.OZOW_PRIVATE_KEY || "";
  if (!siteCode || !privateKey) {
    return NextResponse.json(
      { ok: false, error: "OZOW_SITE_CODE or OZOW_PRIVATE_KEY not set" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const { vendorId, vendorSlug, destinationSuburb, items, subtotalCents, deliveryCents } = parsed.data;
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Cart is empty." }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, isActive: true, status: "ACTIVE" },
    select: { id: true, slug: true, deliveryFee: true },
  });
  if (!vendor) {
    return NextResponse.json({ ok: false, error: "Vendor is unavailable." }, { status: 400 });
  }

  const itemIds = [...new Set(items.map((item) => item.itemId))];
  const products = await prisma.product.findMany({
    where: { vendorId, id: { in: itemIds }, inStock: true },
    select: { id: true, name: true, priceCents: true },
  });
  const menuItems = await prisma.item.findMany({
    where: { vendorId, id: { in: itemIds }, draft: false },
    select: { id: true, name: true, priceCents: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

  const unresolvedIds = itemIds.filter((id) => !productById.has(id) && !menuItemById.has(id));
  if (unresolvedIds.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Some cart items are unavailable. Please refresh your cart." },
      { status: 409 }
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
    };
  });

  const calcSubtotal = normalizedItems.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
  const resolvedDeliveryCents = Number.isFinite(vendor.deliveryFee) ? Math.max(0, vendor.deliveryFee) : deliveryCents;
  const totalCents = calcSubtotal + resolvedDeliveryCents;

  if (Math.abs(calcSubtotal - subtotalCents) > 5) {
    return NextResponse.json(
      {
        ok: false,
        error: "Cart totals changed. Please review checkout before paying.",
        subtotalCents: calcSubtotal,
        deliveryCents: resolvedDeliveryCents,
        totalCents,
      },
      { status: 409 }
    );
  }

  const destinationPoint = destinationSuburb ? await geocodeSuburb(destinationSuburb) : null;

  const ozowReference = `LET-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      publicId: ozowReference,
      userId,
      vendorId,
      itemsJson: JSON.stringify(normalizedItems),
      subtotalCents: calcSubtotal,
      deliveryFeeCents: resolvedDeliveryCents,
      totalCents,
      amountCents: totalCents,
      status: "PLACED",
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
    select: { id: true, ozowReference: true, publicId: true },
  });
  const reference = order.ozowReference ?? order.publicId ?? ozowReference;

  const returnUrl = `${baseUrl}/checkout/success?ref=${encodeURIComponent(reference)}`;
  const cancelUrl = `${baseUrl}/checkout/cancel?ref=${encodeURIComponent(reference)}`;
  const notifyUrl = `${baseUrl}/api/payments/ozow/notify`;

  const redirectUrl = buildOzowRedirectUrl({
    siteCode,
    privateKey,
    amountCents: totalCents,
    transactionReference: reference,
    bankReference: `Lethela ${vendorSlug || vendor.slug}`,
    returnUrl,
    cancelUrl,
    notifyUrl,
    isTest: process.env.OZOW_IS_TEST !== "false",
  });

  return NextResponse.json({ ok: true, redirectUrl, ref: reference });
});
