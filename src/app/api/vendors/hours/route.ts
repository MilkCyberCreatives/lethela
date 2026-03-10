// /src/app/api/vendors/hours/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

export async function GET() {
  try {
    const { vendorId } = await requireVendor("STAFF");
    const hours = await prisma.operatingHour.findMany({ where: { vendorId }, orderBy: { day: "asc" } });
    return NextResponse.json({ ok: true, hours });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const { hours } = await req.json().catch(() => ({ hours: [] }));
    if (!Array.isArray(hours)) return NextResponse.json({ ok: false, error: "hours[] required" }, { status: 400 });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const h of hours) {
        await tx.operatingHour.upsert({
          where: { vendorId_day: { vendorId, day: h.day } },
          update: { openMin: h.openMin, closeMin: h.closeMin, closed: !!h.closed },
          create: { vendorId, day: h.day, openMin: h.openMin, closeMin: h.closeMin, closed: !!h.closed },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}
