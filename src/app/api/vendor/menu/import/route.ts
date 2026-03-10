// /src/app/api/vendor/menu/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { auth } from "@/auth";
import { withSentryRoute } from "@/server/withSentryRoute";

const Row = z.object({
  section: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  tags: z.array(z.string()).default([]),
  image: z.string().url().nullable().optional()
});

const Body = z.object({
  vendorId: z.string().min(1),
  rows: z.array(Row).min(1)
});

export const POST = withSentryRoute(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Auth required" }, { status: 401 });

  const body = await req.json().catch(()=> ({}));
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const { vendorId, rows } = parsed.data;

  // Ensure user owns the vendor or is admin
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { ownerId: true } });
  if (!vendor) return NextResponse.json({ ok: false, error: "Vendor not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && vendor.ownerId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Upsert sections; create draft items
  // Simple approach: upsert by (vendorId, title)
  const sectionCache = new Map<string, string>(); // title -> id

  for (const r of rows) {
    const title = r.section.trim();
    if (!sectionCache.has(title)) {
      const existing = await prisma.menuSection.findFirst({
        where: { vendorId, title }
      });
      if (existing) sectionCache.set(title, existing.id);
      else {
        const created = await prisma.menuSection.create({
          data: { vendorId, title, sortOrder: 0 }
        });
        sectionCache.set(title, created.id);
      }
    }
  }

  let count = 0;
  for (const r of rows) {
    const sectionId = sectionCache.get(r.section.trim())!;
    await prisma.item.create({
      data: {
        vendorId,
        sectionId,
        name: r.name,
        description: r.description ?? undefined,
        priceCents: Math.round(r.price * 100),
        tags: JSON.stringify(r.tags ?? []),
        image: r.image ?? undefined,
        draft: true
      }
    });
    count++;
  }

  return NextResponse.json({ ok: true, count });
});
