import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

const ItemInputSchema = z.object({
  sectionId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  priceCents: z.number().int().min(100).max(2_000_000),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
  image: z.string().trim().max(1000).nullable().optional(),
  draft: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function ensureItemOwner(vendorId: string, id: string) {
  const item = await prisma.item.findFirst({
    where: { id, vendorId },
    select: { id: true },
  });

  if (!item) {
    throw new Error("Menu item not found.");
  }
}

async function ensureSectionOwner(vendorId: string, sectionId: string) {
  const section = await prisma.menuSection.findFirst({
    where: { id: sectionId, vendorId },
    select: { id: true },
  });

  if (!section) {
    throw new Error("Selected section does not belong to this vendor.");
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const { id } = await params;
    await ensureItemOwner(vendorId, id);

    const body = await req.json().catch(() => ({}));
    const parsed = ItemInputSchema.safeParse({
      ...body,
      priceCents: Number(body?.priceCents),
      tags: Array.isArray(body?.tags)
        ? body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
        : [],
      description: body?.description ? String(body.description).trim() : null,
      image: body?.image ? String(body.image).trim() : null,
      draft: Boolean(body?.draft),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid menu item payload.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await ensureSectionOwner(vendorId, parsed.data.sectionId);

    const item = await prisma.item.update({
      where: { id },
      data: {
        sectionId: parsed.data.sectionId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        priceCents: parsed.data.priceCents,
        tags: JSON.stringify(parsed.data.tags),
        image: parsed.data.image || null,
        draft: parsed.data.draft ?? false,
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        ...item,
        tags: parsed.data.tags,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update menu item.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const { id } = await params;
    await ensureItemOwner(vendorId, id);
    await prisma.item.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete menu item.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
