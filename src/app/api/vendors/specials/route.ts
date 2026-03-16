import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

const SpecialInputSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).nullable().optional(),
    discountPct: z.number().int().min(1).max(90),
    startsAt: z.string().trim().min(1),
    endsAt: z.string().trim().min(1),
    productId: z.string().trim().min(1).nullable().optional(),
    draft: z.boolean().optional().default(false),
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: "End date must be later than start date.",
    path: ["endsAt"],
  });

async function ensureVendorProduct(vendorId: string, productId?: string | null) {
  if (!productId) return null;

  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Selected product does not belong to this vendor.");
  }

  return product.id;
}

export async function GET() {
  try {
    const { vendorId } = await requireVendor("STAFF");
    const specials = await prisma.special.findMany({
      where: { vendorId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startsAt: "desc" },
    });
    return NextResponse.json({ ok: true, specials });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load specials.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const body = await req.json().catch(() => ({}));
    const parsed = SpecialInputSchema.safeParse({
      ...body,
      discountPct: Number(body?.discountPct),
      description: body?.description ? String(body.description).trim() : null,
      productId: body?.productId ? String(body.productId).trim() : null,
      draft: Boolean(body?.draft),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid special payload.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (Number.isNaN(new Date(parsed.data.startsAt).getTime()) || Number.isNaN(new Date(parsed.data.endsAt).getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid start or end date." }, { status: 400 });
    }

    const productId = await ensureVendorProduct(vendorId, parsed.data.productId);
    const special = await prisma.special.create({
      data: {
        vendorId,
        productId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        discountPct: parsed.data.discountPct,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        draft: parsed.data.draft,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, special });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create special.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
