// /src/app/api/vendor/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiModerateProduct } from "@/lib/ai";

// For MVP, map email -> vendor record
async function getOrCreateVendor(email: string) {
  const slug = email.split("@")[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  let vendor = await prisma.vendor.findFirst({ where: { slug } });
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: { name: `Vendor ${slug}`, slug, suburb: "Klipfontein View", city: "Midrand" },
    });
  }
  return vendor;
}

export async function GET() {
  const cookie = (await import("next/headers")).cookies();
  const email = cookie.get("vendor_email")?.value || "demo@lethela.co.za";
  const vendor = await getOrCreateVendor(email);

  const items = await prisma.product.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const cookie = (await import("next/headers")).cookies();
  const email = cookie.get("vendor_email")?.value || "demo@lethela.co.za";
  const vendor = await getOrCreateVendor(email);

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.slug || typeof body?.priceCents !== "number") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  // AI moderation
  const mod = await aiModerateProduct(body.name, body.description ?? "");
  if (!mod.allowed) {
    return NextResponse.json({ ok: false, error: "Content not allowed", reasons: mod.reasons }, { status: 400 });
  }

  const p = await prisma.product.create({
    data: {
      vendorId: vendor.id,
      name: body.name,
      slug: body.slug,
      description: body.description || null,
      priceCents: body.priceCents,
      image: body.image || null,
      isAlcohol: !!body.isAlcohol,
      abv: body.abv ?? null,
      inStock: body.inStock ?? true,
    },
  });

  return NextResponse.json({ ok: true, product: p });
}
