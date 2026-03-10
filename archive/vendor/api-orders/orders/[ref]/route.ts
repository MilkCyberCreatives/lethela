// /src/app/api/orders/[ref]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(_req: NextRequest, { params }: { params: { ref: string } }) {
  const order = await prisma.order.findFirst({
    where: { ozowReference: params.ref },
    select: {
      id: true,
      ozowReference: true,
      amountCents: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      vendor: {
        select: { id: true, name: true, suburb: true }
      }
    }
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, order });
}
