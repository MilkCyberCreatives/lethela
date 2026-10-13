import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendorAccount } from "@/lib/authz";
import {
  LIQUOR_LICENCE_REQUIRED,
  catalogInputErrorMessage,
  hasCurrentLiquorLicence,
} from "@/lib/catalog-input";
import { vendorApiErrorStatus } from "@/lib/vendor-api-error";

class MenuInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const ItemInputSchema = z.object({
  sectionId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  priceCents: z.number().int().min(100).max(2_000_000),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
  image: z.string().trim().max(1000).nullable().optional(),
  isAlcohol: z.boolean().default(false),
  draft: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function ensureItemOwner(vendorId: string, id: string) {
  const item = await prisma.item.findFirst({
    where: { id, vendorId },
    select: { id: true },
  });

  if (!item) {
    throw new MenuInputError("Menu item not found.", 404);
  }
}

async function ensureSectionOwner(vendorId: string, sectionId: string) {
  const section = await prisma.menuSection.findFirst({
    where: { id: sectionId, vendorId },
    select: { id: true },
  });

  if (!section) {
    throw new MenuInputError("Choose one of your own menu sections.");
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendorAccount("MANAGER");
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
      isAlcohol: Boolean(body?.isAlcohol),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: catalogInputErrorMessage(parsed.error),
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await ensureSectionOwner(vendorId, parsed.data.sectionId);

    // Moving liquor to draft is always allowed; showing it needs a current licence.
    if (parsed.data.isAlcohol && !parsed.data.draft && !(await hasCurrentLiquorLicence(vendorId))) {
      return NextResponse.json({ ok: false, error: LIQUOR_LICENCE_REQUIRED }, { status: 403 });
    }

    const item = await prisma.item.update({
      where: { id },
      data: {
        sectionId: parsed.data.sectionId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        priceCents: parsed.data.priceCents,
        tags: JSON.stringify(parsed.data.tags),
        image: parsed.data.image || null,
        isAlcohol: parsed.data.isAlcohol,
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
    const status = error instanceof MenuInputError ? error.status : vendorApiErrorStatus(error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendorAccount("MANAGER");
    const { id } = await params;
    await ensureItemOwner(vendorId, id);
    await prisma.item.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete menu item.";
    const status = error instanceof MenuInputError ? error.status : vendorApiErrorStatus(error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
