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
  const [products, grouped] = await Promise.all([
    prisma.product.findMany({
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
    }),
    prisma.product.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countFor = (value: string) => grouped.find((row) => row.status === value)?._count._all ?? 0;
  return NextResponse.json({
    ok: true,
    products,
    counts: {
      submitted: countFor("SUBMITTED"),
      changesRequested: countFor("CHANGES_REQUESTED"),
      approved: countFor("APPROVED"),
      rejected: countFor("REJECTED"),
      total: grouped.reduce((sum, row) => sum + row._count._all, 0),
    },
  });
}
