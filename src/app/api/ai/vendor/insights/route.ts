// src/app/api/ai/vendor/insights/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

export async function GET() {
  const session = await requireVendor("STAFF");

  const vendor = await prisma.vendor.findUnique({
    where: { id: session.vendorId },
    include: {
      products: true,
      orders: {
        include: {
          items: true
        }
      }
    }
  });

  if (!vendor) {
    return NextResponse.json(
      { ok: false, error: "Vendor not found" },
      { status: 404 }
    );
  }

  // revenue, top products, etc.
  const revenueCents = vendor.orders.reduce(
    (s: number, o: any) => s + o.totalCents,
    0
  );

  // count product frequency from order line items
  const productCountMap = vendor.orders
    .flatMap((o: any) => o.items)
    .reduce((acc: Record<string, number>, it: any) => {
      acc[it.productId] = (acc[it.productId] || 0) + it.qty;
      return acc;
    }, {});

  // sort by most sold
  const bestSellers = Object.entries(productCountMap)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([pid]) => {
      const p = vendor.products.find((pp: any) => pp.id === pid);
      return p ? p.name : "Unknown item";
    });

  return NextResponse.json({
    ok: true,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      revenueCents,
      totalOrders: vendor.orders.length,
      bestSellers
    }
  });
}
