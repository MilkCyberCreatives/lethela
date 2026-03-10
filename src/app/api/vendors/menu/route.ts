import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";

const SectionInputSchema = z.object({
  title: z.string().trim().min(2).max(80),
});

export async function GET() {
  try {
    const { vendorId } = await requireVendor("STAFF");
    const sections = await prisma.menuSection.findMany({
      where: { vendorId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: {
        items: {
          orderBy: [{ draft: "asc" }, { name: "asc" }],
          select: {
            id: true,
            vendorId: true,
            sectionId: true,
            name: true,
            description: true,
            priceCents: true,
            tags: true,
            image: true,
            draft: true,
            updatedAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      sections: sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          tags: parseTags(item.tags),
        })),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load menu.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { vendorId } = await requireVendor("MANAGER");
    const body = await req.json().catch(() => ({}));
    const parsed = SectionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid section payload.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const lastSection = await prisma.menuSection.findFirst({
      where: { vendorId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const section = await prisma.menuSection.create({
      data: {
        vendorId,
        title: parsed.data.title,
        sortOrder: (lastSection?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ ok: true, section });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create section.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}
