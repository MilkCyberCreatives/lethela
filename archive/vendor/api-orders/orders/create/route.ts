// src/app/api/orders/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deliveryFeeZAR } from "@/lib/pricing";
import { haversineKm } from "@/lib/geo";

function genPublicId() {
  const n = Math.floor(10000 + Math.random() * 900000);
  return `LET-${n}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { vendorId, items, customerLat, customerLng } = body as {
    vendorId: string;
    items: Array<{ productId: string; qty: number }>;
    customerLat?: number;
    customerLng?: number;
  };

  if (!vendorId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "vendorId and items[] required" }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return NextResponse.json({ ok: false, error: "Vendor not found" }, { status: 404 });

  const productIds = items.map(i => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    return NextResponse.json({ ok: false, error: "One or more products not found" }, { status: 400 });
  }

  let subtotalCents = 0;
  const lineMap: Record<string, number> = {};
  for (const it of items) {
    const p = products.find(pp => pp.id === it.productId)!;
    subtotalCents += p.priceCents * Math.max(1, it.qty);
    lineMap[p.id] = p.priceCents;
  }

  let distanceKm: number | null = null;
  if (
    typeof vendor.latitude === "number" && typeof vendor.longitude === "number" &&
    typeof customerLat === "number" && typeof customerLng === "number"
  ) {
    distanceKm = haversineKm(vendor.latitude, vendor.longitude, customerLat, customerLng);
  }

  const deliveryFeeCents = deliveryFeeZAR(distanceKm ?? 0) * 100; // R10 if < 1 km ✅
  const totalCents = subtotalCents + deliveryFeeCents;

  const order = await prisma.order.create({
    data: {
      publicId: genPublicId(),
      vendorId: vendor.id,
      status: "PLACED",
      customerLat: typeof customerLat === "number" ? customerLat : null,
      customerLng: typeof customerLng === "number" ? customerLng : null,
      distanceKm,
      subtotalCents,
      deliveryFeeCents,
      totalCents,
      items: {
        create: items.map(it => ({
          productId: it.productId,
          qty: Math.max(1, it.qty),
          priceCents: lineMap[it.productId],
        })),
      },
    },
    include: { items: true, vendor: true },
  });

  return NextResponse.json({
    ok: true,
    order: {
      id: order.publicId,
      status: order.status,
      vendor: order.vendor?.name ?? "Vendor",
      distanceKm: order.distanceKm,
      subtotalCents: order.subtotalCents,
      deliveryFeeCents: order.deliveryFeeCents,
      totalCents: order.totalCents,
      items: order.items.map(li => ({
        productId: li.productId,
        qty: li.qty,
        priceCents: li.priceCents,
      })),
    },
  });
}
