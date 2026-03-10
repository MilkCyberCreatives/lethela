import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { aiModerateProduct } from "@/lib/ai";
import { requireVendor } from "@/lib/authz";

const ProductPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case")
    .optional(),
  description: z.string().trim().max(1200).nullable().optional(),
  priceCents: z.number().int().min(100).max(2_000_000).optional(),
  image: z.string().trim().max(1000).nullable().optional(),
  isAlcohol: z.boolean().optional(),
  abv: z.number().min(0).max(100).nullable().optional(),
  inStock: z.boolean().optional(),
});

async function assertOwnership(vendorId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: { id, vendorId },
    select: { id: true, name: true },
  });
  if (!product) throw new Error("Product not found");
}

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const { id } = await params;
    await assertOwnership(vendorId, id);
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Delete failed" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const { id } = await params;
    await assertOwnership(vendorId, id);

    const raw = await req.json().catch(() => ({}));
    const parsed = ProductPatchSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ ok: false, error: "Invalid payload", fieldErrors }, { status: 400 });
    }

    const data = parsed.data;
    if (data.name || data.description) {
      const moderation = await aiModerateProduct(data.name ?? "", data.description ?? "");
      if (!moderation.allowed) {
        return NextResponse.json(
          { ok: false, error: "Content not allowed", reasons: moderation.reasons ?? [] },
          { status: 400 }
        );
      }
    }

    if (data.slug) {
      const existing = await prisma.product.findUnique({
        where: { vendorId_slug: { vendorId, slug: data.slug } },
        select: { id: true },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json({ ok: false, error: "Slug already exists for this vendor" }, { status: 409 });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, product });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Update failed" }, { status: 404 });
  }
}
