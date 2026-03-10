// /src/app/api/vendors/orders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getCookie } from "@/lib/cookie-helpers";

export async function GET() {
  const email = await getCookie("vendor_email");
  if (!email) return NextResponse.json({ ok: false, error: "Not signed in as vendor" }, { status: 401 });

  const vendor = await prisma.vendor.findUnique({ where: { email } });
  if (!vendor) return NextResponse.json({ ok: false, error: "Vendor not found" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { vendorId: vendor.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, orders });
}
