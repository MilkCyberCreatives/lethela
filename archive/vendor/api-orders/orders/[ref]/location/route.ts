// /src/app/api/orders/[ref]/location/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { pusherServer } from "@/lib/pusher-server";
import { z } from "zod";
import { auth } from "@/auth";

const Body = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().optional()
});

export async function POST(req: NextRequest, { params }: { params: { ref: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Auth required" }, { status: 401 });

  const order = await prisma.order.findFirst({ where: { ozowReference: params.ref } });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const channel = `order-${order.ozowReference}`;
  await pusherServer.trigger(channel, "location", { ...parsed.data, at: new Date().toISOString() });

  return NextResponse.json({ ok: true });
}
