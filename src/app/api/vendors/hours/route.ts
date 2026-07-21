// /src/app/api/vendors/hours/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendorAccount } from "@/lib/authz";

const HoursSchema = z
  .array(
    z.object({
      day: z.number().int().min(0).max(6),
      openMin: z.number().int().min(0).max(1439),
      closeMin: z.number().int().min(1).max(1440),
      closed: z.boolean(),
    }),
  )
  .length(7)
  .refine((hours) => new Set(hours.map((hour) => hour.day)).size === 7, {
    message: "Provide each day once.",
  })
  .refine((hours) => hours.every((hour) => hour.closed || hour.openMin < hour.closeMin), {
    message: "Closing time must be after opening time.",
  });

export async function GET() {
  try {
    const { vendorId } = await requireVendorAccount("STAFF");
    const hours = await prisma.operatingHour.findMany({
      where: { vendorId },
      orderBy: { day: "asc" },
    });
    return NextResponse.json({ ok: true, hours });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { vendorId } = await requireVendorAccount("MANAGER");
    const body = await req.json().catch(() => ({ hours: [] }));
    const parsed = HoursSchema.safeParse(body?.hours);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Provide valid opening hours for all seven days." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const h of parsed.data) {
        await tx.operatingHour.upsert({
          where: { vendorId_day: { vendorId, day: h.day } },
          update: { openMin: h.openMin, closeMin: h.closeMin, closed: !!h.closed },
          create: {
            vendorId,
            day: h.day,
            openMin: h.openMin,
            closeMin: h.closeMin,
            closed: !!h.closed,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  }
}
