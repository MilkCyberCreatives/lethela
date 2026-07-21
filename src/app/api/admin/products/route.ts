import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req, "admin:read");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  const requested = String(req.nextUrl.searchParams.get("status") || "SUBMITTED").toUpperCase();
  const status = ["SUBMITTED", "APPROVED", "CHANGES_REQUESTED", "REJECTED", "ALL"].includes(
    requested,
  )
    ? requested
    : "SUBMITTED";
  const products = await prisma.product.findMany({
    where: status === "ALL" ? {} : { status },
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
      status: true,
      reviewReason: true,
      createdAt: true,
      updatedAt: true,
      vendor: {
        select: { id: true, name: true, status: true, isActive: true },
      },
    },
  });
  return NextResponse.json({ ok: true, products });
}
