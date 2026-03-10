import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

const SectionInputSchema = z.object({
  title: z.string().trim().min(2).max(80),
});

type Params = { params: Promise<{ id: string }> };

async function ensureSectionOwner(vendorId: string, id: string) {
  const section = await prisma.menuSection.findFirst({
    where: { id, vendorId },
    select: { id: true },
  });

  if (!section) {
    throw new Error("Section not found.");
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const { id } = await params;
    await ensureSectionOwner(vendorId, id);

    const body = await req.json().catch(() => ({}));
    const parsed = SectionInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid section payload.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const section = await prisma.menuSection.update({
      where: { id },
      data: { title: parsed.data.title },
    });

    return NextResponse.json({ ok: true, section });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update section.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const { id } = await params;
    await ensureSectionOwner(vendorId, id);
    await prisma.menuSection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete section.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
