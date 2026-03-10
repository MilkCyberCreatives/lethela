// /src/app/api/vendor/products/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiModerateProduct } from "@/lib/ai";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const data = await req.json().catch(() => ({}));
  if (data.name || data.description) {
    const mod = await aiModerateProduct(data.name ?? "", data.description ?? "");
    if (!mod.allowed) {
      return NextResponse.json({ ok: false, error: "Content not allowed", reasons: mod.reasons }, { status: 400 });
    }
  }
  const p = await prisma.product.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, product: p });
}
