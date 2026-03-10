import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { aiModerateProduct } from "@/lib/ai";
import { requireVendor } from "@/lib/authz";

const ProductInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  description: z.string().trim().max(1200).optional().nullable(),
  priceCents: z.number().int().min(100).max(2_000_000),
  image: z.string().trim().max(1000).optional().nullable(),
  isAlcohol: z.boolean().optional(),
  abv: z.number().min(0).max(100).optional().nullable(),
  inStock: z.boolean().optional(),
});

export async function GET() {
  try {
    const { vendorId } = await requireVendor("STAFF");
    const items = await prisma.product.findMany({
      where: { vendorId },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceCents: true,
        image: true,
        isAlcohol: true,
        abv: true,
        inStock: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Not signed in as vendor" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const raw = await req.json().catch(() => ({}));
    const parsed = ProductInputSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ ok: false, error: "Invalid payload", fieldErrors }, { status: 400 });
    }

    const body = parsed.data;
    const moderation = await aiModerateProduct(body.name, body.description ?? "");
    if (!moderation.allowed) {
      return NextResponse.json(
        { ok: false, error: "Content not allowed", reasons: moderation.reasons ?? [] },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findUnique({
      where: { vendorId_slug: { vendorId, slug: body.slug } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Slug already exists for this vendor" }, { status: 409 });
    }

    const product = await prisma.product.create({
      data: {
        vendorId,
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        priceCents: body.priceCents,
        image: body.image || null,
        isAlcohol: Boolean(body.isAlcohol),
        abv: body.abv ?? null,
        inStock: body.inStock ?? true,
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Failed to create product" }, { status: 401 });
  }
}
