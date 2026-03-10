// /src/app/api/vendors/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getCookie } from "@/lib/cookie-helpers";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const email = await getCookie("vendor_email");
  if (!email) return NextResponse.json({ ok: false, error: "Not signed in as vendor" }, { status: 401 });

  const vendor = await prisma.vendor.findUnique({ where: { email } });
  if (!vendor) return NextResponse.json({ ok: false, error: "Vendor not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const status = body?.status as "PLACED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED";

  try {
    const o = await prisma.order.update({
      where: { publicId: params.id },
      data: { status },
    });
    return NextResponse.json({ ok: true, order: o });
  } catch {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }
}
